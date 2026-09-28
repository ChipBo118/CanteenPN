import {BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {OrderStatus, PaymentMethod, PaymentStatus, Prisma} from '@prisma/client';
import {randomUUID} from 'crypto';
import {CreateOrderDto} from './orders.dto';
import {day} from './menu.service';
import {PrismaService} from './prisma.service';

const includeOrder = {items: true, payment: true, pickupSlot: true, statusHistory: {orderBy: {createdAt: 'asc' as const}}};
const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PLACED: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['PREPARING', 'REJECTED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.order.findMany({where: {userId}, include: includeOrder, orderBy: {createdAt: 'desc'}});
  }

  listForStaff() {
    return this.prisma.order.findMany({where: {status: {notIn: ['CANCELLED', 'EXPIRED']}}, include: {...includeOrder, user: {select: {fullName: true}}}, orderBy: [{pickupSlot: {startsAt: 'asc'}}, {createdAt: 'asc'}]});
  }

  async create(userId: string, dto: CreateOrderDto, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new BadRequestException('Thiếu Idempotency-Key hợp lệ.');
    const existing = await this.prisma.payment.findUnique({where: {idempotencyKey}, include: {order: {include: includeOrder}}});
    if (existing) return existing.order;
    const grouped = new Map<string, {quantity: number; note?: string}>();
    for (const line of dto.items) {
      const previous = grouped.get(line.menuItemId);
      grouped.set(line.menuItemId, {quantity: (previous?.quantity || 0) + line.quantity, note: line.note || previous?.note});
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const slot = await tx.pickupSlot.findUnique({where: {id: dto.pickupSlotId}});
        if (!slot || !slot.active || slot.startsAt <= new Date()) throw new BadRequestException('Khung giờ nhận không còn khả dụng.');
        if (slot.reserved >= slot.capacity) throw new ConflictException('Khung giờ vừa hết chỗ.');
        const ids = [...grouped.keys()];
        const menu = await tx.menuItem.findMany({where: {id: {in: ids}, active: true}});
        if (menu.length !== ids.length) throw new BadRequestException('Có món không tồn tại hoặc đã ngừng bán.');
        let subtotal = 0;
        for (const item of menu) {
          const qty = grouped.get(item.id)!.quantity;
          const stock = await tx.dailyItemStock.updateMany({where: {menuItemId: item.id, date: day(slot.startsAt), available: {gte: qty}}, data: {available: {decrement: qty}, reserved: {increment: qty}}});
          if (!stock.count) throw new ConflictException(`${item.name} vừa hết số lượng yêu cầu.`);
          subtotal += Number(item.price) * qty;
        }
        const promotion = dto.promotionCode ? await this.validPromotion(tx, dto.promotionCode, userId, subtotal) : null;
        const discount = promotion ? calculateDiscount(promotion.type, Number(promotion.value), Number(promotion.maxDiscount), subtotal) : 0;
        const total = Math.max(0, subtotal - discount);
        if (dto.paymentMethod === PaymentMethod.WALLET) {
          const debit = await tx.user.updateMany({where: {id: userId, walletBalance: {gte: total}}, data: {walletBalance: {decrement: total}}});
          if (!debit.count) throw new BadRequestException('Số dư ví không đủ.');
        }
        await tx.pickupSlot.update({where: {id: slot.id}, data: {reserved: {increment: 1}}});
        const code = `CG-${Date.now().toString().slice(-6)}-${randomUUID().slice(0, 4).toUpperCase()}`;
        const status = dto.paymentMethod === PaymentMethod.VNPAY ? OrderStatus.AWAITING_PAYMENT : OrderStatus.PLACED;
        const order = await tx.order.create({data: {
          code, status, subtotal, discount, total, note: dto.note,
          cancelUntil: new Date(Date.now() + 5 * 60_000), qrToken: randomUUID(), userId,
          pickupSlotId: slot.id, promotionId: promotion?.id,
          items: {create: menu.map(item => ({menuItemId: item.id, nameSnapshot: item.name, unitPrice: item.price, quantity: grouped.get(item.id)!.quantity, note: grouped.get(item.id)!.note}))},
          payment: {create: {method: dto.paymentMethod, status: dto.paymentMethod === PaymentMethod.WALLET ? PaymentStatus.PAID : PaymentStatus.PENDING, amount: total, idempotencyKey}},
          statusHistory: {create: {status, actorId: userId}},
          ...(promotion ? {promotionUsage: {create: {promotionId: promotion.id, userId}}} : {}),
        }, include: includeOrder});
        if (dto.paymentMethod === PaymentMethod.WALLET) {
          const user = await tx.user.findUniqueOrThrow({where: {id: userId}});
          await tx.walletTransaction.create({data: {userId, type: 'ORDER_PAYMENT', amount: -total, balanceAfter: user.walletBalance, reference: `PAY-${order.code}`}});
        }
        return order;
      }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
    } catch (error: any) {
      if (error?.code === 'P2034') throw new ConflictException('Dữ liệu vừa thay đổi, vui lòng thử đặt lại.');
      throw error;
    }
  }

  async cancel(userId: string, orderId: string) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({where: {id: orderId}, include: {items: true, payment: true, pickupSlot: true}});
      if (!order) throw new NotFoundException('Không tìm thấy đơn.');
      if (order.userId !== userId) throw new ForbiddenException();
      if (!['AWAITING_PAYMENT', 'PLACED'].includes(order.status)) throw new BadRequestException('Đơn đã được xử lý nên không thể hủy.');
      if (order.cancelUntil < new Date()) throw new BadRequestException('Đã quá thời hạn hủy 5 phút.');
      for (const line of order.items) {
        await tx.dailyItemStock.update({where: {date_menuItemId: {date: day(order.pickupSlot.startsAt), menuItemId: line.menuItemId}}, data: {available: {increment: line.quantity}, reserved: {decrement: line.quantity}}});
      }
      await tx.pickupSlot.update({where: {id: order.pickupSlotId}, data: {reserved: {decrement: 1}}});
      if (order.payment?.status === PaymentStatus.PAID && order.payment.method === PaymentMethod.WALLET) {
        const user = await tx.user.update({where: {id: userId}, data: {walletBalance: {increment: order.total}}});
        await tx.walletTransaction.create({data: {userId, type: 'ORDER_REFUND', amount: order.total, balanceAfter: user.walletBalance, reference: `REFUND-${order.code}`}});
        await tx.payment.update({where: {id: order.payment.id}, data: {status: PaymentStatus.REFUNDED}});
      }
      return tx.order.update({where: {id: orderId}, data: {status: OrderStatus.CANCELLED, statusHistory: {create: {status: OrderStatus.CANCELLED, actorId: userId, note: 'Sinh viên hủy trong thời hạn'}}}, include: includeOrder});
    });
  }

  async transition(actorId: string, orderId: string, nextInput: string, note?: string) {
    const next = nextInput as OrderStatus;
    const order = await this.prisma.order.findUnique({where: {id: orderId}});
    if (!order) throw new NotFoundException('Không tìm thấy đơn.');
    if (!transitions[order.status]?.includes(next)) throw new BadRequestException(`Không thể chuyển từ ${order.status} sang ${next}.`);
    return this.prisma.$transaction(async tx => {
      const updated = await tx.order.update({where: {id: orderId}, data: {status: next, ...(next === 'COMPLETED' ? {qrUsedAt: new Date()} : {}), statusHistory: {create: {status: next, actorId, note}}}, include: includeOrder});
      await tx.notification.create({data: {userId: order.userId, type: 'ORDER_STATUS', title: `Đơn ${order.code}`, body: `Trạng thái mới: ${next}`}});
      return updated;
    });
  }

  private async validPromotion(tx: Prisma.TransactionClient, codeInput: string, userId: string, subtotal: number) {
    const now = new Date();
    const promotion = await tx.promotion.findUnique({where: {code: codeInput.trim().toUpperCase()}});
    if (!promotion || !promotion.active || promotion.startsAt > now || promotion.endsAt < now) throw new BadRequestException('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    if (subtotal < Number(promotion.minSpend)) throw new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu của mã ưu đãi.');
    const [totalUses, userUses] = await Promise.all([
      tx.promotionUsage.count({where: {promotionId: promotion.id}}),
      tx.promotionUsage.count({where: {promotionId: promotion.id, userId}}),
    ]);
    if (totalUses >= promotion.usageLimit || userUses >= promotion.perUserLimit) throw new BadRequestException('Mã ưu đãi đã hết lượt sử dụng.');
    return promotion;
  }
}

export function calculateDiscount(type: string, value: number, maxDiscount: number, subtotal: number) {
  const raw = type === 'PERCENT' ? subtotal * value / 100 : value;
  return Math.min(raw, Number.isFinite(maxDiscount) && maxDiscount > 0 ? maxDiscount : raw, subtotal);
}
