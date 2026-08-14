import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { connect as netConnect } from 'net';
import { lookup } from 'dns';
import { PrismaClient } from '@prisma/client';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TEMPORARY — delete once the database latency question is settled.
 *
 * The symptom: a no-database endpoint answers in ~12ms, while `SELECT 1`
 * through Prisma costs ~1.8s, and eight concurrent `SELECT 1`s take eight
 * times as long as one instead of overlapping. Adding `connection_limit=10`
 * changed nothing. So the serialization is not Nest, and not Prisma's declared
 * pool size, and the remaining candidates can't be told apart from outside the
 * process.
 *
 * This measures the layers separately, inside Node, on the machine that
 * actually talks to the database:
 *
 *   dns      — resolving the pooler host. Windows' DNS client can serialize
 *              identical in-flight lookups, which would serialize everything
 *              built on top of it.
 *   tls      — raw TCP + TLS handshake to the pooler, no Postgres protocol and
 *              no Prisma involved. If eight of these serialize, the problem is
 *              beneath the database driver entirely — a local TLS-inspecting
 *              antivirus or proxy is the usual cause.
 *   prisma   — `SELECT 1`, sequential and concurrent, for comparison.
 *
 * Reports timings and the host only. Never the credentials: the URL is parsed
 * here and only `hostname`/`port` are read off it.
 *
 * Admin-gated, because response timings are exactly the kind of thing that
 * shouldn't be publicly probeable, and because this is a debugging tool that
 * should not have been reachable by anyone in the first place.
 */
@ApiTags('health')
@Controller('health/db')
@UseGuards(AdminGuard)
export class DbDiagnosticsController {
  constructor(private readonly prisma: PrismaService) {}

  private ms(start: bigint): number {
    return Number(process.hrtime.bigint() - start) / 1e6;
  }

  private time<T>(fn: () => Promise<T>): Promise<number> {
    const t = process.hrtime.bigint();
    return fn().then(
      () => this.ms(t),
      () => -this.ms(t), // negative marks a failure, magnitude still useful
    );
  }

  private dnsLookup(host: string): Promise<void> {
    return new Promise((res, rej) => lookup(host, (err) => (err ? rej(err) : res())));
  }

  /**
   * Raw TCP connect, then immediately close. No TLS, no Postgres protocol.
   *
   * This was a TLS handshake in the first version, which was a mistake:
   * Postgres doesn't do implicit TLS on its port — it expects a plaintext
   * SSLRequest first — so every handshake failed and the numbers came back
   * negative. A bare TCP connect measures the thing that was actually wanted
   * (how long it takes to open a socket to the database, and whether opening
   * several at once serializes) without a protocol mismatch in the way.
   */
  private tcpConnect(host: string, port: number): Promise<void> {
    return new Promise((res, rej) => {
      const sock = netConnect({ host, port }, () => { sock.destroy(); res(); });
      sock.setTimeout(15000, () => { sock.destroy(); rej(new Error('timeout')); });
      sock.on('error', (e) => { sock.destroy(); rej(e); });
    });
  }

  /**
   * Force an explicit pool size onto a connection string, so the same endpoint
   * can be measured with the app's own setting and with a known one.
   */
  private withLimit(rawUrl: string, limit: number): string {
    const u = new URL(rawUrl);
    u.searchParams.set('connection_limit', String(limit));
    u.searchParams.set('pool_timeout', '20');
    return u.toString();
  }

  /**
   * Time one `SELECT 1` three times over, then eight at once, on a client of
   * this diagnostic's own making.
   *
   * A separate PrismaClient per variant is the only way to compare connection
   * strings without restarting the process — the injected PrismaService is
   * bound to DATABASE_URL for the lifetime of the app. Each one is disconnected
   * in a finally, because a leaked pool here would quietly consume the very
   * connection budget being measured.
   */
  private async profile(url: string): Promise<Record<string, unknown>> {
    let client: PrismaClient | null = null;
    try {
      client = new PrismaClient({ datasources: { db: { url } } });
      const q = () => client!.$queryRaw`SELECT 1`;
      await q(); // warm: don't charge the first call for pool construction

      const sequentialMs: number[] = [];
      for (let i = 0; i < 3; i++) sequentialMs.push(Math.round(await this.time(q)));

      const t = process.hrtime.bigint();
      await Promise.all(Array.from({ length: 8 }, () => this.time(q)));
      const parallel8Ms = Math.round(this.ms(t));

      const median = [...sequentialMs].sort((a, b) => a - b)[1];
      return {
        sequentialMs,
        parallel8Ms,
        ratio: median > 0 ? +(parallel8Ms / median).toFixed(2) : null,
        verdict: median > 0 && parallel8Ms / median < 2.5 ? 'concurrent' : 'SERIALIZED',
      };
    } catch (e) {
      return { error: (e as Error).message.split('\n')[0] };
    } finally {
      await client?.$disconnect().catch(() => undefined);
    }
  }

  @Get()
  @ApiOperation({ summary: 'TEMPORARY: where database latency is actually spent' })
  async diagnose(): Promise<Record<string, unknown>> {
    const url = new URL(process.env.DATABASE_URL || '');
    const host = url.hostname;
    const port = Number(url.port || 5432);

    const seq = async (n: number, fn: () => Promise<unknown>) => {
      const out: number[] = [];
      for (let i = 0; i < n; i++) out.push(Math.round(await this.time(fn)));
      return out;
    };
    const par = async (n: number, fn: () => Promise<unknown>) => {
      const t = process.hrtime.bigint();
      await Promise.all(Array.from({ length: n }, () => this.time(fn)));
      return Math.round(this.ms(t));
    };

    const q = () => this.prisma.$queryRaw`SELECT 1`;

    // Warm everything first, so none of the numbers below include one-off setup.
    await this.dnsLookup(host).catch(() => undefined);
    await q().catch(() => undefined);

    const dnsSeq = await seq(4, () => this.dnsLookup(host));
    const dnsPar = await par(8, () => this.dnsLookup(host));
    const tcpSeq = await seq(3, () => this.tcpConnect(host, port));
    const tcpPar = await par(8, () => this.tcpConnect(host, port));
    const prismaSeq = await seq(3, q);
    const prismaPar = await par(8, q);

    const ratio = (parallel: number, sequential: number[]) => {
      const median = [...sequential].sort((a, b) => a - b)[Math.floor(sequential.length / 2)];
      return median > 0 ? +(parallel / median).toFixed(2) : null;
    };

    const direct = process.env.DIRECT_URL;

    return {
      target: { host, port, note: 'credentials never read' },
      // A ratio near 1 means eight concurrent operations overlapped.
      // A ratio near 8 means they ran one after another.
      dns: { sequentialMs: dnsSeq, parallel8Ms: dnsPar, ratio: ratio(dnsPar, dnsSeq) },
      tcp: { sequentialMs: tcpSeq, parallel8Ms: tcpPar, ratio: ratio(tcpPar, tcpSeq) },

      // The app's own client, exactly as configured.
      appClient: {
        sequentialMs: prismaSeq,
        parallel8Ms: prismaPar,
        ratio: ratio(prismaPar, prismaSeq),
        verdict: ratio(prismaPar, prismaSeq)! < 2.5 ? 'concurrent' : 'SERIALIZED',
      },

      // Same endpoint, same credentials, different pool settings — isolates
      // "the pooler won't do concurrency" from "our pool is sized at one".
      variants: {
        pooledAsConfigured: await this.profile(process.env.DATABASE_URL || ''),
        pooledLimit10: await this.profile(this.withLimit(process.env.DATABASE_URL || '', 10)),
        directAsConfigured: direct ? await this.profile(direct) : { skipped: 'DIRECT_URL unset' },
        directLimit10: direct ? await this.profile(this.withLimit(direct, 10)) : { skipped: 'DIRECT_URL unset' },
      },

      reading: {
        'tcp ratio ~8': 'the machine or network serializes connections — antivirus TLS inspection, a proxy, or a VPN, not the database',
        'tcp ratio ~1, every variant SERIALIZED': 'the driver serializes regardless of pool size — look above Prisma',
        'pooledLimit10 concurrent, pooledAsConfigured SERIALIZED': 'the connection string is missing connection_limit; add it',
        'direct concurrent, pooled SERIALIZED': 'the pooled endpoint is the constraint — use the direct one for this long-lived server',
        'query time < tcp connect time': 'connections are being reused, which is what we want',
        'query time ≈ tcp connect time or more': 'a fresh connection is being opened per query',
      },
    };
  }
}
