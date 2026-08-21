import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DressCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeHashtags,
  normalizeSizes,
  resolveBridesmaidSetCount,
} from './dress-normalize';
import { CreateDressDto } from './dto/create-dress.dto';
import { UpdateDressDto } from './dto/update-dress.dto';
import { UpdateDressStatusDto } from './dto/dress-admin.dto';
import {
  BrowseDressesDto,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  SortKey,
} from './dto/browse-dresses.dto';
import { AiPhotoError, AiPhotoService } from './ai-photo.service';
import { StorageService } from './storage.service';
import { MailService } from '../common/mail.service';
import { approvedMail, rejectedMail } from './dress-status-mail';

export interface StatusNotification {
  emailSent: boolean;
  emailError?: string;
}

export interface ClientDressPhoto {
  id: string;
  url: string;
  isAiGenerated: boolean;
}

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
  sizes: string[];
  category: DressCategory;
  bridesmaidSetCount: number | null;
  hashtags: string[];
  phone: string | null;
  email: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: number;
  images: string[];
  photos: ClientDressPhoto[];
  booked: string[];
  notification?: StatusNotification;
}

export type PublicDress = Omit<ClientDress, 'phone' | 'email' | 'photos' | 'notification'>;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AiGenerationResult {
  sourceImageId: string;
  generatedImageUrl: string | null;
  status: 'success' | 'error';
  error?: string;
}

const CLIENT_INCLUDE = {
  images: { orderBy: { order: 'asc' } },
  availability: { orderBy: { date: 'asc' } },
} satisfies Prisma.DressInclude;

type DressWithRelations = Prisma.DressGetPayload<{ include: typeof CLIENT_INCLUDE }>;

const JOIN = { relationLoadStrategy: 'join' } as const;

export const MAX_GALLERY_IMAGES = 8;

const BROWSE_CACHE_TTL_MS = 60_000;

const CACHEABLE_PAGES = 3;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

@Injectable()
export class DressesService {
  private readonly logger = new Logger(DressesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiPhoto: AiPhotoService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  private browseCache = new Map<string, { data: Page<PublicDress>; expiresAt: number }>();

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
      sizes: d.sizes,
      category: d.category,
      bridesmaidSetCount: d.bridesmaidSetCount,
      hashtags: d.hashtags,
      phone: d.phone,
      email: d.email,
      status: d.status,
      rejectReason: d.rejectReason,
      createdAt: d.createdAt.getTime(),
      images: d.images.map((img) => img.url),
      photos: d.images.map((img) => ({
        id: img.id,
        url: img.url,
        isAiGenerated: img.isAiGenerated,
      })),
      booked: d.availability
        .filter((a) => a.status === 'unavailable')
        .map((a) => toDateKey(a.date)),
    };
  }

  private toPublic(d: DressWithRelations): PublicDress {
    const { phone: _phone, email: _email, photos: _photos, ...pub } = this.toClient(d);
    return pub;
  }

  private buildBrowseWhere(q: BrowseDressesDto): Prisma.DressWhereInput {
    const where: Prisma.DressWhereInput = { status: 'approved' };

    if (q.colors?.length) where.color = { in: q.colors };
    if (q.sizes?.length) where.sizes = { hasSome: q.sizes };
    if (q.categories?.length) where.category = { in: q.categories };
    if (q.regions?.length) where.region = { in: q.regions };
    if (q.dressLengths?.length) where.dressLength = { in: q.dressLengths };
    if (q.sleeveLengths?.length) where.sleeveLength = { in: q.sleeveLengths };
    if (q.source && q.source !== 'all') where.source = q.source;

    const price: Prisma.FloatFilter = {};
    if (q.minPrice !== undefined) price.gte = q.minPrice;
    if (q.maxPrice !== undefined) price.lte = q.maxPrice;
    if (price.gte !== undefined || price.lte !== undefined) where.price = price;

    if (q.q) {
      const contains = { contains: q.q, mode: Prisma.QueryMode.insensitive };
      where.OR = [
        { title: contains },
        { desc: contains },
        { color: contains },
        { region: contains },
        { hashtags: { has: normalizeHashtags([q.q])[0] ?? q.q } },
      ];
    }

    return where;
  }

  private browseOrderBy(sort?: SortKey): Prisma.DressOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { id: 'asc' }];
      case 'oldest':
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  private browseCacheKey(q: BrowseDressesDto, page: number, limit: number): string | null {
    const filtered =
      !!q.q ||
      !!q.colors?.length ||
      !!q.sizes?.length ||
      !!q.categories?.length ||
      !!q.regions?.length ||
      !!q.dressLengths?.length ||
      !!q.sleeveLengths?.length ||
      q.minPrice !== undefined ||
      q.maxPrice !== undefined ||
      (!!q.source && q.source !== 'all');

    if (filtered) return null;
    if (page > CACHEABLE_PAGES) return null;
    if (limit !== DEFAULT_PAGE_LIMIT) return null;
    return `${q.sort ?? 'newest'}|${page}`;
  }

  async listPublic(query: BrowseDressesDto): Promise<Page<PublicDress>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);

    const cacheKey = this.browseCacheKey(query, page, limit);
    if (cacheKey) {
      const hit = this.browseCache.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) return hit.data;
    }

    try {
      const where = this.buildBrowseWhere(query);
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.dress.findMany({
          ...JOIN,
          where,
          orderBy: this.browseOrderBy(query.sort),
          skip: (page - 1) * limit,
          take: limit,
          include: CLIENT_INCLUDE,
        }),
        this.prisma.dress.count({ where }),
      ]);

      const result: Page<PublicDress> = {
        items: rows.map((d) => this.toPublic(d)),
        total,
        page,
        limit,
      };

      if (cacheKey) {
        this.browseCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + BROWSE_CACHE_TTL_MS,
        });
      }
      return result;
    } catch {
      throw new InternalServerErrorException('Failed to load dresses');
    }
  }

  async listPublicByIds(ids: string[]): Promise<PublicDress[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.dress.findMany({
      ...JOIN,
      where: { id: { in: ids }, status: 'approved' },
      include: CLIENT_INCLUDE,
    });
    const byId = new Map(rows.map((d) => [d.id, d]));
    return ids.map((id) => byId.get(id)).filter(Boolean).map((d) => this.toPublic(d!));
  }

  async listByOwner(email: string): Promise<ClientDress[]> {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return [];
    const rows = await this.prisma.dress.findMany({
      ...JOIN,
      where: { email: normalized },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: CLIENT_INCLUDE,
    });
    return rows.map((d) => this.toClient(d));
  }

  async listForAdmin(
    status: string,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT,
    category?: DressCategory,
  ): Promise<Page<ClientDress> & { counts: Record<string, number> }> {
    const take = Math.min(limit, MAX_PAGE_LIMIT);
    const where: Prisma.DressWhereInput = status === 'all' ? {} : { status };
    if (category) where.category = category;

    const [[rows, total], grouped] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.dress.findMany({
          ...JOIN,
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * take,
          take,
          include: CLIENT_INCLUDE,
        }),
        this.prisma.dress.count({ where }),
      ]),
      this.prisma.dress.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;

    return { items: rows.map((d) => this.toClient(d)), total, page, limit: take, counts };
  }

  private invalidateBrowseCache(): void {
    this.browseCache.clear();
  }

  async getDressById(id: string): Promise<ClientDress> {
    const dress = await this.prisma.dress.findUnique({
      ...JOIN,
      where: { id },
      include: CLIENT_INCLUDE,
    });
    if (!dress) throw new NotFoundException('השמלה לא נמצאה');
    return this.toClient(dress);
  }

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

    const sizes = normalizeSizes(fields.sizes);
    const hashtags = normalizeHashtags(fields.hashtags);
    const bridesmaidSetCount = resolveBridesmaidSetCount(
      fields.category,
      fields.bridesmaidSetCount,
    );

    const created = await this.prisma.dress.create({
      data: {
        ...fields,
        sizes,
        hashtags,
        bridesmaidSetCount,
        email,
        ownerId: owner.id,
        images: images?.length
          ? { create: images.map((url, order) => ({ url, order })) }
          : undefined,
      },
      include: CLIENT_INCLUDE,
    });
    this.invalidateBrowseCache();
    return this.toClient(created);
  }

  async updateDress(id: string, dto: UpdateDressDto): Promise<ClientDress> {
    const existing = await this.prisma.dress.findUnique({
      where: { id },
      select: { category: true, bridesmaidSetCount: true },
    });
    if (!existing) throw new NotFoundException('השמלה לא נמצאה');

    const { images, bridesmaidSetCount: incoming, ...fields } = dto;

    if (fields.sizes) fields.sizes = normalizeSizes(fields.sizes);
    if (fields.hashtags) fields.hashtags = normalizeHashtags(fields.hashtags);

    const effectiveCategory = fields.category ?? existing.category;
    const bridesmaidSetCount = resolveBridesmaidSetCount(
      effectiveCategory,
      incoming === undefined ? existing.bridesmaidSetCount : incoming,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      if (images) {
        const previous = await tx.dressImage.findMany({
          where: { dressId: id },
          select: { url: true, isAiGenerated: true },
        });
        const aiUrls = new Set(
          previous.filter((p) => p.isAiGenerated).map((p) => p.url),
        );

        await tx.dressImage.deleteMany({ where: { dressId: id } });
        await tx.dressImage.createMany({
          data: images.map((url, order) => ({
            dressId: id,
            url,
            order,
            isAiGenerated: aiUrls.has(url),
          })),
        });
      }
      return tx.dress.update({
        where: { id },
        data: { ...fields, bridesmaidSetCount },
        include: CLIENT_INCLUDE,
      });
    });
    this.invalidateBrowseCache();
    return this.toClient(updated);
  }

  async updateStatus(id: string, dto: UpdateDressStatusDto): Promise<ClientDress> {
    const before = await this.prisma.dress.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!before) throw new NotFoundException('שמלה לא נמצאה');

    const updated = await this.prisma.dress.update({
      where: { id },
      data: {
        status: dto.status,
        rejectReason: dto.status === 'rejected' ? dto.rejectReason ?? '' : null,
      },
      include: CLIENT_INCLUDE,
    });
    this.invalidateBrowseCache();

    const client = this.toClient(updated);
    const notification = await this.notifyStatusDecision(before.status, client);
    return notification ? { ...client, notification } : client;
  }

  private async notifyStatusDecision(
    previousStatus: string,
    dress: ClientDress,
  ): Promise<StatusNotification | undefined> {
    const status = dress.status;
    if (status !== 'approved' && status !== 'rejected') return undefined;
    if (status === previousStatus) return undefined;

    if (!dress.email) {
      this.logger.error(
        `Dress ${dress.id} moved to "${status}" but carries no email on the listing — nobody was notified.`,
      );
      return { emailSent: false, emailError: 'למודעה אין כתובת אימייל — לא נשלחה הודעה' };
    }

    const message =
      status === 'approved'
        ? approvedMail(dress.email, { id: dress.id, title: dress.title })
        : rejectedMail(dress.email, {
            id: dress.id,
            title: dress.title,
            rejectReason: dress.rejectReason,
          });

    const result = await this.mail.send(message);
    if (result.sent) {
      this.logger.log(`Dress ${dress.id} → ${status}: notified ${dress.email}`);
      return { emailSent: true };
    }
    this.logger.error(
      `Dress ${dress.id} → ${status}: the lister was NOT notified (${result.error ?? 'unknown error'}).`,
    );
    return { emailSent: false, emailError: result.error };
  }

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
    this.invalidateBrowseCache();
    return this.getDressById(id);
  }

  async generateAiPhotos(
    dressId: string,
    imageIds: string[],
  ): Promise<AiGenerationResult[]> {
    const dress = await this.prisma.dress.findUnique({
      where: { id: dressId },
      include: { images: true },
    });
    if (!dress) throw new NotFoundException('השמלה לא נמצאה');

    const byId = new Map(dress.images.map((img) => [img.id, img]));
    const sources = imageIds.map((id) => {
      const img = byId.get(id);
      if (!img) {
        throw new BadRequestException('אחת התמונות שנבחרו לא שייכת לשמלה הזו');
      }
      return img;
    });

    const results: AiGenerationResult[] = await Promise.all(
      sources.map(async (src): Promise<AiGenerationResult> => {
        try {
          const generatedUrl = await this.aiPhoto.generateModelPhoto(
            src.url,
            dressId,
          );
          const storedUrl = await this.storage.uploadFromUrl(generatedUrl, dressId);
          return {
            sourceImageId: src.id,
            generatedImageUrl: storedUrl,
            status: 'success',
          };
        } catch (err) {
          const message =
            err instanceof AiPhotoError
              ? err.message
              : (err as { message?: string })?.message || 'יצירת התמונה נכשלה';
          this.logger.warn(
            `AI photo generation failed for image ${src.id} on dress ${dressId}: ${message}`,
          );
          return {
            sourceImageId: src.id,
            generatedImageUrl: null,
            status: 'error',
            error: message,
          };
        }
      }),
    );

    const generatedUrls = results
      .filter((r) => r.status === 'success' && r.generatedImageUrl)
      .map((r) => r.generatedImageUrl as string);

    if (generatedUrls.length > 0) {
      const asCover = imageIds.length === 1;
      await this.prisma.$transaction(async (tx) => {
        if (asCover) {
          await tx.dressImage.updateMany({
            where: { dressId },
            data: { order: { increment: 1 } },
          });
          await tx.dressImage.create({
            data: {
              dressId,
              url: generatedUrls[0],
              order: 0,
              isAiGenerated: true,
            },
          });
          return;
        }

        const last = await tx.dressImage.findFirst({
          where: { dressId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        const start = (last?.order ?? -1) + 1;
        await tx.dressImage.createMany({
          data: generatedUrls.map((url, i) => ({
            dressId,
            url,
            order: start + i,
            isAiGenerated: true,
          })),
        });
      });
    }

    this.invalidateBrowseCache();
    return results;
  }

  async countInquiries(dressId: string): Promise<number> {
    return this.prisma.bookingInquiry.count({ where: { dressId } });
  }

  async deleteDress(id: string, requesterEmail: string): Promise<void> {
    const dress = await this.prisma.dress.findUnique({
      where: { id },
      select: { id: true, email: true, images: { select: { url: true } } },
    });
    if (!dress) throw new NotFoundException('השמלה לא נמצאה');

    const owner = (dress.email || '').trim().toLowerCase();
    const requester = (requesterEmail || '').trim().toLowerCase();
    if (!owner || owner !== requester) {
      throw new ForbiddenException('אפשר למחוק רק מודעות שפרסמת');
    }

    await Promise.all(dress.images.map((img) => this.storage.deleteByPublicUrl(img.url)));

    await this.prisma.dress.delete({ where: { id } });
    this.invalidateBrowseCache();
  }

  async deleteAllByOwner(ownerId: string): Promise<void> {
    const dresses = await this.prisma.dress.findMany({
      where: { ownerId },
      select: { images: { select: { url: true } } },
    });
    await Promise.all(
      dresses.flatMap((d) =>
        d.images.map((img) => this.storage.deleteByPublicUrl(img.url)),
      ),
    );
    await this.prisma.dress.deleteMany({ where: { ownerId } });
    this.invalidateBrowseCache();
  }

  async removeImage(dressId: string, imageId: string): Promise<ClientDress> {
    const images = await this.prisma.dressImage.findMany({
      where: { dressId },
      orderBy: { order: 'asc' },
      select: { id: true, url: true },
    });
    if (images.length === 0) throw new NotFoundException('השמלה לא נמצאה');

    const target = images.find((img) => img.id === imageId);
    if (!target) throw new NotFoundException('התמונה לא נמצאה');

    if (images.length === 1) {
      throw new BadRequestException(
        'לא ניתן למחוק את התמונה האחרונה — לכל שמלה חייבת להיות לפחות תמונה אחת',
      );
    }

    await this.storage.deleteByPublicUrl(target.url);

    const remaining = images.filter((img) => img.id !== imageId);
    await this.prisma.$transaction([
      this.prisma.dressImage.delete({ where: { id: imageId } }),
      ...remaining.map((img, order) =>
        this.prisma.dressImage.update({ where: { id: img.id }, data: { order } }),
      ),
    ]);

    this.invalidateBrowseCache();
    return this.getDressById(dressId);
  }

  async addImage(dressId: string, url: string): Promise<ClientDress> {
    await this.assertDressExists(dressId);

    const last = await this.prisma.dressImage.findFirst({
      where: { dressId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const count = await this.prisma.dressImage.count({ where: { dressId } });
    if (count >= MAX_GALLERY_IMAGES) {
      throw new BadRequestException(
        `הגלריה מלאה — עד ${MAX_GALLERY_IMAGES} תמונות לשמלה`,
      );
    }

    await this.prisma.dressImage.create({
      data: { dressId, url, order: (last?.order ?? -1) + 1 },
    });
    this.invalidateBrowseCache();
    return this.getDressById(dressId);
  }

  async getSimilarDresses(id: string, limit = 4): Promise<PublicDress[]> {
    const current = await this.prisma.dress.findUnique({
      where: { id },
      select: { color: true, source: true },
    });
    if (!current) throw new NotFoundException('השמלה לא נמצאה');

    const or: Prisma.DressWhereInput[] = [{ source: current.source }];
    if (current.color !== null) or.push({ color: current.color });

    const similar = await this.prisma.dress.findMany({
      ...JOIN,
      where: { id: { not: id }, status: 'approved', OR: or },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: CLIENT_INCLUDE,
    });
    return similar.map((d) => this.toPublic(d));
  }

  private async assertDressExists(id: string): Promise<void> {
    const count = await this.prisma.dress.count({ where: { id } });
    if (count === 0) throw new NotFoundException('השמלה לא נמצאה');
  }
}
