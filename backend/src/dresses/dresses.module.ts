import { Module } from '@nestjs/common';
import { AdminDressesController } from './admin-dresses.controller';
import { DressesController } from './dresses.controller';
import { DressesService } from './dresses.service';
import { AiPhotoService } from './ai-photo.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [DressesController, AdminDressesController],
  providers: [DressesService, StorageService, AiPhotoService],
  exports: [DressesService],
})
export class DressesModule {}
