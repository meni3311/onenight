import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { DressesService } from '../dresses/dresses.service';

type PublicUser = Omit<User, 'password'>;

const HASH_ROUNDS = 10;

const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_VIOLATION
  );
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dresses: DressesService,
  ) {}

  private strip(u: User): PublicUser {
    const { password, ...rest } = u;
    return rest;
  }

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private deriveUsername(email: string): string {
    const local = (email || '').split('@')[0] || '';
    const cleaned = local.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return cleaned || 'user';
  }

  private findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async register(data: {
    name: string;
    email: string;
    phone: string;
    username?: string;
    password: string;
    marketingConsent?: boolean;
  }): Promise<PublicUser> {
    const email = this.normalizeEmail(data.email);
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('כתובת המייל כבר רשומה');

    const hash = await bcrypt.hash(data.password, HASH_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: data.name,
          email,
          phone: data.phone,
          username: data.username?.trim() || this.deriveUsername(email),
          password: hash,
          verified: false,
          marketingConsent: data.marketingConsent ?? true,
        },
      });
      return this.strip(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('כתובת המייל כבר רשומה');
      }
      throw error;
    }
  }

  async markVerified(email: string): Promise<PublicUser> {
    const user = await this.findByEmail(email);
    if (!user) throw new NotFoundException('משתמשת לא נמצאה');
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { verified: true },
    });
    return this.strip(updated);
  }

  async login(email: string, password: string): Promise<PublicUser> {
    const user = await this.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('מייל או סיסמה שגויים');
    }
    return this.strip(user);
  }

  async resetPassword(email: string, newPassword: string): Promise<PublicUser> {
    const user = await this.findByEmail(email);
    if (!user) throw new NotFoundException('לא נמצא חשבון עם כתובת המייל הזו');
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, HASH_ROUNDS) },
    });
    return this.strip(updated);
  }

  async updateProfile(
    email: string,
    data: { name?: string; city?: string },
  ): Promise<PublicUser> {
    const user = await this.findByEmail(email);
    if (!user) throw new UnauthorizedException('משתמשת לא נמצאה');
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { name: data.name, city: data.city },
    });
    return this.strip(updated);
  }

  async deleteAccount(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) throw new NotFoundException('משתמשת לא נמצאה');

    await this.dresses.deleteAllByOwner(user.id);

    await this.prisma.$transaction([
      this.prisma.booking.deleteMany({
        where: { OR: [{ renterId: user.id }, { listerId: user.id }] },
      }),
      this.prisma.review.deleteMany({ where: { reviewerId: user.id } }),
      this.prisma.favorite.deleteMany({ where: { userId: user.id } }),
      this.prisma.user.delete({ where: { id: user.id } }),
    ]);
  }
}
