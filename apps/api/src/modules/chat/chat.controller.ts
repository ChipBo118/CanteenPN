import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { SendMessageDto } from './chat.dto';
import { ChatService } from './chat.service';
@ApiTags('chat') @ApiBearerAuth() @Controller()
export class ChatController { constructor(private readonly chat: ChatService) {} @Get('orders/:orderId/chat') orderRoom(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) { return this.chat.orderRoom(user, orderId); } @Roles(Role.CASHIER, Role.ADMIN) @Get('cashier/chat') inbox() { return this.chat.inbox(); } @Get('chat/rooms/:id/messages') messages(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.chat.messages(user, id); } @Post('chat/rooms/:id/messages') send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.chat.send(user, id, dto.content); } @Post('chat/rooms/:id/read') read(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.chat.read(user, id); } }

