# Attendance-Enrollment Gap Fix — Design Spec

> Date: 2026-03-17
> Scope: Admin platform shows no students for new sessions because it queries attendance table (existing records only) instead of enrollment table (all enrolled students)
> Approach: New admin endpoint + frontend updates (Approach B)

---

## Problem

Two admin platform pages show empty student lists for newly created sessions:

1. **Attendance.tsx** — calls `GET /api/admin/attendance?session_id=X` which queries the `attendance` table. Returns `[]` for sessions with no attendance taken yet.
2. **Schedules.tsx session detail drawer** — calls `GET /api/admin/sessions/:id` which includes `attendances` from the `attendance` table. Shows "(0)" and empty list.

The tutor app does NOT have this bug because it uses `GET /api/tutor/schedule/:id/students` which queries the `enrollment` table and overlays attendance data (session.service.ts lines 434-489).

The parent app is also unaffected — attendance history (showing only submitted records) is correct by design, and sessions are fetched via enrollment.

## Design Decisions

- **Admin is read + edit only** — admins can see enrolled students and edit existing attendance records, but cannot create new attendance records. Tutors remain the primary attendance submitters.
- **Existing endpoints unchanged** — `GET /api/admin/attendance` and `GET /api/admin/sessions/:id` keep their current behavior. No breaking API changes.
- **New endpoint** mirrors the tutor pattern without the ownership guard.

---

## 1. New Backend Endpoint

### Route

`GET /api/admin/sessions/:id/students`

Added to `SessionController` (`sinaloka-backend/src/modules/session/session.controller.ts`). Roles: `SUPER_ADMIN`, `ADMIN`.

### Service Method

New method `getAdminSessionStudents(institutionId: string, sessionId: string)` in `SessionService` (`sinaloka-backend/src/modules/session/session.service.ts`).

Logic mirrors `getSessionStudents()` (lines 434-489) but:
- Uses `institutionId` for tenant scoping (via `TenantInterceptor`) instead of tutor user ID
- No tutor ownership verification
- Adds `attendance_id` to the response so the frontend can distinguish editable vs read-only students

### Implementation

```typescript
async getAdminSessionStudents(institutionId: string, sessionId: string) {
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId, institution_id: institutionId },
  });

  if (!session) {
    throw new NotFoundException(`Session with id ${sessionId} not found`);
  }

  const enrollments = await this.prisma.enrollment.findMany({
    where: {
      class_id: session.class_id,
      status: 'ACTIVE',
    },
    include: {
      student: {
        select: { id: true, name: true, grade: true },
      },
    },
  });

  const attendances = await this.prisma.attendance.findMany({
    where: { session_id: sessionId },
  });

  const attendanceMap = new Map(
    attendances.map((a) => [a.student_id, a]),
  );

  return {
    students: enrollments.map((e) => {
      const att = attendanceMap.get(e.student.id);
      return {
        id: e.student.id,
        name: e.student.name,
        grade: e.student.grade,
        attendance_id: att?.id ?? null,
        status: att?.status ?? null,
        homework_done: att?.homework_done ?? false,
        notes: att?.notes ?? null,
      };
    }),
  };
}
```

### Response Shape

```typescript
{
  students: Array<{
    id: string;            // student ID
    name: string;
    grade: string | null;
    attendance_id: string | null;  // null = no attendance record yet
    status: 'PRESENT' | 'ABSENT' | 'LATE' | null;  // null = pending
    homework_done: boolean;
    notes: string | null;
  }>
}
```

---

## 2. Platform Attendance Page Changes

### File: `sinaloka-platform/src/pages/Attendance.tsx`

### New Frontend Type

Add to `sinaloka-platform/src/types/session.ts`:

```typescript
export interface SessionStudent {
  id: string;
  name: string;
  grade: string | null;
  attendance_id: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | null;
  homework_done: boolean;
  notes: string | null;
}
```

### New Service Method

Add to `sinaloka-platform/src/services/sessions.service.ts`:

```typescript
getStudents: (sessionId: string) =>
  api.get<{ students: SessionStudent[] }>(`/api/admin/sessions/${sessionId}/students`).then((r) => r.data),
```

### New Hook

Add to `sinaloka-platform/src/hooks/useSessions.ts`:

```typescript
export function useSessionStudents(sessionId: string) {
  return useQuery({
    queryKey: ['session-students', sessionId],
    queryFn: () => sessionsService.getStudents(sessionId),
    enabled: !!sessionId,
  });
}
```

### Page Changes

1. **Fetch:** Add `useSessionStudents(selectedSessionId)` alongside the existing `useAttendanceBySession` query.

2. **Student list source:** Render from `sessionStudents.data?.students` instead of `attendanceRecords` when displaying the student table.

3. **Editable vs read-only rows:**
   - Students with `attendance_id !== null`: P/A/L buttons, HW checkbox, and notes input are interactive. Pending changes are tracked by `attendance_id` (same PATCH flow as current).
   - Students with `attendance_id === null`: Show student name/grade. P/A/L area shows a grey "Pending" text. HW checkbox and notes input are disabled/hidden. Row has a subtle muted styling.

4. **"Mark All Present" and keyboard shortcuts:** Only apply to students with existing `attendance_id`.

5. **Empty state:** The "No records" message only shows when there are zero enrolled students. If students are enrolled but no attendance exists yet, the table shows all students with "Pending" indicators.

6. **Save logic:** Unchanged — still PATCHes by `attendance_id` for modified records. Read-only students are never included in save.

7. **Counts:** `presentCount`, `absentCount` etc. are calculated from students with attendance records only. An additional "enrolled" count can be shown.

---

## 3. Platform Session Detail Drawer Changes

### File: `sinaloka-platform/src/pages/Schedules.tsx` (lines 831-866)

### Changes

1. **Add query:** Call `useSessionStudents(selectedSessionId)` when the drawer is open (when `selectedSessionId` is set).

2. **Header count:** Change from `({sessionDetail.data?.attendances?.length ?? 0})` to format `"(attended/enrolled)"` — e.g., `"Attendance (2/5)"` where 2 is students with attendance records and 5 is total enrolled.

3. **Student list:** Render from `sessionStudents.data?.students` instead of `sessionDetail.data?.attendances`:
   - Students with `status !== null`: Current display — avatar initial, name, grade, status badge (PRESENT/ABSENT/LATE), homework indicator.
   - Students with `status === null`: Avatar initial, name, grade, grey "Pending" badge. No homework indicator.

4. **Empty states:**
   - No enrolled students: "No students enrolled"
   - Enrolled but no attendance: Shows all students with "Pending" badges
   - Loading: Existing skeleton pattern

---

## Files Changed Summary

| File | Change |
|------|--------|
| `sinaloka-backend/src/modules/session/session.controller.ts` | Add `GET :id/students` route |
| `sinaloka-backend/src/modules/session/session.service.ts` | Add `getAdminSessionStudents()` method |
| `sinaloka-platform/src/types/session.ts` | Add `SessionStudent` interface |
| `sinaloka-platform/src/services/sessions.service.ts` | Add `getStudents()` service method |
| `sinaloka-platform/src/hooks/useSessions.ts` | Add `useSessionStudents()` hook |
| `sinaloka-platform/src/pages/Attendance.tsx` | Use `useSessionStudents`, render enrolled students, disable controls for pending |
| `sinaloka-platform/src/pages/Schedules.tsx` | Use `useSessionStudents` in drawer, show enrolled students with pending badges |

## Files NOT Changed

- `sinaloka-backend/src/modules/attendance/` — existing endpoints unchanged
- `sinaloka-tutors/` — not affected (already works correctly)
- `sinaloka-parent/` — not affected (correct by design)
- No new database migrations needed
