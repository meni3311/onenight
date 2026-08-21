import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

export class VerifyRegistrationDto {
  @ApiProperty({ example: 'dana@example.com' })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'קוד לא תקין' })
  code!: string;
}
