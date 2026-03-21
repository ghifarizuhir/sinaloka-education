-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('MIDTRANS', 'MANUAL_TRANSFER');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "grace_ends_at" TIMESTAMP(3),
    "auto_downgraded_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "last_reminder_tier" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payment" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "institution_id" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "payment_type" TEXT NOT NULL DEFAULT 'new',
    "amount" INTEGER NOT NULL,
    "method" "SubscriptionPaymentMethod" NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "midtrans_order_id" TEXT,
    "midtrans_transaction_id" TEXT,
    "proof_url" TEXT,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoice" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_institution_id_idx" ON "subscription"("institution_id");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_expires_at_idx" ON "subscription"("expires_at");

-- CreateIndex
CREATE INDEX "subscription_payment_institution_id_idx" ON "subscription_payment"("institution_id");

-- CreateIndex
CREATE INDEX "subscription_payment_status_idx" ON "subscription_payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoice_invoice_number_key" ON "subscription_invoice"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoice_payment_id_key" ON "subscription_invoice"("payment_id");

-- CreateIndex
CREATE INDEX "subscription_invoice_institution_id_idx" ON "subscription_invoice"("institution_id");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoice" ADD CONSTRAINT "subscription_invoice_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoice" ADD CONSTRAINT "subscription_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoice" ADD CONSTRAINT "subscription_invoice_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "subscription_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: only one ACTIVE or GRACE_PERIOD subscription per institution
CREATE UNIQUE INDEX "idx_subscription_active_per_institution" ON "subscription" ("institution_id") WHERE "status" IN ('ACTIVE', 'GRACE_PERIOD');

-- Invoice number sequence
CREATE SEQUENCE "subscription_invoice_seq";
