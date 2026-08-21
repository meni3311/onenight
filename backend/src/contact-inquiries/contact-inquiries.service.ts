import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContactInquiry, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

@Injectable()
export class ContactInquiriesService {
  private readonly logger = new Logger(ContactInquiriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactInquiryDto): Promise<ContactInquiry> {
    const row = await this.prisma.contactInquiry.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        message: dto.message,
      },
    });
    this.logger.log(`contact inquiry ${row.id} received from ${row.email}`);
    return row;
  }

  list(): Promise<ContactInquiry[]> {
    return this.prisma.contactInquiry.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async setHandled(id: string, handled: boolean): Promise<ContactInquiry> {
    try {
      return await this.prisma.contactInquiry.update({ where: { id }, data: { handled } });
    } catch (err) {
      throw this.notFoundOrRethrow(err, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.contactInquiry.delete({ where: { id } });
    } catch (err) {
      throw this.notFoundOrRethrow(err, id);
    }
  }

  private notFoundOrRethrow(err: unknown, id: string): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return new NotFoundException(`פנייה ${id} לא נמצאה`);
    }
    return err;
  }
}
