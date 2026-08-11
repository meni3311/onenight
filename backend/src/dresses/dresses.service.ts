import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDressDto } from './dto/create-dress.dto';
import { UpdateDressDto } from './dto/update-dress.dto';
import { UpdateDressStatusDto } from './dto/dress-admin.dto';
import { AiPhotoError, AiPhotoService } from './ai-photo.service';
import { StorageService } from './storage.service';

/**
 * The dress object the frontend consumes. Field-for-field what the old
 * localStorage mock returned (frontend/src/lib/api.js), so App.jsx,
 * AccountPage and AdminPage needed no reshaping when the mock was removed:
 *   - `images` is a flat array of public URLs, not DressImage rows
 *   - `booked` is a flat array of "YYYY-MM-DD" strings, not availability rows
 *   - `createdAt` is epoch millis, because App.jsx sorts on it numerically
 *
 * `photos` is the one addition to that shape. It carries the same images in
 * the same order, but with their row ids and `isAiGenerated` flags — the admin
 * AI photo grid needs to address individual images by id, which flat URLs
 * can't express. `images` is deliberately kept alongside it rather than
 * replaced: every browse/detail consumer (App.jsx, the cards, ProductPage)
 * reads `images[0]` and iterates `images`, and none of them care about ids.
 */

/** One listing photo, with the identity the admin grid needs. */
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
  size: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: number;
  images: string[];
  photos: ClientDressPhoto[];
  booked: string[];
}

/** One entry in the AI generation response — one per requested source image. */
export interface AiGenerationResult {
  sourceImageId: string;
  generatedImageUrl: string | null;
  status: 'success' | 'error';
  error?: string;
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
  private readonly logger = new Logger(DressesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiPhoto: AiPhotoService,
    private readonly storage: StorageService,
  ) {}

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
   *
   * The delete-and-rewrite means row ids are not stable across an edit. That's
   * fine for the URLs themselves, but it would silently drop the
   * `isAiGenerated` flag on any generated photo the admin merely reordered, so
   * the flag is carried across by URL — the one piece of per-row state the
   * incoming flat `string[]` can't express.
   */
  async updateDress(id: string, dto: UpdateDressDto): Promise<ClientDress> {
    await this.assertDressExists(id);
    const { images, ...fields } = dto;

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

  /**
   * Admin-only: turn selected listing photos into AI on-model photos and save
   * the results as photos on this listing.
   *
   * Placement of the results is deliberately conditional on how many photos
   * the admin picked, which is the whole point of the feature:
   *
   *   - exactly one selected → the generated photo becomes the cover, because
   *     picking a single photo is the admin saying "this listing's thumbnail
   *     is bad, fix it". Cover means order 0 (see the note on DressImage in
   *     schema.prisma); the existing photos shift down and none are removed,
   *     so the original is still there if the generation looks wrong.
   *   - more than one → results are appended and the cover is left alone,
   *     because a multi-select is the admin filling out the gallery, and
   *     silently promoting an arbitrary one of several results would be a
   *     coin flip.
   *
   * Note the branch tests the number *selected*, not the number that
   * succeeded: if the admin picks one photo and it fails, nothing is written
   * and the cover stays put.
   *
   * Generation runs concurrently, one prediction per image (the provider takes
   * a single product image; batching is not on the table), and every call is
   * settled independently — one failure returns an error for that photo and
   * leaves the rest to save normally. A partial batch is a real outcome here,
   * not an error state, so the endpoint still returns 200 with per-image
   * statuses.
   *
   * The whole selection is fired at once, so the batch size is capped at the
   * provider's concurrency ceiling — see AiGenerateDto.
   */
  async generateAiPhotos(
    dressId: string,
    imageIds: string[],
  ): Promise<AiGenerationResult[]> {
    const dress = await this.prisma.dress.findUnique({
      where: { id: dressId },
      include: { images: true },
    });
    if (!dress) throw new NotFoundException('השמלה לא נמצאה');

    // Resolve ids against *this* dress's photos, so a valid id belonging to
    // another listing can't be used to generate against it.
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
          const generatedUrl = await this.aiPhoto.generateModelPhoto(src.url);
          // The provider's CDN URL expires — persist our own copy before it is
          // ever written to the database.
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
          // `order` carries no unique constraint, so a bulk increment is safe
          // and keeps the existing photos' relative order intact.
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

    return results;
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
