import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { CreateCategoryDto, CreateComboDto, CreateProductDto, LinkOptionGroupDto, ProductOptionGroupDto, ProductQueryDto, ProductVariantDto, UpdateCategoryDto, UpdateComboDto, UpdateProductDto, UpsertRecipeDto } from './catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  categories() { return this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: { where: { deletedAt: null, isAvailable: true } } } } } }); }

  async products(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { basePrice: { gte: query.minPrice, lte: query.maxPrice } } : {}),
      ...(query.minRating !== undefined ? { averageRating: { gte: query.minRating } } : {}),
      ...(query.vegetarian !== undefined ? { isVegetarian: query.vegetarian } : {}),
      ...(query.available !== undefined ? { isAvailable: query.available } : {}),
      ...(query.maxPreparationTime !== undefined ? { preparationTimeMinutes: { lte: query.maxPreparationTime } } : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput = query.sort === 'rating' ? { averageRating: 'desc' } : query.sort === 'price-asc' ? { basePrice: 'asc' } : query.sort === 'price-desc' ? { basePrice: 'desc' } : query.sort === 'fastest' ? { preparationTimeMinutes: 'asc' } : { totalReviews: 'desc' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: { category: true, variants: { where: { active: true } }, optionGroups: { orderBy: { sortOrder: 'asc' }, include: { optionGroup: { include: { values: { where: { active: true }, orderBy: { sortOrder: 'asc' } } } } } }, recipes: { include: { ingredients: { include: { ingredient: true } } } } }, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.product.count({ where }),
    ]);
    const mapped = items.map(item => ({ ...item, isAvailable: item.isAvailable && this.hasRecipeStock(item.recipes), inventoryAvailability: this.hasRecipeStock(item.recipes) ? 'AVAILABLE' : 'POTENTIALLY_UNAVAILABLE' }));
    const visible = query.available === true ? mapped.filter(item => item.isAvailable) : mapped;
    return { items: visible, meta: { page: query.page, limit: query.limit, total: query.available === true ? Math.max(0, total - (mapped.length - visible.length)) : total, pageCount: Math.ceil(total / query.limit) } };
  }

  private hasRecipeStock(recipes: { ingredients: { quantity: Prisma.Decimal; ingredient: { currentQuantity: Prisma.Decimal; reservedQuantity: Prisma.Decimal } }[] }[]) { return !recipes.length || recipes.some(recipe => recipe.ingredients.every(line => line.ingredient.currentQuantity.sub(line.ingredient.reservedQuantity).greaterThanOrEqualTo(line.quantity))); }

  async productBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, deletedAt: null }, include: { category: true, variants: { where: { active: true } }, optionGroups: { orderBy: { sortOrder: 'asc' }, include: { optionGroup: { include: { values: { where: { active: true }, orderBy: { sortOrder: 'asc' } } } } } }, recipes: { include: { ingredients: { include: { ingredient: true } } } }, reviews: { where: { isHidden: false }, orderBy: { createdAt: 'desc' }, take: 10, include: { studentProfile: { select: { studentDirectory: { select: { fullName: true } } } } } } } });
    if (!product) throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Không tìm thấy món ăn.');
    const recipeStock = this.hasRecipeStock(product.recipes);
    return { ...product, isAvailable: product.isAvailable && recipeStock, inventoryAvailability: recipeStock ? 'AVAILABLE' : 'POTENTIALLY_UNAVAILABLE' };
  }

  combos() { return this.prisma.combo.findMany({ where: { isActive: true, deletedAt: null }, include: { items: { include: { product: true, variant: true } } }, orderBy: { createdAt: 'desc' } }); }

  createProduct(dto: CreateProductDto) { return this.prisma.product.create({ data: dto }); }
  adminProducts() { return this.prisma.product.findMany({ include: { category: true, variants: true, optionGroups: { include: { optionGroup: { include: { values: true } } } }, recipes: { include: { ingredients: { include: { ingredient: true } } } } }, orderBy: { createdAt: 'desc' } }); }
  updateProduct(id: string, dto: UpdateProductDto) { return this.prisma.product.update({ where: { id }, data: dto }); }
  async deactivateProduct(id: string) { return this.prisma.product.update({ where: { id }, data: { isAvailable: false, deletedAt: new Date() } }); }
  createCategory(dto: CreateCategoryDto) { return this.prisma.category.create({ data: dto }); }
  adminCategories() { return this.prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }); }
  updateCategory(id: string, dto: UpdateCategoryDto) { return this.prisma.category.update({ where: { id }, data: dto }); }
  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { products: true } } } });
    if (category._count.products > 0) throw new ApiError(HttpStatus.CONFLICT, 'CATEGORY_IN_USE', 'Không thể xóa danh mục đang có sản phẩm.');
    return this.prisma.category.delete({ where: { id } });
  }
  createVariant(productId: string, dto: ProductVariantDto) { return this.prisma.productVariant.create({ data: { productId, ...dto } }); }
  updateVariant(id: string, dto: ProductVariantDto) { return this.prisma.productVariant.update({ where: { id }, data: dto }); }
  adminOptionGroups() { return this.prisma.productOptionGroup.findMany({ include: { values: true, productLinks: true }, orderBy: { name: 'asc' } }); }
  createOptionGroup(dto: ProductOptionGroupDto) { const { values, ...group } = dto; return this.prisma.productOptionGroup.create({ data: { ...group, values: { create: values } }, include: { values: true } }); }
  linkOptionGroup(productId: string, dto: LinkOptionGroupDto) { return this.prisma.productOptionGroupLink.upsert({ where: { productId_optionGroupId: { productId, optionGroupId: dto.optionGroupId } }, update: { sortOrder: dto.sortOrder ?? 0 }, create: { productId, optionGroupId: dto.optionGroupId, sortOrder: dto.sortOrder ?? 0 } }); }
  async upsertRecipe(productId: string, dto: UpsertRecipeDto) { return this.prisma.$transaction(async tx => { const existing = await tx.recipe.findFirst({ where: { productId, variantId: dto.variantId ?? null } }); if (existing) await tx.recipe.delete({ where: { id: existing.id } }); return tx.recipe.create({ data: { productId, variantId: dto.variantId, name: dto.name, ingredients: { create: dto.ingredients } }, include: { ingredients: { include: { ingredient: true } } } }); }); }
  adminCombos() { return this.prisma.combo.findMany({ include: { items: { include: { product: true, variant: true } } }, orderBy: { createdAt: 'desc' } }); }
  private async comboPrices(client: Prisma.TransactionClient, items: CreateComboDto['items']) { let originalPrice = 0; for (const item of items) { const product = await client.product.findUniqueOrThrow({ where: { id: item.productId } }); let adjustment = 0; if (item.variantId) { const variant = await client.productVariant.findFirst({ where: { id: item.variantId, productId: item.productId } }); if (!variant) throw new ApiError(HttpStatus.BAD_REQUEST, 'COMBO_VARIANT_INVALID', 'Biến thể không thuộc sản phẩm combo.'); adjustment = variant.priceAdjustment; } originalPrice += (product.basePrice + adjustment) * item.quantity; } const discountPercentage = 10; return { originalPrice, discountPercentage, calculatedPrice: Math.round(originalPrice * (100 - discountPercentage) / 100) }; }
  async createCombo(dto: CreateComboDto) { return this.prisma.$transaction(async tx => { const { items, ...data } = dto; const prices = await this.comboPrices(tx, items); return tx.combo.create({ data: { ...data, ...prices, items: { create: items } }, include: { items: { include: { product: true, variant: true } } } }); }); }
  async updateCombo(id: string, dto: UpdateComboDto) { return this.prisma.$transaction(async tx => { const current = await tx.combo.findUniqueOrThrow({ where: { id }, include: { items: true } }); const items = dto.items ?? current.items.map(item => ({ productId: item.productId, variantId: item.variantId ?? undefined, quantity: item.quantity })); const prices = await this.comboPrices(tx, items); if (dto.items) await tx.comboItem.deleteMany({ where: { comboId: id } }); const { items: _items, ...data } = dto; return tx.combo.update({ where: { id }, data: { ...data, ...prices, deletedAt: null, ...(dto.items ? { items: { create: items } } : {}) }, include: { items: { include: { product: true, variant: true } } } }); }); }
  deactivateCombo(id: string) { return this.prisma.combo.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } }); }
}
