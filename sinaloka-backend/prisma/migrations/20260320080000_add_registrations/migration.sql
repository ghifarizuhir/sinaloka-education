-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('STUDENT', 'TUTOR');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "type" "RegistrationType" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "grade" TEXT,
    "parent_name" TEXT,
    "parent_phone" TEXT,
    "parent_email" TEXT,
    "subject_names" TEXT[],
    "experience_years" INTEGER,
    "rejected_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registrations_institution_id_idx" ON "registrations"("institution_id");

-- CreateIndex
CREATE INDEX "registrations_status_idx" ON "registrations"("status");

-- CreateIndex
CREATE INDEX "registrations_type_idx" ON "registrations"("type");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
