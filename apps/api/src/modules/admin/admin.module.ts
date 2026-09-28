import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InventoryModule } from '../inventory/inventory.module';
@Module({ imports: [InventoryModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}

