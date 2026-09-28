import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import { ApiError } from './api-error';
import { ROLES_KEY } from './auth.decorators';
import type { AuthUser } from './auth-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = (context.switchToHttp().getRequest<Request & { user: AuthUser }>()).user;
    if (!user || !roles.includes(user.role)) throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
    return true;
  }
}

