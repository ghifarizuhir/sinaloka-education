# Attendance-Enrollment Gap Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin platform showing no students for new sessions by adding a new endpoint that queries enrolled students and updating both the Attendance page and the Schedules drawer.

**Architecture:** New backend endpoint `GET /api/admin/sessions/:id/students` mirrors the existing tutor pattern (enrollment + attendance overlay). Frontend adds a new hook/service to fetch enrolled students, updates Attendance.tsx and Schedules.tsx drawer to show all enrolled students with editable/read-only distinction.

**Tech Stack:** NestJS, Prisma, React, TanStack Query, TypeScript, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-17-attendance-enrollment-gap-design.md`

---

## Chunk 1: Backend Endpoint + Frontend Plumbing

### Task 1: Add getAdminSessionStudents to SessionService

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts`

- [ ] **Step 1: Add the service method**

Add after the existing `getSessionStudents` method (after line 489) in `session.service.ts`:

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
        institution_id: institutionId,
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

- [ ] **Step 2: Verify compilation**

Run: `cd sinaloka-backend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "feat(session): add getAdminSessionStudents service method"
```

---

### Task 2: Add controller route for GET :id/students

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.controller.ts`

- [ ] **Step 1: Add the route**

In `session.controller.ts`, add after the `findOne` method (after line 60), before the `update` method:

```typescript
  @Get(':id/students')
  getStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.getAdminSessionStudents(user.institutionId!, id);
  }
```

**IMPORTANT:** This route MUST be placed before `@Get(':id')` OR after it — NestJS resolves routes top-to-bottom. Since `':id/students'` is more specific than `':id'`, NestJS handles this correctly regardless of order. But for clarity, place it right after `findOne`.

- [ ] **Step 2: Verify compilation**

Run: `cd sinaloka-backend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.controller.ts
git commit -m "feat(session): add GET :id/students admin route"
```

---

### Task 3: Add SessionStudent type, service method, and hook

**Files:**
- Modify: `sinaloka-platform/src/types/session.ts`
- Modify: `sinaloka-platform/src/services/sessions.service.ts`
- Modify: `sinaloka-platform/src/hooks/useSessions.ts`

- [ ] **Step 1: Add SessionStudent type**

At the end of `sinaloka-platform/src/types/session.ts` (after the `SessionQueryParams` interface, before `SessionDetail`), add:

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

- [ ] **Step 2: Add service method**

In `sinaloka-platform/src/services/sessions.service.ts`, update the import to include `SessionStudent`:

Change line 3:
```typescript
import type { Session, SessionDetail, CreateSessionDto, UpdateSessionDto, SessionQueryParams, GenerateSessionsDto, ApproveRescheduleDto } from '@/src/types/session';
```
To:
```typescript
import type { Session, SessionDetail, SessionStudent, CreateSessionDto, UpdateSessionDto, SessionQueryParams, GenerateSessionsDto, ApproveRescheduleDto } from '@/src/types/session';
```

Add after the `approveReschedule` method (before the closing `};` on line 20):

```typescript
  getStudents: (sessionId: string) =>
    api.get<{ students: SessionStudent[] }>(`/api/admin/sessions/${sessionId}/students`).then((r) => r.data),
```

- [ ] **Step 3: Add hook**

In `sinaloka-platform/src/hooks/useSessions.ts`, add at the end of the file:

```typescript
export function useSessionStudents(sessionId: string | null) {
  return useQuery({ queryKey: ['session-students', sessionId], queryFn: () => sessionsService.getStudents(sessionId!), enabled: !!sessionId });
}
```

- [ ] **Step 4: Add cache invalidation for session-students**

In `sinaloka-platform/src/hooks/useAttendance.ts`, update `useUpdateAttendance` (line 11-14) to also invalidate `session-students`:

Replace:
```typescript
export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: attendanceService.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
```

With:
```typescript
export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: attendanceService.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['session-students'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
```

- [ ] **Step 5: Verify compilation**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/types/session.ts sinaloka-platform/src/services/sessions.service.ts sinaloka-platform/src/hooks/useSessions.ts sinaloka-platform/src/hooks/useAttendance.ts
git commit -m "feat(platform): add SessionStudent type, service, hook, and cache invalidation"
```

---

## Chunk 2: Attendance Page Update

### Task 4: Update Attendance.tsx to show enrolled students

**Files:**
- Modify: `sinaloka-platform/src/pages/Attendance.tsx`

- [ ] **Step 1: Add import for useSessionStudents**

In `Attendance.tsx`, update line 33 to add `useSessionStudents`:

Replace:
```typescript
import { useSessions } from '@/src/hooks/useSessions';
```

With:
```typescript
import { useSessions, useSessionStudents } from '@/src/hooks/useSessions';
```

Add `SessionStudent` to the session type import (line 35):

Replace:
```typescript
import type { Session } from '@/src/types/session';
```

With:
```typescript
import type { Session, SessionStudent } from '@/src/types/session';
```

- [ ] **Step 2: Add the useSessionStudents query**

After line 69 (`const attendanceQuery = ...`), add:

```typescript
  const studentsQuery = useSessionStudents(selectedSessionId);
```

After line 72 (`const attendanceRecords: ...`), add:

```typescript
  const sessionStudents: SessionStudent[] = studentsQuery.data?.students ?? [];
```

- [ ] **Step 3: Update the student table to render from sessionStudents**

Replace the table body (the `attendanceRecords.map` block at lines 363-425) with logic that renders from `sessionStudents` instead. Find this block:

```tsx
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {attendanceRecords.map((record) => {
                            const effectiveStatus = getEffectiveStatus(record);
                            const effectiveHw = getEffectiveHomework(record);
                            const effectiveNotes = getEffectiveNotes(record);
                            const studentName = record.student?.name ?? '—';
                            const studentGrade = record.student?.grade ?? '';
                            return (
                              <tr
                                key={record.id}
                                onFocus={() => setFocusedAttendanceId(record.id)}
                                onBlur={() => setFocusedAttendanceId(null)}
                                tabIndex={0}
                                className={cn(
                                  "hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30 transition-colors outline-none",
                                  focusedAttendanceId === record.id && "bg-zinc-50 dark:bg-zinc-900 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700"
                                )}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{studentName}</span>
                                    {studentGrade && <span className="text-[10px] text-zinc-500">{studentGrade}</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-1">
                                    {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map((status) => (
                                      <button
                                        key={status}
                                        onClick={() => setLocalStatus(record.id, status)}
                                        className={cn(
                                          "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                          effectiveStatus === status
                                            ? status === 'PRESENT' ? "bg-emerald-500 text-white shadow-sm" :
                                              status === 'ABSENT' ? "bg-rose-500 text-white shadow-sm" :
                                              "bg-amber-500 text-white shadow-sm"
                                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                        )}
                                      >
                                        {STATUS_LABEL[status][0]}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                    checked={effectiveHw}
                                    onChange={(e) => setLocalHomework(record.id, e.target.checked)}
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <Input
                                    className="h-8 text-xs w-32"
                                    placeholder={t('attendance.notePlaceholder')}
                                    value={effectiveNotes}
                                    onChange={(e) => setLocalNotes(record.id, e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
```

Replace with:

```tsx
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {sessionStudents.map((student) => {
                            const hasAttendance = student.attendance_id !== null;
                            const effectiveStatus = hasAttendance
                              ? (pendingChanges[student.attendance_id!]?.status ?? student.status) as AttendanceStatus
                              : null;
                            const effectiveHw = hasAttendance
                              ? (pendingChanges[student.attendance_id!]?.homework_done ?? student.homework_done)
                              : false;
                            const effectiveNotes = hasAttendance
                              ? (pendingChanges[student.attendance_id!]?.notes ?? student.notes ?? '')
                              : '';
                            return (
                              <tr
                                key={student.id}
                                onFocus={() => hasAttendance && setFocusedAttendanceId(student.attendance_id)}
                                onBlur={() => setFocusedAttendanceId(null)}
                                tabIndex={hasAttendance ? 0 : undefined}
                                className={cn(
                                  "transition-colors outline-none",
                                  hasAttendance
                                    ? cn("hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30", focusedAttendanceId === student.attendance_id && "bg-zinc-50 dark:bg-zinc-900 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700")
                                    : "opacity-60"
                                )}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{student.name}</span>
                                    {student.grade && <span className="text-[10px] text-zinc-500">{student.grade}</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {hasAttendance ? (
                                    <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-1">
                                      {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map((status) => (
                                        <button
                                          key={status}
                                          onClick={() => setLocalStatus(student.attendance_id!, status)}
                                          className={cn(
                                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                            effectiveStatus === status
                                              ? status === 'PRESENT' ? "bg-emerald-500 text-white shadow-sm" :
                                                status === 'ABSENT' ? "bg-rose-500 text-white shadow-sm" :
                                                "bg-amber-500 text-white shadow-sm"
                                              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                          )}
                                        >
                                          {STATUS_LABEL[status][0]}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('attendance.pending', 'Pending')}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {hasAttendance ? (
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                      checked={effectiveHw}
                                      onChange={(e) => setLocalHomework(student.attendance_id!, e.target.checked)}
                                    />
                                  ) : (
                                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {hasAttendance ? (
                                    <Input
                                      className="h-8 text-xs w-32"
                                      placeholder={t('attendance.notePlaceholder')}
                                      value={effectiveNotes}
                                      onChange={(e) => setLocalNotes(student.attendance_id!, e.target.value)}
                                    />
                                  ) : (
                                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
```

- [ ] **Step 4: Update the empty state check**

Find the empty state condition (around lines 348-351):

```tsx
                  ) : attendanceRecords.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-sm">
                      {t('attendance.noRecords')}
                    </div>
```

Replace with:

```tsx
                  ) : sessionStudents.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-sm">
                      {t('attendance.noRecords')}
                    </div>
```

- [ ] **Step 5: Update the loading state to also check studentsQuery**

Find the loading condition (around line 342):

```tsx
                  {attendanceQuery.isLoading ? (
```

Replace with:

```tsx
                  {(attendanceQuery.isLoading || studentsQuery.isLoading) ? (
```

- [ ] **Step 6: Update bulkMarkAll to use sessionStudents with attendance_id**

Replace the `bulkMarkAll` function (line 125-129):

```typescript
  const bulkMarkAll = (status: AttendanceStatus) => {
    const updates: Record<string, UpdateAttendanceDto> = {};
    attendanceRecords.forEach(r => { updates[r.id] = { ...(pendingChanges[r.id] ?? {}), status }; });
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };
```

With:

```typescript
  const bulkMarkAll = (status: AttendanceStatus) => {
    const updates: Record<string, UpdateAttendanceDto> = {};
    sessionStudents.filter(s => s.attendance_id !== null).forEach(s => { updates[s.attendance_id!] = { ...(pendingChanges[s.attendance_id!] ?? {}), status }; });
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };
```

- [ ] **Step 7: Update presentCount and absentCount**

Replace the count calculations (lines 144-145):

```typescript
  const presentCount = attendanceRecords.filter(r => getEffectiveStatus(r) === 'PRESENT').length;
  const absentCount = attendanceRecords.filter(r => getEffectiveStatus(r) === 'ABSENT').length;
```

With:

```typescript
  const studentsWithAttendance = sessionStudents.filter(s => s.attendance_id !== null);
  const presentCount = studentsWithAttendance.filter(s => (pendingChanges[s.attendance_id!]?.status ?? s.status) === 'PRESENT').length;
  const absentCount = studentsWithAttendance.filter(s => (pendingChanges[s.attendance_id!]?.status ?? s.status) === 'ABSENT').length;
```

- [ ] **Step 8: Verify compilation**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add sinaloka-platform/src/pages/Attendance.tsx
git commit -m "fix(platform): show enrolled students on attendance page for new sessions"
```

---

## Chunk 3: Schedules Drawer Update

### Task 5: Update Schedules.tsx drawer to show enrolled students

**Files:**
- Modify: `sinaloka-platform/src/pages/Schedules.tsx`

- [ ] **Step 1: Add import for useSessionStudents**

In `Schedules.tsx`, update the useSessions import (line 39):

Replace:
```typescript
import { useSessions, useSession, useCreateSession, useUpdateSession, useDeleteSession, useGenerateSessions, useApproveReschedule } from '@/src/hooks/useSessions';
```

With:
```typescript
import { useSessions, useSession, useSessionStudents, useCreateSession, useUpdateSession, useDeleteSession, useGenerateSessions, useApproveReschedule } from '@/src/hooks/useSessions';
```

- [ ] **Step 2: Add the useSessionStudents query**

Find where `useSession` is called for the drawer (search for `useSession(selectedSessionId`). Add right after it:

```typescript
  const sessionStudentsQuery = useSessionStudents(selectedSessionId);
```

- [ ] **Step 3: Replace the attendance section in the drawer**

Find the attendance section (lines 831-866):

```tsx
            {/* Attendance */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {t('schedules.drawer.attendance')} ({sessionDetail.data?.attendances?.length ?? 0})
              </h4>
              {sessionDetail.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : sessionDetail.data?.attendances?.length ? (
                <div className="space-y-2">
                  {sessionDetail.data.attendances.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                          {att.student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-zinc-200">{att.student.name}</p>
                          {att.student.grade && <p className="text-[10px] text-zinc-400">{att.student.grade}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {att.homework_done && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('schedules.drawer.homework')}</span>
                        )}
                        <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'LATE' ? 'warning' : 'default'}>
                          {t(`schedules.drawer.${att.status.toLowerCase()}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">{t('schedules.drawer.noAttendance')}</p>
              )}
            </div>
```

Replace with:

```tsx
            {/* Attendance */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {t('schedules.drawer.attendance')} ({sessionStudentsQuery.data?.students?.filter(s => s.attendance_id !== null).length ?? 0}/{sessionStudentsQuery.data?.students?.length ?? 0})
              </h4>
              {sessionStudentsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : sessionStudentsQuery.data?.students?.length ? (
                <div className="space-y-2">
                  {sessionStudentsQuery.data.students.map((student) => (
                    <div key={student.id} className={cn("flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50", !student.attendance_id && "opacity-60")}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-zinc-200">{student.name}</p>
                          {student.grade && <p className="text-[10px] text-zinc-400">{student.grade}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.attendance_id !== null ? (
                          <>
                            {student.homework_done && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('schedules.drawer.homework')}</span>
                            )}
                            <Badge variant={student.status === 'PRESENT' ? 'success' : student.status === 'LATE' ? 'warning' : 'default'}>
                              {t(`schedules.drawer.${student.status!.toLowerCase()}`)}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="default">
                            {t('schedules.drawer.pending', 'Pending')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">{t('schedules.drawer.noStudents', 'No students enrolled')}</p>
              )}
            </div>
```

- [ ] **Step 4: Verify compilation**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Schedules.tsx
git commit -m "fix(platform): show enrolled students in session detail drawer"
```

---

## Chunk 4: Verification

### Task 6: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Build backend**

Run: `cd sinaloka-backend && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 2: Build platform**

Run: `cd sinaloka-platform && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test checklist**

If dev servers are running, verify:

1. **Enroll a student** in a class
2. **Create a session** for that class
3. **Attendance page:** Select the session — should show enrolled student(s) with "Pending" text in status column and disabled HW/notes
4. **Have tutor submit attendance** for that session
5. **Attendance page:** Reload — student should now show P/A/L buttons (editable), HW checkbox, and notes input
6. **Schedules drawer:** Click the session — should show "Attendance (1/1)" with correct status badge
7. **Schedules drawer (new session):** Click a session with no attendance — should show "Attendance (0/1)" with "Pending" badges
