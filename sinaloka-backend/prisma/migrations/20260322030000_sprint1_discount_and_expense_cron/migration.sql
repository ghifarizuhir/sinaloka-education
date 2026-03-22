-- AlterTable
ALTER TABLE "payments" ADD COLUMN "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "last_generated_at" TIMESTAMP(3);

-- Backfill: set last_generated_at for existing recurring expenses
UPDATE "expenses" SET "last_generated_at" = "created_at" WHERE "is_recurring" = true;
