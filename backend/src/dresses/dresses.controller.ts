import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { DressesService } from './dresses.service';
import { Dress, DressStatus } from './dress.entity';
import { AdminGuard, ADMIN_PASSWORD } from '../common/admin.guard';

@Controller('api/dresses')
export class DressesController {
  constructor(private readonly service: DressesService) {}

  // Public catalog. Defaults to approved. Admin can pass ?status=pending|approved|rejected|all
  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status || 'approved');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Publish — no auth required, lands as pending
  @Post()
  create(@Body() body: Partial<Dress>) {
    return this.service.create(body);
  }

  // Edit listing fields (owner self-service in the demo)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Dress>) {
    return this.service.update(id, body);
  }

  // Toggle a single availability date
  @Patch(':id/booked')
  toggleBooked(@Param('id') id: string, @Body() body: { key?: string; booked?: string[] }) {
    if (Array.isArray(body.booked)) return this.service.setBooked(id, body.booked);
    return this.service.toggleBooked(id, body.key);
  }

  // ----- Admin-only -----
  @UseGuards(AdminGuard)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: DressStatus; rejectReason?: string }) {
    return this.service.setStatus(id, body.status, body.rejectReason || '');
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}

@Controller('api/admin')
export class AdminController {
  // Lightweight password check so the frontend can gate the admin panel
  @Post('login')
  login(@Body() body: { password?: string }) {
    return { ok: body?.password === ADMIN_PASSWORD };
  }
}
