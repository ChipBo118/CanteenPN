import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}
  list(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async create(userId: string, type: NotificationType, title: string, message: string, data?: object) { const notification = await this.prisma.notification.create({ data: { userId, type, title, message, data } }); this.realtime.emitToUser(userId, 'notification:new', notification); return notification; }
  async read(userId: string, id: string) { const result = await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true, readAt: new Date() } }); if (!result.count) throw new ApiError(HttpStatus.NOT_FOUND, 'NOTIFICATION_NOT_FOUND', 'Không tìm thấy thông báo.'); return { ok: true }; }
  async readAll(userId: string) { await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } }); return { ok: true }; }
}

