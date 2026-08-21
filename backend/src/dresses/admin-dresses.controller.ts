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

@ApiTags('admin')
@Controller('admin/dresses')
@UseGuards(AdminGuard)
export class AdminDressesController {
  constructor(private readonly service: DressesService) {}

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

  @Post(':dressId/images')
  @ApiOperation({ summary: "Admin: add an uploaded photo to a dress's gallery" })
  addImage(
    @Param('dressId') dressId: string,
    @Body() dto: AddImageDto,
  ): Promise<ClientDress> {
    return this.service.addImage(dressId, dto.url);
  }

  @Delete(':dressId/images/:imageId')
  @ApiOperation({ summary: "Admin: delete one photo from a dress's gallery" })
  removeImage(
    @Param('dressId') dressId: string,
    @Param('imageId') imageId: string,
  ): Promise<ClientDress> {
    return this.service.removeImage(dressId, imageId);
  }
}
