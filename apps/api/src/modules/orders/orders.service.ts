import { HttpStatus, Injectable } from '@nestjs/common';
import { LoyaltyTransactionType, NotificationType, OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role, StudentVoucherStatus, WalletStatus, WalletTransactionType } from '@prisma/client';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { PricingService } from '../cart/pricing.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './orders.dto';
import { canStudentCancel } from './order-rules';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: PricingService, private readonly inventory: InventoryService, private readonly realtime: RealtimeService) {}
  private pickupSecret() { return process.env.PICKUP_TOKEN_SECRET ?? process.env.JWT_REFRESH_SECRET ?? 'development-pickup-secret-change-me'; }
  private pickupToken(orderId: string) { return createHmac('sha256', this.pickupSecret()).update(orderId).digest('base64url'); }
  private tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private async profile(userId: string) { const value = await this.prisma.studentProfile.findUnique({ where: { userId } }); if (!value) throw new ApiError(HttpStatus.FORBIDDEN, 'STUDENT_PROFILE_REQUIRED', 'Chỉ sinh viên mới có thể đặt món.'); return value; }

  private async validatePickup(dto: CreateOrderDto, tx: Prisma.TransactionClient) {
    const setting = await tx.canteenSetting.findUnique({ where: { id: 'default' } });
    if (dto.pickupType === 'SCHEDULED' && !dto.scheduledPickupAt) throw new ApiError(HttpStatus.BAD_REQUEST, 'PICKUP_TIME_REQUIRED', 'Vui lòng chọn giờ nhận món.');
    if (!dto.scheduledPickupAt) return null;
    const pickup = new Date(dto.scheduledPickupAt);
    if (pickup <= new Date()) throw new ApiError(HttpStatus.BAD_REQUEST, 'PICKUP_TIME_IN_PAST', 'Giờ nhận món không thể ở trong quá khứ.');
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: setting?.timezone ?? 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
    const time = formatter.format(pickup);
    if (time < (setting?.openingTime ?? '07:00') || time > (setting?.closingTime ?? '18:00')) throw new ApiError(HttpStatus.BAD_REQUEST, 'PICKUP_OUTSIDE_BUSINESS_HOURS', 'Giờ nhận món nằm ngoài giờ hoạt động của căng tin.');
    return pickup;
  }

  async create(userId: string, dto: CreateOrderDto, idempotencyKey: string | undefined) {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new ApiError(HttpStatus.BAD_REQUEST, 'IDEMPOTENCY_KEY_REQUIRED', 'Checkout yêu cầu Idempotency-Key hợp lệ.');
    const profile = await this.profile(userId);
    const existing = await this.prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) { if (existing.studentProfileId !== profile.id) throw new ApiError(HttpStatus.CONFLICT, 'IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key đã được sử dụng.'); return this.detailById(existing.id, profile.id); }
    const result = await this.prisma.$transaction(async tx => {
      const duplicate = await tx.order.findUnique({ where: { idempotencyKey } });
      if (duplicate) return this.detailWithClient(tx, duplicate.id, profile.id);
      const quote = await this.pricing.quote(profile.id, dto, tx);
      const scheduledPickupAt = await this.validatePickup(dto, tx);
      const vietnamDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const counterDate = new Date(`${vietnamDate}T00:00:00.000Z`);
      const counter = await tx.orderDailyCounter.upsert({ where: { date: counterDate }, update: { value: { increment: 1 } }, create: { date: counterDate, value: 1 } });
      const orderCode = `ORD-${vietnamDate.replaceAll('-', '')}-${String(counter.value).padStart(5, '0')}`;
      let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
      if (dto.paymentMethod === PaymentMethod.CANTEEN_WALLET) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } });
        const debit = await tx.wallet.updateMany({ where: { id: wallet.id, status: WalletStatus.ACTIVE, balance: { gte: quote.totalAmount } }, data: { balance: { decrement: quote.totalAmount } } });
        if (!debit.count) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_WALLET_BALANCE', 'Số dư ví không đủ để thanh toán.');
        paymentStatus = PaymentStatus.PAID;
      }
      const order = await tx.order.create({ data: {
        orderCode, idempotencyKey, studentProfileId: profile.id, diningType: dto.diningType, pickupType: dto.pickupType, scheduledPickupAt, subtotal: quote.subtotal, comboSavings: quote.comboSavings, couponDiscount: quote.couponDiscount, voucherDiscount: quote.voucherDiscount, pointDiscount: quote.pointDiscount, discountTotal: quote.discountTotal, totalAmount: quote.totalAmount, pointsUsed: quote.pointsUsed, paymentMethod: dto.paymentMethod, paymentStatus, couponId: quote.couponId, studentVoucherId: quote.studentVoucherId, note: dto.note,
        items: { create: quote.lines.map(line => ({ productId: line.productId, comboId: line.comboId, variantId: line.variantId, quantity: line.quantity, productNameSnapshot: line.name, variantNameSnapshot: line.variantName, unitPriceSnapshot: line.unitPrice, selectedOptionsSnapshot: line.options, lineSubtotal: line.lineSubtotal, note: line.note, requiresKitchen: line.requiresKitchen, options: { create: line.options.map(option => ({ optionGroupNameSnapshot: option.groupName, optionValueNameSnapshot: option.valueName, priceAdjustmentSnapshot: option.priceAdjustment })) }, kitchenTask: line.requiresKitchen ? { create: {} } : undefined })) },
        statusHistory: { create: { newStatus: OrderStatus.PENDING, changedByUserId: userId, note: 'Sinh viên tạo đơn' } },
        payments: { create: { method: dto.paymentMethod, status: paymentStatus, amount: quote.totalAmount, idempotencyKey: `payment-${idempotencyKey}`, providerRef: dto.paymentMethod === PaymentMethod.VNPAY_QR_MOCK ? `VNPAY-MOCK-${randomUUID()}` : undefined, qrPayload: dto.paymentMethod === PaymentMethod.VNPAY_QR_MOCK ? `canteengo://mock-vnpay/${orderCode}` : undefined, paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : undefined } },
      }});
      if (dto.paymentMethod === PaymentMethod.CANTEEN_WALLET) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } });
        await tx.walletTransaction.create({ data: { walletId: wallet.id, orderId: order.id, type: WalletTransactionType.PAYMENT, amount: -quote.totalAmount, balanceBefore: wallet.balance + quote.totalAmount, balanceAfter: wallet.balance, description: `Thanh toán ${order.orderCode}`, reference: `WALLET-${order.id}` } });
      }
      if (quote.couponId) { await tx.couponUsage.create({ data: { couponId: quote.couponId, studentProfileId: profile.id, orderId: order.id, discountAmount: quote.couponDiscount } }); await tx.coupon.update({ where: { id: quote.couponId }, data: { usageCount: { increment: 1 } } }); }
      if (quote.studentVoucherId) await tx.studentVoucher.update({ where: { id: quote.studentVoucherId }, data: { status: StudentVoucherStatus.USED, usedAt: new Date() } });
      if (quote.pointsUsed) {
        const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: profile.id } });
        const changed = await tx.loyaltyAccount.updateMany({ where: { id: account.id, points: { gte: quote.pointsUsed } }, data: { points: { decrement: quote.pointsUsed } } });
        if (!changed.count) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_POINTS', 'Số điểm đã thay đổi, vui lòng thử lại.');
        await tx.loyaltyTransaction.create({ data: { loyaltyAccountId: account.id, orderId: order.id, type: LoyaltyTransactionType.SPEND, points: -quote.pointsUsed, balanceBefore: account.points, balanceAfter: account.points - quote.pointsUsed, description: `Dùng điểm cho ${order.orderCode}`, reference: `POINT-SPEND-${order.id}` } });
      }
      await tx.cartItem.deleteMany({ where: { cart: { studentProfileId: profile.id } } });
      await tx.notification.create({ data: { userId, type: NotificationType.ORDER, title: `Đã tạo ${order.orderCode}`, message: 'Đơn đang chờ thu ngân xác nhận.', data: { orderId: order.id, orderCode } } });
      return this.detailWithClient(tx, order.id, profile.id);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
    this.realtime.emitToRole(Role.CASHIER, 'order:new', result);
    this.realtime.emitToRole(Role.ADMIN, 'order:new', result);
    return result;
  }

  private detailInclude(): Prisma.OrderInclude {
    return {
      items: { include: { options: true, kitchenTask: true } },
      payments: { orderBy: { createdAt: 'desc' } },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { email: true, role: true } } },
      },
      pickupToken: true,
      chatRoom: true,
    };
  }

  private async detailWithClient(client: Prisma.TransactionClient, id: string, studentProfileId?: string) {
    const order = await client.order.findFirst({
      where: { id, ...(studentProfileId ? { studentProfileId } : {}) },
      include: this.detailInclude(),
    });
    if (!order) throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    return { ...order, pickupQrToken: order.pickupToken?.status === 'ACTIVE' ? this.pickupToken(order.id) : undefined };
  }

  async detailById(id: string, studentProfileId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, ...(studentProfileId ? { studentProfileId } : {}) },
      include: this.detailInclude(),
    });
    if (!order) throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    return { ...order, pickupQrToken: order.pickupToken?.status === 'ACTIVE' ? this.pickupToken(order.id) : undefined };
  }
  async mine(userId: string) { const profile = await this.profile(userId); return this.prisma.order.findMany({ where: { studentProfileId: profile.id }, include: { items: true }, orderBy: { createdAt: 'desc' } }); }
  async mineDetail(userId: string, id: string) { const profile = await this.profile(userId); return this.detailById(id, profile.id); }

  async cancelByStudent(userId: string, orderId: string, reason: string) {
    const profile = await this.profile(userId);
    const result = await this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id: orderId, studentProfileId: profile.id }, include: { items: { include: { kitchenTask: true } } } });
      if (!order) throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      if (!canStudentCancel(order.status, order.items.map(item => item.kitchenTask?.status))) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_CANNOT_BE_CANCELLED', 'Đơn đã bắt đầu chế biến nên không thể tự hủy.');
      await this.inventory.releaseForOrder(tx, order.id);
      let paymentStatus = order.paymentStatus;
      if (order.paymentStatus === PaymentStatus.PAID) { paymentStatus = PaymentStatus.REFUNDED; await tx.payment.updateMany({ where: { orderId: order.id, status: PaymentStatus.PAID }, data: { status: PaymentStatus.REFUNDED } }); }
      if (order.paymentMethod === PaymentMethod.CANTEEN_WALLET && order.paymentStatus === PaymentStatus.PAID) { const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } }); await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: order.totalAmount } } }); await tx.walletTransaction.create({ data: { walletId: wallet.id, orderId: order.id, type: WalletTransactionType.REFUND, amount: order.totalAmount, balanceBefore: wallet.balance, balanceAfter: wallet.balance + order.totalAmount, description: `Hoàn tiền ${order.orderCode}`, reference: `REFUND-${order.id}` } }); }
      if (order.pointsUsed > 0) { const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: profile.id } }); await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: order.pointsUsed } } }); await tx.loyaltyTransaction.create({ data: { loyaltyAccountId: account.id, orderId: order.id, type: LoyaltyTransactionType.REFUND, points: order.pointsUsed, balanceBefore: account.points, balanceAfter: account.points + order.pointsUsed, description: `Hoàn điểm ${order.orderCode}`, reference: `POINT-REFUND-${order.id}` } }); }
      if (order.couponId) { const deleted = await tx.couponUsage.deleteMany({ where: { orderId: order.id } }); if (deleted.count) await tx.coupon.update({ where: { id: order.couponId }, data: { usageCount: { decrement: 1 } } }); }
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED, paymentStatus, cancellationReason: reason, cancelledAt: new Date(), statusHistory: { create: { oldStatus: order.status, newStatus: OrderStatus.CANCELLED, changedByUserId: userId, note: reason } } } });
      if (order.studentVoucherId) await tx.studentVoucher.update({ where: { id: order.studentVoucherId }, data: { status: StudentVoucherStatus.ACTIVE, usedAt: null } });
      return this.detailWithClient(tx, order.id, profile.id);
    });
    this.realtime.emitToOrder(orderId, 'order:cancelled', result);
    return result;
  }

  cashierQueue(status?: OrderStatus) { return this.prisma.order.findMany({ where: status ? { status } : { status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.REJECTED] } }, include: { items: true, studentProfile: { include: { studentDirectory: true } } }, orderBy: { createdAt: 'asc' } }); }

  async accept(cashierUserId: string, orderId: string) {
    const result = await this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== OrderStatus.PENDING) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_STATUS_TRANSITION_INVALID', 'Chỉ có thể nhận đơn đang chờ.');
      await this.inventory.reserveForOrder(tx, order.id);
      const raw = this.pickupToken(order.id);
      await tx.orderPickupToken.create({ data: { orderId: order.id, tokenHash: this.tokenHash(raw), tokenHint: raw.slice(-6), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
      await tx.chatRoom.create({ data: { orderId: order.id, participants: { create: [{ userId: cashierUserId }, { userId: (await tx.studentProfile.findUniqueOrThrow({ where: { id: order.studentProfileId } })).userId }] } } });
      const taskCount = await tx.kitchenTask.count({ where: { orderItem: { orderId: order.id } } });
      const nextStatus = taskCount ? OrderStatus.ACCEPTED : OrderStatus.READY;
      await tx.order.update({ where: { id: order.id }, data: { status: nextStatus, acceptedAt: new Date(), readyAt: taskCount ? undefined : new Date(), statusHistory: { create: [{ oldStatus: OrderStatus.PENDING, newStatus: OrderStatus.ACCEPTED, changedByUserId: cashierUserId }, ...(taskCount ? [] : [{ oldStatus: OrderStatus.ACCEPTED, newStatus: OrderStatus.READY, changedByUserId: cashierUserId, note: 'Đơn không cần chế biến' }])] } } });
      const student = await tx.studentProfile.findUniqueOrThrow({ where: { id: order.studentProfileId } });
      await tx.notification.create({ data: { userId: student.userId, type: NotificationType.ORDER, title: `${order.orderCode} đã được xác nhận`, message: 'Đơn đã chuyển đến nhà bếp.', data: { orderId: order.id } } });
      return this.detailWithClient(tx, order.id);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.realtime.emitToOrder(orderId, 'order:accepted', result);
    if (result.status === OrderStatus.READY) this.realtime.emitToOrder(orderId, 'order:ready', result); else this.realtime.emitToRole(Role.KITCHEN_STAFF, 'kitchen:order-available', result);
    return result;
  }

  async reject(cashierUserId: string, orderId: string, reason: string) {
    const result = await this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== OrderStatus.PENDING) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_STATUS_TRANSITION_INVALID', 'Chỉ có thể từ chối đơn đang chờ.');
      const changed = await tx.order.updateMany({ where: { id: orderId, status: OrderStatus.PENDING }, data: { status: OrderStatus.REJECTED, cancellationReason: reason } });
      if (!changed.count) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_STATUS_TRANSITION_INVALID', 'Trạng thái đơn vừa thay đổi, vui lòng tải lại.');
      let paymentStatus = order.paymentStatus;
      if (order.paymentStatus === PaymentStatus.PAID) {
        paymentStatus = PaymentStatus.REFUNDED;
        await tx.payment.updateMany({ where: { orderId, status: PaymentStatus.PAID }, data: { status: PaymentStatus.REFUNDED } });
      }
      if (order.paymentMethod === PaymentMethod.CANTEEN_WALLET && order.paymentStatus === PaymentStatus.PAID) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: order.studentProfileId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: order.totalAmount } } });
        await tx.walletTransaction.create({ data: { walletId: wallet.id, orderId, type: WalletTransactionType.REFUND, amount: order.totalAmount, balanceBefore: wallet.balance, balanceAfter: wallet.balance + order.totalAmount, description: `Hoàn tiền ${order.orderCode}`, reference: `REJECT-REFUND-${order.id}` } });
      }
      if (order.pointsUsed > 0) {
        const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: order.studentProfileId } });
        await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: order.pointsUsed } } });
        await tx.loyaltyTransaction.create({ data: { loyaltyAccountId: account.id, orderId, type: LoyaltyTransactionType.REFUND, points: order.pointsUsed, balanceBefore: account.points, balanceAfter: account.points + order.pointsUsed, description: `Hoàn điểm ${order.orderCode}`, reference: `REJECT-POINTS-${order.id}` } });
      }
      if (order.couponId) {
        const deleted = await tx.couponUsage.deleteMany({ where: { orderId } });
        if (deleted.count) await tx.coupon.update({ where: { id: order.couponId }, data: { usageCount: { decrement: 1 } } });
      }
      if (order.studentVoucherId) await tx.studentVoucher.update({ where: { id: order.studentVoucherId }, data: { status: StudentVoucherStatus.ACTIVE, usedAt: null } });
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus, statusHistory: { create: { oldStatus: OrderStatus.PENDING, newStatus: OrderStatus.REJECTED, changedByUserId: cashierUserId, note: reason } } } });
      const student = await tx.studentProfile.findUniqueOrThrow({ where: { id: order.studentProfileId } });
      await tx.notification.create({ data: { userId: student.userId, type: NotificationType.ORDER, title: `${order.orderCode} bị từ chối`, message: reason, data: { orderId } } });
      return this.detailWithClient(tx, orderId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.realtime.emitToOrder(orderId, 'order:rejected', result);
    return result;
  }
  async confirmCash(cashierUserId: string, orderId: string) { const result = await this.prisma.$transaction(async tx => { const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } }); if (order.paymentMethod !== PaymentMethod.CASH || order.paymentStatus !== PaymentStatus.PENDING) throw new ApiError(HttpStatus.CONFLICT, 'PAYMENT_CANNOT_BE_CONFIRMED', 'Thanh toán tiền mặt không ở trạng thái chờ.'); await tx.payment.updateMany({ where: { orderId, method: PaymentMethod.CASH, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.PAID, paidAt: new Date(), metadata: { confirmedBy: cashierUserId } } }); await tx.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.PAID } }); return this.detailWithClient(tx, orderId); }); this.realtime.emitToOrder(orderId, 'payment:updated', result); return result; }
  async handoff(cashierUserId: string, token: string) { const result = await this.prisma.$transaction(async tx => { const pickup = await tx.orderPickupToken.findUnique({ where: { tokenHash: this.tokenHash(token) }, include: { order: true } }); if (!pickup || pickup.status !== 'ACTIVE' || pickup.expiresAt <= new Date()) throw new ApiError(HttpStatus.BAD_REQUEST, 'PICKUP_TOKEN_INVALID', 'Mã QR không hợp lệ hoặc đã hết hạn.'); if (pickup.order.status !== OrderStatus.READY || pickup.order.paymentStatus !== PaymentStatus.PAID) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_NOT_READY_FOR_HANDOFF', 'Đơn chưa sẵn sàng hoặc chưa thanh toán.'); await tx.orderPickupToken.update({ where: { id: pickup.id }, data: { status: 'USED', usedAt: new Date() } }); await tx.order.update({ where: { id: pickup.orderId }, data: { status: OrderStatus.COMPLETED, completedAt: new Date(), statusHistory: { create: { oldStatus: OrderStatus.READY, newStatus: OrderStatus.COMPLETED, changedByUserId: cashierUserId } } } }); const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: pickup.order.studentProfileId } }); const earned = Math.floor(pickup.order.totalAmount / 1000); await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: earned } } }); await tx.loyaltyTransaction.create({ data: { loyaltyAccountId: account.id, orderId: pickup.orderId, type: LoyaltyTransactionType.EARN, points: earned, balanceBefore: account.points, balanceAfter: account.points + earned, description: `Hoàn tất ${pickup.order.orderCode}`, reference: `POINT-EARN-${pickup.orderId}` } }); const student = await tx.studentProfile.findUniqueOrThrow({ where: { id: pickup.order.studentProfileId } }); await tx.notification.create({ data: { userId: student.userId, type: NotificationType.ORDER, title: `${pickup.order.orderCode} đã hoàn tất`, message: `Bạn nhận được ${earned} điểm CanteenPN.`, data: { orderId: pickup.orderId } } }); return this.detailWithClient(tx, pickup.orderId); }); this.realtime.emitToOrder(result.id, 'order:completed', result); return result; }
}

