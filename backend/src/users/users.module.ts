import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthOtpModule } from '../auth-otp/auth-otp.module';

@Module({
  // AuthOtpModule is imported so UsersController can reuse OtpService
  // directly (verify-registration / reset-password) — one OTP system,
  // never a second implementation.
  imports: [TypeOrmModule.forFeature([User]), AuthOtpModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
