import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { AdjustInventoryDto, CorrectAttendanceDto, CreateEmployeeDto, CreateIngredientDto, CreateShiftDto, CreateStockReceiptDto, CreateSupplierDto, UpdateEmployeeDto, UpdateIngredientDto, UpdateShiftDto, UpdateSupplierDto } from './operations.dto';
import { OperationsService } from './operations.service';

@ApiTags('inventory', 'suppliers', 'employees', 'shifts', 'attendance') @ApiBearerAuth() @Controller()
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Roles(Role.ADMIN) @Get('admin/ingredients') ingredients() { return this.operations.ingredients(); }
  @Roles(Role.ADMIN) @Post('admin/ingredients') createIngredient(@Body() dto: CreateIngredientDto) { return this.operations.createIngredient(dto); }
  @Roles(Role.ADMIN) @Patch('admin/ingredients/:id') updateIngredient(@Param('id') id: string, @Body() dto: UpdateIngredientDto) { return this.operations.updateIngredient(id, dto); }
  @Roles(Role.ADMIN) @Delete('admin/ingredients/:id') deleteIngredient(@Param('id') id: string) { return this.operations.deleteIngredient(id); }
  @Roles(Role.ADMIN) @Post('admin/ingredients/:id/adjust') adjust(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AdjustInventoryDto) { return this.operations.adjustIngredient(user.sub, id, dto); }
  @Roles(Role.ADMIN) @Get('admin/suppliers') suppliers() { return this.operations.suppliers(); }
  @Roles(Role.ADMIN) @Post('admin/suppliers') createSupplier(@Body() dto: CreateSupplierDto) { return this.operations.createSupplier(dto); }
  @Roles(Role.ADMIN) @Patch('admin/suppliers/:id') updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) { return this.operations.updateSupplier(id, dto); }
  @Roles(Role.ADMIN) @Get('admin/stock-receipts') receipts() { return this.operations.receipts(); }
  @Roles(Role.ADMIN) @Post('admin/stock-receipts') createReceipt(@CurrentUser() user: AuthUser, @Body() dto: CreateStockReceiptDto) { return this.operations.createReceipt(user.sub, dto); }
  @Roles(Role.ADMIN) @Post('admin/stock-receipts/:id/confirm') confirmReceipt(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.operations.confirmReceipt(user.sub, id); }
  @Roles(Role.ADMIN) @Get('admin/employees') employees() { return this.operations.employees(); }
  @Roles(Role.ADMIN) @Post('admin/employees') createEmployee(@Body() dto: CreateEmployeeDto) { return this.operations.createEmployee(dto); }
  @Roles(Role.ADMIN) @Patch('admin/employees/:id') updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.operations.updateEmployee(id, dto); }
  @Roles(Role.ADMIN) @Delete('admin/employees/:id') deleteEmployee(@Param('id') id: string) { return this.operations.deleteEmployee(id); }
  @Roles(Role.ADMIN) @Get('admin/shifts') shifts(@Query('employeeId') employeeId?: string) { return this.operations.shifts(employeeId); }
  @Roles(Role.ADMIN) @Post('admin/shifts') createShift(@Body() dto: CreateShiftDto) { return this.operations.createShift(dto); }
  @Roles(Role.ADMIN) @Patch('admin/shifts/:id') updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) { return this.operations.updateShift(id, dto); }
  @Roles(Role.ADMIN) @Delete('admin/shifts/:id') deleteShift(@Param('id') id: string) { return this.operations.deleteShift(id); }
  @Roles(Role.CASHIER, Role.KITCHEN_STAFF) @Get('shifts/mine') myShifts(@CurrentUser() user: AuthUser) { return this.operations.myShifts(user.sub); }
  @Roles(Role.CASHIER, Role.KITCHEN_STAFF) @Post('attendance/clock-in') clockIn(@CurrentUser() user: AuthUser) { return this.operations.clockIn(user.sub); }
  @Roles(Role.CASHIER, Role.KITCHEN_STAFF) @Post('attendance/clock-out') clockOut(@CurrentUser() user: AuthUser) { return this.operations.clockOut(user.sub); }
  @Roles(Role.ADMIN) @Get('admin/attendance') attendance() { return this.operations.attendances(); }
  @Roles(Role.ADMIN) @Patch('admin/attendance/:id') correct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CorrectAttendanceDto) { return this.operations.correctAttendance(user.sub, id, dto); }
}
