import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingInquiryDto } from './dto/create-booking-inquiry.dto';

@Injectable()
export class BookingInquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBookingInquiryDto) {
    return this.prisma.bookingInquiry.create({
      data: {
        renterId: dto.renterId,
        renterPhone: dto.renterPhone,
        dressId: dto.dressId,
        dressTitle: dto.dressTitle,
        ownerPhone: dto.ownerPhone,
        selectedStartDate: new Date(dto.selectedStartDate),
        selectedEndDate: new Date(dto.selectedEndDate),
      },
    });
  }

  list() {
    return this.prisma.bookingInquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.bookingInquiry.delete({ where: { id } });
  }
}
