import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/auth')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post('register')
  register(@Body() body: { name: string; email?: string; city?: string; phone: string; password: string }) {
    return this.service.register(body);
  }

  @Post('login')
  login(@Body() body: { phone: string; password: string }) {
    return this.service.login(body.phone, body.password);
  }

  @Post('profile')
  updateProfile(@Body() body: { phone: string; name?: string; email?: string; city?: string }) {
    return this.service.updateProfile(body.phone, body);
  }
}
