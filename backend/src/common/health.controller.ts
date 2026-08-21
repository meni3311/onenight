import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

interface HealthOk {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

/**
 * Liveness/readiness probe — for hosting platforms (Render/Railway/etc.),
 * uptime monitors, and manual "is it up" checks. No auth: nothing returned
 * here reveals more than "the process is running and can reach its
 * database."
 *
 * Runs a trivial `SELECT 1` against Postgres rather than just returning 200
 * unconditionally — a process that's up but has lost its DB connection
 * (pool exhausted, Neon compute suspended, stale credentials after a
 * redeploy) isn't actually healthy, and catching that before real traffic
 * does is the whole point of a platform health check. PrismaModule is
 * @Global (see prisma.module.ts), so no module wiring was needed beyond
 * registering this controller in AppModule.
 *
 * Resolves to /api/health — it was already mounted under 'api/' before
 * main.ts had a global prefix (see git history), so adding
 * app.setGlobalPrefix('api') doesn't move this route or require excluding
 * it from the prefix. Point Render's "Health Check Path" setting at
 * /api/health.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness/readiness check — process + database' })
  async check(): Promise<HealthOk> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // Distinct from a 200 with `{ status: 'error' }`: 503 is what makes a
      // load balancer / platform health check actually treat this instance
      // as down instead of routing traffic to it.
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'unreachable',
      });
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
