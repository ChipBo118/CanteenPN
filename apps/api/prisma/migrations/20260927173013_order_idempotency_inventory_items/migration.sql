/*
  Warnings:

  - A unique constraint covering the columns `[reservationId,orderItemId,ingredientId]` on the table `InventoryReservationItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderItemId` to the `InventoryReservationItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idempotencyKey` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."InventoryReservationItem_reservationId_ingredientId_key";

-- AlterTable
ALTER TABLE "InventoryReservationItem" ADD COLUMN     "orderItemId" TEXT;

UPDATE "InventoryReservationItem" AS item
SET "orderItemId" = (
  SELECT order_item."id"
  FROM "InventoryReservation" AS reservation
  JOIN "OrderItem" AS order_item ON order_item."orderId" = reservation."orderId"
  WHERE reservation."id" = item."reservationId"
  ORDER BY order_item."createdAt" ASC
  LIMIT 1
);

ALTER TABLE "InventoryReservationItem" ALTER COLUMN "orderItemId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idempotencyKey" TEXT;
UPDATE "Order" SET "idempotencyKey" = 'legacy-' || "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "variantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservationItem_reservationId_orderItemId_ingredie_key" ON "InventoryReservationItem"("reservationId", "orderItemId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservationItem" ADD CONSTRAINT "InventoryReservationItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
