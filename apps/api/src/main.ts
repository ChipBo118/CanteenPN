import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import {AppModule} from './app.module';
import {resolve} from 'path';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  try { process.loadEnvFile(candidate); break; } catch { /* Try the next conventional workspace location. */ }
}
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });
  app.setGlobalPrefix('api');
  const origins = (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',').map(value => value.trim());
  app.enableCors({ origin: origins, credentials: true });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.useStaticAssets(resolve(process.env.UPLOAD_DIR ?? './uploads'), { prefix: '/uploads/', dotfiles: 'deny', index: false, immutable: true, maxAge: '30d' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  const redisAdapter = new RedisIoAdapter(app, process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
  try {
    await redisAdapter.connect();
    app.useWebSocketAdapter(redisAdapter);
  } catch (error) {
    Logger.warn(`Không kết nối được Redis adapter, Socket.IO chạy một tiến trình: ${String(error)}`, 'Bootstrap');
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CanteenPN API')
    .setDescription('REST API cho hệ thống quản lý Căng tin Học viện Phụ nữ CanteenPN')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('canteengo_refresh')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, { customSiteTitle: 'CanteenPN API Docs' });

  app.enableShutdownHooks();
  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`CanteenPN API đang chạy tại http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
