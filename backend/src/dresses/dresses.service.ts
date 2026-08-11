import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDressDto } from './dto/create-dress.dto';
import { UpdateDressDto } from './dto/update-dress.dto';
import { UpdateDressStatusDto } from './dto/dress-admin.dto';

/**
 * The dress object the frontend consumes. Field-for-field what the old
 * localStorage mock returned (frontend/src/lib/api.js), so App.jsx,
 * AccountPage and AdminPage needed no reshaping when the mock was removed:
 *   - `images` is a flat array of public URLs, not DressImage rows
 *   - `booked` is a flat array of "YYYY-MM-DD" strings, not availability rows
 *   - `createdAt` is epoch millis, because App.jsx sorts on it numerically
 */
export interface ClientDress {
  id: string;
  title: string;
  desc: string | null;
  price: number;
  fabric: string | null;
  color: string | null;
  colorHex: string | null;
  designer: string | null;
  source: string;
  store: string | null;
  condition: string;
  dressLength: string;
  sleeveLength: string;
  city: string | null;
  region: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: number;
  images: string[];
  booked: string[];
}

/** Everything the client shape needs, in one query. */
const CLIENT_INCLUDE = {
  images: { orderBy: { order: 'asc' } },
  availability: { orderBy: { date: 'asc' } },
} satisfies Prisma.DressInclude;

type DressWithRelations = Prisma.DressGetPayload<{ include: typeof CLIENT_INCLUDE }>;

/** `Date` -> "YYYY-MM-DD", in UTC so a day never shifts across timezones. */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * "YYYY-MM-DD" -> midnight UTC. Parsing as UTC (rather than `new Date(key)`
 * in server-local time) keeps the round-trip through toDateKey stable
 * regardless of where the API happens to be running.
 */
function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

@Injectable()
export class DressesService {
  constructor(private readonly prisma: PrismaService) {}

  private toClient(d: DressWithRelations): ClientDress {
    return {
      id: d.id,
      title: d.title,
      desc: d.desc,
      price: d.price,
      fabric: d.fabric,
      color: d.color,
      colorHex: d.colorHex,
      designer: d.designer,
      source: d.source,
      store: d.store,
      condition: d.condition,
      dressLength: d.dressLength,
      sleeveLength: d.sleeveLength,
      city: d.city,
      region: d.region,
      size: d.size,
      phone: d.phone,
      email: d.email,
      status: d.status,
      rejectReason: d.rejectReason,
      createdAt: d.createdAt.getTime(),
      images: d.images.map((img) => img.url),
      booked: d.availability
        .filter((a) => a.status === 'unavailable')
        .map((a) => toDateKey(a.date)),
    };
  }

  /**
   * Browse list. `status` is "approved" (default), a specific status, or
   * "all" for the admin queue and the owner's own listings — which include
   * pending and rejected ones.
   */
  async listDresses(status = 'approved'): Promise<ClientDress[]> {
    try {
      const dresses = await this.prisma.dress.findMany({
        where: status === 'all' ? {} : { status },
        orderBy: { createdAt: 'desc' },
        include: CLIENT_INCLUDE,
      });
      return dresses.map((d) => this.toClient(d));
    } catch {
      throw new InternalServerErrorException('Failed to load dresses');
    }
  }

  async getDressById(id: string): Promise<ClientDress> {
    const dress = await this.prisma.dress.findUnique({
      where: { id },
      include: CLIENT_INCLUDE,
    });
    if (!dress) throw new NotFoundException('השמלה לא נמצאה');
    return this.toClient(dress);
  }

  /**
   * Create a listing. The owner is resolved from `email` rather than trusted
   * from the body, so a client can't attach a listing to another account.
   * Status always starts "pending" (schema default) — the approval flow is
   * unchanged.
   */
  async createDress(dto: CreateDressDto): Promise<ClientDress> {
    const email = dto.email.trim().toLowerCase();
    const owner = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!owner) {
      throw new BadRequestException(
        'לא נמצא משתמש עם כתובת המייל הזו — יש להתחבר לפני פרסום שמלה',
      );
    }

    const { images, email: _ignored, ...fields } = dto;

    const created = await this.prisma.dress.create({
      data: {
        ...fields,
        email,
        ownerId: owner.id,
        images: images?.length
          ? { create: images.map((url, order) => ({ url, order })) }
          : undefined,
      },
      include: CLIENT_INCLUDE,
    });
    return this.toClient(created);
  }

  /**
   * Owner edit. When `images` is supplied it replaces the whole set (the UI
   * edits the list as a unit, including reordering), so the old rows are
   * deleted and rewritten inside one transaction — a partial failure would
   * otherwise leave a listing with no photos.
   */
  async updateDress(id: string, dto: UpdateDressDto): Promise<ClientDress> {
    await this.assertDressExists(id);
    const { images, ...fields } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.dressImage.deleteMany({ where: { dressId: id } });
        await tx.dressImage.createMany({
          data: images.map((url, order) => ({ dressId: id, url, order })),
        });
      }
      return tx.dress.update({
        where: { id },
        data: fields,
        include: CLIENT_INCLUDE,
      });
    });
    return this.toClient(updated);
  }

  /** Admin approve/reject. Clears the reason whenever status isn't "rejected". */
  async updateStatus(id: string, dto: UpdateDressStatusDto): Promise<ClientDress> {
    await this.assertDressExists(id);
    const updated = await this.prisma.dress.update({
      where: { id },
      data: {
        status: dto.status,
        rejectReason: dto.status === 'rejected' ? dto.rejectReason ?? '' : null,
      },
      include: CLIENT_INCLUDE,
    });
    return this.toClient(updated);
  }

  /**
   * Toggle one day on the owner's availability calendar. A row's presence
   * means "blocked", so toggling off deletes it rather than flipping a flag —
   * matching the model's "absence means available" convention.
   */
  async toggleBookedDate(id: string, key: string): Promise<ClientDress> {
    await this.assertDressExists(id);
    const date = fromDateKey(key);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('תאריך לא תקין');
    }

    const existing = await this.prisma.dressAvailability.findUnique({
      where: { dressId_date: { dressId: id, date } },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.dressAvailability.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.dressAvailability.create({
        data: { dressId: id, date, status: 'unavailable' },
      });
    }
    return this.getDressById(id);
  }

  /** Dresses sharing this one's colour or source, excluding itself. */
  async getSimilarDresses(id: string, limit = 4): Promise<ClientDress[]> {
    const current = await this.prisma.dress.findUnique({
      where: { id },
      select: { color: true, source: true },
    });
    if (!current) throw new NotFoundException('השמלה לא נמצאה');

    const or: Prisma.DressWhereInput[] = [{ source: current.source }];
    if (current.color !== null) or.push({ color: current.color });

    const similar = await this.prisma.dress.findMany({
      where: { id: { not: id }, status: 'approved', OR: or },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: CLIENT_INCLUDE,
    });
    return similar.map((d) => this.toClient(d));
  }

  private async assertDressExists(id: string): Promise<void> {
    const count = await this.prisma.dress.count({ where: { id } });
    if (count === 0) throw new NotFoundException('השמלה לא נמצאה');
  }
}
