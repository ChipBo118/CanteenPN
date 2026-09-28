import {BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {Role} from '@prisma/client';
import * as argon2 from 'argon2';
import {randomInt} from 'crypto';
import {LoginDto, RegisterDto, RequestOtpDto} from './auth.dto';
import {accessSecret, refreshSecret} from './auth.guard';
import {PrismaService} from './prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async requestOtp(dto: RequestOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const studentId = dto.studentId.trim().toUpperCase();
    const phone = normalizePhone(dto.phone);
    const domain = process.env.SCHOOL_EMAIL_DOMAIN || 'student.edu.vn';
    if (!email.endsWith(`@${domain}`)) throw new BadRequestException(`Vui lòng dùng email @${domain}.`);
    const duplicate = await this.prisma.user.findFirst({
      where: {OR: [{email}, {studentId}, {phone}]},
      select: {email: true, studentId: true, phone: true},
    });
    if (duplicate?.email === email) throw new BadRequestException('Email này đã được đăng ký.');
    if (duplicate?.studentId === studentId) throw new BadRequestException('Mã sinh viên này đã được đăng ký.');
    if (duplicate?.phone === phone) throw new BadRequestException('Số điện thoại này đã được đăng ký.');
    const latest = await this.prisma.otpCode.findFirst({where: {email}, orderBy: {createdAt: 'desc'}});
    if (latest && Date.now() - latest.createdAt.getTime() < 30_000) throw new BadRequestException('Vui lòng đợi 30 giây trước khi gửi lại OTP.');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.otpCode.create({data: {email, codeHash: await argon2.hash(code), expiresAt: new Date(Date.now() + 10 * 60_000)}});
    // Mailpit integration can replace this development-only response.
    return {message: 'OTP có hiệu lực trong 10 phút.', ...(process.env.NODE_ENV === 'production' ? {} : {devOtp: code})};
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const studentId = dto.studentId.trim().toUpperCase();
    const phone = dto.phone ? normalizePhone(dto.phone) : undefined;
    const otp = await this.prisma.otpCode.findFirst({where: {email, usedAt: null}, orderBy: {createdAt: 'desc'}});
    if (!otp || otp.expiresAt < new Date() || otp.attempts >= 5) throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn.');
    if (!(await argon2.verify(otp.codeHash, dto.otp))) {
      await this.prisma.otpCode.update({where: {id: otp.id}, data: {attempts: {increment: 1}}});
      throw new BadRequestException('OTP không chính xác.');
    }
    const duplicate = await this.prisma.user.findFirst({
      where: {OR: [{email}, {studentId}, ...(phone ? [{phone}] : [])]},
      select: {email: true, studentId: true, phone: true},
    });
    if (duplicate?.email === email) throw new BadRequestException('Email này đã được đăng ký.');
    if (duplicate?.studentId === studentId) throw new BadRequestException('Mã sinh viên này đã được đăng ký.');
    if (phone && duplicate?.phone === phone) throw new BadRequestException('Số điện thoại này đã được đăng ký.');
    let user;
    try {
      user = await this.prisma.$transaction(async tx => {
        await tx.otpCode.update({where: {id: otp.id}, data: {usedAt: new Date()}});
        return tx.user.create({data: {
          email,
          studentId,
          fullName: dto.fullName.trim(),
          phone,
          className: dto.className?.trim() || undefined,
          passwordHash: await argon2.hash(dto.password),
          role: Role.STUDENT,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          walletBalance: Number(process.env.INITIAL_WALLET_BALANCE || 200000),
        }});
      });
    } catch (error) {
      if ((error as {code?: string}).code === 'P2002') throw new BadRequestException('MSSV, số điện thoại hoặc email đã được sử dụng.');
      throw error;
    }
    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({where: {email: dto.email.trim().toLowerCase()}});
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) throw new UnauthorizedException('Email hoặc mật khẩu chưa đúng.');
    if (user.status === 'LOCKED') throw new UnauthorizedException('Tài khoản đã bị khóa.');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Tài khoản chưa được xác minh.');
    return this.issueSession(user);
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('Không tìm thấy refresh token.');
    const payload = await this.jwt.verifyAsync<{sub: string; sid: string}>(rawToken, {secret: refreshSecret()}).catch(() => null);
    if (!payload) throw new UnauthorizedException('Refresh token không hợp lệ.');
    const session = await this.prisma.refreshSession.findUnique({where: {id: payload.sid}, include: {user: true}});
    if (!session || session.revokedAt || session.expiresAt < new Date() || !(await argon2.verify(session.tokenHash, rawToken))) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    }
    const accessToken = await this.jwt.signAsync({sub: session.user.id, role: session.user.role}, {secret: accessSecret(), expiresIn: '15m'});
    return {accessToken, user: publicUser(session.user)};
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const payload = await this.jwt.verifyAsync<{sid: string}>(rawToken, {secret: refreshSecret()}).catch(() => null);
    if (payload?.sid) await this.prisma.refreshSession.updateMany({where: {id: payload.sid}, data: {revokedAt: new Date()}});
  }

  private async issueSession(user: {id: string; email: string; fullName: string; studentId: string | null; role: Role; walletBalance: unknown}) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    const session = await this.prisma.refreshSession.create({data: {userId: user.id, tokenHash: 'pending', expiresAt}});
    const refreshToken = await this.jwt.signAsync({sub: user.id, sid: session.id}, {secret: refreshSecret(), expiresIn: '7d'});
    await this.prisma.refreshSession.update({where: {id: session.id}, data: {tokenHash: await argon2.hash(refreshToken)}});
    const accessToken = await this.jwt.signAsync({sub: user.id, role: user.role}, {secret: accessSecret(), expiresIn: '15m'});
    return {accessToken, refreshToken, user: publicUser(user)};
  }
}

function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s.-]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}

function publicUser(user: {id: string; email: string; fullName: string; studentId: string | null; role: Role; walletBalance: unknown}) {
  return {id: user.id, email: user.email, name: user.fullName, studentId: user.studentId || undefined, role: user.role.toLowerCase(), walletBalance: Number(user.walletBalance)};
}
