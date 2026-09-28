import { HttpStatus, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import type { AuthUser } from '../../common/auth-user';
import { PrismaService } from '../../prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}
  private async roomFor(user: AuthUser, roomId: string) { const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId }, include: { order: { include: { studentProfile: true } } } }); const staffRoles: Role[] = [Role.CASHIER, Role.ADMIN]; const staff = staffRoles.includes(user.role); if (!room || (!staff && room.order.studentProfile.userId !== user.sub)) throw new ApiError(HttpStatus.FORBIDDEN, 'CHAT_ACCESS_DENIED', 'Bạn không có quyền truy cập cuộc trò chuyện này.'); return room; }
  async orderRoom(user: AuthUser, orderId: string) { const room = await this.prisma.chatRoom.findFirst({ where: { orderId, ...(user.role === Role.STUDENT ? { order: { studentProfile: { userId: user.sub } } } : {}) }, include: { messages: { orderBy: { createdAt: 'asc' } }, order: { select: { orderCode: true } } } }); if (!room) throw new ApiError(HttpStatus.NOT_FOUND, 'CHAT_ROOM_NOT_FOUND', 'Cuộc trò chuyện chỉ có sau khi đơn được xác nhận.'); return room; }
  inbox() { return this.prisma.chatRoom.findMany({ include: { order: { include: { studentProfile: { include: { studentDirectory: true } } } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 }, participants: true }, orderBy: { updatedAt: 'desc' } }); }
  async messages(user: AuthUser, roomId: string) { await this.roomFor(user, roomId); return this.prisma.chatMessage.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } }); }
  async send(user: AuthUser, roomId: string, content: string) { await this.roomFor(user, roomId); const message = await this.prisma.$transaction(async tx => { await tx.chatParticipant.upsert({ where: { roomId_userId: { roomId, userId: user.sub } }, update: {}, create: { roomId, userId: user.sub } }); const created = await tx.chatMessage.create({ data: { roomId, senderUserId: user.sub, senderRole: user.role, content: content.trim() } }); await tx.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } }); return created; }); this.realtime.emitToChat(roomId, 'chat:message', message); return message; }
  async read(user: AuthUser, roomId: string) { await this.roomFor(user, roomId); const now = new Date(); await this.prisma.$transaction([this.prisma.chatParticipant.upsert({ where: { roomId_userId: { roomId, userId: user.sub } }, update: { lastReadAt: now }, create: { roomId, userId: user.sub, lastReadAt: now } }), this.prisma.chatMessage.updateMany({ where: { roomId, senderUserId: { not: user.sub }, readAt: null }, data: { readAt: now } })]); this.realtime.emitToChat(roomId, 'chat:read', { userId: user.sub, readAt: now }); return { ok: true }; }
}

