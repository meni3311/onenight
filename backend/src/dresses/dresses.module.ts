import { Module } from '@nestjs/common';
import { DressesController } from './dresses.controller';
import { DressesService } from './dresses.service';

/**
 * Dress feature module — detail/availability plus browse (filtered list) and
 * create. Depends on the global PrismaModule for data access, so no provider
 * wiring beyond the service is required here.
 */
@Module({
  controllers: [DressesController],
  providers: [DressesService],
  exports: [DressesService],
})
export class DressesModule {}
