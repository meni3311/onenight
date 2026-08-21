import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class DeleteDressDto {
  @ApiProperty({ description: "The requesting account's email address" })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;
}
