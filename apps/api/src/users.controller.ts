import {BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Query, Req} from '@nestjs/common';
import {Role, UserStatus} from '@prisma/client';
import {Roles} from './auth.decorators';
import {AuthUser} from './auth.guard';
import {PrismaService} from './prisma.service';
import {UpdateProfileDto} from './users.dto';

@Controller()
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('profile')
  profile(@Req() req: {user: AuthUser}) {
    return this.prisma.user.findUnique({where: {id: req.user.id}, select: {id: true, email: true, studentId: true, fullName: true, phone: true, className: true, role: true, status: true, walletBalance: true}});
  }

  @Patch('profile')
  async update(@Req() req: {user: AuthUser}, @Body() dto: UpdateProfileDto) {
    if (dto.phone) {
      const owner = await this.prisma.user.findFirst({where: {phone: dto.phone, id: {not: req.user.id}}, select: {id: true}});
      if (owner) throw new BadRequestException('Số điện thoại này đã được tài khoản khác sử dụng.');
    }
    let user;
    try {
      user = await this.prisma.user.update({where: {id: req.user.id}, data: dto, select: {id: true, email: true, studentId: true, fullName: true, phone: true, className: true, role: true}});
    } catch (error) {
      if ((error as {code?: string}).code === 'P2002') throw new BadRequestException('Số điện thoại này đã được tài khoản khác sử dụng.');
      throw error;
    }
    await this.prisma.auditLog.create({data: {userId: req.user.id, action: 'PROFILE_UPDATED', entityType: 'User', entityId: req.user.id}});
    return user;
  }

  @Roles(Role.ADMIN) @Get('admin/users')
  users(@Query('q') query?: string) {
    const q = query?.trim();
    return this.prisma.user.findMany({
      where: q ? {OR: [
        {studentId: {contains: q.toUpperCase(), mode: 'insensitive'}},
        {email: {contains: q.toLowerCase(), mode: 'insensitive'}},
        {fullName: {contains: q, mode: 'insensitive'}},
      ]} : undefined,
      select: {id: true, email: true, studentId: true, fullName: true, className: true, phone: true, role: true, status: true, createdAt: true},
      orderBy: [{role: 'asc'}, {studentId: 'asc'}, {createdAt: 'desc'}],
    });
  }

  @Roles(Role.ADMIN) @Get('admin/students/:studentId')
  async student(@Param('studentId') studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: {studentId: studentId.trim().toUpperCase()},
      select: {id: true, email: true, studentId: true, fullName: true, className: true, phone: true, role: true, status: true, walletBalance: true, createdAt: true},
    });
    if (!user || user.role !== Role.STUDENT) throw new NotFoundException('Không tìm thấy tài khoản sinh viên.');
    return user;
  }

  @Roles(Role.ADMIN) @Patch('admin/users/:id/status')
  async status(@Req() req: {user: AuthUser}, @Param('id') id: string, @Body('status') status: UserStatus) {
    return this.changeStatus(req.user.id, id, status);
  }

  @Roles(Role.ADMIN) @Patch('admin/students/:studentId/status')
  async studentStatus(@Req() req: {user: AuthUser}, @Param('studentId') studentId: string, @Body('status') status: UserStatus) {
    const student = await this.prisma.user.findUnique({where: {studentId: studentId.trim().toUpperCase()}});
    if (!student || student.role !== Role.STUDENT) throw new NotFoundException('Không tìm thấy tài khoản sinh viên.');
    return this.changeStatus(req.user.id, student.id, status, student.studentId || undefined);
  }

  private async changeStatus(actorId: string, id: string, status: UserStatus, studentId?: string) {
    if (status !== UserStatus.ACTIVE && status !== UserStatus.LOCKED) throw new BadRequestException('Trạng thái không hợp lệ.');
    const user = await this.prisma.user.update({where: {id}, data: {status}});
    if (status === UserStatus.LOCKED) await this.prisma.refreshSession.updateMany({where: {userId: id, revokedAt: null}, data: {revokedAt: new Date()}});
    await this.prisma.auditLog.create({data: {userId: actorId, action: `USER_${status}`, entityType: 'User', entityId: id, metadata: studentId ? {studentId} : undefined}});
    return {id: user.id, studentId: user.studentId, status: user.status};
  }
}
