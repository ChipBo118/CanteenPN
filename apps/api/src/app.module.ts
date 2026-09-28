import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {AppController} from './app.controller';
import {PrismaModule} from './prisma.service';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { OperationsModule } from './modules/operations/operations.module';
import { ChatModule } from './modules/chat/chat.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    KitchenModule,
    RealtimeModule,
    NotificationsModule,
    PaymentsModule,
    WalletModule,
    RewardsModule,
    OperationsModule,
    ChatModule,
    EngagementModule,
    AdminModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
