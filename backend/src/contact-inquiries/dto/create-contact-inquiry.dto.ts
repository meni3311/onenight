import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContactInquiryDto {
  @ApiProperty({ example: 'נועה לוי', maxLength: 120 })
  @Transform(trim)
  @IsString({ message: 'נא להזין שם' })
  @MinLength(1, { message: 'נא להזין שם' })
  @MaxLength(120, { message: 'השם ארוך מדי' })
  name!: string;

  @ApiProperty({ example: 'noa@example.com', maxLength: 254 })
  @Transform(trim)
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
