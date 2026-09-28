import { HttpStatus, Injectable } from '@nestjs/common';
import { LoyaltyTransactionType, NotificationType, OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role, StudentVoucherStatus, UserStatus, WalletRequestStatus, WalletRequestType, WalletTransactionType } from '@prisma/client';
import * as argon2 from 'argon2';
import * as XLSX from 'xlsx';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateCouponDto, CreateVoucherDto, StudentQueryDto, UpdateCouponDto, UpdateSettingsDto, UpdateVoucherDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly inventory: InventoryService) {}
  async students(query: StudentQueryDto) { const where: Prisma.StudentDirectoryWhereInput = query.search ? { OR: [{ studentCode: { contains: query.search, mode: 'insensitive' } }, { schoolEmail: { contains: query.search, mode: 'insensitive' } }, { fullName: { contains: query.search, mode: 'insensitive' } }] } : {}; const [items, total] = await this.prisma.$transaction([this.prisma.studentDirectory.findMany({ where, include: { studentProfile: { include: { user: { select: { id: true, status: true, lastLoginAt: true, createdAt: true } }, _count: { select: { orders: true } } } } }, orderBy: { studentCode: 'asc' }, skip: (query.page - 1) * query.limit, take: query.limit }), this.prisma.studentDirectory.count({ where })]); return { items, meta: { ...query, total, pageCount: Math.ceil(total / query.limit) } }; }
  async setStudentStatus(actorUserId: string, userId: string, status: UserStatus, reason: string) { const before = await this.prisma.user.findUnique({ where: { id: userId } }); if (!before || before.role !== Role.STUDENT) throw new ApiError(HttpStatus.NOT_FOUND, 'STUDENT_NOT_FOUND', 'Không tìm thấy tài khoản sinh viên.'); const updated = await this.prisma.$transaction(async tx => { const user = await tx.user.update({ where: { id: userId }, data: { status } }); await tx.auditLog.create({ data: { actorUserId, action: `STUDENT_ACCOUNT_${status}`, entityType: 'User', entityId: userId, beforeData: { status: before.status }, afterData: { status, reason } } }); if (status !== UserStatus.ACTIVE) await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); return user; }); return updated; }
  async resetStudentPassword(actorUserId: string, userId: string, password: string, reason: string) { const user = await this.prisma.user.findUnique({ where: { id: userId } }); if (!user || user.role !== Role.STUDENT) throw new ApiError(HttpStatus.NOT_FOUND, 'STUDENT_NOT_FOUND', 'Không tìm thấy tài khoản sinh viên.'); const passwordHash = await argon2.hash(password); await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }), this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }), this.prisma.auditLog.create({ data: { actorUserId, action: 'STUDENT_PASSWORD_RESET', entityType: 'User', entityId: userId, afterData: { reason } } })]); return { message: 'Đã đặt lại mật khẩu và thu hồi mọi phiên đăng nhập.' }; }
  settings() { return this.prisma.canteenSetting.findUniqueOrThrow({ where: { id: 'default' } }); }
  async updateSettings(actorUserId: string, dto: UpdateSettingsDto) { const before = await this.settings(); const { expenses, ...fields } = dto; const data: Prisma.CanteenSettingUpdateInput = { ...fields, ...(expenses === undefined ? {} : { expenses: expenses as unknown as Prisma.InputJsonValue }) }; const updated = await this.prisma.canteenSetting.update({ where: { id: 'default' }, data }); await this.prisma.auditLog.create({ data: { actorUserId, action: 'SETTINGS_UPDATE', entityType: 'CanteenSetting', entityId: 'default', beforeData: before as unknown as Prisma.InputJsonValue, afterData: updated as unknown as Prisma.InputJsonValue } }); return updated; }
  coupons() { return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }); }
  createCoupon(dto: CreateCouponDto) { return this.prisma.coupon.create({ data: { ...dto, code: dto.code.toUpperCase(), startAt: new Date(dto.startAt), expireAt: new Date(dto.expireAt) } }); }
  updateCoupon(id: string, dto: UpdateCouponDto) { return this.prisma.coupon.update({ where: { id }, data: { ...dto, code: dto.code?.toUpperCase(), startAt: dto.startAt ? new Date(dto.startAt) : undefined, expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined } }); }
  vouchers() { return this.prisma.voucher.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }
  createVoucher(dto: CreateVoucherDto) { return this.prisma.voucher.create({ data: { ...dto, code: dto.code.toUpperCase(), remainingQuantity: dto.totalQuantity, startAt: new Date(dto.startAt), expireAt: new Date(dto.expireAt) } }); }
  async updateVoucher(id: string, dto: UpdateVoucherDto) { const current = await this.prisma.voucher.findUnique({ where: { id } }); if (!current) throw new ApiError(HttpStatus.NOT_FOUND, 'VOUCHER_NOT_FOUND', 'Không tìm thấy voucher.'); const issued = current.totalQuantity - current.remainingQuantity; if (dto.totalQuantity !== undefined && dto.totalQuantity < issued) throw new ApiError(HttpStatus.CONFLICT, 'VOUCHER_QUANTITY_INVALID', `Đã phát hành ${issued} voucher.`); return this.prisma.voucher.update({ where: { id }, data: { ...dto, code: dto.code?.toUpperCase(), remainingQuantity: dto.totalQuantity === undefined ? undefined : dto.totalQuantity - issued, startAt: dto.startAt ? new Date(dto.startAt) : undefined, expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined } }); }
  async deleteVoucher(id: string) { const result = await this.prisma.voucher.updateMany({ where: { id }, data: { isActive: false } }); if (!result.count) throw new ApiError(HttpStatus.NOT_FOUND, 'VOUCHER_NOT_FOUND', 'Không tìm thấy voucher.'); return { ok: true }; }

  async dashboard() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [revenue, ordersToday, pending, preparing, completed, activeStudents, employeesWorking, lowStock, recentOrders, recentReviews, orders30] = await Promise.all([
      this.prisma.order.aggregate({ where: { completedAt: { gte: start }, paymentStatus: PaymentStatus.PAID }, _sum: { totalAmount: true } }),
      this.prisma.order.count({ where: { createdAt: { gte: start } } }), this.prisma.order.count({ where: { status: OrderStatus.PENDING } }), this.prisma.order.count({ where: { status: OrderStatus.PREPARING } }), this.prisma.order.count({ where: { completedAt: { gte: start } } }), this.prisma.studentProfile.count({ where: { user: { status: UserStatus.ACTIVE } } }), this.prisma.attendance.count({ where: { clockInAt: { gte: start }, clockOutAt: null } }), this.prisma.ingredient.findMany({ where: { active: true }, orderBy: { currentQuantity: 'asc' }, take: 10 }), this.prisma.order.findMany({ include: { studentProfile: { include: { studentDirectory: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }), this.prisma.review.findMany({ include: { product: true }, orderBy: { createdAt: 'desc' }, take: 8 }), this.prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { createdAt: true, totalAmount: true, paymentMethod: true, status: true } }),
    ]);
    const revenueByDay = new Map<string, number>(); const ordersByHour = new Map<number, number>(); const paymentMethods = new Map<string, number>();
    for (const order of orders30) { const day = order.createdAt.toISOString().slice(0, 10); revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + (order.status === OrderStatus.COMPLETED ? order.totalAmount : 0)); const hour = order.createdAt.getUTCHours(); ordersByHour.set(hour, (ordersByHour.get(hour) ?? 0) + 1); paymentMethods.set(order.paymentMethod, (paymentMethods.get(order.paymentMethod) ?? 0) + 1); }
    return { summary: { revenueToday: revenue._sum.totalAmount ?? 0, ordersToday, pendingOrders: pending, preparingOrders: preparing, completedOrders: completed, activeStudents, employeesWorkingToday: employeesWorking, lowStockIngredients: lowStock.filter(item => item.currentQuantity.sub(item.reservedQuantity).lessThanOrEqualTo(item.lowStockThreshold)).length }, charts: { revenueByDay: [...revenueByDay].map(([date, value]) => ({ date, value })), ordersByHour: [...ordersByHour].map(([hour, value]) => ({ hour, value })), paymentMethods: [...paymentMethods].map(([method, value]) => ({ method, value })) }, recentOrders, lowStock, recentReviews };
  }

  async report(type: string, from?: string, to?: string, categoryId?: string, employeeId?: string, paymentMethod?: string) { const range = { gte: from ? new Date(from) : new Date(Date.now() - 30 * 86_400_000), lte: to ? new Date(`${to}T23:59:59.999Z`) : new Date() }; if (type === 'inventory') return this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } }); if (type === 'attendance') return this.prisma.attendance.findMany({ where: { scheduledStart: range, ...(employeeId ? { employeeId } : {}) }, include: { employee: true } }); if (type === 'reviews') return this.prisma.review.findMany({ where: { createdAt: range, ...(categoryId ? { product: { categoryId } } : {}) }, include: { product: { include: { category: true } } } }); if (type === 'employees') return this.employeePerformance(); const validPayment = Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod) ? paymentMethod as PaymentMethod : undefined; const where: Prisma.OrderWhereInput = { createdAt: range, ...(validPayment ? { paymentMethod: validPayment } : {}), ...(categoryId ? { items: { some: { product: { categoryId } } } } : {}), ...(employeeId ? { statusHistory: { some: { changedBy: { employeeProfile: { id: employeeId } } } } } : {}) }; if (type === 'products') { const items = await this.prisma.orderItem.findMany({ where: { order: where, productId: { not: null } }, include: { product: { include: { category: true } } } }); const aggregate = new Map<string, { product:string; category:string; quantity:number; revenue:number }>(); for (const item of items) { const key=item.productId!; const current=aggregate.get(key)??{product:item.productNameSnapshot,category:item.product?.category.name??'',quantity:0,revenue:0}; current.quantity+=item.quantity; current.revenue+=item.lineSubtotal; aggregate.set(key,current); } return [...aggregate.values()].sort((a,b)=>b.quantity-a.quantity); } const orders = await this.prisma.order.findMany({ where, include: { items: true, studentProfile: { include: { studentDirectory: true } }, payments: true }, orderBy: { createdAt: 'desc' } }); if (type === 'revenue') { const days=new Map<string,{date:string;orders:number;revenue:number}>(); for(const order of orders.filter(order=>order.paymentStatus===PaymentStatus.PAID)){const date=order.createdAt.toISOString().slice(0,10);const row=days.get(date)??{date,orders:0,revenue:0};row.orders++;row.revenue+=order.totalAmount;days.set(date,row);} return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date)); } return orders; }
  async exportReport(type: string, format: 'csv' | 'xlsx', from?: string, to?: string, categoryId?: string, employeeId?: string, paymentMethod?: string) { const data = await this.report(type, from, to, categoryId, employeeId, paymentMethod); const normalized = JSON.parse(JSON.stringify(data)) as Record<string, unknown>[]; const sheet = XLSX.utils.json_to_sheet(normalized); if (format === 'csv') return { buffer: Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf8'), contentType: 'text/csv; charset=utf-8', extension: 'csv' }; const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, type.slice(0, 31)); return { buffer: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' }; }
  walletTransactions() { return this.prisma.walletTransaction.findMany({ include: { wallet: { include: { studentProfile: { include: { studentDirectory: true } } } }, order: true }, orderBy: { createdAt: 'desc' }, take: 500 }); }
  async walletSummary() {
    const [deposits, withdrawals] = await Promise.all([
      // Approved deposits and simulated top-ups both write a TOP_UP ledger entry.
      this.prisma.walletTransaction.aggregate({ where: { type: WalletTransactionType.TOP_UP }, _sum: { amount: true } }),
      this.prisma.walletRequest.aggregate({ where: { type: WalletRequestType.WITHDRAWAL, status: WalletRequestStatus.APPROVED }, _sum: { amount: true } }),
    ]);
    return {
      totalDeposits: deposits._sum.amount ?? 0,
      totalWithdrawals: withdrawals._sum.amount ?? 0,
    };
  }
  walletRequests() { return this.prisma.walletRequest.findMany({ where: { status: { not: WalletRequestStatus.APPROVED } }, include: { wallet: { include: { studentProfile: { include: { studentDirectory: true, user: { select: { id: true, email: true } } } } } } }, orderBy: { createdAt: 'desc' }, take: 500 }); }
  async reviewWalletRequest(actorUserId: string, id: string, approve: boolean, reason: string) {
    return this.prisma.$transaction(async tx => {
      const request = await tx.walletRequest.findUnique({ where: { id }, include: { wallet: { include: { studentProfile: true } } } });
      if (!request) throw new ApiError(HttpStatus.NOT_FOUND, 'WALLET_REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu ví.');
      if (request.status !== WalletRequestStatus.PENDING) throw new ApiError(HttpStatus.CONFLICT, 'WALLET_REQUEST_REVIEWED', 'Yêu cầu này đã được xử lý.');
      const status = approve ? WalletRequestStatus.APPROVED : WalletRequestStatus.REJECTED;
      const changed = await tx.walletRequest.updateMany({ where: { id, status: WalletRequestStatus.PENDING }, data: { status, adminNote: reason, reviewedByUserId: actorUserId, reviewedAt: new Date() } });
      if (!changed.count) throw new ApiError(HttpStatus.CONFLICT, 'WALLET_REQUEST_REVIEWED', 'Yêu cầu này vừa được xử lý.');
      const userId = request.wallet.studentProfile.userId;
      if (request.type === WalletRequestType.DEPOSIT && approve) {
        const wallet = await tx.wallet.update({ where: { id: request.walletId }, data: { balance: { increment: request.amount } } });
        await tx.walletTransaction.create({ data: { walletId: request.walletId, type: WalletTransactionType.TOP_UP, amount: request.amount, balanceBefore: wallet.balance - request.amount, balanceAfter: wallet.balance, description: `Nạp tiền ${request.requestCode}`, reference: `DEPOSIT-${request.id}` } });
      }
      if (request.type === WalletRequestType.WITHDRAWAL && !approve) {
        const wallet = await tx.wallet.update({ where: { id: request.walletId }, data: { balance: { increment: request.amount } } });
        await tx.walletTransaction.create({ data: { walletId: request.walletId, type: WalletTransactionType.REFUND, amount: request.amount, balanceBefore: wallet.balance - request.amount, balanceAfter: wallet.balance, description: `Hoàn yêu cầu rút ${request.requestCode}`, reference: `WITHDRAW-REFUND-${request.id}` } });
      }
      await tx.notification.create({ data: { userId, type: NotificationType.WALLET, title: approve ? 'Yêu cầu ví đã được duyệt' : 'Yêu cầu ví bị từ chối', message: `${request.requestCode}: ${reason}` } });
      await tx.auditLog.create({ data: { actorUserId, action: approve ? 'WALLET_REQUEST_APPROVE' : 'WALLET_REQUEST_REJECT', entityType: 'WalletRequest', entityId: id, beforeData: { status: request.status }, afterData: { status, reason } } });
      return tx.walletRequest.findUniqueOrThrow({ where: { id }, include: { wallet: { include: { studentProfile: { include: { studentDirectory: true } } } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  orders() { return this.prisma.order.findMany({ include: { items: true, studentProfile: { include: { studentDirectory: true } }, payments: true }, orderBy: { createdAt: 'desc' }, take: 500 }); }
  order(id: string) { return this.prisma.order.findUniqueOrThrow({ where: { id }, include: { studentProfile: { include: { studentDirectory: true } }, items: { include: { options: true, kitchenTask: { include: { employee: true } } } }, payments: true, statusHistory: { include: { changedBy: { select: { email: true, role: true, employeeProfile: true } } }, orderBy: { createdAt: 'asc' } }, pickupToken: true, chatRoom: true } }); }
  async employeePerformance() {
    const [employees, histories, tasks] = await Promise.all([
      this.prisma.employeeProfile.findMany({ where: { status: 'ACTIVE' }, include: { user: { select: { email: true, status: true } } }, orderBy: { employeeCode: 'asc' } }),
      this.prisma.orderStatusHistory.findMany({ where: { changedByUserId: { not: null } }, include: { order: { select: { createdAt: true } } } }),
      this.prisma.kitchenTask.findMany({ where: { employeeId: { not: null } } }),
    ]);
    return employees.map(employee => {
      const actions = histories.filter(item => item.changedByUserId === employee.userId);
      const kitchen = tasks.filter(item => item.employeeId === employee.id);
      const accepted = actions.filter(item => item.newStatus === OrderStatus.ACCEPTED);
      const completedTasks = kitchen.filter(item => item.completedAt && item.startedAt);
      const averageHandlingMinutes = accepted.length ? accepted.reduce((sum, item) => sum + (item.createdAt.getTime() - item.order.createdAt.getTime()) / 60_000, 0) / accepted.length : 0;
      const averagePreparationMinutes = completedTasks.length ? completedTasks.reduce((sum, item) => sum + (item.completedAt!.getTime() - item.startedAt!.getTime()) / 60_000, 0) / completedTasks.length : 0;
      return { id: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, phone: employee.phone, hireDate: employee.hireDate, status: employee.status, workRole: employee.workRole, email: employee.user.email, acceptedOrders: accepted.length, rejectedOrders: actions.filter(item => item.newStatus === OrderStatus.REJECTED).length, completedHandoffs: actions.filter(item => item.newStatus === OrderStatus.COMPLETED).length, averageHandlingMinutes: Math.max(0, Math.round(averageHandlingMinutes * 10) / 10), claimedItems: kitchen.filter(item => item.claimedAt).length, completedItems: completedTasks.length, averagePreparationMinutes: Math.max(0, Math.round(averagePreparationMinutes * 10) / 10) };
    });
  }
  async cancelOrder(actorUserId: string, id: string, reason: string) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      if (new Set<OrderStatus>([OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED]).has(order.status)) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_CANNOT_BE_CANCELLED', 'Không thể hủy đơn ở trạng thái hiện tại.');
      const changed = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: OrderStatus.CANCELLED, cancellationReason: reason, cancelledAt: new Date() } });
      if (!changed.count) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_STATUS_TRANSITION_INVALID', 'Trạng thái đơn vừa thay đổi, vui lòng tải lại.');
      await this.inventory.releaseForOrder(tx, id);
      let paymentStatus = order.paymentStatus;
      if (order.paymentStatus === PaymentStatus.PAID) {
        paymentStatus = PaymentStatus.REFUNDED;
        await tx.payment.updateMany({ where: { orderId: id, status: PaymentStatus.PAID }, data: { status: PaymentStatus.REFUNDED } });
      }
      if (order.paymentMethod === PaymentMethod.CANTEEN_WALLET && order.paymentStatus === PaymentStatus.PAID) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: order.studentProfileId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: order.totalAmount } } });
        await tx.walletTransaction.create({ data: { walletId: wallet.id, orderId: id, type: WalletTransactionType.REFUND, amount: order.totalAmount, balanceBefore: wallet.balance, balanceAfter: wallet.balance + order.totalAmount, description: `Hoàn tiền ${order.orderCode}`, reference: `ADMIN-REFUND-${order.id}` } });
      }
      if (order.pointsUsed > 0) {
        const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: order.studentProfileId } });
        await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: order.pointsUsed } } });
        await tx.loyaltyTransaction.create({ data: { loyaltyAccountId: account.id, orderId: id, type: LoyaltyTransactionType.REFUND, points: order.pointsUsed, balanceBefore: account.points, balanceAfter: account.points + order.pointsUsed, description: `Hoàn điểm ${order.orderCode}`, reference: `ADMIN-POINTS-${order.id}` } });
      }
      if (order.couponId) {
        const deleted = await tx.couponUsage.deleteMany({ where: { orderId: id } });
        if (deleted.count) await tx.coupon.update({ where: { id: order.couponId }, data: { usageCount: { decrement: 1 } } });
      }
      if (order.studentVoucherId) await tx.studentVoucher.update({ where: { id: order.studentVoucherId }, data: { status: StudentVoucherStatus.ACTIVE, usedAt: null } });
      const updated = await tx.order.update({ where: { id }, data: { paymentStatus, statusHistory: { create: { oldStatus: order.status, newStatus: OrderStatus.CANCELLED, changedByUserId: actorUserId, note: reason } } } });
      await tx.auditLog.create({ data: { actorUserId, action: 'ADMIN_ORDER_CANCEL', entityType: 'Order', entityId: id, beforeData: { status: order.status, paymentStatus: order.paymentStatus }, afterData: { status: OrderStatus.CANCELLED, paymentStatus, reason } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
