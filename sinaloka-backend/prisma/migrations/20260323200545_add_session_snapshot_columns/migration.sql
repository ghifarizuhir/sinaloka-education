ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_id" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_subject_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_class_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_class_fee" DECIMAL(65,30);
ALTER TABLE "sessions" ADD COLUMN "snapshot_class_room" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_fee_mode" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_fee_per_student" DECIMAL(65,30);
