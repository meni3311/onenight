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
