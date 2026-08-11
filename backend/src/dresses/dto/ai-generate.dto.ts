import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/**
 * Which of a listing's existing photos to run through AI photo generation.
 *
 * The cap of 6 is FASHN's, not ours: the account has a hard ceiling of 6
 * concurrent predictions, and the service fires every selected image at once,
 * so a 7th would come back 429 ConcurrencyLimitExceeded. It doubles as a cost
 * guard — each id is a separate metered generation — and sits comfortably
 * above any real listing's photo count.
 *
 * Keep this in step with MAX_PER_RUN in AiImaginePanel.jsx, which pre-empts
 * the same limit client-side, and with the poll-interval reasoning in
 * AiPhotoService (its rate-limit headroom assumes at most 6 in flight).
 */
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
