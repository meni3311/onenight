import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class AddImageDto {
  @ApiProperty({ description: 'Public URL of an uploaded image' })
  @IsUrl({ require_tld: false }, { message: 'כתובת תמונה לא תקינה' })
  url!: string;
}
