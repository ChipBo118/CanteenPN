import {Body, Controller, Get, Headers, Param, Patch, Post, Query, Req} from '@nestjs/common';
import {Role} from '@prisma/client';
import {Public, Roles} from './auth.decorators';
import {AuthUser} from './auth.guard';
import {CreateMenuItemDto, SetStockDto} from './menu.dto';
import {MenuService} from './menu.service';

@Controller()
export class MenuController {
  constructor(private menu: MenuService) {}
  @Public() @Get('menu') list(@Query('date') date?: string) { return this.menu.list(date); }
  @Public() @Get('categories') categories() { return this.menu.categories(); }
  @Get('slots') slots() { return this.menu.slots(); }
  @Roles(Role.ADMIN) @Get('admin/menu') adminList(@Query('date') date?: string) { return this.menu.list(date, true); }
  @Roles(Role.ADMIN) @Post('admin/menu') create(@Body() dto: CreateMenuItemDto, @Req() req: {user: AuthUser}) { return this.menu.create(dto, req.user.id); }
  @Roles(Role.ADMIN, Role.STAFF) @Patch('staff/menu/:id/stock') setStock(@Param('id') id: string, @Body() dto: SetStockDto, @Req() req: {user: AuthUser}) { return this.menu.setStock(id, dto, req.user.id); }
}
