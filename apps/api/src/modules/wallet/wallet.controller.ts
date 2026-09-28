import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { DepositDto, LinkBankDto, TopUpDto, WithdrawDto } from './wallet.dto';
import { WalletService } from './wallet.service';
@ApiTags('wallet') @ApiBearerAuth() @Roles(Role.STUDENT) @Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}
  @Get() get(@CurrentUser() user: AuthUser) { return this.wallet.get(user.sub); }
  @Get('transactions') transactions(@CurrentUser() user: AuthUser) { return this.wallet.get(user.sub).then(value => value.transactions); }
  @Get('requests') requests(@CurrentUser() user: AuthUser) { return this.wallet.requests(user.sub); }
  @Post('deposit') deposit(@CurrentUser() user: AuthUser, @Body() dto: DepositDto) { return this.wallet.deposit(user.sub, dto); }
  @Post('withdraw') withdraw(@CurrentUser() user: AuthUser, @Body() dto: WithdrawDto) { return this.wallet.withdraw(user.sub, dto); }
  @Post('link-bank') linkBank(@CurrentUser() user: AuthUser, @Body() dto: LinkBankDto) { return this.wallet.linkBank(user.sub, dto); }
  @Post('mock-top-up') topUp(@CurrentUser() user: AuthUser, @Body() dto: TopUpDto) { return this.wallet.topUp(user.sub, dto.amount); }
}

