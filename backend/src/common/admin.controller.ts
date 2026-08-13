import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ADMIN_PASSWORD } from './admin.guard';

class AdminLoginDto {
  @IsString() password!: string;
}

/**
 * Admin password check for the moderation screen's gate.
 *
 * This endpoint only tells the UI whether to render the queue — it issues no
 * token and grants nothing on its own. Every privileged call still sends the
 * password as `x-admin-password` and is re-checked by AdminGuard, so a forged
 * `{ ok: true }` here buys an attacker nothing.
 *
 * Previously served by the localStorage mock, which compared against a
 * password hardcoded in frontend bundle. Now the comparison happens
 * server-side against ADMIN_PASSWORD. Still demo-grade — a single shared
 * password with no rate limiting, no sessions, no audit trail. Replace with
 * real auth before this matters.
 */
// The global 'api' prefix (see main.ts's app.setGlobalPrefix) supplies the
// leading /api — full route stays /api/admin/login.
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  @Post('login')
  @ApiOperation({ summary: 'Check the admin password' })
  login(@Body() dto: AdminLoginDto): { ok: boolean } {
    return { ok: dto.password === ADMIN_PASSWORD };
  }
}
