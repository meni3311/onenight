import { Module } from '@nestjs/common';
import { AdminDressesController } from './admin-dresses.controller';
import { DressesController } from './dresses.controller';
import { DressesService } from './dresses.service';
import { AiPhotoService } from './ai-photo.service';
import { StorageService } from './storage.service';

/**
 * Dress feature module — browse/detail, create/edit, the owner's availability
 * calendar, admin approval, photo upload to Supabase Storage, and the
 * admin-only AI on-model photo tool. Depends on the global PrismaModule for
 * data access, so no provider wiring beyond these services is required here.
 */
@Module({
  controllers: [DressesController, AdminDressesController],
  providers: [DressesService, StorageService, AiPhotoService],
  exports: [DressesService],
})
export class DressesModule {}
