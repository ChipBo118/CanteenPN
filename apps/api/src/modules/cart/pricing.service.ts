import { HttpStatus, Injectable } from '@nestjs/common';
import { DiscountType, Prisma, StudentVoucherStatus } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import type { QuoteDto } from './cart.dto';
import { calculateComboPrice, calculateProductUnitPrice } from './pricing.rules';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

export type PricedLine = {
  cartItemId: string;
  productId?: string;
  comboId?: string;
  variantId?: string;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  comboSavings: number;
  note?: string;
  options: { groupName: string; valueName: string; priceAdjustment: number }[];
  requiresKitchen: boolean;
};

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(studentProfileId: string, discounts: QuoteDto, client: DatabaseClient = this.prisma) {
    const [cart, setting, loyalty] = await Promise.all([
      client.cart.findUnique({ where: { studentProfileId }, include: { items: { orderBy: { createdAt: 'asc' }, include: { product: { include: { recipes: { include: { ingredients: { include: { ingredient: true } } } } } }, combo: { include: { items: { include: { product: { include: { recipes: { include: { ingredients: { include: { ingredient: true } } } } } }, variant: true } } } }, variant: true, options: { include: { optionValue: { include: { optionGroup: true } } } } } } } }),
      client.canteenSetting.findUnique({ where: { id: 'default' } }),
      client.loyaltyAccount.findUnique({ where: { studentProfileId } }),
    ]);
    if (!cart?.items.length) throw new ApiError(HttpStatus.BAD_REQUEST, 'CART_EMPTY', 'Giỏ hàng đang trống.');

    const lines: PricedLine[] = cart.items.map(item => {
      if (item.product) {
        if (!item.product.isAvailable || item.product.deletedAt) throw new ApiError(HttpStatus.CONFLICT, 'PRODUCT_UNAVAILABLE', `${item.product.name} hiện đã hết món.`);
        const recipeAvailable = !item.product.recipes.length || item.product.recipes.some(recipe => recipe.ingredients.every(line => line.ingredient.currentQuantity.sub(line.ingredient.reservedQuantity).greaterThanOrEqualTo(line.quantity.mul(item.quantity))));
        if (!recipeAvailable) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_INVENTORY', `${item.product.name} không đủ nguyên liệu để phục vụ số lượng đã chọn.`);
        if (item.variant && item.variant.productId !== item.product.id) throw new ApiError(HttpStatus.BAD_REQUEST, 'VARIANT_INVALID', 'Biến thể không thuộc sản phẩm đã chọn.');
        const options = item.options.map(selected => ({ groupName: selected.optionValue.optionGroup.name, valueName: selected.optionValue.name, priceAdjustment: selected.optionValue.priceAdjustment }));
        const unitPrice = calculateProductUnitPrice(item.product.basePrice, item.variant?.priceAdjustment ?? 0, options.map(option => option.priceAdjustment));
        return { cartItemId: item.id, productId: item.product.id, variantId: item.variantId ?? undefined, name: item.product.name, variantName: item.variant?.name, quantity: item.quantity, unitPrice, lineSubtotal: unitPrice * item.quantity, comboSavings: 0, note: item.note ?? undefined, options, requiresKitchen: item.product.preparationTimeMinutes > 1 };
      }
      if (item.combo) {
        if (!item.combo.isActive || item.combo.deletedAt) throw new ApiError(HttpStatus.CONFLICT, 'PRODUCT_UNAVAILABLE', `${item.combo.name} hiện không khả dụng.`);
        const comboAvailable = item.combo.items.every(comboItem => !comboItem.product.recipes.length || comboItem.product.recipes.some(recipe => recipe.ingredients.every(line => line.ingredient.currentQuantity.sub(line.ingredient.reservedQuantity).greaterThanOrEqualTo(line.quantity.mul(comboItem.quantity * item.quantity)))));
        if (!comboAvailable) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_INVENTORY', `${item.combo.name} không đủ nguyên liệu để phục vụ số lượng đã chọn.`);
        const original = item.combo.items.reduce((sum, comboItem) => sum + (comboItem.product.basePrice + (comboItem.variant?.priceAdjustment ?? 0)) * comboItem.quantity, 0);
        const unitPrice = calculateComboPrice(original, item.combo.discountPercentage);
        return { cartItemId: item.id, comboId: item.combo.id, name: item.combo.name, quantity: item.quantity, unitPrice, lineSubtotal: unitPrice * item.quantity, comboSavings: (original - unitPrice) * item.quantity, note: item.note ?? undefined, options: [], requiresKitchen: true };
      }
      throw new ApiError(HttpStatus.BAD_REQUEST, 'CART_ITEM_INVALID', 'Mục trong giỏ hàng không hợp lệ.');
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const comboSavings = lines.reduce((sum, line) => sum + line.comboSavings, 0);
    const now = new Date();
    let couponDiscount = 0;
    let couponId: string | undefined;
    if (discounts.couponCode) {
      const coupon = await client.coupon.findUnique({ where: { code: discounts.couponCode.trim().toUpperCase() } });
      if (!coupon || !coupon.isActive) throw new ApiError(HttpStatus.BAD_REQUEST, 'COUPON_INVALID', 'Mã giảm giá không hợp lệ.');
      if (coupon.startAt > now || coupon.expireAt < now) throw new ApiError(HttpStatus.BAD_REQUEST, 'COUPON_EXPIRED', 'Mã giảm giá chưa có hiệu lực hoặc đã hết hạn.');
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw new ApiError(HttpStatus.CONFLICT, 'COUPON_USAGE_LIMIT_REACHED', 'Mã giảm giá đã hết lượt sử dụng.');
      if (subtotal < coupon.minimumOrderValue || (coupon.requiresCombo && !lines.some(line => line.comboId))) throw new ApiError(HttpStatus.BAD_REQUEST, 'COUPON_CONDITIONS_NOT_MET', 'Đơn hàng chưa đủ điều kiện áp dụng mã giảm giá.');
      const used = await client.couponUsage.count({ where: { couponId: coupon.id, studentProfileId } });
      if (used >= coupon.perStudentLimit) throw new ApiError(HttpStatus.CONFLICT, 'COUPON_STUDENT_LIMIT_REACHED', 'Bạn đã dùng hết lượt của mã giảm giá này.');
      couponDiscount = coupon.type === DiscountType.PERCENTAGE ? Math.round(subtotal * coupon.discountValue / 100) : coupon.type === DiscountType.FIXED_AMOUNT ? coupon.discountValue : 0;
      couponDiscount = Math.min(couponDiscount, coupon.maximumDiscount ?? couponDiscount, subtotal);
      couponId = coupon.id;
    }
    let afterCoupon = Math.max(0, subtotal - couponDiscount);
    let voucherDiscount = 0;
    let studentVoucherId: string | undefined;
    if (discounts.studentVoucherId) {
      const owned = await client.studentVoucher.findFirst({ where: { id: discounts.studentVoucherId, studentProfileId }, include: { voucher: true } });
      if (!owned || owned.status !== StudentVoucherStatus.ACTIVE || !owned.voucher.isActive || owned.voucher.startAt > now || owned.voucher.expireAt < now) throw new ApiError(HttpStatus.BAD_REQUEST, 'VOUCHER_INVALID', 'Voucher không hợp lệ hoặc đã hết hạn.');
      if (subtotal < owned.voucher.minimumOrderValue) throw new ApiError(HttpStatus.BAD_REQUEST, 'VOUCHER_CONDITIONS_NOT_MET', 'Đơn hàng chưa đạt giá trị tối thiểu của voucher.');
      voucherDiscount = owned.voucher.discountType === DiscountType.PERCENTAGE ? Math.round(afterCoupon * owned.voucher.discountValue / 100) : owned.voucher.discountValue;
      voucherDiscount = Math.min(voucherDiscount, owned.voucher.maximumDiscount ?? voucherDiscount, afterCoupon);
      studentVoucherId = owned.id;
    }
    const afterVoucher = Math.max(0, afterCoupon - voucherDiscount);
    const pointsToUse = discounts.pointsToUse ?? 0;
    if (pointsToUse > (loyalty?.points ?? 0)) throw new ApiError(HttpStatus.BAD_REQUEST, 'INSUFFICIENT_POINTS', 'Số điểm khả dụng không đủ.');
    const pointValueVnd = setting?.pointValueVnd ?? 100;
    const pointDiscount = Math.min(pointsToUse * pointValueVnd, afterVoucher);
    const effectivePointsUsed = Math.ceil(pointDiscount / pointValueVnd);
    return { lines, subtotal, comboSavings, couponDiscount, voucherDiscount, pointDiscount, discountTotal: couponDiscount + voucherDiscount + pointDiscount, totalAmount: Math.max(0, afterVoucher - pointDiscount), couponId, studentVoucherId, pointsUsed: effectivePointsUsed, pointValueVnd };
  }
}

