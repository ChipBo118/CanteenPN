import { Prisma } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  it('rejects a reservation before stock can become negative', async () => {
    const tx = {
      inventoryReservation: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue({ items: [{ id: 'item-1', quantity: 2, variantId: null, combo: null, product: { recipes: [{ variantId: null, ingredients: [{ ingredientId: 'rice', quantity: new Prisma.Decimal(3) }] }] } }] }) },
      ingredient: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'rice', name: 'Gạo', currentQuantity: new Prisma.Decimal(10), reservedQuantity: new Prisma.Decimal(6) }), updateMany: jest.fn() },
      inventoryTransaction: { create: jest.fn() },
    };
    await expect(new InventoryService().reserveForOrder(tx as never, 'order-1')).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_INVENTORY' } });
    expect(tx.ingredient.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryReservation.create).not.toHaveBeenCalled();
  });

  it('releases each reserved ingredient and closes the reservation', async () => {
    const quantity = new Prisma.Decimal(2);
    const tx = {
      inventoryReservation: { findUnique: jest.fn().mockResolvedValue({ id: 'reservation-1', items: [{ id: 'line-1', quantity, ingredient: { id: 'rice', currentQuantity: new Prisma.Decimal(10), reservedQuantity: new Prisma.Decimal(4) } }] }), update: jest.fn() },
      ingredient: { update: jest.fn() }, inventoryTransaction: { create: jest.fn() }, inventoryReservationItem: { updateMany: jest.fn() },
    };
    await new InventoryService().releaseForOrder(tx as never, 'order-1');
    expect(tx.ingredient.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reservedQuantity: { decrement: quantity } } }));
    expect(tx.inventoryReservation.update).toHaveBeenCalled();
  });
});
