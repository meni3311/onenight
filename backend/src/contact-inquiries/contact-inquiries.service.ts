import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContactInquiry, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

/**
 * "צור קשר" messages.
 *
 * Storage and nothing more — no email is sent from here in either direction.
 * The visitor gets an on-page confirmation rather than an autoresponder, and
 * the admin reads the queue in the panel rather than being paged about it.
 * That's a deliberate floor, not an oversight: MailService is available if a
 * "new message" notification is wanted later, but every send is a thing that
 * can fail on a path that currently cannot.
 */
@Injectable()
export class ContactInquiriesService {
  private readonly logger = new Logger(ContactInquiriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactInquiryDto): Promise<ContactInquiry> {
    const row = await this.prisma.contactInquiry.create({
      data: {
        name: dto.name,
        // Normalized on write so "Noa@Example.com " and "noa@example.com"
        // don't read as two different people in the admin queue.
        email: dto.email.toLowerCase(),
        message: dto.message,
      },
    });
    /* No message body in the log — it's user content and the admin panel is
       where it belongs. The id is enough to correlate a support question with
       a row. */
    this.logger.log(`contact inquiry ${row.id} received from ${row.email}`);
    return row;
  }

  /** Admin queue: newest first, unhandled and handled together. */
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

  /**
   * Turn Prisma's P2025 ("record to update/delete does not exist") into a 404.
   *
   * Without this the admin panel gets a 500 for the entirely ordinary case of
   * two tabs open and the row already deleted in the other one.
   */
  private notFoundOrRethrow(err: unknown, id: string): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return new NotFoundException(`פנייה ${id} לא נמצאה`);
    }
    return err;
  }
}
