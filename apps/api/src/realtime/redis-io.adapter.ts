import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  constructor(app: INestApplicationContext, private readonly redisUrl: string) { super(app); }
  async connect() {
    const publisher = new Redis(this.redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
    const subscriber = publisher.duplicate();
    publisher.on('error', () => undefined);
    subscriber.on('error', () => undefined);
    try {
      await Promise.all([publisher.connect(), subscriber.connect()]);
      this.adapterConstructor = createAdapter(publisher, subscriber);
    } catch (error) {
      publisher.disconnect();
      subscriber.disconnect();
      throw error;
    }
  }
  createIOServer(port: number, options?: ServerOptions) { const server = super.createIOServer(port, options); if (this.adapterConstructor) server.adapter(this.adapterConstructor); return server; }
}

