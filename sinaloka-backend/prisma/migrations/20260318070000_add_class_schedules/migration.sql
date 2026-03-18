-- CreateTable
CREATE TABLE "class_schedules" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (before INSERT so ON CONFLICT works)
CREATE UNIQUE INDEX "class_schedules_class_id_day_key" ON "class_schedules"("class_id", "day");

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data (DISTINCT ON handles duplicate days in schedule_days)
INSERT INTO "class_schedules" ("id", "class_id", "day", "start_time", "end_time", "created_at", "updated_at")
SELECT DISTINCT ON (sub."class_id", sub."day")
    gen_random_uuid(), sub."class_id", sub."day", sub."start_time", sub."end_time", now(), now()
FROM (
    SELECT "id" AS "class_id", unnest("schedule_days") AS "day", "schedule_start_time" AS "start_time", "schedule_end_time" AS "end_time"
    FROM "classes"
) sub
ON CONFLICT ("class_id", "day") DO NOTHING;

-- DropColumns
ALTER TABLE "classes" DROP COLUMN "schedule_days";
ALTER TABLE "classes" DROP COLUMN "schedule_start_time";
ALTER TABLE "classes" DROP COLUMN "schedule_end_time";
