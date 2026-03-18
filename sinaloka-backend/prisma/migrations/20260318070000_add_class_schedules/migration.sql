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

-- Migrate existing data
INSERT INTO "class_schedules" ("id", "class_id", "day", "start_time", "end_time", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", unnest("schedule_days"), "schedule_start_time", "schedule_end_time", now(), now()
FROM "classes"
ON CONFLICT DO NOTHING;

-- DropColumns
ALTER TABLE "classes" DROP COLUMN "schedule_days";
ALTER TABLE "classes" DROP COLUMN "schedule_start_time";
ALTER TABLE "classes" DROP COLUMN "schedule_end_time";

-- CreateIndex
CREATE UNIQUE INDEX "class_schedules_class_id_day_key" ON "class_schedules"("class_id", "day");

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
