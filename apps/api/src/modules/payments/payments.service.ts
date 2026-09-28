import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}
  async get(userId: string, orderId: string) { const payment = await this.prisma.payment.findFirst({ where: { orderId, order: { OR: [{ studentProfile: { userId } }, { statusHistory: { some: { changedByUserId: userId } } }] } }, orderBy: { createdAt: 'desc' } }); if (!payment) throw new ApiError(HttpStatus.NOT_FOUND, 'PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch thanh toán.'); return payment; }
  async mockVnpaySuccess(userId: string, orderId: string) {
    const result = await this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id: orderId, studentProfile: { userId } }, include: { payments: { orderBy: { createdAt: 'desc' } }, studentProfile: true } });
      if (!order) throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      const payment = order.payments.find(item => item.method === PaymentMethod.VNPAY_QR_MOCK && item.status === PaymentStatus.PENDING);
      if (!payment) throw new ApiError(HttpStatus.CONFLICT, 'PAYMENT_CANNOT_BE_CONFIRMED', 'Giao dịch VNPay mock không ở trạng thái chờ.');
      const updated = await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PAID, paidAt: new Date(), metadata: { demoAction: 'Mô phỏng thanh toán thành công', confirmedByUserId: userId } } });
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.PAID } });
      await tx.notification.create({ data: { userId, type: NotificationType.PAYMENT, title: 'Thanh toán thành công', message: `Đơn ${order.orderCode} đã được thanh toán qua VNPay QR mô phỏng.`, data: { orderId } } });
      return updated;
    });
    this.realtime.emitToOrder(orderId, 'payment:paid', result);
    return result;
  }
}

