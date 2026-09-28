import { Role, StudentDirectoryStatus, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';

jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));
const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };

function createPrismaMock() {
  const tx = {
    user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: '2677610050@hpn.edu.vn', role: Role.STUDENT }) },
    studentProfile: { create: jest.fn().mockResolvedValue({ id: 'profile-1' }) },
  };
  return {
    studentDirectory: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    refreshToken: { create: jest.fn().mockResolvedValue({ id: 'session-1' }) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    tx,
  };
}

describe('AuthService student registration', () => {
  it('rejects an email that is absent from StudentDirectory', async () => {
    const prisma = createPrismaMock();
    prisma.studentDirectory.findUnique.mockResolvedValue(null);
    const service = new AuthService(prisma as never, jwt as never);
    await expect(service.registerStudent({ email: 'missing@hpn.edu.vn', password: 'Password1', confirmPassword: 'Password1' })).rejects.toMatchObject({ response: { code: 'STUDENT_EMAIL_NOT_FOUND' } });
  });

  it('creates exactly one student identity, wallet, loyalty account and cart', async () => {
    const prisma = createPrismaMock();
    prisma.studentDirectory.findUnique.mockResolvedValue({ id: 'directory-50', fullName: 'Nguyễn Minh Anh', status: StudentDirectoryStatus.ACTIVE, studentProfile: null });
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AuthService(prisma as never, jwt as never);
    const result = await service.registerStudent({ email: ' 2677610050@HPN.EDU.VN ', password: 'Password1', confirmPassword: 'Password1' });
    expect(result.user).toEqual({ id: 'user-1', email: '2677610050@hpn.edu.vn', role: Role.STUDENT, displayName: 'Nguyễn Minh Anh' });
    expect(prisma.tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: '2677610050@hpn.edu.vn', role: Role.STUDENT, status: UserStatus.ACTIVE }) });
    expect(prisma.tx.studentProfile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studentDirectoryId: 'directory-50', wallet: { create: { balance: 0 } }, loyaltyAccount: { create: { points: 0 } }, cart: { create: {} } }) });
  });

  it('rejects a directory record already linked to an account', async () => {
    const prisma = createPrismaMock();
    prisma.studentDirectory.findUnique.mockResolvedValue({ id: 'directory-1', status: StudentDirectoryStatus.ACTIVE, studentProfile: { id: 'profile-existing' } });
    const service = new AuthService(prisma as never, jwt as never);
    await expect(service.registerStudent({ email: '2373240001@hpn.edu.vn', password: 'Password1', confirmPassword: 'Password1' })).rejects.toMatchObject({ response: { code: 'STUDENT_ALREADY_REGISTERED' } });
  });
});
