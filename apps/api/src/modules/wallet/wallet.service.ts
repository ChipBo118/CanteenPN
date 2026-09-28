import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType, Prisma, WalletRequestStatus, WalletRequestType, WalletStatus, WalletTransactionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { DepositDto, LinkBankDto, WithdrawDto } from './wallet.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}
  private async profile(userId: string) { const profile = await this.prisma.studentProfile.findUnique({ where: { userId } }); if (!profile) throw new ApiError(HttpStatus.FORBIDDEN, 'STUDENT_PROFILE_REQUIRED', 'Chỉ sinh viên mới có ví.'); return profile; }
  async get(userId: string) { const profile = await this.profile(userId); return this.prisma.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 }, requests: { where: { status: { not: WalletRequestStatus.APPROVED } }, orderBy: { createdAt: 'desc' }, take: 30 } } }); }
  async requests(userId: string) { const profile = await this.profile(userId); const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } }); return this.prisma.walletRequest.findMany({ where: { walletId: wallet.id, status: { not: WalletRequestStatus.APPROVED } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async linkBank(userId: string, dto: LinkBankDto) {
    const profile = await this.profile(userId);
    const accountNumber = dto.accountNumber.replace(/\s+/g, '');
    if (!/^\d{6,30}$/.test(accountNumber)) throw new ApiError(HttpStatus.BAD_REQUEST, 'BANK_ACCOUNT_INVALID', 'Số tài khoản chỉ được chứa chữ số.');
    return this.prisma.wallet.update({ where: { studentProfileId: profile.id }, data: { bankName: dto.bankName.trim(), bankAccountNumber: accountNumber, bankAccountName: dto.accountName.trim().toUpperCase(), bankLinkedAt: new Date() } });
  }
  async deposit(userId: string, dto: DepositDto) {
    const profile = await this.profile(userId);
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } });
    if (wallet.status !== WalletStatus.ACTIVE) throw new ApiError(HttpStatus.CONFLICT, 'WALLET_INACTIVE', 'Ví đang bị tạm khóa.');
    const requestCode = `NAP-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
    const request = await this.prisma.walletRequest.create({ data: { requestCode, walletId: wallet.id, type: WalletRequestType.DEPOSIT, amount: dto.amount, method: dto.method, note: dto.note } });
    return { ...request, qrPayload: dto.method === 'QR' ? `CANTEENPN|${requestCode}|${dto.amount}` : null };
  }
  async withdraw(userId: string, dto: WithdrawDto) {
    const profile = await this.profile(userId);
    const request = await this.prisma.$transaction(async tx => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } });
      if (wallet.status !== WalletStatus.ACTIVE) throw new ApiError(HttpStatus.CONFLICT, 'WALLET_INACTIVE', 'Ví đang bị tạm khóa.');
      if (!wallet.bankLinkedAt || !wallet.bankAccountNumber) throw new ApiError(HttpStatus.CONFLICT, 'BANK_NOT_LINKED', 'Vui lòng liên kết tài khoản ngân hàng trước khi rút tiền.');
      const debited = await tx.wallet.updateMany({ where: { id: wallet.id, balance: { gte: dto.amount } }, data: { balance: { decrement: dto.amount } } });
      if (!debited.count) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_BALANCE', 'Số dư ví không đủ để rút tiền.');
      const requestCode = `RUT-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
      const created = await tx.walletRequest.create({ data: { requestCode, walletId: wallet.id, type: WalletRequestType.WITHDRAWAL, amount: dto.amount, method: 'BANK_TRANSFER', note: dto.note } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, type: WalletTransactionType.WITHDRAWAL, amount: -dto.amount, balanceBefore: wallet.balance, balanceAfter: wallet.balance - dto.amount, description: `Tạm giữ tiền rút ${requestCode}`, reference: `WITHDRAW-${created.id}` } });
      await tx.notification.create({ data: { userId, type: NotificationType.WALLET, title: 'Đã gửi yêu cầu rút tiền', message: `${dto.amount.toLocaleString('vi-VN')} ₫ đang được giữ để chờ duyệt.` } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.realtime.emitToUser(userId, 'wallet:updated', request);
    return request;
  }
  async topUp(userId: string, amount: number) { const profile = await this.profile(userId); const transaction = await this.prisma.$transaction(async tx => { const wallet = await tx.wallet.findUniqueOrThrow({ where: { studentProfileId: profile.id } }); if (wallet.status !== WalletStatus.ACTIVE) throw new ApiError(HttpStatus.CONFLICT, 'WALLET_INACTIVE', 'Ví đang bị tạm khóa.'); const after = wallet.balance + amount; await tx.wallet.update({ where: { id: wallet.id }, data: { balance: after } }); const entry = await tx.walletTransaction.create({ data: { walletId: wallet.id, type: WalletTransactionType.TOP_UP, amount, balanceBefore: wallet.balance, balanceAfter: after, description: 'Nạp tiền mô phỏng', reference: `TOPUP-${randomUUID()}` } }); await tx.notification.create({ data: { userId, type: NotificationType.WALLET, title: 'Nạp ví thành công', message: `Ví CanteenPN đã được cộng ${amount.toLocaleString('vi-VN')} ₫.` } }); return entry; }); this.realtime.emitToUser(userId, 'wallet:updated', transaction); return transaction; }
}

