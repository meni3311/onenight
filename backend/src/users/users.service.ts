import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type PublicUser = Omit<User, 'password'>;

const HASH_ROUNDS = 10;

/** Prisma's unique-constraint violation code (was a raw driver error under TypeORM). */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_VIOLATION
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private strip(u: User): PublicUser {
    const { password, ...rest } = u;
    return rest;
  }

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  /** The registration form has no username field — it's a display-only
   *  handle (never used for login/lookup), so it's fine to derive one
   *  automatically from the email's local part rather than ask for it.
   *  No uniqueness is enforced on it, matching that "display only" role. */
  private deriveUsername(email: string): string {
    const local = (email || '').split('@')[0] || '';
    const cleaned = local.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return cleaned || 'user';
  }

  /** Emails are always normalized to lowercase before being written, so a
   *  direct unique lookup on the normalized input is sufficient here. (Under
   *  SQLite this needed a LOWER() query builder because that engine compares
   *  case-sensitively and legacy rows could have mixed casing; the migrated
   *  Postgres rows were all written through normalizeEmail.) */
  private findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  /** Creates an unverified account with a bcrypt password hash — the
   *  plaintext password is never persisted or logged. Verification (and
   *  login) happen once the caller completes the OTP step. */
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
          // Registration form checkbox defaults to checked; fall back to that
          // same default if an older/other client omits the field.
          marketingConsent: data.marketingConsent ?? true,
        },
      });
      return this.strip(user);
    } catch (error) {
      // Guards the race between the findByEmail check above and this insert —
      // two concurrent registrations for the same email would both pass the
      // check and only the DB constraint would catch the second one. Same
      // message as the pre-check so the client sees one consistent error.
      if (isUniqueViolation(error)) {
        throw new ConflictException('כתובת המייל כבר רשומה');
      }
      throw error;
    }
  }

  /** Flips `verified` — only ever called after the caller has proven
   *  ownership of the email via OtpService.verifyOtp. */
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

  /** Sets a new password hash — only ever called after the caller has
   *  proven ownership of the email via OtpService.verifyOtp. */
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
      // Undefined fields are omitted by Prisma, matching the previous
      // `if (x !== undefined)` guards — a missing field leaves the column
      // untouched rather than nulling it.
      data: { name: data.name, city: data.city },
    });
    return this.strip(updated);
  }
}
