import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comboId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(20) quantity = 1;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) optionValueIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class UpdateCartItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(20) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class QuoteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() studentVoucherId?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) pointsToUse = 0;
}

