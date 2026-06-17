import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Simple admin gate. Expects header `x-admin-password` to match ADMIN_PASSWORD.
 * Demo only — replace with real auth (JWT / sessions) for production.
 */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'onenight2026';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const pw = req.headers['x-admin-password'];
    if (pw !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('סיסמת מנהלת שגויה');
    }
    return true;
  }
}
