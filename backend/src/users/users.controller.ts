import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { OtpService } from '../auth-otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

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

  @Post('verify-registration')
  verifyRegistration(@Body() body: VerifyRegistrationDto) {
    this.otp.verifyOtp(body.email, body.code);
    return this.service.markVerified(body.email);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.service.login(body.email, body.password);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    this.otp.verifyOtp(body.email, body.code);
    return this.service.resetPassword(body.email, body.newPassword);
  }

  @Post('profile')
  updateProfile(@Body() body: { email: string; name?: string; city?: string }) {
    return this.service.updateProfile(body.email, body);
  }

  @Post('delete-account')
  @HttpCode(204)
  async deleteAccount(@Body() body: DeleteAccountDto): Promise<void> {
    this.otp.verifyOtp(body.email, body.code);
    await this.service.deleteAccount(body.email);
  }
}
