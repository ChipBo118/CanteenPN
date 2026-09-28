import { Body, Controller, Get, Headers, Param, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { CreateOrderDto, PickupTokenDto, ReasonDto } from './orders.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders') @ApiBearerAuth() @Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Roles(Role.STUDENT) @Post('orders') create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto, @Headers('idempotency-key') key?: string) { return this.orders.create(user.sub, dto, key); }
  @Roles(Role.STUDENT) @Get('orders') mine(@CurrentUser() user: AuthUser) { return this.orders.mine(user.sub); }
  @Roles(Role.STUDENT) @Get('orders/:id') detail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.mineDetail(user.sub, id); }
  @Roles(Role.STUDENT) @Post('orders/:id/cancel') cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReasonDto) { return this.orders.cancelByStudent(user.sub, id, dto.reason); }
  @Roles(Role.CASHIER, Role.ADMIN) @Get('cashier/orders') queue(@Query('status', new ParseEnumPipe(OrderStatus, { optional: true })) status?: OrderStatus) { return this.orders.cashierQueue(status); }
  @Roles(Role.CASHIER, Role.ADMIN) @Post('cashier/orders/:id/accept') accept(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.accept(user.sub, id); }
  @Roles(Role.CASHIER, Role.ADMIN) @Post('cashier/orders/:id/reject') reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReasonDto) { return this.orders.reject(user.sub, id, dto.reason); }
  @Roles(Role.CASHIER, Role.ADMIN) @Post('cashier/orders/:id/confirm-cash') cash(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.confirmCash(user.sub, id); }
  @Roles(Role.CASHIER, Role.ADMIN) @Post('cashier/scan-pickup-token') handoff(@CurrentUser() user: AuthUser, @Body() dto: PickupTokenDto) { return this.orders.handoff(user.sub, dto.token); }
}

