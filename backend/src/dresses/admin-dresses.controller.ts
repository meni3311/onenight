import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import {
  AiGenerationResult,
  ClientDress,
  DressesService,
  Page,
} from './dresses.service';
import { AiGenerateDto } from './dto/ai-generate.dto';
import { AddImageDto } from './dto/add-image.dto';
import { DEFAULT_PAGE_LIMIT } from './dto/browse-dresses.dto';
import { AdminListDressesDto } from './dto/dress-admin.dto';

/**
 * Admin-only operations on a dress that don't belong on the public
 * `api/dresses` controller.
 *
 * Separate controller rather than another route on DressesController because
 * the path prefix differs (`api/admin/dresses`), which keeps the admin surface
 * greppable and means AdminGuard is declared once at the class level — no risk
 * of a future route on this controller shipping unguarded.
 *
 * The global 'api' prefix (see main.ts's app.setGlobalPrefix) supplies the
 * leading /api. The brief wrote the path as
 * `/admin/dresses/:dressId/ai-generate`; it's mounted at
 * `/api/admin/dresses/:dressId/ai-generate` to match the existing convention
 * (and `api/admin/login`, which the same admin screen already calls).
 */
@ApiTags('admin')
@Controller('admin/dresses')
@UseGuards(AdminGuard)
export class AdminDressesController {
  constructor(private readonly service: DressesService) {}

  /**
   * The moderation queue — the only way to reach pending and rejected
   * listings.
   *
   * AdminGuard is declared at the class level here, so this route is gated
   * by construction: the password decides whether the queue is *sent*, not
   * merely whether it is rendered.
   *
   * Returns full ClientDress objects, contact details included — reaching the
   * lister is what the queue is for (the screen renders their phone and links
   * to WhatsApp). Declared before any `:dressId` route in this controller.
   */
  @Get()
  @ApiOperation({ summary: 'Admin: the moderation queue, paginated, with per-status counts' })
  list(
    @Query() query: AdminListDressesDto,
  ): Promise<Page<ClientDress> & { counts: Record<string, number> }> {
    return this.service.listForAdmin(
      query.status ?? 'pending',
      query.page ?? 1,
      query.limit ?? DEFAULT_PAGE_LIMIT,
      query.category,
    );
  }

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

  /**
   * Append a photo to the gallery. The bytes are uploaded separately through
   * `POST /api/dresses/images` first; this records the resulting URL.
   *
   * Both this and the delete below return the whole updated dress rather than
   * a bare 204, so the admin screen can re-render from one response instead of
   * following every mutation with a refetch.
   */
  @Post(':dressId/images')
  @ApiOperation({ summary: "Admin: add an uploaded photo to a dress's gallery" })
  addImage(
    @Param('dressId') dressId: string,
    @Body() dto: AddImageDto,
  ): Promise<ClientDress> {
    return this.service.addImage(dressId, dto.url);
  }

  /**
   * Remove one photo from the gallery and from Storage. Rejects an attempt to
   * remove the last remaining photo — see DressesService.removeImage.
   */
  @Delete(':dressId/images/:imageId')
  @ApiOperation({ summary: "Admin: delete one photo from a dress's gallery" })
  removeImage(
    @Param('dressId') dressId: string,
    @Param('imageId') imageId: string,
  ): Promise<ClientDress> {
    return this.service.removeImage(dressId, imageId);
  }
}
