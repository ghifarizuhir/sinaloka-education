-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('PER_SESSION', 'MONTHLY_FIXED');

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "billing_mode" "BillingMode",
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "package_fee";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "billing_period" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_enrollment_id_billing_period_key" ON "payments"("enrollment_id", "billing_period");

-- Backfill: existing institutions get PER_SESSION default and skip onboarding
UPDATE "institutions" SET "billing_mode" = 'PER_SESSION', "onboarding_completed" = true WHERE "billing_mode" IS NULL;
