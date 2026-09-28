import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiError } from './api-error';
import { IS_PUBLIC_KEY } from './auth.decorators';
import type { AuthUser } from './auth-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new ApiError(HttpStatus.UNAUTHORIZED, 'AUTHENTICATION_REQUIRED', 'Vui lòng đăng nhập để tiếp tục.');
    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(token, { secret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me' });
      return true;
    } catch {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'ACCESS_TOKEN_INVALID', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}

