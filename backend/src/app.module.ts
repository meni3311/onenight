import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { DressesModule } from './dresses/dresses.module';
import { UsersModule } from './users/users.module';
import { AuthOtpModule } from './auth-otp/auth-otp.module';
import { BookingInquiriesModule } from './booking-inquiries/booking-inquiries.module';
import { AdminController } from './common/admin.controller';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    // Prisma (PostgreSQL / Supabase) — the sole datastore. Users and auth
    // were migrated off the legacy TypeORM/SQLite connection that used to be
    // registered here; UsersService has been fully Prisma-backed since.
    PrismaModule,
    // Serve the frontend (../frontend) at http://localhost:3000
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
      serveStaticOptions: { index: ['index.html'] },
    }),
    DressesModule,
    UsersModule,
    AuthOtpModule,
    BookingInquiriesModule,
  ],
  // Standalone controllers with no service/module of their own: the admin
  // password check and the health probe.
  controllers: [AdminController, HealthController],
})
export class AppModule {}
