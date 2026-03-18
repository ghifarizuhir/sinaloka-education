/*
  Warnings:

  - Changed the type of `category` on the `expenses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TutorFeeMode" AS ENUM ('FIXED_PER_SESSION', 'PER_STUDENT_ATTENDANCE', 'MONTHLY_SALARY');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'NEW';

-- Commit the enum addition before using the new value
COMMIT;
BEGIN;

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "package_fee" DECIMAL(65,30),
ADD COLUMN     "subject_id" TEXT,
ADD COLUMN     "tutor_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "tutor_fee_mode" "TutorFeeMode" NOT NULL DEFAULT 'FIXED_PER_SESSION',
ADD COLUMN     "tutor_fee_per_student" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "payment_status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrence_end_date" DATE,
ADD COLUMN     "recurrence_frequency" TEXT,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "default_language" TEXT NOT NULL DEFAULT 'id',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "invoice_url" TEXT;

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "period_end" DATE,
ADD COLUMN     "period_start" DATE,
ADD COLUMN     "slip_url" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "tutor_fee_amount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "tutors" ADD COLUMN     "monthly_salary" DECIMAL(65,30);

-- DropEnum
DROP TYPE "ExpenseCategory";

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_subjects" (
    "tutor_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,

    CONSTRAINT "tutor_subjects_pkey" PRIMARY KEY ("tutor_id","subject_id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_params" JSONB NOT NULL,
    "wa_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "related_type" TEXT,
    "related_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_institution_id_key" ON "subjects"("name", "institution_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_related_type_related_id_created_at_idx" ON "whatsapp_messages"("related_type", "related_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_wa_message_id_idx" ON "whatsapp_messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_institution_id_created_at_idx" ON "whatsapp_messages"("institution_id", "created_at");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
