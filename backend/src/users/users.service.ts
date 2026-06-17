import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';

type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  private strip(u: User): PublicUser {
    const { password, ...rest } = u;
    return rest;
  }

  async register(data: { name: string; email?: string; city?: string; phone: string; password: string }): Promise<PublicUser> {
    const existing = await this.repo.findOne({ where: { phone: data.phone } });
    if (existing) throw new ConflictException('מספר טלפון כבר רשום');
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.repo.create({
      name: data.name,
      email: data.email || '',
      city: data.city || '',
      phone: data.phone,
      password: hash,
    });
    return this.strip(await this.repo.save(user));
  }

  async login(phone: string, password: string): Promise<PublicUser> {
    const user = await this.repo.findOne({ where: { phone } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('טלפון או סיסמה שגויים');
    }
    return this.strip(user);
  }

  async updateProfile(phone: string, data: { name?: string; email?: string; city?: string }): Promise<PublicUser> {
    const user = await this.repo.findOne({ where: { phone } });
    if (!user) throw new UnauthorizedException('משתמשת לא נמצאה');
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.city !== undefined) user.city = data.city;
    return this.strip(await this.repo.save(user));
  }
}
