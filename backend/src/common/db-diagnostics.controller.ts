import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { connect as tlsConnect } from 'tls';
import { lookup } from 'dns';
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

  /** Raw TCP + TLS handshake, then immediately close. No Postgres traffic. */
  private tlsHandshake(host: string, port: number): Promise<void> {
    return new Promise((res, rej) => {
      const sock = tlsConnect(
        { host, port, servername: host, rejectUnauthorized: false },
        () => { sock.destroy(); res(); },
      );
      sock.setTimeout(15000, () => { sock.destroy(); rej(new Error('timeout')); });
      sock.on('error', (e) => { sock.destroy(); rej(e); });
    });
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
    const tlsSeq = await seq(3, () => this.tlsHandshake(host, port));
    const tlsPar = await par(8, () => this.tlsHandshake(host, port));
    const prismaSeq = await seq(3, q);
    const prismaPar = await par(8, q);

    const ratio = (parallel: number, sequential: number[]) => {
      const median = [...sequential].sort((a, b) => a - b)[Math.floor(sequential.length / 2)];
      return median > 0 ? +(parallel / median).toFixed(2) : null;
    };

    return {
      target: { host, port, note: 'credentials never read' },
      // A ratio near 1 means eight concurrent operations overlapped.
      // A ratio near 8 means they ran one after another.
      dns: { sequentialMs: dnsSeq, parallel8Ms: dnsPar, ratio: ratio(dnsPar, dnsSeq) },
      tls: { sequentialMs: tlsSeq, parallel8Ms: tlsPar, ratio: ratio(tlsPar, tlsSeq) },
      prisma: { sequentialMs: prismaSeq, parallel8Ms: prismaPar, ratio: ratio(prismaPar, prismaSeq) },
      reading: {
        'tls ratio ~8': 'the machine/network serializes connections — look at antivirus TLS inspection, a proxy, or a VPN, not at Prisma',
        'tls ratio ~1 but prisma ratio ~8': 'the driver layer serializes — pool config or the Supabase pooler',
        'tls sequential ~1800ms': 'each new connection is genuinely that expensive — distance plus handshake; connection reuse is the fix',
        'tls sequential ~300ms': 'the network is fine and something is opening a fresh connection per query',
      },
    };
  }
}
