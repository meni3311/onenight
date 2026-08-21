import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

/**
 * Body for POST /api/auth/delete-account. Same correlated verify-then-act
 * shape as ResetPasswordDto: the OTP is checked and the account (plus its
 * listings and their images) is removed in one call, so the account can
 * never be deleted without a valid code for that email.
 */
export class DeleteAccountDto {
  @ApiProperty({ example: 'dana@example.com' })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'קוד לא תקין' })
  code!: string;
}
