/**
 * Measures where database latency actually goes, from the machine that talks
 * to the database.
 *
 * Run from the backend/ directory:
 *   npx ts-node scripts/db-latency-probe.ts
 *
 * Read-only — the only statement it issues is `SELECT 1`. Safe to point at
 * any database, including production.
 *
 * WHY THIS EXISTS: the original Supabase instance was in ap-southeast-2, and
 * from Israel a single `SELECT 1` through Prisma cost ~1.8s while eight
 * concurrent ones took eight times as long as one instead of overlapping.
 * Raising Prisma's `connection_limit` changed nothing, which ruled out the
 * declared pool size and left candidates that can't be told apart from
 * outside the process. This measures the layers separately:
 *
 *   dns      resolving the database host. Windows' DNS client can serialize
 *            identical in-flight lookups, which would serialize everything
 *            built on top of it.
 *   tls      raw TCP + TLS handshake — no Postgres protocol, no Prisma. If
 *            these serialize, the cause is beneath the driver entirely; a
 *            local TLS-inspecting antivirus or proxy is the usual culprit.
 *   prisma   `SELECT 1`, sequential and concurrent, for comparison.
 *
 * This is the standalone twin of GET /api/health/db (admin-gated, same
 * measurements). Use this one before cutover, when the app isn't running
 * against the new database yet.
 *
 * Prints timings and the host only — the connection URL is parsed here and
 * only `hostname`/`port` are ever read off it, so output is safe to paste.
 *
 * Reads DATABASE_URL from backend/.env, which importing @prisma/client loads
 * for us. That is the same way the running app picks it up — nothing in this
 * project calls dotenv directly.
 */
import { connect as tlsConnect } from 'tls';
import { lookup } from 'dns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function ms(start: bigint): number {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

/** Returns elapsed ms; negative magnitude marks a failure. */
function time(fn: () => Promise<unknown>): Promise<number> {
  const t = process.hrtime.bigint();
  return fn().then(
    () => ms(t),
    () => -ms(t),
  );
}

function dnsLookup(host: string): Promise<void> {
  return new Promise((res, rej) => lookup(host, (err) => (err ? rej(err) : res())));
}

/** Raw TCP + TLS handshake, then immediately close. No Postgres traffic. */
function tlsHandshake(host: string, port: number): Promise<void> {
  return new Promise((res, rej) => {
    const sock = tlsConnect(
      { host, port, servername: host, rejectUnauthorized: false },
      () => {
        sock.destroy();
        res();
      },
    );
    sock.setTimeout(15000, () => {
      sock.destroy();
      rej(new Error('timeout'));
    });
    sock.on('error', (e) => {
      sock.destroy();
      rej(e);
    });
  });
}

async function seq(n: number, fn: () => Promise<unknown>): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.round(await time(fn)));
  return out;
}

async function par(n: number, fn: () => Promise<unknown>): Promise<number> {
  const t = process.hrtime.bigint();
  await Promise.all(Array.from({ length: n }, () => time(fn)));
  return Math.round(ms(t));
}

/**
 * Concurrent-vs-sequential cost. ~1 means the eight operations overlapped;
 * ~8 means they ran one after another.
 */
function ratio(parallel: number, sequential: number[]): number | null {
  const median = [...sequential].sort((a, b) => a - b)[
    Math.floor(sequential.length / 2)
  ];
  return median > 0 ? +(parallel / median).toFixed(2) : null;
}

async function main(): Promise<void> {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('DATABASE_URL is not set — nothing to probe.');
    process.exit(1);
  }

  const url = new URL(raw);
  const host = url.hostname;
  const port = Number(url.port || 5432);

  const q = () => prisma.$queryRaw`SELECT 1`;

  // Warm everything first, so none of the numbers below include one-off setup.
  await dnsLookup(host).catch(() => undefined);
  await q().catch(() => undefined);

  const dnsSeq = await seq(4, () => dnsLookup(host));
  const dnsPar = await par(8, () => dnsLookup(host));
  const tlsSeq = await seq(3, () => tlsHandshake(host, port));
  const tlsPar = await par(8, () => tlsHandshake(host, port));
  const prismaSeq = await seq(3, q);
  const prismaPar = await par(8, q);

  const report = (
    label: string,
    sequential: number[],
    parallel: number,
  ): void => {
    console.log(
      `  ${label.padEnd(8)} sequential ${JSON.stringify(sequential).padEnd(22)}` +
        ` parallel8 ${String(parallel).padStart(6)}ms   ratio ${ratio(parallel, sequential)}`,
    );
  };

  console.log(`\ntarget: ${host}:${port}   (credentials never read)\n`);
  report('dns', dnsSeq, dnsPar);
  report('tls', tlsSeq, tlsPar);
  report('prisma', prismaSeq, prismaPar);

  console.log(`
reading the numbers:
  tls ratio ~8                    the machine or network serializes connections —
                                  look at antivirus TLS inspection, a proxy, or a
                                  VPN, not at Prisma
  tls ratio ~1, prisma ratio ~8   the driver layer serializes — pool config or the
                                  connection pooler
  tls sequential ~1800ms          each new connection genuinely costs that much;
                                  distance plus handshake. Connection reuse is the
                                  fix, or move the database closer
  tls sequential ~300ms           the network is fine and something is opening a
                                  fresh connection per query

for reference, the old ap-southeast-2 instance measured ~1800ms sequential
with a tls ratio near 8. An EU region reached from Israel should land in the
low tens of ms, with ratios near 1.
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
