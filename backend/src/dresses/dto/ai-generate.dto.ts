import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AiGenerateDto {
  @ApiProperty({
    description: 'DressImage ids belonging to this dress',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'יש לבחור לפחות תמונה אחת' })
  @ArrayMaxSize(6, { message: 'ניתן לבחור עד 6 תמונות בבת אחת' })
  @IsString({ each: true })
  imageIds!: string[];
}
