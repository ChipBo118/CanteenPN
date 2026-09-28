import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @Min(0) @Max(5) minRating?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() vegetarian?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() available?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() maxPreparationTime?: number;
  @ApiPropertyOptional({ enum: ['popular', 'rating', 'price-asc', 'price-desc', 'fastest'] }) @IsOptional() @IsString() sort?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 12 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 12;
}

export class CreateCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional({ default: '🍽️' }) @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty() @IsString() categoryId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) basePrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) preparationTimeMinutes!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() calories?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isVegetarian?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isAvailable?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) { @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean; }
export class ProductVariantDto { @ApiProperty() @IsString() name!: string; @ApiProperty() @IsString() sku!: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() priceAdjustment?: number; @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() active?: boolean; }
export class OptionValueDto { @ApiProperty() @IsString() name!: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() priceAdjustment?: number; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number; }
export class ProductOptionGroupDto { @ApiProperty() @IsString() name!: string; @ApiProperty() @IsString() slug!: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minSelect?: number; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxSelect?: number; @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isRequired?: boolean; @ApiProperty({ type: [OptionValueDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => OptionValueDto) values!: OptionValueDto[]; }
export class LinkOptionGroupDto { @ApiProperty() @IsString() optionGroupId!: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number; }
export class ComboItemDto { @ApiProperty() @IsString() productId!: string; @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity!: number; }
export class CreateComboDto { @ApiProperty() @IsString() name!: string; @ApiProperty() @IsString() slug!: string; @ApiProperty() @IsString() description!: string; @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) preparationTimeMinutes?: number; @ApiProperty({ type: [ComboItemDto] }) @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => ComboItemDto) items!: ComboItemDto[]; }
export class UpdateComboDto extends PartialType(CreateComboDto) { @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean; }
export class RecipeIngredientDto { @ApiProperty() @IsString() ingredientId!: string; @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.001) quantity!: number; }
export class UpsertRecipeDto { @ApiProperty() @IsString() name!: string; @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string; @ApiProperty({ type: [RecipeIngredientDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => RecipeIngredientDto) ingredients!: RecipeIngredientDto[]; }

