# Operations Gaps Fix — Design Spec

> Date: 2026-03-17
> Scope: Two code gaps identified in operations-findings.md audit
> Approach: Componentized (Approach B)

---

## 1. Week Calendar View (Platform)

### Problem

The week calendar view in `sinaloka-platform/src/pages/Schedules.tsx` (lines 575-587) is a placeholder that shows a "Weekly Overview" message and a "Back to Month View" button. Month and day views are fully implemented; the week view is the only stub.

### Solution

Create a new `WeekCalendar` component extracted into its own file, replacing the placeholder.

### Component

**File:** `sinaloka-platform/src/components/WeekCalendar.tsx`

**Layout:** 7-column timeline grid extending the day view pattern:

- **Time column (left):** Hourly labels from 8:00 to 21:00 (14 rows), matching the day view's existing pattern
- **7 day columns:** One per day of the current week (Mon–Sun)
- **Day headers row:** Above the grid, showing abbreviated day name + date number. Today's date gets a filled circle highlight (same styling as month view's today indicator)
- **Session blocks:** Positioned in the hour row matching `start_time`, within the correct day column. Each block shows:
  - Class name (bold, truncated)
  - Time range (e.g., "14:00 - 15:30")
  - Tutor name (with User icon)
  - Color-coded by subject via existing `SUBJECT_COLORS` map
  - Status border via existing `getStatusBorder()` (emerald for completed, amber for reschedule requested)
  - Cancelled sessions: grey background, line-through text
  - Clicking opens the session detail drawer (calls `onSelectSession(sessionId)`)

**Responsive:** Container uses `overflow-x-auto` with `min-w-[800px]` inner grid, making it horizontally scrollable on smaller screens.

### Props Interface

```typescript
interface WeekCalendarProps {
  sessions: Session[];
  weekDays: Date[];
  onSelectSession: (sessionId: string) => void;
}
```

### Integration into Schedules.tsx

1. Replace the placeholder block (lines 575-587) with `<WeekCalendar>` component
2. Pass existing `sessions`, `weekDays` (already computed at line 136), and `setSelectedSessionId` as `onSelectSession`
3. Move `getSubjectColor` and `getStatusBorder` helper functions out of the component body (or pass them as props / import from a shared location) so `WeekCalendar` can use them. Recommendation: keep them in `Schedules.tsx` and pass as props to avoid over-extracting.

### Navigation

Already handled by Schedules.tsx — the existing prev/next week and "Today" button logic updates `currentDate`, which recalculates `weekStart` and `weekDays`. No new navigation code needed.

### Filters

All existing filters (class, status, date range) already apply to the `sessions` query before reaching the calendar views. The week view receives pre-filtered sessions — no filter changes needed.

---

## 2. Per-Student Notes in Tutor Attendance Page

### Problem

The tutor attendance page (`sinaloka-tutors/src/pages/AttendancePage.tsx`) lacks a per-student notes input. The admin platform has this feature, and the backend already supports it. The data pipeline is fully wired:

- `Student.note` field exists in `types.ts:20`
- `mapStudent()` maps `raw.notes` → `note` (mappers/index.ts:54)
- `mapAttendanceToBackend()` sends `notes: s.note` to the API (mappers/index.ts:94)

Only the UI input and a state handler callback are missing.

### Solution

Add an expandable notes input per student card with a toggle button, keeping the default view compact for mobile.

### UI Changes (AttendancePage.tsx)

**Location:** Inside each student card, after the homework checkbox row (lines 127-137).

**Toggle button:** Add a `MessageSquare` (Lucide) icon button on the same row as the "HW Done" checkbox:
- Outline icon when no note exists
- Filled/highlighted icon when a note is present (e.g., `text-lime-400` instead of `text-zinc-500`)
- Tapping toggles visibility of the notes input below

**Expandable input:** When toggled open, render a text input below the homework row:
- Styling: matches existing inputs (`bg-zinc-900 border-zinc-800 focus:border-lime-400 text-white text-sm`)
- Placeholder: "Add note..."
- Max length: 500 characters (matches backend DTO validation)
- Compact height: single-line text input (not textarea) to save mobile space

**Local state:** Use a `Set<string>` state (`expandedNotes`) to track which student IDs have their notes section expanded.

### Props Changes

Add to `AttendancePageProps`:

```typescript
onSetNote: (classId: string, studentId: string, note: string) => void;
```

### Hook Changes (useAttendance.ts)

No changes needed in `useAttendance.ts` itself — the `students` state is managed by the parent component and `setStudents` is already exposed. The parent component that renders `AttendancePage` will provide the `onSetNote` callback that updates the student's `note` field in the `students` array state.

### Data Flow

1. Tutor taps note icon → input expands
2. Tutor types note → `onSetNote` updates `Student.note` in local state
3. Tutor taps "Finalize & Close" → existing `mapAttendanceToBackend()` includes `notes: s.note` in the payload
4. Backend receives notes via existing `BatchCreateAttendanceSchema` (which already accepts `notes: max 500, optional/nullable`)

No backend changes required.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `sinaloka-platform/src/components/WeekCalendar.tsx` | **NEW** — Week timeline component |
| `sinaloka-platform/src/pages/Schedules.tsx` | Replace week placeholder with `<WeekCalendar>`, pass props |
| `sinaloka-tutors/src/pages/AttendancePage.tsx` | Add expandable notes UI per student, new `onSetNote` prop |
| `sinaloka-tutors/src/pages/SchedulePage.tsx` (or parent) | Wire `onSetNote` callback to update student state |

## Files NOT Changed

- Backend: No changes needed (all endpoints and DTOs already support notes)
- `sinaloka-tutors/src/types.ts`: Already has `Student.note` field
- `sinaloka-tutors/src/mappers/index.ts`: Already maps notes both directions
- `sinaloka-tutors/src/hooks/useAttendance.ts`: Already sends notes via `mapAttendanceToBackend`
