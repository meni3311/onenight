import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dana@example.com' })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
