-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'GROWTH', 'BUSINESS');

-- CreateEnum
CREATE TYPE "UpgradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "plan_changed_at" TIMESTAMP(3),
ADD COLUMN     "plan_limit_reached_at" TIMESTAMP(3),
ADD COLUMN     "plan_type" "PlanType" NOT NULL DEFAULT 'STARTER';

-- CreateTable
CREATE TABLE "upgrade_requests" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "current_plan" "PlanType" NOT NULL,
    "requested_plan" "PlanType" NOT NULL,
    "status" "UpgradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "review_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upgrade_requests_status_idx" ON "upgrade_requests"("status");

-- CreateIndex
CREATE INDEX "upgrade_requests_institution_id_idx" ON "upgrade_requests"("institution_id");

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
