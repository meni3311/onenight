import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { User } from './users/user.entity';
import { PrismaModule } from './prisma/prisma.module';
import { DressesModule } from './dresses/dresses.module';
import { UsersModule } from './users/users.module';
import { AuthOtpModule } from './auth-otp/auth-otp.module';

@Module({
  imports: [
    // Prisma (PostgreSQL / Supabase) — powers the dresses feature.
    PrismaModule,
    // Legacy SQLite store, still backing users + auth during migration.
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(__dirname, '..', 'data', 'onenight.sqlite'),
      entities: [User],
      synchronize: true,
    }),
    // Serve the frontend (../frontend) at http://localhost:3000
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
      serveStaticOptions: { index: ['index.html'] },
    }),
    DressesModule,
    UsersModule,
    AuthOtpModule,
  ],
})
export class AppModule {}
