import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications') @ApiBearerAuth() @Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.notifications.list(user.sub); }
  @Post('read-all') readAll(@CurrentUser() user: AuthUser) { return this.notifications.readAll(user.sub); }
  @Post(':id/read') read(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.notifications.read(user.sub, id); }
}

