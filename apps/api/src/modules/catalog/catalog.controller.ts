import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { resolve } from 'node:path';
import { Public, Roles } from '../../common/auth.decorators';
import { storeImage } from '../../common/image-storage';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, CreateComboDto, CreateProductDto, LinkOptionGroupDto, ProductOptionGroupDto, ProductQueryDto, ProductVariantDto, UpdateCategoryDto, UpdateComboDto, UpdateProductDto, UpsertRecipeDto } from './catalog.dto';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Public() @Get('categories') categories() { return this.catalog.categories(); }
  @Public() @Get('products') products(@Query() query: ProductQueryDto) { return this.catalog.products(query); }
  @Public() @Get('products/:slug') product(@Param('slug') slug: string) { return this.catalog.productBySlug(slug); }
  @Public() @Get('combos') combos() { return this.catalog.combos(); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/products/image') @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async uploadProductImage(@UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP tối đa 5 MB.');
    const signatures = { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': [0x52, 0x49, 0x46, 0x46] } as const;
    const signature = signatures[file.mimetype as keyof typeof signatures];
    if (!signature.every((byte, index) => file.buffer[index] === byte) || (file.mimetype === 'image/webp' && file.buffer.toString('ascii', 8, 12) !== 'WEBP')) throw new BadRequestException('Nội dung tệp ảnh không hợp lệ.');
    const imageDirectory = resolve(process.env.PRODUCT_IMAGE_DIR ?? resolve(__dirname, '../../../../../apps/web/public/images'));
    const imageUrlPrefix = (process.env.PRODUCT_IMAGE_URL_PREFIX ?? '/images').replace(/\/$/, '');
    const imageUrl = await storeImage({
      buffer: file.buffer,
      mimetype: file.mimetype,
      folder: 'products',
      publicIdPrefix: 'menu',
      localDirectory: imageDirectory,
      localUrlPrefix: imageUrlPrefix,
    });
    return { imageUrl };
  }

  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/products') createProduct(@Body() dto: CreateProductDto) { return this.catalog.createProduct(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Get('admin/products') adminProducts() { return this.catalog.adminProducts(); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Patch('admin/products/:id') updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.catalog.updateProduct(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete('admin/products/:id') deactivate(@Param('id') id: string) { return this.catalog.deactivateProduct(id); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/categories') createCategory(@Body() dto: CreateCategoryDto) { return this.catalog.createCategory(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Get('admin/categories') adminCategories() { return this.catalog.adminCategories(); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Patch('admin/categories/:id') updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.catalog.updateCategory(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete('admin/categories/:id') deleteCategory(@Param('id') id: string) { return this.catalog.deleteCategory(id); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/products/:id/variants') createVariant(@Param('id') id: string, @Body() dto: ProductVariantDto) { return this.catalog.createVariant(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Patch('admin/variants/:id') updateVariant(@Param('id') id: string, @Body() dto: ProductVariantDto) { return this.catalog.updateVariant(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Get('admin/option-groups') optionGroups() { return this.catalog.adminOptionGroups(); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/option-groups') createOptionGroup(@Body() dto: ProductOptionGroupDto) { return this.catalog.createOptionGroup(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/products/:id/option-groups') linkOptionGroup(@Param('id') id: string, @Body() dto: LinkOptionGroupDto) { return this.catalog.linkOptionGroup(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/products/:id/recipe') recipe(@Param('id') id: string, @Body() dto: UpsertRecipeDto) { return this.catalog.upsertRecipe(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Get('admin/combos') adminCombos() { return this.catalog.adminCombos(); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post('admin/combos') createCombo(@Body() dto: CreateComboDto) { return this.catalog.createCombo(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Patch('admin/combos/:id') updateCombo(@Param('id') id: string, @Body() dto: UpdateComboDto) { return this.catalog.updateCombo(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete('admin/combos/:id') deactivateCombo(@Param('id') id: string) { return this.catalog.deactivateCombo(id); }
}
