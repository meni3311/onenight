import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { Dress } from './dresses/dress.entity';
import { User } from './users/user.entity';
import { DressesModule } from './dresses/dresses.module';
import { UsersModule } from './users/users.module';
import { AuthOtpModule } from './auth-otp/auth-otp.module';
import { SeedService } from './seed';

@Module({
  imports: [
    // SQLite database — single file at backend/data/onenight.sqlite
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(__dirname, '..', 'data', 'onenight.sqlite'),
      entities: [Dress, User],
      synchronize: true, // auto-creates tables; fine for this app
    }),
    // Serve the frontend (../frontend/index.html) at http://localhost:3000
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
      serveStaticOptions: { index: ['index.html'] },
    }),
    DressesModule,
    UsersModule,
    AuthOtpModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
