import { KitchenTaskStatus, OrderStatus } from '@prisma/client';
import { canStudentCancel } from './order-rules';

describe('student cancellation rules', () => {
  it('allows PENDING orders', () => expect(canStudentCancel(OrderStatus.PENDING, [])).toBe(true));
  it('allows ACCEPTED orders before preparation starts', () => expect(canStudentCancel(OrderStatus.ACCEPTED, [KitchenTaskStatus.WAITING, KitchenTaskStatus.CLAIMED])).toBe(true));
  it('blocks cancellation once any task is preparing', () => expect(canStudentCancel(OrderStatus.ACCEPTED, [KitchenTaskStatus.PREPARING])).toBe(false));
  it('blocks terminal and ready orders', () => expect(canStudentCancel(OrderStatus.READY, [KitchenTaskStatus.DONE])).toBe(false));
});

