import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { AdminReasonDto, AdminResetPasswordDto, CreateCouponDto, CreateVoucherDto, StudentQueryDto, UpdateCouponDto, UpdateSettingsDto, UpdateVoucherDto } from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin', 'reports') @ApiBearerAuth() @Roles(Role.ADMIN) @Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('students') students(@Query() query: StudentQueryDto) { return this.admin.students(query); }
  @Post('students/:userId/lock') lock(@CurrentUser() actor: AuthUser, @Param('userId') id: string, @Body() dto: AdminReasonDto) { return this.admin.setStudentStatus(actor.sub, id, UserStatus.LOCKED, dto.reason); }
  @Post('students/:userId/unlock') unlock(@CurrentUser() actor: AuthUser, @Param('userId') id: string, @Body() dto: AdminReasonDto) { return this.admin.setStudentStatus(actor.sub, id, UserStatus.ACTIVE, dto.reason); }
  @Post('students/:userId/deactivate') deactivate(@CurrentUser() actor: AuthUser, @Param('userId') id: string, @Body() dto: AdminReasonDto) { return this.admin.setStudentStatus(actor.sub, id, UserStatus.INACTIVE, dto.reason); }
  @Post('students/:userId/reset-password') reset(@CurrentUser() actor: AuthUser, @Param('userId') id: string, @Body() dto: AdminResetPasswordDto) { return this.admin.resetStudentPassword(actor.sub, id, dto.password, dto.reason); }
  @Get('settings') settings() { return this.admin.settings(); }
  @Patch('settings') updateSettings(@CurrentUser() actor: AuthUser, @Body() dto: UpdateSettingsDto) { return this.admin.updateSettings(actor.sub, dto); }
  @Get('coupons') coupons() { return this.admin.coupons(); }
  @Post('coupons') createCoupon(@Body() dto: CreateCouponDto) { return this.admin.createCoupon(dto); }
  @Patch('coupons/:id') updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) { return this.admin.updateCoupon(id, dto); }
  @Get('vouchers') vouchers() { return this.admin.vouchers(); }
  @Post('vouchers') createVoucher(@Body() dto: CreateVoucherDto) { return this.admin.createVoucher(dto); }
  @Patch('vouchers/:id') updateVoucher(@Param('id') id: string, @Body() dto: UpdateVoucherDto) { return this.admin.updateVoucher(id, dto); }
  @Delete('vouchers/:id') deleteVoucher(@Param('id') id: string) { return this.admin.deleteVoucher(id); }
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('wallet-summary') walletSummary() { return this.admin.walletSummary(); }
  @Get('wallet-transactions') walletTransactions() { return this.admin.walletTransactions(); }
  @Get('wallet-requests') walletRequests() { return this.admin.walletRequests(); }
  @Post('wallet-requests/:id/approve') approveWalletRequest(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: AdminReasonDto) { return this.admin.reviewWalletRequest(actor.sub, id, true, dto.reason); }
  @Post('wallet-requests/:id/reject') rejectWalletRequest(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: AdminReasonDto) { return this.admin.reviewWalletRequest(actor.sub, id, false, dto.reason); }
  @Get('orders') orders() { return this.admin.orders(); }
  @Get('orders/:id') order(@Param('id') id: string) { return this.admin.order(id); }
  @Post('orders/:id/cancel') cancelOrder(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: AdminReasonDto) { return this.admin.cancelOrder(actor.sub, id, dto.reason); }
  @Get('employee-performance') performance() { return this.admin.employeePerformance(); }
  @Get('reports/:type') report(@Param('type') type: string, @Query('from') from?: string, @Query('to') to?: string, @Query('categoryId') categoryId?: string, @Query('employeeId') employeeId?: string, @Query('paymentMethod') paymentMethod?: string) { return this.admin.report(type, from, to, categoryId, employeeId, paymentMethod); }
  @Get('reports/:type/export') async export(@Param('type') type: string, @Query('format') format: 'csv' | 'xlsx' = 'csv', @Query('from') from: string | undefined, @Query('to') to: string | undefined, @Query('categoryId') categoryId: string | undefined, @Query('employeeId') employeeId: string | undefined, @Query('paymentMethod') paymentMethod: string | undefined, @Res() response: Response) { const file = await this.admin.exportReport(type, format, from, to, categoryId, employeeId, paymentMethod); response.setHeader('content-type', file.contentType); response.setHeader('content-disposition', `attachment; filename="canteenpn-${type}.${file.extension}"`); response.send(file.buffer); }
}
