import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Trim before validating, so "  " fails MinLength instead of passing it. */
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body of POST /api/contact-inquiries — the "צור קשר" form.
 *
 * Public and unauthenticated: anyone can send this, and the email address is
 * whatever they typed rather than anything verified. The length caps are the
 * only thing standing between this endpoint and a table full of junk, so they
 * are deliberately tight-ish and enforced here rather than in the database.
 */
export class CreateContactInquiryDto {
  @ApiProperty({ example: 'נועה לוי', maxLength: 120 })
  @Transform(trim)
  @IsString({ message: 'נא להזין שם' })
  @MinLength(1, { message: 'נא להזין שם' })
  @MaxLength(120, { message: 'השם ארוך מדי' })
  name!: string;

  @ApiProperty({ example: 'noa@example.com', maxLength: 254 })
  @Transform(trim)
  // 254 is the maximum length of an email address per RFC 5321.
  @MaxLength(254, { message: 'כתובת האימייל ארוכה מדי' })
  @IsEmail({}, { message: 'כתובת האימייל אינה תקינה' })
  email!: string;

  @ApiProperty({ maxLength: 2000 })
  @Transform(trim)
  @IsString({ message: 'נא לכתוב הודעה' })
  @MinLength(1, { message: 'נא לכתוב הודעה' })
  @MaxLength(2000, { message: 'ההודעה ארוכה מדי (עד 2000 תווים)' })
  message!: string;
}
