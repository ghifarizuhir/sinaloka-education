# Classes Schedule UX Improvement — Design Spec

**Date:** 2026-03-18
**Scope:** sinaloka-backend Class module + sinaloka-platform Classes page
**Branch:** feat/parent-module

---

## Problem Statement

The Classes form has UX limitations around scheduling:

1. **Single time slot for all days** — A class scheduled on Monday and Thursday must have the same start/end time for both days. Real tutoring needs differ (e.g., Monday 13:00-14:00, Thursday 09:00-10:00).
2. **No visual schedule preview** — Admins create schedules blindly without seeing how they fit with the tutor's existing classes, leading to accidental conflicts.
3. **Small modal** — The current modal has no room for a calendar preview.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model | New `ClassSchedule` table | Separate table for future extensibility (recurring schedules, exceptions, etc.) |
| Per-day times | Each day has its own start/end time | Business need — different days may have different time slots |
| Form layout | Wide modal (~1100px), 2-panel | Form on left, calendar preview on right, fits in existing modal pattern |
| Day selection UX | Keep toggle buttons + inline time rows | Familiar pattern, each toggled day spawns a time row |
| Calendar preview content | Current class + same-tutor classes | Detect tutor scheduling conflicts visually |
| Conflict data source | Add `tutor_id` filter to existing `getAll()` endpoint | Reuse existing endpoint pattern, just add a query param |
| Responsive | Calendar hides on <1024px | Form works standalone on small screens |

---

## Solution

### 1. Database — New ClassSchedule Model

**New Prisma model:**

```prisma
model ClassSchedule {
  id         String   @id @default(uuid())
  class_id   String
  day        String   // "Monday", "Tuesday", etc.
  start_time String   // "HH:mm" format
  end_time   String   // "HH:mm" format
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  class      Class    @relation(fields: [class_id], references: [id], onDelete: Cascade)

  @@unique([class_id, day])
  @@map("class_schedules")
}
```

**Note:** `@@unique([class_id, day])` enforces one schedule per day per class at the database level. If a future need arises for multiple time slots per day, this constraint can be removed.

**Changes to Class model:**
- Remove fields: `schedule_days String[]`, `schedule_start_time String`, `schedule_end_time String`
- Add relation: `schedules ClassSchedule[]`

**Data migration:**
For each existing class, create one `ClassSchedule` row per day in `schedule_days`, all sharing the same `start_time`/`end_time`. Example:

- Class with `schedule_days: ["Monday", "Wednesday"]`, `start_time: "14:00"`, `end_time: "15:30"`
- → Row 1: `{day: "Monday", start_time: "14:00", end_time: "15:30"}`
- → Row 2: `{day: "Wednesday", start_time: "14:00", end_time: "15:30"}`

Migration is a 3-step SQL:
1. Create `class_schedules` table
2. Insert rows from existing class schedule fields using `unnest()`:
   ```sql
   INSERT INTO class_schedules (id, class_id, day, start_time, end_time, created_at, updated_at)
   SELECT gen_random_uuid(), id, unnest(schedule_days), schedule_start_time, schedule_end_time, now(), now()
   FROM classes;
   ```
3. Drop old columns from `classes` table

### 2. Backend API Changes

**DTO changes (`class.dto.ts`):**

Replace the 3 schedule fields with a `schedules` array:

```typescript
const ScheduleItemSchema = z.object({
  day: ScheduleDay,
  start_time: TimeString,
  end_time: TimeString,
}).refine(d => d.start_time < d.end_time, {
  message: 'start_time must be before end_time',
  path: ['end_time'],
});

// In CreateClassSchema, replace schedule_days/start_time/end_time with:
schedules: z.array(ScheduleItemSchema).min(1, 'At least one schedule is required'),
```

Remove the cross-field `.refine()` that validated `schedule_start_time < schedule_end_time` (now handled per-item).

**Service changes (`class.service.ts`):**

- `create()`: Use `prisma.$transaction()` — create class first, then create all schedule rows
- `update()`: Use `prisma.$transaction()` — delete existing schedules, create new ones, update class fields
- `findAll()`: Add `include: { schedules: true }` to all queries
- `findOne()`: Add `include: { schedules: true }`
- `delete()`: No change needed — `onDelete: Cascade` handles schedule cleanup

**Add `tutor_id` filter to `findAll()`:**

The existing `ClassQuerySchema` does not have a `tutor_id` param. Add it:
- Backend: Add `tutor_id: z.string().uuid().optional()` to `ClassQuerySchema`
- Service: Add `if (tutor_id) where.tutor_id = tutor_id;` in `findAll()`
- Frontend: Add `tutor_id?: string` to `ClassQueryParams` in `types/class.ts`

This allows the calendar preview to fetch the selected tutor's classes via the existing `getAll()` endpoint.

**Update DTO semantics:** When `schedules` is provided in an update request, it performs a full replacement — all existing schedules are deleted and replaced with the new array. The `schedules` field in `UpdateClassSchema` should be optional (the class may be updated without changing schedules), but when present must have `min(1)`.

### 3. Frontend Types

Update `sinaloka-platform/src/types/class.ts`:

```typescript
export interface ClassScheduleItem {
  id?: string;
  day: ScheduleDay;
  start_time: string;
  end_time: string;
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  // ... other fields unchanged ...
  // REMOVE: schedule_days, schedule_start_time, schedule_end_time
  // ADD:
  schedules: ClassScheduleItem[];
}

export interface CreateClassDto {
  // ... other fields unchanged ...
  // REMOVE: schedule_days, schedule_start_time, schedule_end_time
  // ADD:
  schedules: { day: ScheduleDay; start_time: string; end_time: string }[];
}
```

### 4. Form Layout — Wide Modal with 2-Panel Design

Expand the current modal from ~500px to `max-w-5xl` (~1100px). Internal layout:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Buat Kelas Baru                                                     [X]  │
├────────────────────────────────┬────────────────────────────────────────────┤
│  LEFT PANEL (form, ~55%)       │  RIGHT PANEL (calendar preview, ~45%)     │
│                                │                                            │
│  Nama Kelas    [____________]  │   Week Calendar Preview                    │
│                                │   ┌─────┬─────┬─────┬─────┬─────┬─────┐   │
│  Mapel  [▾ Pilih]              │   │ Sen │ Sel │ Rab │ Kam │ Jum │ Sab │   │
│  Tutor  [▾ Pilih]              │   ├─────┼─────┼─────┼─────┼─────┼─────┤   │
│                                │   │     │     │     │     │     │     │   │
│  Jadwal Hari                   │   │ 13  │     │     │ 09  │     │     │   │
│  [Sen][Sel][Rab][Kam][Jum][Sab]│   │ ██  │     │     │ ██  │     │     │   │
│                                │   │ 14  │     │     │ 10  │     │     │   │
│  Senin    [13:00] - [14:00] 🗑 │   │     │     │     │     │     │     │   │
│  Kamis    [09:00] - [10:00] 🗑 │   │     │     │     │     │     │     │   │
│                                │   │     │     │     │     │     │     │   │
│  Kapasitas  [25]               │   │  (muted: tutor's other classes)   │   │
│  Biaya      [500000]           │   │     │     │     │     │     │     │   │
│  Ruangan    [____________]     │   └─────┴─────┴─────┴─────┴─────┴─────┘   │
│  Status     [▾ Aktif]          │                                            │
│  ...fee fields...              │   Legend:                                   │
│                                │   ██ Kelas ini   ░░ Kelas tutor lain       │
│  [  Batal  ] [  Buat Kelas  ] │   ⚠  Jadwal bentrok                        │
├────────────────────────────────┴────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────────────────┘
```

**Responsive:** On `< 1024px`, the right panel hides and the form takes full width. Calendar is a visual aid, not required for form completion.

### 5. Inline Per-Day Time Rows

**Behavior:**
- Toggling a day button ON → appends `{day, start_time: '14:00', end_time: '15:30'}` to `formSchedules`
- Toggling a day button OFF → removes the entry from `formSchedules`
- Each active day renders an inline row:

```
  Senin    [13:00] - [14:00]  🗑
  Kamis    [09:00] - [10:00]  🗑
```

- Time inputs are native `<input type="time">`
- Delete button (🗑) removes the row AND untogles the day button
- Rows are sorted by day order (Mon → Sun)
- Default time for new rows: `14:00 - 15:30`

**Form state:**
- Remove: `formScheduleDays: ScheduleDay[]`, `formStartTime: string`, `formEndTime: string`
- Add: `formSchedules: ClassScheduleItem[]`

**On submit:** `formSchedules` maps directly to the `schedules` field in the DTO.

### 6. Week Calendar Preview Component

**New component:** `sinaloka-platform/src/components/ScheduleWeekPreview.tsx`

**Props:**
```typescript
interface ScheduleWeekPreviewProps {
  currentSchedules: ClassScheduleItem[];  // from form state
  tutorClasses: Class[];                  // from API, tutor's other classes
  currentClassId?: string;                // exclude current class when editing
}
```

**Rendering:**
- 6 day columns: Mon through Sat (standard tutoring days)
- Time axis: 07:00 to 21:00, with 30-min gridlines
- **Current class blocks** — Primary color (blue), rendered from `currentSchedules`
- **Tutor's other class blocks** — Muted gray with class name labels, rendered from `tutorClasses` (excluding `currentClassId`)
- **Overlap detection** — If a current schedule block overlaps with a tutor's existing class, render the current block in red/orange with a warning icon and tooltip: "Jadwal bentrok dengan [class name]"

**Data flow:**
- When `formTutorId` changes, fetch tutor's classes: `useClasses({ tutor_id: formTutorId })`
- When no tutor is selected, show placeholder: "Pilih tutor untuk melihat jadwal"
- Calendar updates reactively as user toggles days / changes times

### 7. Session Generation Service Update

The session service (`session.service.ts`) reads `classRecord.schedule_days`, `schedule_start_time`, and `schedule_end_time` to generate session records for a date range. This must be updated:

- Read from `classRecord.schedules[]` instead of the old fields
- For each schedule entry, generate sessions on the matching day of the week
- Each generated session uses that day's specific `start_time` / `end_time` (not a shared time)
- Include `schedules` in any class query used by the session service

### 8. Enrollment Conflict Detection Update

The enrollment service (`enrollment.service.ts`) has schedule conflict detection using `daysOverlap()` and `timeRangesOverlap()`. These assume a single time range for all days. Update to per-day comparison:

- For each schedule in class A, check if there's a schedule in class B on the same day
- If same day found, check if the time ranges overlap for that specific day
- This is more accurate than the old approach since Monday 09:00-10:00 and Monday 14:00-15:00 in the same class are no longer conflated

### 9. Parent App Updates

The parent app (`sinaloka-parent`) consumes the old schedule fields in:
- `src/types.ts` — type definitions
- `src/mappers/index.ts` — API response mapping
- `src/components/EnrollmentList.tsx` — schedule display

Update to read from `schedules[]`:
- Display as a list of day + time pairs (e.g., "Senin 13:00-14:00, Kamis 09:00-10:00")
- Update types and mappers to match the new API response shape

### 10. ClassTimetable Component Update

The existing `ClassTimetable.tsx` component (used in the table view toggle) currently reads:
- `cls.schedule_days` → loop over days
- `cls.schedule_start_time` / `cls.schedule_end_time` → position blocks

Update to read from `cls.schedules[]`:
- Each schedule entry is its own block (day + time already paired)
- This simplifies the code — no need to combine days × shared time

### 11. Seed Update

Update `prisma/seed.ts`:
- Remove setting `schedule_days`, `schedule_start_time`, `schedule_end_time` on classes
- After creating classes, create `ClassSchedule` rows for each class

---

## Files Changed

### Backend
| File | Action | Change |
|------|--------|--------|
| `prisma/schema.prisma` | Modify | Add `ClassSchedule` model, update `Class` model |
| `prisma/migrations/` | Create | Migration: create table, migrate data, drop old columns |
| `prisma/seed.ts` | Modify | Create schedule rows instead of setting old fields |
| `sinaloka-backend/src/modules/class/class.dto.ts` | Modify | Replace 3 schedule fields with `schedules[]`; add `tutor_id` to query |
| `sinaloka-backend/src/modules/class/class.service.ts` | Modify | Transaction-based create/update, include schedules, add tutor_id filter |
| `sinaloka-backend/src/modules/session/session.service.ts` | Modify | Read from `schedules[]` for session generation |
| `sinaloka-backend/src/modules/enrollment/enrollment.service.ts` | Modify | Per-day conflict detection algorithm |

### Frontend — Platform
| File | Action | Change |
|------|--------|--------|
| `sinaloka-platform/src/types/class.ts` | Modify | Add `ClassScheduleItem`, update `Class`, add `tutor_id` to query params |
| `sinaloka-platform/src/pages/Classes.tsx` | Modify | Wide modal, inline day-time rows, form state, display updates |
| `sinaloka-platform/src/components/ScheduleWeekPreview.tsx` | **New** | Week calendar preview component |
| `sinaloka-platform/src/components/ClassTimetable.tsx` | Modify | Read from `schedules[]` |

### Frontend — Parent
| File | Action | Change |
|------|--------|--------|
| `sinaloka-parent/src/types.ts` | Modify | Replace old schedule fields with `schedules[]` |
| `sinaloka-parent/src/mappers/index.ts` | Modify | Map new schedule shape |
| `sinaloka-parent/src/components/EnrollmentList.tsx` | Modify | Display per-day schedule |

### Test Specs (update mock class objects)
| File | Action |
|------|--------|
| `sinaloka-backend/src/modules/class/class.service.spec.ts` | Update mock data |
| `sinaloka-backend/src/modules/class/class.controller.spec.ts` | Update mock data |
| `sinaloka-backend/src/modules/session/session.service.spec.ts` | Update mock data + test logic |
| `sinaloka-backend/src/modules/enrollment/enrollment.service.spec.ts` | Update conflict detection tests |
| Other spec files referencing old schedule fields | Update mock data |

---

## Testing

- **Backend:** Update all spec files that create mock class objects to use `schedules[]` instead of old fields. This includes class, session, enrollment, attendance, and payment spec files.
- **Session service:** Verify sessions are generated with correct per-day times
- **Enrollment service:** Verify per-day conflict detection works correctly
- **Frontend (platform):** Manual browser testing — form UX, calendar preview, responsive behavior
- **Frontend (parent):** Manual browser testing — schedule display on enrollment list
- **Build check:** `npm run build` on backend, platform, and parent
- **Migration:** Verify data migration preserves existing class schedules correctly

---

## Known Consideration

- Sunday column is excluded from the calendar preview (Mon-Sat only) but users can still toggle Sunday in the form. Sunday schedules work correctly, they just aren't shown in the preview.

## Out of Scope

- No drag-to-set time on calendar (future enhancement)
- No recurring schedule / exceptions system
- No conflict prevention (warning only, admin can still save overlapping schedules)
- No changes to the Tutors app (it doesn't display schedule fields directly)
- No changes to attendance or payment modules (they reference sessions, not class schedules directly)
