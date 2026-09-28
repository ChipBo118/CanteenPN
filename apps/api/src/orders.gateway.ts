import {WebSocketGateway,WebSocketServer} from '@nestjs/websockets';
import {Server} from 'socket.io';
@WebSocketGateway({cors:{origin:true,credentials:true}}) export class OrdersGateway{@WebSocketServer() server:Server;emitUpdate(order:unknown){this.server?.emit('order.updated',order)}}
