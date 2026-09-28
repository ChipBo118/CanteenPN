import {BadRequestException} from '@nestjs/common';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthService} from './auth.service';

describe('AuthService OTP precheck', () => {
  const prisma = {
    user: {findFirst: vi.fn()},
    otpCode: {findFirst: vi.fn(), create: vi.fn()},
  };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(prisma as never, {} as never);
  });

  it('từ chối MSSV đã tồn tại trước khi tạo OTP', async () => {
    prisma.user.findFirst.mockResolvedValue({email: 'other@student.edu.vn', studentId: 'SV2026001', phone: '0901111111'});
    await expect(service.requestOtp({email: 'new@student.edu.vn', studentId: 'sv2026001', phone: '0902222222'}))
      .rejects.toThrow('Mã sinh viên này đã được đăng ký.');
    expect(prisma.otpCode.create).not.toHaveBeenCalled();
  });

  it('từ chối số điện thoại đã tồn tại trước khi tạo OTP', async () => {
    prisma.user.findFirst.mockResolvedValue({email: 'other@student.edu.vn', studentId: 'SV2026999', phone: '0901234567'});
    await expect(service.requestOtp({email: 'new@student.edu.vn', studentId: 'SV2026002', phone: '+84901234567'}))
      .rejects.toThrow('Số điện thoại này đã được đăng ký.');
    expect(prisma.otpCode.create).not.toHaveBeenCalled();
  });

  it('áp dụng cooldown 30 giây', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.otpCode.findFirst.mockResolvedValue({createdAt: new Date(Date.now() - 10_000)});
    await expect(service.requestOtp({email: 'new@student.edu.vn', studentId: 'SV2026002', phone: '0902222222'}))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.requestOtp({email: 'new@student.edu.vn', studentId: 'SV2026002', phone: '0902222222'}))
      .rejects.toThrow('Vui lòng đợi 30 giây trước khi gửi lại OTP.');
    expect(prisma.otpCode.create).not.toHaveBeenCalled();
  });
});
