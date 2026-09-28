import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { PaymentsService } from './payments.service';

@ApiTags('payments') @ApiBearerAuth() @Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get(':orderId') get(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) { return this.payments.get(user.sub, orderId); }
  @Post(':orderId/mock-vnpay/succeed') succeed(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) { return this.payments.mockVnpaySuccess(user.sub, orderId); }
}

