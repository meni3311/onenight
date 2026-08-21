import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ADMIN_PASSWORD } from './admin.guard';

class AdminLoginDto {
  @IsString() password!: string;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  @Post('login')
  @ApiOperation({ summary: 'Check the admin password' })
  login(@Body() dto: AdminLoginDto): { ok: boolean } {
    return { ok: dto.password === ADMIN_PASSWORD };
  }
}
