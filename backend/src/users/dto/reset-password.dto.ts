import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'dana@example.com' })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'קוד לא תקין' })
  code!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'הסיסמה חייבת להכיל לפחות 8 תווים' })
  newPassword!: string;
}
