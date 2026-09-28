import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { AddCartItemDto, QuoteDto, UpdateCartItemDto } from './cart.dto';
import { CartService } from './cart.service';

@ApiTags('cart') @ApiBearerAuth() @Roles(Role.STUDENT) @Controller()
export class CartController {
  constructor(private readonly cart: CartService) {}
  @Get('cart') get(@CurrentUser() user: AuthUser) { return this.cart.get(user.sub); }
  @Post('cart/items') add(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) { return this.cart.add(user.sub, dto); }
  @Patch('cart/items/:id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCartItemDto) { return this.cart.update(user.sub, id, dto); }
  @Delete('cart/items/:id') remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.cart.remove(user.sub, id); }
  @Delete('cart') clear(@CurrentUser() user: AuthUser) { return this.cart.clear(user.sub); }
  @Post('checkout/quote') quote(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) { return this.cart.quote(user.sub, dto); }
}

