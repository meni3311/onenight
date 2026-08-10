import { ApiProperty } from '@nestjs/swagger';
import {
  DressCondition,
  DressLength,
  DressSource,
  SleeveLength,
} from '@prisma/client';

export class DressSizeDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'M' }) size!: string;
  @ApiProperty() available!: boolean;
}

export class DressImageDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ description: 'Display order, ascending' }) order!: number;
}

export class ReviewDto {
  @ApiProperty() id!: string;
  @ApiProperty() reviewer!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) rating!: number;
  @ApiProperty() text!: string;
  @ApiProperty({ example: 'M' }) sizeWorn!: string;
  @ApiProperty({ description: 'ISO timestamp' }) createdAt!: string;
}

/** Full dress detail returned by GET /dresses/:id. */
export class DressDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() price!: number;
  @ApiProperty({ nullable: true, type: String }) fabric!: string | null;
  @ApiProperty({ nullable: true, type: String }) color!: string | null;
  @ApiProperty({ nullable: true, type: String }) designer!: string | null;
  @ApiProperty({ enum: DressSource }) source!: DressSource;
  @ApiProperty({ enum: DressCondition }) condition!: DressCondition;
  @ApiProperty({ enum: DressLength }) dressLength!: DressLength;
  @ApiProperty({ enum: SleeveLength }) sleeveLength!: SleeveLength;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ type: [DressSizeDto] }) sizes!: DressSizeDto[];
  @ApiProperty({ type: [DressImageDto] }) images!: DressImageDto[];
  @ApiProperty({ type: [ReviewDto] }) reviews!: ReviewDto[];
}

/** Compact dress shape for similar-dresses rails. */
export class DressSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() price!: number;
  @ApiProperty({ type: [DressImageDto] }) images!: DressImageDto[];
}

/** Card shape for GET /dresses (browse/filter list). */
export class DressListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() price!: number;
  @ApiProperty({ nullable: true, type: String }) color!: string | null;
  @ApiProperty({ enum: DressSource }) source!: DressSource;
  @ApiProperty({ enum: DressLength }) dressLength!: DressLength;
  @ApiProperty({ enum: SleeveLength }) sleeveLength!: SleeveLength;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ type: [DressImageDto] }) images!: DressImageDto[];
}

/** A single unavailable range from GET /dresses/:id/unavailable-dates. */
export class UnavailableDateRangeDto {
  @ApiProperty({ type: String, format: 'date-time' }) start!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) end!: Date;
}

/** Result of POST /dresses/:id/check-availability. */
export class AvailabilityResultDto {
  @ApiProperty() available!: boolean;
}
