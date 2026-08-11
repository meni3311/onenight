import { Module } from '@nestjs/common';
import { DressesController } from './dresses.controller';
import { DressesService } from './dresses.service';
import { StorageService } from './storage.service';

/**
 * Dress feature module — browse/detail, create/edit, the owner's availability
 * calendar, admin approval, and photo upload to Supabase Storage. Depends on
 * the global PrismaModule for data access, so no provider wiring beyond these
 * two services is required here.
 */
@Module({
  controllers: [DressesController],
  providers: [DressesService, StorageService],
  exports: [DressesService],
})
export class DressesModule {}
