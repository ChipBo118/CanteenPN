import { RewardsService } from './rewards.service';

describe('RewardsService voucher concurrency', () => {
  it('reports out-of-stock when the atomic decrement loses the race', async () => {
    const tx = {
      voucher: { findUnique: jest.fn().mockResolvedValue({ id: 'v-1', isActive: true, expireAt: new Date(Date.now() + 60_000), perStudentLimit: 1, requiredPoints: 20 }) , updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      loyaltyAccount: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'loyalty-1', points: 100 }) },
      studentVoucher: { count: jest.fn().mockResolvedValue(0) },
    };
    const prisma = { studentProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'student-1' }) }, $transaction: jest.fn((callback: (client: unknown) => unknown) => callback(tx)) };
    await expect(new RewardsService(prisma as never).redeem('user-1', 'v-1')).rejects.toMatchObject({ response: { code: 'VOUCHER_OUT_OF_STOCK' } });
    expect(tx.voucher.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ remainingQuantity: { gt: 0 } }) }));
  });
});
