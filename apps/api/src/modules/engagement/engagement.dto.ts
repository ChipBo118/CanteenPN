import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
export class CreateReviewDto { @ApiPropertyOptional() @IsOptional() @IsString() orderItemId?: string; @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string; @ApiPropertyOptional() @IsOptional() @IsString() productId?: string; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number; @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) comment?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) content?: string; }
export class ModerateReviewDto { @ApiProperty() @Type(() => Boolean) @IsBoolean() isHidden!: boolean; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; }

