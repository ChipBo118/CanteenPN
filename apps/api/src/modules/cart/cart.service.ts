import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { AddCartItemDto, QuoteDto, UpdateCartItemDto } from './cart.dto';
import { PricingService } from './pricing.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: PricingService) {}
  private async profile(userId: string) { const profile = await this.prisma.studentProfile.findUnique({ where: { userId } }); if (!profile) throw new ApiError(HttpStatus.FORBIDDEN, 'STUDENT_PROFILE_REQUIRED', 'Chỉ tài khoản sinh viên mới có giỏ hàng.'); return profile; }
  private include() { return { items: { orderBy: { createdAt: 'asc' as const }, include: { product: true, combo: true, variant: true, options: { include: { optionValue: { include: { optionGroup: true } } } } } } }; }
  async get(userId: string) { const profile = await this.profile(userId); return this.prisma.cart.findUnique({ where: { studentProfileId: profile.id }, include: this.include() }); }
  async add(userId: string, dto: AddCartItemDto) {
    const profile = await this.profile(userId);
    if ((!dto.productId && !dto.comboId) || (dto.productId && dto.comboId)) throw new ApiError(HttpStatus.BAD_REQUEST, 'CART_ITEM_INVALID', 'Hãy chọn một sản phẩm hoặc một combo.');
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({ where: { id: dto.productId, deletedAt: null, isAvailable: true }, include: { variants: true, optionGroups: { include: { optionGroup: { include: { values: true } } } } } });
      if (!product) throw new ApiError(HttpStatus.CONFLICT, 'PRODUCT_UNAVAILABLE', 'Món ăn hiện không khả dụng.');
      if (dto.variantId && !product.variants.some(variant => variant.id === dto.variantId && variant.active)) throw new ApiError(HttpStatus.BAD_REQUEST, 'VARIANT_INVALID', 'Biến thể không hợp lệ.');
      const allowed = new Set(product.optionGroups.flatMap(link => link.optionGroup.values.filter(value => value.active).map(value => value.id)));
      if (dto.optionValueIds?.some(id => !allowed.has(id))) throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_OPTION_INVALID', 'Tùy chọn món ăn không hợp lệ.');
    } else if (!await this.prisma.combo.findFirst({ where: { id: dto.comboId, isActive: true, deletedAt: null } })) throw new ApiError(HttpStatus.CONFLICT, 'PRODUCT_UNAVAILABLE', 'Combo hiện không khả dụng.');
    const cart = await this.prisma.cart.upsert({ where: { studentProfileId: profile.id }, update: {}, create: { studentProfileId: profile.id } });
    await this.prisma.cartItem.create({ data: { cartId: cart.id, productId: dto.productId, comboId: dto.comboId, variantId: dto.variantId, quantity: dto.quantity, note: dto.note, options: dto.optionValueIds?.length ? { create: [...new Set(dto.optionValueIds)].map(optionValueId => ({ optionValueId })) } : undefined } });
    return this.get(userId);
  }
  async update(userId: string, itemId: string, dto: UpdateCartItemDto) { const profile = await this.profile(userId); const result = await this.prisma.cartItem.updateMany({ where: { id: itemId, cart: { studentProfileId: profile.id } }, data: dto }); if (!result.count) throw new ApiError(HttpStatus.NOT_FOUND, 'CART_ITEM_NOT_FOUND', 'Không tìm thấy món trong giỏ.'); return this.get(userId); }
  async remove(userId: string, itemId: string) { const profile = await this.profile(userId); const result = await this.prisma.cartItem.deleteMany({ where: { id: itemId, cart: { studentProfileId: profile.id } } }); if (!result.count) throw new ApiError(HttpStatus.NOT_FOUND, 'CART_ITEM_NOT_FOUND', 'Không tìm thấy món trong giỏ.'); return this.get(userId); }
  async clear(userId: string) { const profile = await this.profile(userId); await this.prisma.cartItem.deleteMany({ where: { cart: { studentProfileId: profile.id } } }); return this.get(userId); }
  async quote(userId: string, dto: QuoteDto) { const profile = await this.profile(userId); return this.pricing.quote(profile.id, dto); }
}

