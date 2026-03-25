# Classes Schedule UX Improvement — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-time-for-all-days scheduling with per-day time slots, add a week calendar preview with tutor conflict detection, and improve the form UX with a wide 2-panel modal.

**Architecture:** New `ClassSchedule` table replaces the 3 schedule columns on `Class`. Backend service uses transactions for schedule CRUD. Frontend form shows inline per-day time rows with a reactive calendar preview showing same-tutor conflicts.

**Tech Stack:** NestJS + Prisma + Zod (backend), React + Vite + TailwindCSS (frontend), PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-18-classes-schedule-ux-design.md`

---

## Task 1: Database — Add ClassSchedule model and migrate data

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`
- Create: `sinaloka-backend/prisma/migrations/<timestamp>_add_class_schedules/migration.sql`

- [ ] **Step 1: Add ClassSchedule model to schema**

In `sinaloka-backend/prisma/schema.prisma`, add after the `Class` model:

```prisma
model ClassSchedule {
  id         String   @id @default(uuid())
  class_id   String
  day        String
  start_time String
  end_time   String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  class      Class    @relation(fields: [class_id], references: [id], onDelete: Cascade)

  @@unique([class_id, day])
  @@map("class_schedules")
}
```

In the `Class` model, add the relation:

```prisma
  schedules         ClassSchedule[]
```

And remove these 3 fields from `Class`:

```prisma
  schedule_days       String[]
  schedule_start_time String
  schedule_end_time   String
```

- [ ] **Step 2: Create migration with data transfer**

Run:
```bash
cd sinaloka-backend && npx prisma migrate dev --name add_class_schedules --create-only
```

This creates the migration file. Edit it to add data migration BEFORE dropping old columns. The final migration SQL should be:

```sql
-- Step 1: Create new table
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

-- Step 2: Migrate existing data
INSERT INTO "class_schedules" ("id", "class_id", "day", "start_time", "end_time", "created_at", "updated_at")
SELECT DISTINCT ON ("id", day) gen_random_uuid(), "id", unnest("schedule_days"), "schedule_start_time", "schedule_end_time", now(), now()
FROM "classes"
ON CONFLICT DO NOTHING;

-- Step 3: Drop old columns
ALTER TABLE "classes" DROP COLUMN "schedule_days";
ALTER TABLE "classes" DROP COLUMN "schedule_start_time";
ALTER TABLE "classes" DROP COLUMN "schedule_end_time";

-- Step 4: Add constraints and indexes
CREATE UNIQUE INDEX "class_schedules_class_id_day_key" ON "class_schedules"("class_id", "day");
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Regenerate Prisma client**

Run:
```bash
cd sinaloka-backend && npm run prisma:generate
```

- [ ] **Step 4: Apply migration to dev database**

Run:
```bash
cd sinaloka-backend && export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sinaloka" && npx prisma migrate dev
```

Expected: Migration applies successfully.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma sinaloka-backend/prisma/migrations/ sinaloka-backend/generated/
git commit -m "feat(backend): add ClassSchedule model and migrate schedule data"
```

---

## Task 2: Backend — Update Class DTOs

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.dto.ts`

- [ ] **Step 1: Add ScheduleItemSchema and replace schedule fields in CreateClassSchema**

In `sinaloka-backend/src/modules/class/class.dto.ts`:

Add after the `TimeString` constant (line 13):

```typescript
const ScheduleItemSchema = z.object({
  day: ScheduleDay,
  start_time: TimeString,
  end_time: TimeString,
}).refine(d => d.start_time < d.end_time, {
  message: 'start_time must be before end_time',
  path: ['end_time'],
});
```

In `CreateClassSchema` (lines 16-43), replace these 3 fields:

```typescript
  schedule_days: z.array(ScheduleDay).min(1),
  schedule_start_time: TimeString,
  schedule_end_time: TimeString,
```

with:

```typescript
  schedules: z.array(ScheduleItemSchema).min(1, 'At least one schedule is required'),
```

Remove the `.refine()` at lines 33-36 that validates `schedule_start_time < schedule_end_time` (now handled per-item inside `ScheduleItemSchema`).

- [ ] **Step 2: Update UpdateClassSchema**

In `UpdateClassSchema` (lines 46-74), replace:

```typescript
  schedule_days: z.array(ScheduleDay).min(1).optional(),
  schedule_start_time: TimeString.optional(),
  schedule_end_time: TimeString.optional(),
```

with:

```typescript
  schedules: z.array(ScheduleItemSchema).min(1).optional(),
```

Remove the conditional `.refine()` at lines 63-73 that validated start < end times.

- [ ] **Step 3: Add tutor_id to ClassQuerySchema**

In `ClassQuerySchema` (lines 77-88), add after the `subject_id` field:

```typescript
  tutor_id: z.string().uuid().optional(),
```

Update the `ClassQueryDto` type export accordingly (it's inferred, so no separate change needed).

- [ ] **Step 4: Build check**

Run: `cd sinaloka-backend && npm run build`
Expected: Build will fail because class.service.ts still references old fields — that's expected. Verify only DTO-related errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.dto.ts
git commit -m "feat(backend): replace schedule fields with schedules[] array in class DTOs"
```

---

## Task 3: Backend — Update Class Service

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.ts`

- [ ] **Step 1: Update create() to use transaction with schedules**

In `class.service.ts`, replace the `create()` method. The current method (lines 13-65) creates a class with `schedule_days`, `schedule_start_time`, `schedule_end_time` directly.

Replace the schedule-related parts of the create data. Remove these 3 lines from the data object:

```typescript
schedule_days: dto.schedule_days,
schedule_start_time: dto.schedule_start_time,
schedule_end_time: dto.schedule_end_time,
```

Wrap the existing `prisma.class.create()` in a transaction and add schedule creation after it. **Important:** Keep the existing field-by-field data construction pattern (with null coalescing like `package_fee: dto.package_fee ?? null`) — do NOT use a destructure spread, as the current code uses explicit null coercions.

After the class is created inside the transaction, add:

```typescript
await tx.classSchedule.createMany({
  data: dto.schedules.map(s => ({
    class_id: cls.id,
    day: s.day,
    start_time: s.start_time,
    end_time: s.end_time,
  })),
});
```

And update the final return query to include `schedules: true` in the `include` object.

- [ ] **Step 2: Update update() to replace schedules**

In the `update()` method, wrap the existing logic in a transaction. **Keep the existing per-field conditional spread pattern** (e.g., `...(dto.name !== undefined && { name: dto.name })`). Remove the old schedule fields from the spread. Add schedule replacement when `dto.schedules` is provided:

```typescript
return this.prisma.$transaction(async (tx) => {
  if (dto.schedules) {
    await tx.classSchedule.deleteMany({ where: { class_id: id } });
    await tx.classSchedule.createMany({
      data: dto.schedules.map(s => ({
        class_id: id,
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    });
  }

  // Keep existing per-field update data construction, just remove
  // schedule_days, schedule_start_time, schedule_end_time from the spread
  return tx.class.update({
    where: { id },
    data: { /* existing conditional spreads minus schedule fields */ },
    include: { tutor: { include: { user: true } }, schedules: true },
  });
});
```

- [ ] **Step 3: Add include schedules to findAll() and findOne()**

In `findAll()`, add `schedules: true` to the `include` object in the `findMany()` call. Also add the `tutor_id` filter:

```typescript
if (tutor_id) where.tutor_id = tutor_id;
```

In `findOne()`, add `schedules: true` to the `include` object.

- [ ] **Step 4: Build check**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds (or only session/enrollment errors remain — those are separate tasks).

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.service.ts
git commit -m "feat(backend): transaction-based schedule CRUD in class service"
```

---

## Task 4: Backend — Update Session Service

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts`

- [ ] **Step 1: Update generateSessions() to read from schedules[]**

In `session.service.ts`, the `generateSessions()` method (lines 267-346) currently reads:

```typescript
const targetDays = (classRecord.schedule_days as string[]).map((day) => DAY_MAP[day]);
```

And later uses:

```typescript
start_time: classRecord.schedule_start_time,
end_time: classRecord.schedule_end_time,
```

Replace with per-schedule logic. Build a map of day number → schedule:

```typescript
const scheduleByDay = new Map(
  classRecord.schedules.map(s => [DAY_MAP[s.day], s])
);
const targetDays = [...scheduleByDay.keys()];
```

When creating session records, use the day-specific times:

```typescript
const schedule = scheduleByDay.get(currentDate.getDay());
// ...
start_time: schedule.start_time,
end_time: schedule.end_time,
```

- [ ] **Step 2: Ensure class query includes schedules**

In any place where the session service queries a class record, add `include: { schedules: true }` to ensure `classRecord.schedules` is available.

- [ ] **Step 3: Build check**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "feat(backend): session generation uses per-day schedule times"
```

---

## Task 5: Backend — Update Enrollment Conflict Detection

**Files:**
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.service.ts`

- [ ] **Step 1: Replace daysOverlap() and timeRangesOverlap() with schedulesConflict()**

Replace the two helper methods (lines 31-42):

```typescript
private daysOverlap(daysA: string[], daysB: string[]): boolean {
  return daysA.some((day) => daysB.includes(day));
}
```

With a new method that compares per-day schedules:

```typescript
private schedulesConflict(
  schedulesA: { day: string; start_time: string; end_time: string }[],
  schedulesB: { day: string; start_time: string; end_time: string }[],
): boolean {
  for (const a of schedulesA) {
    for (const b of schedulesB) {
      if (a.day === b.day && a.start_time < b.end_time && b.start_time < a.end_time) {
        return true;
      }
    }
  }
  return false;
}
```

- [ ] **Step 2: Update checkConflict() to use schedulesConflict()**

In `checkConflict()` (lines 44-106), replace:

```typescript
if (this.daysOverlap(targetClass.schedule_days, enrolledClass.schedule_days) &&
    this.timeRangesOverlap(targetClass.schedule_start_time, targetClass.schedule_end_time,
                           enrolledClass.schedule_start_time, enrolledClass.schedule_end_time))
```

with:

```typescript
if (this.schedulesConflict(targetClass.schedules, enrolledClass.schedules))
```

Ensure class queries in `checkConflict()` include `schedules: true`.

- [ ] **Step 3: Update conflictingClasses response shape**

In `checkConflict()`, the code that pushes to `conflictingClasses` (around lines 92-98) references `enrolledClass.schedule_days`, `schedule_start_time`, `schedule_end_time`. Update to use `schedules`:

```typescript
conflictingClasses.push({
  id: enrolledClass.id,
  name: enrolledClass.name,
  schedules: enrolledClass.schedules,
});
```

- [ ] **Step 4: Build check**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/enrollment/enrollment.service.ts
git commit -m "feat(backend): per-day schedule conflict detection in enrollment service"
```

---

## Task 6: Backend — Update test specs

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.spec.ts`
- Modify: `sinaloka-backend/src/modules/class/class.controller.spec.ts`
- Modify: `sinaloka-backend/src/modules/session/session.service.spec.ts`
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.service.spec.ts`
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.controller.spec.ts`
- Modify: `sinaloka-backend/src/modules/session/session.controller.spec.ts`
- Modify: `sinaloka-backend/src/modules/session/tutor-session.controller.spec.ts`
- Modify: `sinaloka-backend/src/modules/attendance/attendance.controller.spec.ts`
- Modify: `sinaloka-backend/src/modules/attendance/tutor-attendance.controller.spec.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.controller.spec.ts`

- [ ] **Step 1: Update all mock class objects**

In every spec file, replace:

```typescript
schedule_days: ['Monday', 'Wednesday'],
schedule_start_time: '14:00',
schedule_end_time: '15:30',
```

with:

```typescript
schedules: [
  { id: 'sched-1', day: 'Monday', start_time: '14:00', end_time: '15:30', class_id: '...', created_at: new Date(), updated_at: new Date() },
  { id: 'sched-2', day: 'Wednesday', start_time: '14:00', end_time: '15:30', class_id: '...', created_at: new Date(), updated_at: new Date() },
],
```

Search for all occurrences across spec files:

```bash
cd sinaloka-backend && grep -rn "schedule_days\|schedule_start_time\|schedule_end_time" src/modules/**/*.spec.ts
```

Update each occurrence.

- [ ] **Step 2: Update enrollment conflict test cases**

In `enrollment.service.spec.ts`, update the conflict detection tests:
- mockClassA, mockClassB, mockClassC should use `schedules[]` arrays
- Test that per-day conflict works: two classes on Monday with overlapping times = conflict
- Test that two classes on different days = no conflict even if times overlap

- [ ] **Step 3: Run all tests**

Run: `cd sinaloka-backend && npm run test -- --ci`
Expected: Class, session, enrollment tests pass. Pre-existing failures in other modules are acceptable.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/
git commit -m "test(backend): update all spec files for schedules[] data model"
```

---

## Task 7: Backend — Update seed file

**Files:**
- Modify: `sinaloka-backend/prisma/seed.ts`

- [ ] **Step 1: Remove old schedule fields from class creation**

In `prisma/seed.ts`, in each class creation (lines 185-249), remove:

```typescript
schedule_days: ['Monday', 'Wednesday'],
schedule_start_time: '14:00',
schedule_end_time: '15:30',
```

- [ ] **Step 2: Create ClassSchedule rows after class creation**

After the `classes` array is created (around line 250), add:

```typescript
await prisma.classSchedule.createMany({
  data: [
    // Class 1: Matematika SMP — Mon & Wed 14:00-15:30
    { class_id: classes[0].id, day: 'Monday', start_time: '14:00', end_time: '15:30' },
    { class_id: classes[0].id, day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
    // Class 2: English SMP — Tue & Thu 16:00-17:30
    { class_id: classes[1].id, day: 'Tuesday', start_time: '16:00', end_time: '17:30' },
    { class_id: classes[1].id, day: 'Thursday', start_time: '16:00', end_time: '17:30' },
    // Class 3: Fisika SMA — Mon 09:00-10:30, Fri 09:00-10:30
    { class_id: classes[2].id, day: 'Monday', start_time: '09:00', end_time: '10:30' },
    { class_id: classes[2].id, day: 'Friday', start_time: '09:00', end_time: '10:30' },
    // Class 4: B. Indonesia SMA — Wed & Sat 10:00-11:30
    { class_id: classes[3].id, day: 'Wednesday', start_time: '10:00', end_time: '11:30' },
    { class_id: classes[3].id, day: 'Saturday', start_time: '10:00', end_time: '11:30' },
  ],
});
console.log('Class schedules created');
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/prisma/seed.ts
git commit -m "feat(backend): update seed to use ClassSchedule rows"
```

---

## Task 8: Frontend — Update platform types

**Files:**
- Modify: `sinaloka-platform/src/types/class.ts`

- [ ] **Step 1: Add ClassScheduleItem and update Class interface**

In `sinaloka-platform/src/types/class.ts`:

Add after the `ScheduleDay` type (line 3):

```typescript
export interface ClassScheduleItem {
  id?: string;
  day: ScheduleDay;
  start_time: string;
  end_time: string;
}
```

In the `Class` interface (lines 5-27), replace:

```typescript
  schedule_days: ScheduleDay[];
  schedule_start_time: string;
  schedule_end_time: string;
```

with:

```typescript
  schedules: ClassScheduleItem[];
```

In the `CreateClassDto` interface (lines 29-44), replace:

```typescript
  schedule_days: ScheduleDay[];
  schedule_start_time: string;
  schedule_end_time: string;
```

with:

```typescript
  schedules: { day: ScheduleDay; start_time: string; end_time: string }[];
```

- [ ] **Step 2: Add tutor_id to ClassQueryParams**

In the `ClassQueryParams` interface, add:

```typescript
  tutor_id?: string;
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/types/class.ts
git commit -m "feat(platform): update Class types for schedules[] model"
```

---

## Task 9: Frontend — Update ClassTimetable component

**Files:**
- Modify: `sinaloka-platform/src/components/ClassTimetable.tsx`

- [ ] **Step 1: Update block calculation**

In `ClassTimetable.tsx`, the block calculation (lines 97-100) currently iterates over `cls.schedule_days` and uses shared `schedule_start_time`/`schedule_end_time`:

```typescript
for (const cls of classes) {
  const startMin = parseTime(cls.schedule_start_time);
  const endMin = parseTime(cls.schedule_end_time);
```

Replace with iterating over `cls.schedules`:

```typescript
for (const cls of classes) {
  for (const schedule of cls.schedules) {
    const startMin = parseTime(schedule.start_time);
    const endMin = parseTime(schedule.end_time);
    const dayIndex = DAYS.indexOf(schedule.day as ScheduleDay);
    if (dayIndex === -1) continue;
    // ... create block for this day + time
  }
}
```

Remove the inner loop over `cls.schedule_days` since each schedule entry already pairs day + time.

- [ ] **Step 2: Build check**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/ClassTimetable.tsx
git commit -m "feat(platform): ClassTimetable reads from schedules[] array"
```

---

## Task 10: Frontend — Create ScheduleWeekPreview component

**Files:**
- Create: `sinaloka-platform/src/components/ScheduleWeekPreview.tsx`

- [ ] **Step 1: Create the component**

Create `sinaloka-platform/src/components/ScheduleWeekPreview.tsx`:

```tsx
import React from 'react';
import { cn } from '../lib/utils';
import type { ClassScheduleItem } from '../types/class';
import type { Class } from '../types/class';

const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_SHORT: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab',
  Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab',
};

const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface ScheduleWeekPreviewProps {
  currentSchedules: ClassScheduleItem[];
  tutorClasses: Class[];
  currentClassId?: string;
}

export const ScheduleWeekPreview: React.FC<ScheduleWeekPreviewProps> = ({
  currentSchedules,
  tutorClasses,
  currentClassId,
}) => {
  const otherClasses = tutorClasses.filter(c => c.id !== currentClassId);

  // Check if a current schedule overlaps with any tutor class schedule
  const hasConflict = (schedule: ClassScheduleItem): string | null => {
    for (const cls of otherClasses) {
      for (const s of cls.schedules) {
        if (
          s.day === schedule.day &&
          schedule.start_time < s.end_time &&
          s.start_time < schedule.end_time
        ) {
          return cls.name;
        }
      }
    }
    return null;
  };

  const getBlockStyle = (startTime: string, endTime: string) => {
    const startMin = parseTime(startTime) - START_HOUR * 60;
    const endMin = parseTime(endTime) - START_HOUR * 60;
    return {
      top: `${(startMin / TOTAL_MINUTES) * 100}%`,
      height: `${((endMin - startMin) / TOTAL_MINUTES) * 100}%`,
    };
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: '40px repeat(6, 1fr)' }}>
        {/* Header */}
        <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-1" />
        {PREVIEW_DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-l border-zinc-200 dark:border-zinc-800">
            {DAY_SHORT[day]}
          </div>
        ))}

        {/* Time grid */}
        <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * 40}px` }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 text-[10px] text-zinc-400 pr-1 text-right"
              style={{ top: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>

        {PREVIEW_DAYS.map(day => (
          <div
            key={day}
            className="relative border-l border-zinc-200 dark:border-zinc-800"
            style={{ height: `${(END_HOUR - START_HOUR) * 40}px` }}
          >
            {/* Hour gridlines */}
            {hours.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800/50"
                style={{ top: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
              />
            ))}

            {/* Tutor's other class blocks (gray) */}
            {otherClasses.flatMap(cls =>
              cls.schedules
                .filter(s => s.day === day)
                .map(s => (
                  <div
                    key={`${cls.id}-${s.day}`}
                    className="absolute left-0.5 right-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[9px] px-1 overflow-hidden text-zinc-600 dark:text-zinc-300 z-10"
                    style={getBlockStyle(s.start_time, s.end_time)}
                    title={`${cls.name}: ${s.start_time}-${s.end_time}`}
                  >
                    {cls.name}
                  </div>
                ))
            )}

            {/* Current class blocks (blue or red if conflict) */}
            {currentSchedules
              .filter(s => s.day === day)
              .map(s => {
                const conflictWith = hasConflict(s);
                return (
                  <div
                    key={`current-${s.day}`}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded text-[9px] px-1 font-medium z-20 border',
                      conflictWith
                        ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    )}
                    style={getBlockStyle(s.start_time, s.end_time)}
                    title={conflictWith ? `Bentrok dengan ${conflictWith}` : `${s.start_time}-${s.end_time}`}
                  >
                    {s.start_time}
                    {conflictWith && ' ⚠'}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/components/ScheduleWeekPreview.tsx
git commit -m "feat(platform): add ScheduleWeekPreview component for form calendar"
```

---

## Task 11: Frontend — Update Classes.tsx form with wide modal, inline day-time rows, and calendar preview

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

This is the largest task. It involves:
1. Replacing form state variables
2. Updating openAddModal/openEditModal
3. Updating handleFormSubmit
4. Replacing the modal JSX with wide 2-panel layout
5. Replacing day toggle + time inputs with inline per-day rows
6. Adding calendar preview integration
7. Updating schedule display in table and detail views

- [ ] **Step 1: Update imports**

Add at the top of `Classes.tsx`:

```typescript
import { ScheduleWeekPreview } from '../components/ScheduleWeekPreview';
import type { ClassScheduleItem } from '../types/class';
```

- [ ] **Step 2: Replace form state variables**

Replace the 3 schedule state variables (lines 92-94):

```typescript
const [formScheduleDays, setFormScheduleDays] = useState<ScheduleDay[]>([]);
const [formStartTime, setFormStartTime] = useState('14:00');
const [formEndTime, setFormEndTime] = useState('15:30');
```

with:

```typescript
const [formSchedules, setFormSchedules] = useState<ClassScheduleItem[]>([]);
```

Add a query for tutor's classes (for calendar preview). The existing `useClasses` hook does not support an `enabled` option, so use `useQuery` directly to avoid firing a request when no tutor is selected:

```typescript
import { useQuery } from '@tanstack/react-query';
import { classesService } from '../services/classes.service';

// Inside the component:
const { data: tutorClassesData } = useQuery({
  queryKey: ['classes', 'tutor', formTutorId],
  queryFn: () => classesService.getAll({ tutor_id: formTutorId!, limit: 100 }),
  enabled: !!formTutorId,
});
const tutorClasses = tutorClassesData?.data?.data ?? [];
```

- [ ] **Step 3: Update toggleScheduleDay()**

Replace the `toggleScheduleDay()` function (lines 182-186):

```typescript
const toggleScheduleDay = (day: ScheduleDay) => {
  setFormSchedules(prev => {
    const exists = prev.find(s => s.day === day);
    if (exists) return prev.filter(s => s.day !== day);
    return [...prev, { day, start_time: '14:00', end_time: '15:30' }];
  });
};
```

- [ ] **Step 4: Update openAddModal()**

In `openAddModal()` (lines 144-161), replace:

```typescript
setFormScheduleDays([]);
setFormStartTime('14:00');
setFormEndTime('15:30');
```

with:

```typescript
setFormSchedules([]);
```

- [ ] **Step 5: Update openEditModal()**

In `openEditModal()` (lines 163-180), replace:

```typescript
setFormScheduleDays(cls.schedule_days);
setFormStartTime(cls.schedule_start_time);
setFormEndTime(cls.schedule_end_time);
```

with:

```typescript
setFormSchedules(cls.schedules.map(s => ({ day: s.day as ScheduleDay, start_time: s.start_time, end_time: s.end_time })));
```

- [ ] **Step 6: Update handleFormSubmit()**

In `handleFormSubmit()` (lines 188-236), replace the schedule validation and payload:

Replace:
```typescript
schedule_days: formScheduleDays,
schedule_start_time: formStartTime,
schedule_end_time: formEndTime,
```

with:

```typescript
schedules: formSchedules.map(s => ({ day: s.day, start_time: s.start_time, end_time: s.end_time })),
```

Update validation: replace `formScheduleDays.length < 1` check with `formSchedules.length < 1`.

- [ ] **Step 7: Replace modal with wide 2-panel layout**

Replace the Modal component for the form. Change the Modal's `className` or wrapper to use `max-w-5xl` width.

Inside the modal body, wrap content in a 2-column grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-6">
  {/* Left panel — form fields */}
  <div className="space-y-4">
    {/* ...existing form fields... */}
  </div>

  {/* Right panel — calendar preview (hidden on small screens) */}
  <div className="hidden lg:block space-y-3">
    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
      Pratinjau Jadwal
    </label>
    {formTutorId ? (
      <ScheduleWeekPreview
        currentSchedules={formSchedules}
        tutorClasses={tutorClasses}
        currentClassId={editingClass?.id}
      />
    ) : (
      <div className="flex items-center justify-center h-64 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
        <p className="text-sm text-zinc-400">Pilih tutor untuk melihat jadwal</p>
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 8: Replace schedule day buttons + time inputs with inline rows**

Replace the day toggle buttons and time inputs section with:

```tsx
{/* Schedule Days */}
<div className="space-y-3">
  <Label>Jadwal Hari</Label>
  <div className="flex flex-wrap gap-1.5">
    {DAYS_OF_WEEK.map(day => {
      const isActive = formSchedules.some(s => s.day === day);
      return (
        <button
          key={day}
          type="button"
          onClick={() => toggleScheduleDay(day)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
            isActive
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900'
              : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
          )}
        >
          {day.slice(0, 3)}
        </button>
      );
    })}
  </div>

  {/* Inline per-day time rows */}
  {formSchedules
    .sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day))
    .map((schedule, idx) => (
      <div key={schedule.day} className="flex items-center gap-2 pl-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-20">
          {schedule.day.slice(0, 3)}
        </span>
        <input
          type="time"
          value={schedule.start_time}
          onChange={(e) => {
            const updated = [...formSchedules];
            updated[formSchedules.indexOf(schedule)] = { ...schedule, start_time: e.target.value };
            setFormSchedules(updated);
          }}
          className="h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 dark:text-zinc-100"
        />
        <span className="text-zinc-400 text-sm">–</span>
        <input
          type="time"
          value={schedule.end_time}
          onChange={(e) => {
            const updated = [...formSchedules];
            updated[formSchedules.indexOf(schedule)] = { ...schedule, end_time: e.target.value };
            setFormSchedules(updated);
          }}
          className="h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={() => setFormSchedules(prev => prev.filter(s => s.day !== schedule.day))}
          className="text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    ))}
</div>
```

- [ ] **Step 9: Update estimateSessionCount and Generate Sessions modal**

The `estimateSessionCount()` function (around line 256) takes `scheduleDays: string[]`. Update it to accept `ClassScheduleItem[]` and derive days from it:

```typescript
const estimateSessionCount = (schedules: ClassScheduleItem[], months: number) => {
  const daysPerWeek = schedules.length;
  // ... rest of calculation
};
```

Also update the Generate Sessions modal display (around lines 973, 1018-1025, 1052):
- Line 973: Change `classDetail.data?.schedule_days?.length > 0` to `classDetail.data?.schedules?.length > 0`
- Lines 1018-1022: Change iteration over `schedule_days` to `schedules.map(s => s.day)`
- Line 1025: Replace single time display with per-schedule times
- Line 1052: Update `estimateSessionCount` call to pass `classDetail.data.schedules`

- [ ] **Step 10: Update schedule display in table view**

In the table view (lines 463-466), replace:

```tsx
<span className="flex items-center gap-1">
  <Calendar size={10} /> {cls.schedule_days.join(', ')}
</span>
<span className="flex items-center gap-1">
  <Clock size={10} /> {cls.schedule_start_time} - {cls.schedule_end_time}
</span>
```

with:

```tsx
{cls.schedules.map(s => (
  <span key={s.day} className="flex items-center gap-1 text-xs">
    <Calendar size={10} /> {s.day.slice(0, 3)} {s.start_time}-{s.end_time}
  </span>
))}
```

- [ ] **Step 11: Update schedule display in detail drawer**

In the detail drawer (lines 924-932), replace schedule_days and time display with:

```tsx
{selectedClass.schedules.map(s => (
  <span key={s.day} className="px-2 py-0.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800">
    {s.day.slice(0, 3)} {s.start_time}-{s.end_time}
  </span>
))}
```

- [ ] **Step 12: Build check**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors.

- [ ] **Step 13: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(platform): wide modal with inline per-day schedules and calendar preview"
```

---

## Task 12: Update Parent app (backend + frontend)

**Files:**
- Modify: `sinaloka-backend/src/modules/parent/parent.service.ts` (or wherever parent enrollment query lives)
- Modify: `sinaloka-parent/src/types.ts`
- Modify: `sinaloka-parent/src/mappers/index.ts`
- Modify: `sinaloka-parent/src/components/EnrollmentList.tsx`

- [ ] **Step 0: Ensure parent backend includes schedules in enrollment query**

Find the parent module's enrollment query (likely in `sinaloka-backend/src/modules/parent/parent.service.ts` or the enrollment service query used by parent endpoints). Ensure that when class data is included in enrollment responses, it also includes `schedules: true`:

```typescript
include: { class: { include: { schedules: true, tutor: { include: { user: true } } } } }
```

Without this, `raw.class.schedules` will be `undefined` in the parent app mapper.

- [ ] **Step 1: Update types**

In `sinaloka-parent/src/types.ts`, in the `EnrollmentRecord` interface (lines 64-76), replace the class schedule fields:

```typescript
schedule_days: string[];
schedule_start_time: string;
schedule_end_time: string;
```

with:

```typescript
schedules: { day: string; start_time: string; end_time: string }[];
```

- [ ] **Step 2: Update mapper**

In `sinaloka-parent/src/mappers/index.ts`, in `mapEnrollment()` (lines 72-86), replace:

```typescript
schedule_days: raw.class.schedule_days,
schedule_start_time: raw.class.schedule_start_time,
schedule_end_time: raw.class.schedule_end_time,
```

with:

```typescript
schedules: raw.class.schedules ?? [],
```

- [ ] **Step 3: Update EnrollmentList display**

In `sinaloka-parent/src/components/EnrollmentList.tsx` (lines 28-32), replace:

```tsx
{enrollment.class.schedule_days.map(d => DAY_LABELS[d] || d).join(', ')}
{enrollment.class.schedule_start_time}–{enrollment.class.schedule_end_time}
```

with:

```tsx
{enrollment.class.schedules.map(s =>
  `${DAY_LABELS[s.day] || s.day} ${s.start_time}–${s.end_time}`
).join(', ')}
```

- [ ] **Step 4: Build check**

Run: `cd sinaloka-parent && npm run lint`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-parent/src/types.ts sinaloka-parent/src/mappers/index.ts sinaloka-parent/src/components/EnrollmentList.tsx
git commit -m "feat(parent): update schedule display for per-day times"
```

---

## Task 13: Final verification

- [ ] **Step 1: Run backend build + tests**

```bash
cd sinaloka-backend && npm run build && npm run test -- --ci --testPathPatterns="class|session|enrollment"
```

Expected: All class/session/enrollment tests pass.

- [ ] **Step 2: Run all frontend builds**

```bash
cd sinaloka-platform && npm run build
cd sinaloka-parent && npm run build
```

Expected: Both builds succeed.

- [ ] **Step 3: Re-seed database**

```bash
cd sinaloka-backend && export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sinaloka" && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts
```

Expected: Seed completes with "Class schedules created".

- [ ] **Step 4: Manual browser testing**

Open `http://localhost:3000/classes` and verify:

1. **Table view** shows per-day schedules (e.g., "Mon 14:00-15:30, Wed 14:00-15:30")
2. **Timetable view** renders blocks correctly per-day with correct times
3. **Add Class modal** is wide with 2-panel layout
4. **Day toggle buttons** work — toggling a day adds an inline time row
5. **Inline time rows** allow changing start/end time per day
6. **Delete button** on time row removes the day
7. **Calendar preview** shows when tutor is selected
8. **Calendar preview** shows tutor's other classes as gray blocks
9. **Overlap warning** shows red blocks when schedules conflict
10. **Edit Class modal** pre-fills existing schedules correctly
11. **Form submit** saves per-day schedules to the database
