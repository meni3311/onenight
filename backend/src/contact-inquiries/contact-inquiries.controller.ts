import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactInquiry } from '@prisma/client';
import { AdminGuard } from '../common/admin.guard';
import { ContactInquiriesService } from './contact-inquiries.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { UpdateContactInquiryDto } from './dto/update-contact-inquiry.dto';

/**
 * The "צור קשר" page's message form, and the admin queue that reads it.
 *
 * The global 'api' prefix (main.ts) supplies the leading /api, so the routes
 * are /api/contact-inquiries and /api/contact-inquiries/:id — same shape as
 * booking-inquiries next door, and gated the same way: POST is public because
 * a contact form has to be, everything else is behind AdminGuard.
 */
@ApiTags('contact-inquiries')
@Controller('contact-inquiries')
export class ContactInquiriesController {
  constructor(private readonly service: ContactInquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'Submit the public "צור קשר" form' })
  create(@Body() dto: CreateContactInquiryDto): Promise<ContactInquiry> {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: every contact message, newest first' })
  list(): Promise<ContactInquiry[]> {
    return this.service.list();
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: mark a message handled / unhandled' })
  setHandled(
    @Param('id') id: string,
    @Body() dto: UpdateContactInquiryDto,
  ): Promise<ContactInquiry> {
    return this.service.setHandled(id, dto.handled);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Admin: delete a contact message' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
