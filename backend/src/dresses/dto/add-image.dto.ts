import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

/**
 * One already-uploaded photo to append to a listing's gallery.
 *
 * A URL, not the bytes: the file is uploaded through the existing
 * `POST /api/dresses/images` route first, and only the resulting public URL
 * is recorded here. Same split the publish form already uses.
 */
export class AddImageDto {
  @ApiProperty({ description: 'Public URL of an uploaded image' })
  @IsUrl({ require_tld: false }, { message: 'כתובת תמונה לא תקינה' })
  url!: string;
}
