import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthOtpModule } from '../auth-otp/auth-otp.module';
import { DressesModule } from '../dresses/dresses.module';

@Module({
  imports: [AuthOtpModule, DressesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
