import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dress, DressStatus } from './dress.entity';

@Injectable()
export class DressesService {
  constructor(
    @InjectRepository(Dress) private readonly repo: Repository<Dress>,
  ) {}

  /** Public list: approved only. Admin list: pass status or 'all'. */
  async findAll(status?: string): Promise<Dress[]> {
    const where = status && status !== 'all' ? { status: status as DressStatus } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Dress> {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dress not found');
    return d;
  }

  /** A newly published dress always starts as pending. */
  async create(data: Partial<Dress>): Promise<Dress> {
    const dress = this.repo.create({
      ...data,
      status: 'pending',
      rejectReason: '',
      booked: data.booked ?? [],
      images: data.images ?? [],
    });
    return this.repo.save(dress);
  }

  async update(id: string, data: Partial<Dress>): Promise<Dress> {
    const dress = await this.findOne(id);
    // Whitelist editable fields
    const fields: (keyof Dress)[] = [
      'title', 'desc', 'color', 'colorHex', 'condition', 'length',
      'price', 'region', 'size', 'source', 'store', 'images',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) (dress as any)[f] = data[f];
    }
    return this.repo.save(dress);
  }

  async setStatus(id: string, status: DressStatus, rejectReason = ''): Promise<Dress> {
    const dress = await this.findOne(id);
    dress.status = status;
    dress.rejectReason = status === 'rejected' ? rejectReason : '';
    return this.repo.save(dress);
  }

  /** Toggle a single date key in the booked array. */
  async toggleBooked(id: string, key: string): Promise<Dress> {
    const dress = await this.findOne(id);
    const set = new Set(dress.booked || []);
    set.has(key) ? set.delete(key) : set.add(key);
    dress.booked = [...set];
    return this.repo.save(dress);
  }

  async setBooked(id: string, booked: string[]): Promise<Dress> {
    const dress = await this.findOne(id);
    dress.booked = booked || [];
    return this.repo.save(dress);
  }

  async remove(id: string): Promise<void> {
    const dress = await this.findOne(id);
    await this.repo.remove(dress);
  }

  count(): Promise<number> {
    return this.repo.count();
  }

  saveMany(rows: Partial<Dress>[]): Promise<Dress[]> {
    return this.repo.save(this.repo.create(rows));
  }
}
