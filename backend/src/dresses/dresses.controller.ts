import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { DressesService, ClientDress, Page, PublicDress } from './dresses.service';
import { StorageService, UploadedImage } from './storage.service';
import { BrowseDressesDto, DressIdsDto } from './dto/browse-dresses.dto';
import { CreateDressDto } from './dto/create-dress.dto';
import { UpdateDressDto } from './dto/update-dress.dto';
import { ToggleBookedDateDto, UpdateDressStatusDto } from './dto/dress-admin.dto';
import { DeleteDressDto } from './dto/delete-dress.dto';

@ApiTags('dresses')
@Controller('dresses')
export class DressesController {
  constructor(
    private readonly service: DressesService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Browse approved dresses — paginated, filtered, sorted' })
  listDresses(@Query() query: BrowseDressesDto): Promise<Page<PublicDress>> {
    return this.service.listPublic(query);
  }

  @Get('by-ids')
  @ApiOperation({ summary: 'Approved dresses by id, in the order requested' })
  listByIds(@Query() query: DressIdsDto): Promise<PublicDress[]> {
    return this.service.listPublicByIds(query.ids ?? []);
  }

  @Get('mine')
  @ApiOperation({ summary: "An owner's own listings, by email" })
  listMine(@Query('email') email: string): Promise<ClientDress[]> {
    return this.service.listByOwner(email);
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload a listing photo to Cloudflare R2' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: UploadedImage,
    @Query('dressId') dressId?: string,
  ): Promise<{ url: string }> {
    const url = await this.storage.uploadDressImage(file, dressId || 'pending');
    return { url };
  }

  @Post()
  @ApiOperation({ summary: 'Publish a new dress listing (starts as pending)' })
  createDress(@Body() dto: CreateDressDto): Promise<ClientDress> {
    return this.service.createDress(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one dress' })
  getDressById(@Param('id') id: string): Promise<ClientDress> {
    return this.service.getDressById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Edit a listing's fields and/or replace its images" })
  updateDress(
    @Param('id') id: string,
    @Body() dto: UpdateDressDto,
  ): Promise<ClientDress> {
    return this.service.updateDress(id, dto);
  }

  @Patch(':id/booked')
  @ApiOperation({ summary: 'Toggle one day on the availability calendar' })
  toggleBooked(
    @Param('id') id: string,
    @Body() dto: ToggleBookedDateDto,
  ): Promise<ClientDress> {
    return this.service.toggleBookedDate(id, dto.key);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: approve or reject a listing' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDressStatusDto,
  ): Promise<ClientDress> {
    return this.service.updateStatus(id, dto);
  }

  @Get(':id/inquiry-count')
  @ApiOperation({ summary: 'Number of booking inquiries referencing this dress' })
  async getInquiryCount(@Param('id') id: string): Promise<{ count: number }> {
    return { count: await this.service.countInquiries(id) };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: "Owner: delete their own listing and its photos" })
  async deleteDress(
    @Param('id') id: string,
    @Body() dto: DeleteDressDto,
  ): Promise<void> {
    await this.service.deleteDress(id, dto.email);
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Similar approved dresses (same colour or source)' })
  getSimilarDresses(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ): Promise<PublicDress[]> {
    return this.service.getSimilarDresses(id, limit);
  }
}
