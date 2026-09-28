import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';

@Module({ imports: [InventoryModule], controllers: [KitchenController], providers: [KitchenService] })
export class KitchenModule {}
