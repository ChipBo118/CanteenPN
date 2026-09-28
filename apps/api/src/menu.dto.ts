import {IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength} from 'class-validator';

export class CreateMenuItemDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) categoryId!: string;
  @IsString() @MinLength(5) description!: string;
  @IsNumber() @Min(0) price!: number;
  @IsInt() @Min(1) @Max(180) prepMinutes!: number;
  @IsOptional() @IsBoolean() vegetarian?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(3) spicyLevel?: number;
  @IsString() imagePath!: string;
  @IsString() altText!: string;
  @IsUrl() sourcePageUrl!: string;
  @IsString() author!: string;
  @IsString() licenseType!: string;
  @IsString() attributionText!: string;
}

export class SetStockDto {
  @IsInt() @Min(0) available!: number;
  @IsOptional() @IsString() date?: string;
}
