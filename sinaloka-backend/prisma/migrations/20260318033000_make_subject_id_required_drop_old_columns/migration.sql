-- DropColumn
ALTER TABLE "tutors" DROP COLUMN IF EXISTS "subjects";

-- DropColumn
ALTER TABLE "classes" DROP COLUMN IF EXISTS "subject";

-- AlterColumn - make subject_id NOT NULL
ALTER TABLE "classes" ALTER COLUMN "subject_id" SET NOT NULL;
