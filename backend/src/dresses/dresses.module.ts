import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dress } from './dress.entity';
import { DressesService } from './dresses.service';
import { AdminController, DressesController } from './dresses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dress])],
  controllers: [DressesController, AdminController],
  providers: [DressesService],
  exports: [DressesService],
})
export class DressesModule {}
