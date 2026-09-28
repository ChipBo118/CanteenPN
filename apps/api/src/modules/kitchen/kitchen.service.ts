import { HttpStatus, Injectable } from '@nestjs/common';
import { KitchenTaskStatus, NotificationType, OrderStatus, Prisma } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService, private readonly inventory: InventoryService, private readonly realtime: RealtimeService) {}
  private async employee(userId: string) { const employee = await this.prisma.employeeProfile.findUnique({ where: { userId } }); if (!employee) throw new ApiError(HttpStatus.FORBIDDEN, 'EMPLOYEE_PROFILE_REQUIRED', 'Không tìm thấy hồ sơ nhân viên.'); return employee; }
  available() { return this.prisma.kitchenTask.findMany({ where: { status: KitchenTaskStatus.WAITING, orderItem: { order: { status: { in: [OrderStatus.ACCEPTED, OrderStatus.PREPARING] } } } }, include: { orderItem: { include: { order: true } } }, orderBy: { createdAt: 'asc' } }); }
  async mine(userId: string) { const employee = await this.employee(userId); return this.prisma.kitchenTask.findMany({ where: { employeeId: employee.id }, include: { orderItem: { include: { order: true } } }, orderBy: { updatedAt: 'desc' } }); }
  async claim(userId: string, taskId: string) {
    const employee = await this.employee(userId);
    const result = await this.prisma.kitchenTask.updateMany({ where: { id: taskId, status: KitchenTaskStatus.WAITING, employeeId: null, orderItem: { order: { status: { in: [OrderStatus.ACCEPTED, OrderStatus.PREPARING] } } } }, data: { status: KitchenTaskStatus.CLAIMED, employeeId: employee.id, claimedAt: new Date() } });
    if (!result.count) throw new ApiError(HttpStatus.CONFLICT, 'ORDER_ALREADY_CLAIMED', 'Món này đã được nhân viên khác nhận.');
    const task = await this.prisma.kitchenTask.findUniqueOrThrow({ where: { id: taskId }, include: { orderItem: { include: { order: true } } } });
    this.realtime.emitToOrder(task.orderItem.orderId, 'kitchen:task-claimed', task);
    return task;
  }
  async start(userId: string, taskId: string) {
    const employee = await this.employee(userId);
    const result = await this.prisma.$transaction(async tx => {
      const task = await tx.kitchenTask.findFirst({ where: { id: taskId, employeeId: employee.id, status: KitchenTaskStatus.CLAIMED }, include: { orderItem: { include: { order: true } } } });
      if (!task) throw new ApiError(HttpStatus.CONFLICT, 'KITCHEN_TASK_NOT_OWNED', 'Bạn chưa nhận món này hoặc món đã bắt đầu.');
      await this.inventory.consumeForOrderItem(tx, task.orderItemId);
      await tx.kitchenTask.update({ where: { id: task.id }, data: { status: KitchenTaskStatus.PREPARING, startedAt: new Date() } });
      if (task.orderItem.order.status === OrderStatus.ACCEPTED) {
        await tx.order.update({ where: { id: task.orderItem.orderId }, data: { status: OrderStatus.PREPARING, statusHistory: { create: { oldStatus: OrderStatus.ACCEPTED, newStatus: OrderStatus.PREPARING, changedByUserId: userId } } } });
        const student = await tx.studentProfile.findUniqueOrThrow({ where: { id: task.orderItem.order.studentProfileId } });
        await tx.notification.create({ data: { userId: student.userId, type: NotificationType.ORDER, title: 'Nhà bếp đang chuẩn bị món', message: `Đơn ${task.orderItem.order.orderCode} đang được chế biến.`, data: { orderId: task.orderItem.orderId } } });
      }
      return tx.kitchenTask.findUniqueOrThrow({ where: { id: task.id }, include: { orderItem: { include: { order: true } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.realtime.emitToOrder(result.orderItem.orderId, 'kitchen:task-started', result);
    this.realtime.emitToOrder(result.orderItem.orderId, 'order:preparing', result.orderItem.order);
    return result;
  }
  async complete(userId: string, taskId: string) {
    const employee = await this.employee(userId);
    const result = await this.prisma.$transaction(async tx => {
      const task = await tx.kitchenTask.findFirst({ where: { id: taskId, employeeId: employee.id, status: KitchenTaskStatus.PREPARING }, include: { orderItem: { include: { order: true } } } });
      if (!task) throw new ApiError(HttpStatus.CONFLICT, 'KITCHEN_TASK_NOT_PREPARING', 'Món không thuộc trạng thái đang chế biến của bạn.');
      await tx.kitchenTask.update({ where: { id: task.id }, data: { status: KitchenTaskStatus.DONE, completedAt: new Date() } });
      const remaining = await tx.kitchenTask.count({ where: { orderItem: { orderId: task.orderItem.orderId }, status: { not: KitchenTaskStatus.DONE } } });
      if (!remaining) {
        await tx.order.update({ where: { id: task.orderItem.orderId }, data: { status: OrderStatus.READY, readyAt: new Date(), statusHistory: { create: { oldStatus: OrderStatus.PREPARING, newStatus: OrderStatus.READY, changedByUserId: userId } } } });
        const student = await tx.studentProfile.findUniqueOrThrow({ where: { id: task.orderItem.order.studentProfileId } });
        await tx.notification.create({ data: { userId: student.userId, type: NotificationType.ORDER, title: `${task.orderItem.order.orderCode} đã sẵn sàng`, message: 'Vui lòng đến quầy và xuất trình mã QR để nhận món.', data: { orderId: task.orderItem.orderId } } });
      }
      return tx.kitchenTask.findUniqueOrThrow({ where: { id: task.id }, include: { orderItem: { include: { order: true } } } });
    });
    this.realtime.emitToOrder(result.orderItem.orderId, 'kitchen:task-completed', result);
    if (result.orderItem.order.status === OrderStatus.READY) this.realtime.emitToOrder(result.orderItem.orderId, 'order:ready', result.orderItem.order);
    return result;
  }
}

