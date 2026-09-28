import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, Prisma, Role, StudentDirectoryStatus, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ApiError } from '../../common/api-error';
import type { AuthUser } from '../../common/auth-user';
import { PrismaService } from '../../prisma.service';
import { ChangePasswordDto, LoginDto, RegisterStudentDto, ResetPasswordDto } from './auth.dto';

const DEFAULT_AVATAR = '/images/default-student-avatar.svg';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async registerStudent(dto: RegisterStudentDto) {
    if (dto.password !== dto.confirmPassword) throw new ApiError(HttpStatus.BAD_REQUEST, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    const email = this.normalizeEmail(dto.email);
    const directory = await this.prisma.studentDirectory.findUnique({ where: { schoolEmail: email }, include: { studentProfile: true } });
    if (!directory) throw new ApiError(HttpStatus.BAD_REQUEST, 'STUDENT_EMAIL_NOT_FOUND', 'Email này không tồn tại trong hệ thống sinh viên.');
    if (directory.status !== StudentDirectoryStatus.ACTIVE) throw new ApiError(HttpStatus.FORBIDDEN, 'STUDENT_NOT_ELIGIBLE', 'Hồ sơ sinh viên hiện không đủ điều kiện đăng ký.');
    if (directory.studentProfile || await this.prisma.user.findUnique({ where: { email } })) throw new ApiError(HttpStatus.CONFLICT, 'STUDENT_ALREADY_REGISTERED', 'Sinh viên này đã có tài khoản CanteenPN.');
    const passwordHash = await argon2.hash(dto.password);
    try {
      const user = await this.prisma.$transaction(async tx => {
        const created = await tx.user.create({ data: { email, passwordHash, role: Role.STUDENT, status: UserStatus.ACTIVE, avatarUrl: DEFAULT_AVATAR } });
        await tx.studentProfile.create({ data: { userId: created.id, studentDirectoryId: directory.id, wallet: { create: { balance: 0 } }, loyaltyAccount: { create: { points: 0 } }, cart: { create: {} } } });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.issueSession(user.id, user.email, user.role, directory.fullName);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(HttpStatus.CONFLICT, 'STUDENT_ALREADY_REGISTERED', 'Sinh viên này đã có tài khoản CanteenPN.');
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: { select: { studentDirectory: { select: { fullName: true } } } },
        employeeProfile: { select: { fullName: true } },
      },
    });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    if (user.status === UserStatus.LOCKED) throw new ApiError(HttpStatus.FORBIDDEN, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    if (user.status !== UserStatus.ACTIVE || user.deletedAt) throw new ApiError(HttpStatus.FORBIDDEN, 'ACCOUNT_INACTIVE', 'Tài khoản hiện không hoạt động.');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(user.id, user.email, user.role, user.studentProfile?.studentDirectory.fullName ?? user.employeeProfile?.fullName);
  }

  private async issueSession(userId: string, email: string, role: Role, displayName?: string, familyId: string = randomUUID()) {
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30) * 86_400_000);
    const session = await this.prisma.refreshToken.create({ data: { tokenHash: this.hashToken(refreshToken), familyId, userId, expiresAt } });
    const payload: AuthUser = { sub: userId, email, role, sessionId: session.id };
    const accessToken = await this.jwt.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me', expiresIn: 15 * 60 });
    return { accessToken, refreshToken, expiresIn: 900, user: { id: userId, email, role, displayName: displayName ?? email.split('@')[0] } };
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new ApiError(HttpStatus.UNAUTHORIZED, 'REFRESH_TOKEN_REQUIRED', 'Thiếu refresh token.');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: {
        user: {
          include: {
            studentProfile: { select: { studentDirectory: { select: { fullName: true } } } },
            employeeProfile: { select: { fullName: true } },
          },
        },
      },
    });
    if (!stored) throw new ApiError(HttpStatus.UNAUTHORIZED, 'REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ.');
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'REFRESH_TOKEN_REUSED', 'Phiên đăng nhập đã bị thu hồi do phát hiện token được dùng lại.');
    }
    if (stored.expiresAt <= new Date() || stored.user.status !== UserStatus.ACTIVE) throw new ApiError(HttpStatus.UNAUTHORIZED, 'REFRESH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn.');
    const displayName = stored.user.studentProfile?.studentDirectory.fullName ?? stored.user.employeeProfile?.fullName;
    const next = await this.issueSession(stored.user.id, stored.user.email, stored.user.role, displayName, stored.familyId);
    const replacement = await this.prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: this.hashToken(next.refreshToken) } });
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date(), replacedById: replacement.id } });
    return next;
  }

  async logout(rawToken: string | undefined) {
    if (rawToken) await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hashToken(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Đăng xuất thành công.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        studentProfile: {
          select: {
            id: true,
            studentDirectory: true,
            wallet: { select: { balance: true, status: true } },
            loyaltyAccount: { select: { points: true } },
            _count: {
              select: {
                orders: { where: { status: OrderStatus.COMPLETED } },
                studentVouchers: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
        employeeProfile: true,
      },
    });
    return user;
  }

  updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { avatarUrl }, select: { id: true, avatarUrl: true } });
  }

  async forgotPassword(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const user = await this.prisma.user.findUnique({ where: { email } });
    let resetToken: string | undefined;
    if (user?.status === UserStatus.ACTIVE) {
      resetToken = randomBytes(40).toString('base64url');
      await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: this.hashToken(resetToken), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    }
    return { message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được tạo.', ...(process.env.NODE_ENV === 'production' ? {} : { resetToken }) };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) throw new ApiError(HttpStatus.BAD_REQUEST, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    const token = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: this.hashToken(dto.token) } });
    if (!token || token.usedAt || token.expiresAt <= new Date()) throw new ApiError(HttpStatus.BAD_REQUEST, 'PASSWORD_RESET_TOKEN_INVALID', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    const passwordHash = await argon2.hash(dto.password);
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }), this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }), this.prisma.refreshToken.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { message: 'Mật khẩu đã được cập nhật.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new ApiError(HttpStatus.BAD_REQUEST, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) throw new ApiError(HttpStatus.BAD_REQUEST, 'CURRENT_PASSWORD_INVALID', 'Mật khẩu hiện tại không đúng.');
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(dto.newPassword) } }), this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }
}
