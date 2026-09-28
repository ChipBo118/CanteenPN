import { KitchenTaskStatus, Role } from '@prisma/client';
import { KitchenService } from './kitchen.service';

describe('KitchenService claim concurrency', () => {
  it('uses an atomic conditional update and rejects the losing employee', async () => {
    const prisma = {
      employeeProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'employee-2', workRole: Role.KITCHEN_STAFF }) },
      kitchenTask: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findUniqueOrThrow: jest.fn() },
    };
    const service = new KitchenService(prisma as never, {} as never, { emitToOrder: jest.fn() } as never);
    await expect(service.claim('user-2', 'task-1')).rejects.toMatchObject({ response: { code: 'ORDER_ALREADY_CLAIMED' } });
    expect(prisma.kitchenTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: KitchenTaskStatus.WAITING, employeeId: null }) }));
  });
});
