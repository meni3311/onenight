import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthOtpModule } from '../auth-otp/auth-otp.module';
import { DressesModule } from '../dresses/dresses.module';

@Module({
  // AuthOtpModule is imported so UsersController can reuse OtpService
  // directly (verify-registration / reset-password / delete-account) — one
  // OTP system, never a second implementation. DressesModule is imported so
  // UsersService.deleteAccount can reuse DressesService.deleteAllByOwner
  // rather than reimplementing listing/image cleanup a second time.
  imports: [AuthOtpModule, DressesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
