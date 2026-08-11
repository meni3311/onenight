import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/** Body for POST /api/auth/register. */
export class RegisterDto {
  @ApiProperty({ example: 'דנה כהן' })
  @IsString()
  @MinLength(2, { message: 'נא להזין שם מלא' })
  name!: string;

  @ApiProperty({ example: 'dana@example.com' })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;

  @ApiProperty({ example: '0501234567', description: 'Digits only, Israeli format' })
  @Matches(/^0\d{8,9}$/, { message: 'מספר טלפון לא תקין' })
  phone!: string;

  @ApiPropertyOptional({ example: 'dana_c', description: 'Display-only handle — never used for login' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'a-strong-password', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'הסיסמה חייבת להכיל לפחות 8 תווים' })
  password!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Opt-out consent to receive marketing content/offers — defaults to true if omitted',
  })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}
