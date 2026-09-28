import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {JwtService} from '@nestjs/jwt';
import {Role} from '@prisma/client';
import {IS_PUBLIC, ROLES} from './auth.decorators';
import {PrismaService} from './prisma.service';

export type AuthUser = {id: string; email: string; fullName: string; role: Role};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    const token = request.cookies?.cg_access || bearer;
    if (!token) throw new UnauthorizedException('Bạn cần đăng nhập.');
    try {
      const payload = await this.jwt.verifyAsync<{sub: string}>(token, {secret: accessSecret()});
      const user = await this.prisma.user.findUnique({where: {id: payload.sub}});
      if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Tài khoản không hoạt động.');
      request.user = {id: user.id, email: user.email, fullName: user.fullName, role: user.role} satisfies AuthUser;
      const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES, [context.getHandler(), context.getClass()]);
      if (allowed?.length && !allowed.includes(user.role)) throw new UnauthorizedException('Bạn không có quyền truy cập.');
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    }
  }
}

export const accessSecret = () => process.env.JWT_SECRET || 'canteengo-local-development-secret';
export const refreshSecret = () => process.env.JWT_REFRESH_SECRET || `${accessSecret()}-refresh`;
