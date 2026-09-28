import { WalletStatus } from '@prisma/client';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  it('refuses to mutate a suspended wallet', async () => {
    const tx = { wallet: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'wallet-1', status: WalletStatus.FROZEN, balance: 0 }) } };
    const prisma = { studentProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'student-1' }) }, $transaction: jest.fn((callback: (client: unknown) => unknown) => callback(tx)) };
    const service = new WalletService(prisma as never, { emitToUser: jest.fn() } as never);
    await expect(service.topUp('user-1', 50_000)).rejects.toMatchObject({ response: { code: 'WALLET_INACTIVE' } });
  });
});
