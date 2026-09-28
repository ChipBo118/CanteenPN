import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import type { Role } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';
import { RealtimeService } from './realtime.service';

type SocketUser = { sub: string; email: string; role: Role };

@WebSocketGateway({ cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}
  afterInit(server: Server) { this.realtime.attach(server); }
  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error('missing token');
      const user = await this.jwt.verifyAsync<SocketUser>(token, { secret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me' });
      socket.data.user = user;
      await socket.join([`user:${user.sub}`, `role:${user.role}`]);
    } catch {
      this.logger.warn(`Từ chối socket ${socket.id}: token không hợp lệ`);
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('order:subscribe')
  async subscribeOrder(@ConnectedSocket() socket: Socket, @MessageBody() payload: { orderId?: string }) {
    const user = socket.data.user as SocketUser | undefined;
    if (!user || !payload?.orderId) throw new WsException('Yêu cầu không hợp lệ.');
    const allowed = user.role === 'ADMIN' || user.role === 'CASHIER' || user.role === 'KITCHEN_STAFF' || Boolean(await this.prisma.order.findFirst({ where: { id: payload.orderId, studentProfile: { userId: user.sub } }, select: { id: true } }));
    if (!allowed) throw new WsException('Bạn không có quyền theo dõi đơn này.');
    await socket.join(`order:${payload.orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('order:unsubscribe')
  async unsubscribeOrder(@ConnectedSocket() socket: Socket, @MessageBody() payload: { orderId?: string }) { if (payload?.orderId) await socket.leave(`order:${payload.orderId}`); return { ok: true }; }

  private async canAccessChat(user: SocketUser, roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId }, include: { order: { include: { studentProfile: true } } } });
    if (!room) return false;
    if (user.role === 'ADMIN' || user.role === 'CASHIER') return true;
    return room.order.studentProfile.userId === user.sub;
  }

  @SubscribeMessage('chat:join')
  async joinChat(@ConnectedSocket() socket: Socket, @MessageBody() payload: { roomId?: string }) {
    const user = socket.data.user as SocketUser | undefined;
    if (!user || !payload?.roomId || !(await this.canAccessChat(user, payload.roomId))) throw new WsException('Bạn không có quyền truy cập cuộc trò chuyện này.');
    await socket.join(`chat:${payload.roomId}`);
    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  async leaveChat(@ConnectedSocket() socket: Socket, @MessageBody() payload: { roomId?: string }) { if (payload?.roomId) await socket.leave(`chat:${payload.roomId}`); return { ok: true }; }

  @SubscribeMessage('chat:typing')
  async typing(@ConnectedSocket() socket: Socket, @MessageBody() payload: { roomId?: string; typing?: boolean }) {
    const user = socket.data.user as SocketUser | undefined;
    if (!user || !payload?.roomId || !(await this.canAccessChat(user, payload.roomId))) throw new WsException('Không có quyền gửi trạng thái nhập.');
    socket.to(`chat:${payload.roomId}`).emit('chat:typing', { roomId: payload.roomId, userId: user.sub, typing: Boolean(payload.typing) });
    return { ok: true };
  }

  @SubscribeMessage('chat:send')
  async sendChat(@ConnectedSocket() socket: Socket, @MessageBody() payload: { roomId?: string; content?: string }) {
    const user = socket.data.user as SocketUser | undefined;
    const content = payload?.content?.trim();
    if (!user || !payload?.roomId || !content || content.length > 2000 || !(await this.canAccessChat(user, payload.roomId))) throw new WsException('Tin nhắn không hợp lệ.');
    const message = await this.prisma.$transaction(async tx => {
      await tx.chatParticipant.upsert({ where: { roomId_userId: { roomId: payload.roomId!, userId: user.sub } }, update: {}, create: { roomId: payload.roomId!, userId: user.sub } });
      const created = await tx.chatMessage.create({ data: { roomId: payload.roomId!, senderUserId: user.sub, senderRole: user.role, content } });
      await tx.chatRoom.update({ where: { id: payload.roomId! }, data: { updatedAt: new Date() } });
      return created;
    });
    this.realtime.emitToChat(payload.roomId, 'chat:message', message);
    return message;
  }
}

