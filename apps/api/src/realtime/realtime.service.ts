import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;
  attach(server: Server) { this.server = server; }
  emitToUser(userId: string, event: string, payload: unknown) { this.server?.to(`user:${userId}`).emit(event, payload); }
  emitToRole(role: string, event: string, payload: unknown) { this.server?.to(`role:${role}`).emit(event, payload); }
  emitToOrder(orderId: string, event: string, payload: unknown) { this.server?.to(`order:${orderId}`).emit(event, payload); }
  emitToChat(roomId: string, event: string, payload: unknown) { this.server?.to(`chat:${roomId}`).emit(event, payload); }
}

