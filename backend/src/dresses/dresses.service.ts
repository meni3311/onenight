import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import {
  DressDetailDto,
  DressSummaryDto,
  AvailabilityResultDto,
} from './dto/dress-detail.dto';
import { UnavailableDateRange } from './types/dress.types';

/** Default number of similar dresses returned by the rail. */
const DEFAULT_SIMILAR_LIMIT = 4;

@Injectable()
export class DressesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full dress detail with sizes, ordered images and reviews. */
  async getDressById(id: string): Promise<DressDetailDto> {
    try {
      const dress = await this.prisma.dress.findUnique({
        where: { id },
        include: {
          sizes: true,
          images: { orderBy: { order: 'asc' } },
          reviews: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!dress) {
        throw new NotFoundException(`Dress ${id} not found`);
      }

      return {
        id: dress.id,
        name: dress.name,
        description: dress.description,
        price: dress.price,
        fabric: dress.fabric,
        color: dress.color,
        length: dress.length,
        designer: dress.designer,
        source: dress.source,
        condition: dress.condition,
        sizes: dress.sizes.map((s) => ({
          id: s.id,
          size: s.size,
          available: s.available,
        })),
        images: dress.images.map((img) => ({
          id: img.id,
          url: img.url,
          order: img.order,
        })),
        reviews: dress.reviews.map((r) => ({
          id: r.id,
          reviewer: r.reviewer,
          rating: r.rating,
          text: r.text,
          sizeWorn: r.sizeWorn,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to load dress');
    }
  }

  /** Booked ranges for a dress, ascending by start date. */
  async getUnavailableDates(dressId: string): Promise<UnavailableDateRange[]> {
    try {
      await this.assertDressExists(dressId);

      const bookings = await this.prisma.booking.findMany({
        where: { dressId },
        select: { startDate: true, endDate: true },
        orderBy: { startDate: 'asc' },
      });

      return bookings.map((b) => ({ start: b.startDate, end: b.endDate }));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to load unavailable dates');
    }
  }

  /**
   * A dress+size is available for a range when the size is offered and marked
   * available, and no existing booking overlaps the requested window.
   */
  async checkAvailability(
    dressId: string,
    dto: CheckAvailabilityDto,
  ): Promise<AvailabilityResultDto> {
    try {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);

      const dress = await this.prisma.dress.findUnique({
        where: { id: dressId },
        include: { sizes: true },
      });

      if (!dress) {
        throw new NotFoundException(`Dress ${dressId} not found`);
      }

      const sizeOffered = dress.sizes.some(
        (s) => s.size === dto.size && s.available,
      );
      if (!sizeOffered) {
        return { available: false };
      }

      // Overlap when an existing booking starts on/before our end and ends
      // on/after our start.
      const overlapping = await this.prisma.booking.count({
        where: {
          dressId,
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });

      return { available: overlapping === 0 };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to check availability');
    }
  }

  /** Dresses sharing the current dress's colour or source, excluding itself. */
  async getSimilarDresses(
    dressId: string,
    limit: number = DEFAULT_SIMILAR_LIMIT,
  ): Promise<DressSummaryDto[]> {
    try {
      const current = await this.prisma.dress.findUnique({
        where: { id: dressId },
        select: { color: true, source: true },
      });

      if (!current) {
        throw new NotFoundException(`Dress ${dressId} not found`);
      }

      const orFilters: Prisma.DressWhereInput[] = [{ source: current.source }];
      if (current.color !== null) {
        orFilters.push({ color: current.color });
      }

      const similar = await this.prisma.dress.findMany({
        where: {
          id: { not: dressId },
          OR: orFilters,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { images: { orderBy: { order: 'asc' } } },
      });

      return similar.map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        images: d.images.map((img) => ({
          id: img.id,
          url: img.url,
          order: img.order,
        })),
      }));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to load similar dresses');
    }
  }

  private async assertDressExists(id: string): Promise<void> {
    const count = await this.prisma.dress.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Dress ${id} not found`);
    }
  }
}
