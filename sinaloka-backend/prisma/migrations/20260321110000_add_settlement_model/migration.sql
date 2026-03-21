-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "midtrans_payment_type" TEXT;

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "gross_amount" DECIMAL(65,30) NOT NULL,
    "midtrans_fee" DECIMAL(65,30) NOT NULL,
    "transfer_amount" DECIMAL(65,30) NOT NULL,
    "platform_cost" DECIMAL(65,30) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "transferred_at" TIMESTAMP(3),
    "transferred_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settlements_payment_id_key" ON "settlements"("payment_id");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
