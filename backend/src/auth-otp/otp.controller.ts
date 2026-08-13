import { Body, Controller, Post } from '@nestjs/common';
import { OtpService } from './otp.service';

// The global 'api' prefix (see main.ts's app.setGlobalPrefix) supplies the
// leading /api — full routes stay /api/auth/....
@Controller('auth')
export class OtpController {
  constructor(private readonly otp: OtpService) {}

  @Post('send-otp')
  sendOtp(@Body() body: { email: string }) {
    return this.otp.sendOtp(body?.email);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; code: string }) {
    return this.otp.verifyOtp(body?.email, body?.code);
  }
}
