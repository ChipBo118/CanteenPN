import {Body, Controller, Get, Headers, Param, Patch, Post, Req} from '@nestjs/common';
import {Role} from '@prisma/client';
import {Roles} from './auth.decorators';
import {AuthUser} from './auth.guard';
import {CreateOrderDto, TransitionOrderDto} from './orders.dto';
import {OrdersGateway} from './orders.gateway';
import {OrdersService} from './orders.service';

@Controller()
export class OrdersController {
  constructor(private orders: OrdersService, private gateway: OrdersGateway) {}
  @Roles(Role.STUDENT) @Get('orders') mine(@Req() req: {user: AuthUser}) { return this.orders.listForUser(req.user.id); }
  @Roles(Role.STUDENT) @Post('orders')
  async create(@Req() req: {user: AuthUser}, @Body() dto: CreateOrderDto, @Headers('idempotency-key') key = '') {
    const order = await this.orders.create(req.user.id, dto, key); this.gateway.emitUpdate(order); return order;
  }
  @Roles(Role.STUDENT) @Post('orders/:id/cancel')
  async cancel(@Req() req: {user: AuthUser}, @Param('id') id: string) { const order = await this.orders.cancel(req.user.id, id); this.gateway.emitUpdate(order); return order; }
  @Roles(Role.STAFF, Role.ADMIN) @Get('staff/orders') staffList() { return this.orders.listForStaff(); }
  @Roles(Role.STAFF, Role.ADMIN) @Patch('staff/orders/:id/status')
  async transition(@Req() req: {user: AuthUser}, @Param('id') id: string, @Body() dto: TransitionOrderDto) { const order = await this.orders.transition(req.user.id, id, dto.status, dto.note); this.gateway.emitUpdate(order); return order; }
}
