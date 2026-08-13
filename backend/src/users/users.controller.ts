import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { OtpService } from '../auth-otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

// The global 'api' prefix (see main.ts's app.setGlobalPrefix) supplies the
// leading /api — full routes stay /api/auth/..., same as OtpController,
// which shares this path.
@Controller('auth')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly otp: OtpService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.service.register(body);
  }

  /**
   * Completes registration: proves the caller owns the email via the same
   * OtpService used everywhere else (throws on a bad/expired code), then
   * flips the account to verified. The two steps are correlated in one
   * request so "verified" can never be set without a valid code.
   */
  @Post('verify-registration')
  verifyRegistration(@Body() body: VerifyRegistrationDto) {
    this.otp.verifyOtp(body.email, body.code);
    return this.service.markVerified(body.email);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.service.login(body.email, body.password);
  }

  /**
   * Forgot-password: sending the code reuses the existing
   * POST /api/auth/send-otp endpoint directly (no separate flow). This
   * endpoint is the second half — same correlated verify-then-act pattern
   * as verify-registration, so the password can never change without a
   * valid code for that email.
   */
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    this.otp.verifyOtp(body.email, body.code);
    return this.service.resetPassword(body.email, body.newPassword);
  }

  @Post('profile')
  updateProfile(@Body() body: { email: string; name?: string; city?: string }) {
    return this.service.updateProfile(body.email, body);
  }

  /**
   * Self-service account deletion, reached from the user's own account
   * settings — not the admin panel. Same correlated verify-then-act pattern
   * as verify-registration / reset-password: the code sent via the existing
   * POST /api/auth/send-otp is checked here and the account (plus its
   * listings and their images) is removed in the same request.
   */
  @Post('delete-account')
  @HttpCode(204)
  async deleteAccount(@Body() body: DeleteAccountDto): Promise<void> {
    this.otp.verifyOtp(body.email, body.code);
    await this.service.deleteAccount(body.email);
  }
}
