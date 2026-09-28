import { KitchenTaskStatus, OrderStatus } from '@prisma/client';

export function canStudentCancel(status: OrderStatus, taskStatuses: (KitchenTaskStatus | undefined)[]) {
  if (status === OrderStatus.PENDING) return true;
  if (status !== OrderStatus.ACCEPTED) return false;
  return !taskStatuses.some(task => task === KitchenTaskStatus.PREPARING || task === KitchenTaskStatus.DONE);
}

