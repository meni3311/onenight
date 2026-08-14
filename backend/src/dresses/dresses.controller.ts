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
// The global 'api' prefix (see main.ts's app.setGlobalPrefix) supplies the
// leading /api — this controller only owns its own sub-path, so the full
// route is still /api/dresses/...
@Controller('dresses')
export class DressesController {
  constructor(
    private readonly service: DressesService,
    private readonly storage: StorageService,
  ) {}

  /**
   * The public browse list. Approved listings only, one page at a time,
   * filtered and sorted server-side, without owner contact details.
   *
   * This route used to take `?status=` and the frontend called it with `all`,
   * so every anonymous visitor's browser downloaded the entire moderation
   * queue — pending and rejected listings, each carrying its owner's phone
   * number and email — and then hid all of it client-side. There is now no
   * parameter that reaches a non-approved listing from here; the queue lives
   * behind AdminGuard on AdminDressesController. `status` is still accepted
   * and ignored so a stale client can't 400 — see BrowseDressesDto.
   */
  @Get()
  @ApiOperation({ summary: 'Browse approved dresses — paginated, filtered, sorted' })
  listDresses(@Query() query: BrowseDressesDto): Promise<Page<PublicDress>> {
    return this.service.listPublic(query);
  }

  /**
   * Resolve favourited ids to listings. Declared before `:id` for the same
   * reason "images" is — Nest matches in declaration order, and otherwise
   * "by-ids" would be read as a dress id.
   */
  @Get('by-ids')
  @ApiOperation({ summary: 'Approved dresses by id, in the order requested' })
  listByIds(@Query() query: DressIdsDto): Promise<PublicDress[]> {
    return this.service.listPublicByIds(query.ids ?? []);
  }

  /**
   * An owner's own listings, pending and rejected included, for the account
   * screen. Ownership is an email match — the same weak rule the delete
   * endpoint below uses, and the strongest one available until this app has
   * real sessions. See DressesService.listByOwner.
   */
  @Get('mine')
  @ApiOperation({ summary: "An owner's own listings, by email" })
  listMine(@Query('email') email: string): Promise<ClientDress[]> {
    return this.service.listByOwner(email);
  }

  /**
   * Upload one listing photo and get back its public URL. Declared before
   * `:id` routes — Nest matches in declaration order, so without this
   * "images" would be captured as a dress id.
   */
  @Post('images')
  @ApiOperation({ summary: 'Upload a listing photo to Supabase Storage' })
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

  /**
   * How many booking inquiries point at this listing. Read by the owner's
   * delete confirmation so it can say so before anything is destroyed.
   * Returns only a count — no renter details — so it needs no gate beyond
   * knowing the dress id.
   */
  @Get(':id/inquiry-count')
  @ApiOperation({ summary: 'Number of booking inquiries referencing this dress' })
  async getInquiryCount(@Param('id') id: string): Promise<{ count: number }> {
    return { count: await this.service.countInquiries(id) };
  }

  /**
   * Owner deletes their own listing. Not admin-gated — this is the
   * user-facing action, separate from any moderation tooling. Ownership is
   * checked in the service against the listing's email.
   */
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
