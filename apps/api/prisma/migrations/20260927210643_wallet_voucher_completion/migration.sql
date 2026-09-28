-- CreateEnum
CREATE TYPE "WalletRequestType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "WalletRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'WITHDRAWAL';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankLinkedAt" TIMESTAMP(3),
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "WalletRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletRequestType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT,
    "status" "WalletRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "adminNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletRequest_requestCode_key" ON "WalletRequest"("requestCode");

-- CreateIndex
CREATE INDEX "WalletRequest_walletId_createdAt_idx" ON "WalletRequest"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletRequest_status_createdAt_idx" ON "WalletRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "WalletRequest" ADD CONSTRAINT "WalletRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
