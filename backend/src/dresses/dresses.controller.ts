import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DressesService } from './dresses.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreateDressDto } from './dto/create-dress.dto';
import { ListDressesQueryDto } from './dto/list-dresses-query.dto';
import {
  AvailabilityResultDto,
  DressDetailDto,
  DressListItemDto,
  DressSummaryDto,
  UnavailableDateRangeDto,
} from './dto/dress-detail.dto';

@ApiTags('dresses')
@Controller('dresses')
export class DressesController {
  constructor(private readonly service: DressesService) {}

  @Get()
  @ApiOperation({ summary: 'Browse/filter dresses (price range, colors, dress/sleeve length — AND across categories, OR within one)' })
  @ApiResponse({ status: 200, type: [DressListItemDto] })
  listDresses(@Query() query: ListDressesQueryDto): Promise<DressListItemDto[]> {
    return this.service.listDresses(query);
  }

  @Post()
  @ApiOperation({ summary: 'Publish a new dress listing' })
  @ApiResponse({ status: 201, type: DressDetailDto })
  createDress(@Body() dto: CreateDressDto): Promise<DressDetailDto> {
    return this.service.createDress(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full dress detail with sizes, images, reviews' })
  @ApiResponse({ status: 200, type: DressDetailDto })
  getDressById(@Param('id') id: string): Promise<DressDetailDto> {
    return this.service.getDressById(id);
  }

  @Get(':id/unavailable-dates')
  @ApiOperation({ summary: 'List booked (unavailable) date ranges for a dress' })
  @ApiResponse({ status: 200, type: [UnavailableDateRangeDto] })
  getUnavailableDates(
    @Param('id') id: string,
  ): Promise<UnavailableDateRangeDto[]> {
    return this.service.getUnavailableDates(id);
  }

  @Post(':id/check-availability')
  @ApiOperation({ summary: 'Check whether a dress+size is free for a date range' })
  @ApiResponse({ status: 200, type: AvailabilityResultDto })
  checkAvailability(
    @Param('id') id: string,
    @Body() dto: CheckAvailabilityDto,
  ): Promise<AvailabilityResultDto> {
    return this.service.checkAvailability(id, dto);
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Get similar dresses (same colour or source)' })
  @ApiResponse({ status: 200, type: [DressSummaryDto] })
  getSimilarDresses(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ): Promise<DressSummaryDto[]> {
    return this.service.getSimilarDresses(id, limit);
  }
}
