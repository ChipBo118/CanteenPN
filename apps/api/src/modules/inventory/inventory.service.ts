import { HttpStatus, Injectable } from '@nestjs/common';
import { InventoryReservationItemStatus, InventoryReservationStatus, InventoryTransactionType, Prisma, Role } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { RealtimeService } from '../../realtime/realtime.service';

type Requirement = { orderItemId: string; ingredientId: string; quantity: Prisma.Decimal };

@Injectable()
export class InventoryService {
  constructor(private readonly realtime?: RealtimeService) {}
  private lowStock(ingredient: { id: string; name: string; unit: string; currentQuantity: Prisma.Decimal; reservedQuantity: Prisma.Decimal; lowStockThreshold: Prisma.Decimal }, reservedAfter: Prisma.Decimal) { const available = ingredient.currentQuantity.sub(reservedAfter); if (available.lessThanOrEqualTo(ingredient.lowStockThreshold)) this.realtime?.emitToRole(Role.ADMIN, 'inventory:low-stock', { ingredientId: ingredient.id, name: ingredient.name, unit: ingredient.unit, available: available.toString(), threshold: ingredient.lowStockThreshold.toString() }); }
  async reserveForOrder(tx: Prisma.TransactionClient, orderId: string) {
    const existing = await tx.inventoryReservation.findUnique({ where: { orderId } });
    if (existing) return existing;
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                recipes: { include: { ingredients: true } },
              },
            },
            combo: {
              include: {
                items: {
                  include: {
                    product: {
                      include: {
                        recipes: { include: { ingredients: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const requirements: Requirement[] = [];
    for (const item of order.items) {
      const recipeSources = item.product ? [{ product: item.product, quantity: item.quantity, variantId: item.variantId }] : item.combo ? item.combo.items.map(comboItem => ({ product: comboItem.product, quantity: comboItem.quantity * item.quantity, variantId: comboItem.variantId })) : [];
      for (const source of recipeSources) {
        const recipe = source.product.recipes.find(candidate => candidate.variantId === source.variantId) ?? source.product.recipes.find(candidate => candidate.variantId === null);
        if (!recipe) continue;
        for (const ingredient of recipe.ingredients) requirements.push({ orderItemId: item.id, ingredientId: ingredient.ingredientId, quantity: ingredient.quantity.mul(source.quantity) });
      }
    }
    const totals = new Map<string, Prisma.Decimal>();
    for (const item of requirements) totals.set(item.ingredientId, (totals.get(item.ingredientId) ?? new Prisma.Decimal(0)).add(item.quantity));
    for (const [ingredientId, quantity] of totals) {
      const ingredient = await tx.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
      const available = ingredient.currentQuantity.sub(ingredient.reservedQuantity);
      if (available.lessThan(quantity)) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_INVENTORY', `Không đủ nguyên liệu ${ingredient.name}.`, { ingredientId, ingredientName: ingredient.name, required: quantity.toString(), available: available.toString() });
      const updated = await tx.ingredient.updateMany({ where: { id: ingredientId, currentQuantity: ingredient.currentQuantity, reservedQuantity: ingredient.reservedQuantity }, data: { reservedQuantity: { increment: quantity } } });
      if (!updated.count) throw new ApiError(HttpStatus.CONFLICT, 'INVENTORY_CHANGED', 'Tồn kho vừa thay đổi. Vui lòng thử nhận đơn lại.');
      await tx.inventoryTransaction.create({ data: { ingredientId, type: InventoryTransactionType.RESERVE, quantity, quantityBefore: ingredient.currentQuantity, quantityAfter: ingredient.currentQuantity, reservedBefore: ingredient.reservedQuantity, reservedAfter: ingredient.reservedQuantity.add(quantity), referenceType: 'ORDER', referenceId: orderId } });
      this.lowStock(ingredient, ingredient.reservedQuantity.add(quantity));
    }
    return tx.inventoryReservation.create({ data: { orderId, items: { create: requirements.map(item => ({ orderItemId: item.orderItemId, ingredientId: item.ingredientId, quantity: item.quantity })) } } });
  }

  async releaseForOrder(tx: Prisma.TransactionClient, orderId: string) {
    const reservation = await tx.inventoryReservation.findUnique({ where: { orderId }, include: { items: { where: { status: InventoryReservationItemStatus.RESERVED }, include: { ingredient: true } } } });
    if (!reservation || !reservation.items.length) return;
    for (const item of reservation.items) {
      const ingredient = item.ingredient;
      await tx.ingredient.update({ where: { id: ingredient.id }, data: { reservedQuantity: { decrement: item.quantity } } });
      await tx.inventoryTransaction.create({ data: { ingredientId: ingredient.id, type: InventoryTransactionType.RELEASE, quantity: item.quantity, quantityBefore: ingredient.currentQuantity, quantityAfter: ingredient.currentQuantity, reservedBefore: ingredient.reservedQuantity, reservedAfter: ingredient.reservedQuantity.sub(item.quantity), referenceType: 'ORDER', referenceId: orderId } });
    }
    await tx.inventoryReservationItem.updateMany({ where: { reservationId: reservation.id, status: InventoryReservationItemStatus.RESERVED }, data: { status: InventoryReservationItemStatus.RELEASED } });
    await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status: InventoryReservationStatus.RELEASED } });
  }

  async consumeForOrderItem(tx: Prisma.TransactionClient, orderItemId: string) {
    const items = await tx.inventoryReservationItem.findMany({ where: { orderItemId, status: InventoryReservationItemStatus.RESERVED }, include: { ingredient: true, reservation: true } });
    for (const item of items) {
      const ingredient = item.ingredient;
      if (ingredient.currentQuantity.lessThan(item.quantity) || ingredient.reservedQuantity.lessThan(item.quantity)) throw new ApiError(HttpStatus.CONFLICT, 'INVENTORY_INCONSISTENT', `Tồn kho ${ingredient.name} không nhất quán.`);
      await tx.ingredient.update({ where: { id: ingredient.id }, data: { currentQuantity: { decrement: item.quantity }, reservedQuantity: { decrement: item.quantity } } });
      await tx.inventoryTransaction.create({ data: { ingredientId: ingredient.id, type: InventoryTransactionType.CONSUME, quantity: item.quantity, quantityBefore: ingredient.currentQuantity, quantityAfter: ingredient.currentQuantity.sub(item.quantity), reservedBefore: ingredient.reservedQuantity, reservedAfter: ingredient.reservedQuantity.sub(item.quantity), referenceType: 'ORDER_ITEM', referenceId: orderItemId } });
      this.lowStock({ ...ingredient, currentQuantity: ingredient.currentQuantity.sub(item.quantity) }, ingredient.reservedQuantity.sub(item.quantity));
      await tx.inventoryReservationItem.update({ where: { id: item.id }, data: { status: InventoryReservationItemStatus.CONSUMED } });
    }
    const reservationId = items[0]?.reservationId;
    if (reservationId) {
      const remaining = await tx.inventoryReservationItem.count({ where: { reservationId, status: InventoryReservationItemStatus.RESERVED } });
      await tx.inventoryReservation.update({ where: { id: reservationId }, data: { status: remaining ? InventoryReservationStatus.PARTIALLY_CONSUMED : InventoryReservationStatus.CONSUMED } });
    }
  }
}

