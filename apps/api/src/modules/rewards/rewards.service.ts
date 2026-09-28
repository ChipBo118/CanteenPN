import { HttpStatus, Injectable } from '@nestjs/common';
import { LoyaltyTransactionType, NotificationType, Prisma, StudentVoucherStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}
  private async profile(userId: string) { const profile = await this.prisma.studentProfile.findUnique({ where: { userId } }); if (!profile) throw new ApiError(HttpStatus.FORBIDDEN, 'STUDENT_PROFILE_REQUIRED', 'Chỉ sinh viên mới có điểm thưởng.'); return profile; }
  async loyalty(userId: string) { const profile = await this.profile(userId); return this.prisma.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: profile.id }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } } }); }
  coupons() { const now = new Date(); return this.prisma.coupon.findMany({ where: { isActive: true, startAt: { lte: now }, expireAt: { gte: now } }, orderBy: { expireAt: 'asc' } }); }
  vouchers() { const now = new Date(); return this.prisma.voucher.findMany({ where: { isActive: true, startAt: { lte: now }, expireAt: { gte: now }, remainingQuantity: { gt: 0 } }, orderBy: { requiredPoints: 'asc' } }); }
  async owned(userId: string) {
    const profile = await this.profile(userId);
    await this.prisma.studentVoucher.updateMany({ where: { studentProfileId: profile.id, status: StudentVoucherStatus.ACTIVE, voucher: { expireAt: { lt: new Date() } } }, data: { status: StudentVoucherStatus.EXPIRED } });
    return this.prisma.studentVoucher.findMany({ where: { studentProfileId: profile.id }, include: { voucher: true }, orderBy: { redeemedAt: 'desc' } });
  }
  redeem(userId: string, voucherId: string) { return this.acquire(userId, voucherId, false); }
  claim(userId: string, voucherId: string) { return this.acquire(userId, voucherId, true); }
  async validate(userId: string, serialCode: string) {
    const profile = await this.profile(userId);
    const owned = await this.prisma.studentVoucher.findFirst({ where: { studentProfileId: profile.id, serialCode: serialCode.trim().toUpperCase() }, include: { voucher: true } });
    const valid = Boolean(owned && owned.status === StudentVoucherStatus.ACTIVE && owned.voucher.isActive && owned.voucher.startAt <= new Date() && owned.voucher.expireAt >= new Date());
    return { valid, reason: valid ? null : 'Voucher không tồn tại, đã dùng hoặc đã hết hạn.', voucher: owned };
  }
  private async acquire(userId: string, voucherId: string, freeOnly: boolean) {
    const profile = await this.profile(userId);
    return this.prisma.$transaction(async tx => {
      const now = new Date();
      const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
      if (!voucher || !voucher.isActive || voucher.startAt > now || voucher.expireAt < now) throw new ApiError(HttpStatus.BAD_REQUEST, 'VOUCHER_INVALID', 'Voucher không khả dụng.');
      if (freeOnly && voucher.requiredPoints !== 0) throw new ApiError(HttpStatus.BAD_REQUEST, 'VOUCHER_REQUIRES_POINTS', 'Voucher này cần đổi bằng điểm.');
      const previous = await tx.studentVoucher.count({ where: { studentProfileId: profile.id, voucherId } });
      if (previous >= voucher.perStudentLimit) throw new ApiError(HttpStatus.CONFLICT, 'VOUCHER_STUDENT_LIMIT_REACHED', 'Bạn đã nhận đủ số lượng voucher này.');
      const stock = await tx.voucher.updateMany({ where: { id: voucher.id, remainingQuantity: { gt: 0 } }, data: { remainingQuantity: { decrement: 1 } } });
      if (!stock.count) throw new ApiError(HttpStatus.CONFLICT, 'VOUCHER_OUT_OF_STOCK', 'Voucher đã hết số lượng.');
      const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { studentProfileId: profile.id } });
      if (voucher.requiredPoints > 0) {
        const points = await tx.loyaltyAccount.updateMany({ where: { id: account.id, points: { gte: voucher.requiredPoints } }, data: { points: { decrement: voucher.requiredPoints } } });
        if (!points.count) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_POINTS', 'Bạn không đủ điểm để đổi voucher.');
      }
      const owned = await tx.studentVoucher.create({ data: { studentProfileId: profile.id, voucherId: voucher.id, serialCode: `VC-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`, status: StudentVoucherStatus.ACTIVE }, include: { voucher: true } });
      if (voucher.requiredPoints > 0) await tx.loyaltyTransaction.create({ data: { loyaltyAccountId: account.id, type: LoyaltyTransactionType.VOUCHER_EXCHANGE, points: -voucher.requiredPoints, balanceBefore: account.points, balanceAfter: account.points - voucher.requiredPoints, description: `Đổi ${voucher.name}`, reference: `VOUCHER-${owned.id}` } });
      await tx.notification.create({ data: { userId, type: NotificationType.VOUCHER, title: voucher.requiredPoints ? 'Đổi voucher thành công' : 'Nhận voucher thành công', message: `${voucher.name} đã được thêm vào tài khoản.` } });
      return owned;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

