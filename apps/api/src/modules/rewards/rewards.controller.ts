import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { ValidateVoucherDto } from './rewards.dto';
import { RewardsService } from './rewards.service';
@ApiTags('loyalty', 'coupons', 'vouchers') @Controller()
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}
  @Public() @Get('coupons') coupons() { return this.rewards.coupons(); }
  @Public() @Get('vouchers') vouchers() { return this.rewards.vouchers(); }
  @ApiBearerAuth() @Roles(Role.STUDENT) @Get('loyalty') loyalty(@CurrentUser() user: AuthUser) { return this.rewards.loyalty(user.sub); }
  @ApiBearerAuth() @Roles(Role.STUDENT) @Get('student-vouchers') owned(@CurrentUser() user: AuthUser) { return this.rewards.owned(user.sub); }
  @ApiBearerAuth() @Roles(Role.STUDENT) @Post('vouchers/:id/redeem') redeem(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.rewards.redeem(user.sub, id); }
  @ApiBearerAuth() @Roles(Role.STUDENT) @Post('vouchers/:id/claim') claim(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.rewards.claim(user.sub, id); }
  @ApiBearerAuth() @Roles(Role.STUDENT) @Post('vouchers/validate') validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateVoucherDto) { return this.rewards.validate(user.sub, dto.serialCode); }
}

