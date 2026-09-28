import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiningType, PaymentMethod, PickupType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ enum: DiningType }) @IsEnum(DiningType) diningType!: DiningType;
  @ApiProperty({ enum: PickupType }) @IsEnum(PickupType) pickupType!: PickupType;
  @ApiPropertyOptional() @ValidateIf(value => value.pickupType === PickupType.SCHEDULED) @IsDateString() scheduledPickupAt?: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() studentVoucherId?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) pointsToUse = 0;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ReasonDto { @ApiProperty() @IsString() @MinLength(3) reason!: string; }
export class PickupTokenDto { @ApiProperty() @IsString() @MinLength(20) token!: string; }

