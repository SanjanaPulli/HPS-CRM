/*
  Warnings:

  - A unique constraint covering the columns `[barcodeId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "barcodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_barcodeId_key" ON "Employee"("barcodeId");
