-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "midtrans_transaction_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "snap_token" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "snap_redirect_url" TEXT;
