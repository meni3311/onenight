import {
  BadRequestException,
  ForbiddenException,
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
import {
  BrowseDressesDto,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  SortKey,
} from './dto/browse-dresses.dto';
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

/**
 * What an anonymous browser is allowed to see.
 *
 * `phone` and `email` are the listing owner's real contact details, and they
 * were previously included on every card in the browse response — one fetch
 * handed any visitor the phone number of every person who had ever listed a
 * dress. They are dropped here and served only from the single-listing
 * endpoint, which the detail view fetches when a card is actually opened.
 *
 * `photos` goes too: image row ids and `isAiGenerated` exist for the admin
 * photo grid, and nothing public reads them (every browse consumer reads the
 * flat `images` array — see the note on ClientDress).
 */
export type PublicDress = Omit<ClientDress, 'phone' | 'email' | 'photos'>;

/** One page of results, plus what the caller needs to request the next. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
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

/**
 * Load CLIENT_INCLUDE's relations with a LATERAL join in the same statement,
 * instead of Prisma's default of one follow-up query per relation.
 *
 * Every dress read includes two relations, so the default costs three round
 * trips where one does. Against a local database that's free; against the
 * Supabase instance in ap-southeast-2 a single round trip measured ~1.8s, and
 * endpoint latency tracked query count almost exactly — the browse list at
 * ~4.7s was three tolls, not one slow query.
 *
 * Reads only. `relationLoadStrategy` is not accepted on create/update, so the
 * write paths below keep the default and pay the extra trips on a response
 * nobody is waiting on a grid for.
 *
 * Requires the `relationJoins` preview feature (see schema.prisma) and a
 * `prisma generate` after enabling it.
 */
const JOIN = { relationLoadStrategy: 'join' } as const;

/**
 * Ceiling on photos per listing, enforced when the admin adds one.
 *
 * Matches the `max` passed to ImageUploader on the admin screen. The publish
 * form's own limit is lower (3) and independent — that one is about not
 * overwhelming a first-time lister, this one is about what a gallery can
 * usefully show. AI generations append into the same set and count against it.
 */
export const MAX_GALLERY_IMAGES = 8;

/**
 * How long a cached anonymous browse list may be served for.
 *
 * Short on purpose. Every write path calls invalidateBrowseCache(), so this
 * is the backstop rather than the mechanism — the cost of it expiring late
 * is a new listing appearing up to a minute after publication, which is
 * harmless. Raising it only makes sense once the invalidation set has been
 * observed to be complete in production.
 */
const BROWSE_CACHE_TTL_MS = 60_000;

/**
 * How many leading pages of the unfiltered browse view are worth caching.
 *
 * The cache exists for the first-paint path — every visitor lands on the
 * homepage and gets page 1 of the default sort — and that is the only traffic
 * with enough repetition to hit. Filtered queries are served live and never
 * stored: the facets multiply out (colours × sizes × lengths × price × source)
 * into a key space no single-process Map should try to hold, and each
 * combination is requested by roughly one person.
 *
 * With the cap on cacheable pages, sorts, and page size, the whole cache is at
 * most CACHEABLE_PAGES × (SORT_KEYS + 1 default) entries.
 */
const CACHEABLE_PAGES = 3;

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

  /**
   * The one cached read in this service: leading pages of the unfiltered
   * anonymous browse list, keyed by sort and page (see browseCacheKey).
   *
   * It was a single field back when the list was the entire catalogue and
   * there was exactly one thing to cache. Paging means one entry per page, so
   * it is a Map now — still a plain Map rather than a cache library, because
   * the key space is capped at a handful of entries and the invalidation
   * below is hand-written either way.
   *
   * This is per-process. If the API is ever scaled past one instance each
   * one keeps its own copy and a write on instance A won't clear instance
   * B — that, not traffic volume, is the signal to move to a shared store.
   */
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

  /** The browse shape, with the owner's contact details removed. */
  private toPublic(d: DressWithRelations): PublicDress {
    const { phone: _phone, email: _email, photos: _photos, ...pub } = this.toClient(d);
    return pub;
  }

  /**
   * Every filter the homepage used to apply in the browser, as one WHERE.
   *
   * `status` is pinned to "approved" here and is not overridable by anything
   * the caller sends — that is the whole point of this method existing. The
   * admin queue reaches pending and rejected listings through listForAdmin,
   * behind AdminGuard.
   */
  private buildBrowseWhere(q: BrowseDressesDto): Prisma.DressWhereInput {
    const where: Prisma.DressWhereInput = { status: 'approved' };

    if (q.colors?.length) where.color = { in: q.colors };
    if (q.sizes?.length) where.size = { in: q.sizes };
    if (q.regions?.length) where.region = { in: q.regions };
    if (q.dressLengths?.length) where.dressLength = { in: q.dressLengths };
    if (q.sleeveLengths?.length) where.sleeveLength = { in: q.sleeveLengths };
    // "all" is the SOURCE_OPTIONS default, i.e. no filter — not a value to match.
    if (q.source && q.source !== 'all') where.source = q.source;

    const price: Prisma.FloatFilter = {};
    if (q.minPrice !== undefined) price.gte = q.minPrice;
    if (q.maxPrice !== undefined) price.lte = q.maxPrice;
    if (price.gte !== undefined || price.lte !== undefined) where.price = price;

    if (q.q) {
      // The client-side version concatenated these four fields and searched
      // the result, which also matched strings spanning a field boundary.
      // That was incidental; per-field OR is the intended behaviour.
      const contains = { contains: q.q, mode: Prisma.QueryMode.insensitive };
      where.OR = [
        { title: contains },
        { desc: contains },
        { color: contains },
        { region: contains },
      ];
    }

    return where;
  }

  /**
   * Sort keys map 1:1 onto SORT_OPTIONS in the frontend's SortMenu.
   *
   * Every one is tiebroken on `id`. With OFFSET paging a non-unique sort key
   * has no defined order among equal rows, so two listings at the same price
   * could swap between two page requests and be shown twice or not at all.
   * The tiebreak makes the sequence total, which is what makes paging stable.
   *
   * No sort selected is newest-first, matching the order the unpaginated
   * endpoint happened to return and the frontend treated as its default.
   */
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

  /**
   * Cache key for this request, or null when it shouldn't be cached at all.
   *
   * Null for anything filtered, anything past the first few pages, and any
   * non-default page size — see CACHEABLE_PAGES for why. The page-size check
   * also means a caller can't mint unlimited cache entries by walking `limit`
   * from 1 to MAX_PAGE_LIMIT.
   */
  private browseCacheKey(q: BrowseDressesDto, page: number, limit: number): string | null {
    const filtered =
      !!q.q ||
      !!q.colors?.length ||
      !!q.sizes?.length ||
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

  /**
   * The public browse list: one page of approved listings, filtered and
   * sorted server-side, with owner contact details stripped.
   *
   * There is no way to ask this for a pending or rejected listing. The
   * endpoint it backs used to take a `status` param that the frontend called
   * with "all", so every anonymous visitor downloaded the moderation queue.
   */
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
      // One round trip for both: `total` drives the result count the filter
      // panel shows and the client's "is there a next page" check, so it is
      // never optional and shouldn't cost a second request.
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

  /**
   * Approved listings by id, for the favourites page.
   *
   * Favourites are ids in the visitor's localStorage, and the page used to
   * resolve them against the full in-memory catalogue. Approved-only is not
   * just a copy of the browse rule here: a favourited listing that was later
   * rejected would otherwise still render, which leaks a moderation decision
   * to whoever favourited it. Unknown and non-approved ids are simply absent
   * from the response, and the page renders what came back.
   */
  async listPublicByIds(ids: string[]): Promise<PublicDress[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.dress.findMany({
      ...JOIN,
      where: { id: { in: ids }, status: 'approved' },
      include: CLIENT_INCLUDE,
    });
    // Restore the caller's order — `IN` gives no ordering guarantee, and the
    // favourites grid should stay in the order the user saved them.
    const byId = new Map(rows.map((d) => [d.id, d]));
    return ids.map((id) => byId.get(id)).filter(Boolean).map((d) => this.toPublic(d!));
  }

  /**
   * An owner's own listings, including their pending and rejected ones.
   *
   * OWNERSHIP: an email match, the same weak-but-consistent rule deleteDress
   * uses and for the same reason — this app has no bearer token, so there is
   * nothing stronger available without introducing real sessions. Anyone who
   * knows an address can read that person's listings and their own phone
   * number back. That is narrower than what shipped before (the browse list
   * handed every visitor every owner's details unprompted) but it is not
   * privacy, and it goes away when real auth lands.
   *
   * Unpaginated: this is one person's listings, and the account screen shows
   * them as a single list with no pager. The cap is a bound on a pathological
   * account, not a page size.
   */
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

  /**
   * The admin moderation queue. Behind AdminGuard — this is the only path to
   * pending and rejected listings, and it returns the full ClientDress shape
   * (contact details included) because the queue's whole job is to let the
   * admin reach the person who listed the dress.
   *
   * `counts` covers every status regardless of which one is being shown, so
   * the tab bar can render "ממתינות (3)" without loading the other tabs.
   */
  async listForAdmin(
    status: string,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT,
  ): Promise<Page<ClientDress> & { counts: Record<string, number> }> {
    const take = Math.min(limit, MAX_PAGE_LIMIT);
    const where: Prisma.DressWhereInput = status === 'all' ? {} : { status };

    // groupBy sits outside the transaction the other two share: the tab
    // badges are a summary, they don't have to be consistent with the page
    // to the row, and Prisma's groupBy result type doesn't survive being
    // mixed into a $transaction array.
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

  /**
   * Drops the cached browse pages. Called from every path that changes what
   * that list would return — including toggleBookedDate, because a dress
   * payload embeds `booked` (see toClient) and the frontend reads a dress's
   * availability straight out of the browse response. Missing an
   * invalidation here would mean showing a taken date as free, so the rule
   * is simple and deliberately blunt: any write to a dress, its images, its
   * status or its availability clears every page, not the pages that write
   * could plausibly have affected. Working out which pages a price edit
   * shifts a listing between is not worth being wrong about.
   */
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
    this.invalidateBrowseCache();
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
    this.invalidateBrowseCache();
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
    this.invalidateBrowseCache();
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
    this.invalidateBrowseCache();
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

    this.invalidateBrowseCache();
    return results;
  }

  /**
   * How many booking inquiries reference this dress.
   *
   * Feeds the warning in the owner's delete confirmation. `BookingInquiry`
   * has no foreign key to `Dress` (its dressId is a plain column — see the
   * model's own note), so this is a count, not a relation traversal, and
   * these rows are NOT removed when the dress is.
   */
  async countInquiries(dressId: string): Promise<number> {
    return this.prisma.bookingInquiry.count({ where: { dressId } });
  }

  /**
   * Owner-initiated deletion of their own listing.
   *
   * OWNERSHIP: verified by matching `requesterEmail` against the listing's
   * own `email`, the same weak-but-consistent rule `createDress` uses to
   * resolve an owner and `AccountPage` uses to decide which listings are
   * "mine". This app has no bearer token — the login endpoints return a user
   * object and nothing signs subsequent requests — so an email match is the
   * strongest check available here without introducing real sessions. It
   * stops the accidental and the casual, not someone who knows another
   * lister's address. Tighten this when real auth lands.
   *
   * BOOKING INQUIRIES ARE DELIBERATELY LEFT BEHIND. Each inquiry row is a
   * self-contained snapshot (dress title, both phone numbers, requested
   * dates) captured at click time precisely so it outlives the listing, and
   * the admin queue already renders "השמלה כבר לא זמינה" for a missing
   * dress. Cascading them would destroy a renter's pending request and the
   * admin's ability to follow it up. The owner is told the count before
   * confirming, so this is disclosed rather than silent.
   *
   * Everything else hangs off `Dress` with onDelete: Cascade (images, sizes,
   * availability, bookings, reviews, favourites) and goes with the row.
   */
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

    // Storage first: if the row went first and this failed, the URLs needed
    // to find these objects would already be gone and the files unreachable
    // forever. deleteByPublicUrl never throws, so a Storage problem can't
    // block the deletion itself.
    await Promise.all(dress.images.map((img) => this.storage.deleteByPublicUrl(img.url)));

    await this.prisma.dress.delete({ where: { id } });
    this.invalidateBrowseCache();
  }

  /**
   * Bulk owner deletion — every listing this owner has, hard-deleted with
   * their stored images. Only caller is UsersService.deleteAccount: unlike
   * `deleteDress`, there is no per-request email to check against, because
   * by the time this runs the account itself (and thus its ownership) has
   * already been resolved and is about to be removed. Same storage-then-row
   * order as `deleteDress`, and for the same reason: if the row went first
   * and this failed, the URLs needed to find those files would already be
   * gone.
   */
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

  /**
   * Admin: drop one photo from a listing's gallery.
   *
   * Refuses the last one — every consumer renders `images[0]` as the card
   * thumbnail and the detail page's lead image, so a listing with an empty
   * gallery renders as a broken image everywhere it appears.
   *
   * Re-packs `order` afterwards so the sequence stays 0..n-1 with no holes.
   * Nothing reads `order` numerically beyond sorting, but leaving gaps makes
   * the "lowest order is the cover" rule harder to reason about, and removing
   * the current cover has to promote the next photo cleanly.
   */
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

  /**
   * Admin: append an already-uploaded photo to a listing's gallery.
   *
   * Takes a URL rather than the file itself because the upload already has a
   * home — the frontend posts the bytes to `POST /api/dresses/images` (same
   * path the publish form uses) and passes the resulting public URL here.
   * That keeps one upload implementation instead of a second admin-only one.
   *
   * The cap is re-checked here and not only in the UI: the UI disables the
   * button, but the endpoint is what actually has to hold the line.
   */
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

  /**
   * Dresses sharing this one's colour or source, excluding itself.
   *
   * Public, so it returns the stripped shape — this feeds the detail view's
   * "you may also like" rail, which renders cards and reads no contact
   * details. The rail used to be filled client-side from the full catalogue
   * the browse call returned; with that catalogue no longer in the browser,
   * this endpoint (which already existed and was never called) is what backs
   * it.
   */
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
