import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { AiGenerationResult, DressesService } from './dresses.service';
import { AiGenerateDto } from './dto/ai-generate.dto';

/**
 * Admin-only operations on a dress that don't belong on the public
 * `api/dresses` controller.
 *
 * Separate controller rather than another route on DressesController because
 * the path prefix differs (`api/admin/dresses`), which keeps the admin surface
 * greppable and means AdminGuard is declared once at the class level — no risk
 * of a future route on this controller shipping unguarded.
 *
 * Note the `api/` prefix: main.ts sets no global prefix, so every controller in
 * this codebase carries it. The brief wrote the path as
 * `/admin/dresses/:dressId/ai-generate`; it's mounted at
 * `/api/admin/dresses/:dressId/ai-generate` to match the existing convention
 * (and `api/admin/login`, which the same admin screen already calls).
 */
@ApiTags('admin')
@Controller('api/admin/dresses')
@UseGuards(AdminGuard)
export class AdminDressesController {
  constructor(private readonly service: DressesService) {}

  /**
   * Generate model photos from selected listing photos.
   *
   * Always 200 when the request itself is well-formed, even if every
   * generation failed — the per-image `status` field is the result channel, so
   * the admin UI can badge the thumbnails that worked and show an inline error
   * on the ones that didn't. Throwing on partial failure would throw away the
   * successes, which have already been paid for and saved.
   */
  @Post(':dressId/ai-generate')
  @ApiOperation({
    summary: 'Admin: turn selected listing photos into AI on-model photos',
  })
  aiGenerate(
    @Param('dressId') dressId: string,
    @Body() dto: AiGenerateDto,
  ): Promise<AiGenerationResult[]> {
    return this.service.generateAiPhotos(dressId, dto.imageIds);
  }
}
