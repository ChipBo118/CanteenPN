import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from './auth-user';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser => {
  return (context.switchToHttp().getRequest<Request & { user: AuthUser }>()).user;
});

