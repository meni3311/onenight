import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { BookingInquiriesService } from './booking-inquiries.service';
import { CreateBookingInquiryDto } from './dto/create-booking-inquiry.dto';

// The global 'api' prefix (see main.ts's app.setGlobalPrefix) supplies the
// leading /api — the frontend's Vite dev proxy only forwards '/api/*' to
// this server, and that's still true: the full route stays
// /api/booking-inquiries.
@ApiTags('booking-inquiries')
@Controller('booking-inquiries')
export class BookingInquiriesController {
  constructor(private readonly service: BookingInquiriesService) {}

  @Post()
  @ApiOperation({
    summary:
      'Log a "להזמנה" button click. Called alongside the existing WhatsApp-open flow on the frontend, never in place of it.',
  })
  create(@Body() dto: CreateBookingInquiryDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: list all booking inquiries, newest first' })
  list() {
    return this.service.list();
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Admin: delete a booking inquiry record' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
