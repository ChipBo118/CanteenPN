import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { KitchenService } from './kitchen.service';

@ApiTags('kitchen') @ApiBearerAuth() @Roles(Role.KITCHEN_STAFF, Role.ADMIN) @Controller('kitchen/tasks')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}
  @Get() available() { return this.kitchen.available(); }
  @Get('mine') mine(@CurrentUser() user: AuthUser) { return this.kitchen.mine(user.sub); }
  @Post(':id/claim') claim(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.kitchen.claim(user.sub, id); }
  @Post(':id/start') start(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.kitchen.start(user.sub, id); }
  @Post(':id/complete') complete(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.kitchen.complete(user.sub, id); }
}

