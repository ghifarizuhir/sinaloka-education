# Sprint 4: Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire 3 existing hooks/endpoints: attendance summary, login redirect, enrollment conflict check.

**Architecture:** All frontend-only changes — no backend modifications needed. All endpoints and hooks already exist.

**Tech Stack:** React + TanStack Query + React Router (frontend)

**Spec:** `docs/superpowers/specs/2026-03-22-sprint4-quick-wins-design.md`

---

## Task 1: Attendance Summary per Class

**Files:**
- Modify: `sinaloka-platform/src/pages/Attendance.tsx`

- [ ] **Step 1: Read the file and understand current structure**

Read `Attendance.tsx`. Key things to find:
- Line ~32: `useAttendanceSummary` is already imported but unused
- The selected session state and how `class_id` is accessed from it
- The left panel layout (date picker + session list)

- [ ] **Step 2: Wire useAttendanceSummary with selected session's class_id**

After the existing hooks, add the summary call. The selected session should have `class_id` (check the session type). Use current month as date range:

```typescript
const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0];
const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];

const selectedSessionData = sessions.find(s => s.id === selectedSessionId);

const { data: attendanceSummary } = useAttendanceSummary({
  class_id: selectedSessionData?.class_id ?? '',
  date_from: monthStart,
  date_to: monthEnd,
});
```

Note: The hook has `enabled: !!params.class_id && !!params.date_from && !!params.date_to` so it won't fire if class_id is empty.

- [ ] **Step 3: Add summary cards in the right panel header**

After the session header ("X/N present" counter area), add a summary section that shows when `attendanceSummary` data is available:

```tsx
{attendanceSummary && selectedSessionData && (
  <div className="grid grid-cols-4 gap-2 mt-3">
    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-2 text-center">
      <p className="text-lg font-bold text-emerald-600">{attendanceSummary.attendance_rate}%</p>
      <p className="text-[10px] text-emerald-600/70">{t('attendance.rate', { defaultValue: 'Rate' })}</p>
    </div>
    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 text-center">
      <p className="text-lg font-bold text-blue-600">{attendanceSummary.present}</p>
      <p className="text-[10px] text-blue-600/70">{t('attendance.presentLabel', { defaultValue: 'Present' })}</p>
    </div>
    <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 p-2 text-center">
      <p className="text-lg font-bold text-rose-600">{attendanceSummary.absent}</p>
      <p className="text-[10px] text-rose-600/70">{t('attendance.absentLabel', { defaultValue: 'Absent' })}</p>
    </div>
    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-center">
      <p className="text-lg font-bold text-amber-600">{attendanceSummary.late}</p>
      <p className="text-[10px] text-amber-600/70">{t('attendance.lateLabel', { defaultValue: 'Late' })}</p>
    </div>
  </div>
)}
```

Add a small label above: `<p className="text-xs text-muted-foreground mt-3">{t('attendance.classSummary', { defaultValue: 'Class Summary (This Month)' })}</p>`

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run build`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Attendance.tsx
git commit -m "feat(platform): wire attendance summary per class with monthly stats"
```

---

## Task 2: Redirect After Login (`?redirect=`)

**Files:**
- Modify: `sinaloka-platform/src/components/ProtectedRoute.tsx`
- Modify: `sinaloka-platform/src/pages/Login.tsx`

- [ ] **Step 1: Update ProtectedRoute to pass current path**

Read `ProtectedRoute.tsx`. Find the unauthenticated redirect (line ~20):

```tsx
if (!isAuthenticated) return <Navigate to="/login" replace />;
```

Replace with:

```tsx
if (!isAuthenticated) {
  const currentPath = location.pathname + location.search;
  return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
}
```

Make sure `useLocation` is imported from `react-router-dom`. Check if it's already imported or if `location` is available in the component.

- [ ] **Step 2: Update Login.tsx to read redirect param**

Read `Login.tsx`. Find the post-login redirect logic (lines ~32-35):

```typescript
if (profile.role === 'SUPER_ADMIN') {
  navigate('/super/institutions', { replace: true });
} else {
  navigate('/', { replace: true });
}
```

Replace with:

```typescript
if (profile.role === 'SUPER_ADMIN') {
  navigate('/super/institutions', { replace: true });
} else {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  // Validate: must start with / to prevent open redirect attacks
  const target = redirect && redirect.startsWith('/') ? redirect : '/';
  navigate(target, { replace: true });
}
```

Also update the pre-auth guard (lines ~19-24) — if already authenticated, check redirect param too:

```typescript
if (!authLoading && isAuthenticated) {
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/super/institutions" replace />;
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  const target = redirect && redirect.startsWith('/') ? redirect : '/';
  return <Navigate to={target} replace />;
}
```

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-platform && npm run build`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/ProtectedRoute.tsx sinaloka-platform/src/pages/Login.tsx
git commit -m "feat(platform): preserve and restore redirect path after login"
```

---

## Task 3: Enrollment Conflict Check Before Enroll

**Files:**
- Modify: `sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts`

- [ ] **Step 1: Read the file and find handleEnroll**

Read `useEnrollmentsPage.ts`. Find:
- Line 77: `const checkConflict = useCheckConflict();` (already instantiated)
- The `handleEnroll` function — look for where `createEnrollment.mutateAsync` is called for each student

- [ ] **Step 2: Add conflict check before enrollment creation**

In the `handleEnroll` function, before calling `createEnrollment.mutateAsync`, add a conflict check per student-class pair. The approach:

```typescript
// For each student, check conflict first
const conflicts: string[] = [];
const validStudents: string[] = [];

for (const studentId of selectedStudentIds) {
  try {
    const result = await checkConflict.mutateAsync({
      student_id: studentId,
      class_id: selectedClassId,
    });
    if (result.conflict) {
      conflicts.push(result.student_name ?? studentId);
    } else {
      validStudents.push(studentId);
    }
  } catch {
    // If check fails, allow enrollment (don't block on check failure)
    validStudents.push(studentId);
  }
}

if (conflicts.length > 0) {
  toast.warning(
    t('enrollments.toast.conflictsFound', {
      defaultValue: `${conflicts.length} student(s) already enrolled: ${conflicts.join(', ')}`,
      count: conflicts.length,
      names: conflicts.join(', '),
    })
  );
}

if (validStudents.length === 0) return;

// Continue with createEnrollment for validStudents only
```

IMPORTANT: Read the actual `handleEnroll` function first to understand the current flow, then adapt the conflict check to fit. The key thing is: check conflict BEFORE create, skip conflicting students with a warning, proceed with non-conflicting ones.

Also check what `checkConflict` returns (read the backend `enrollment.service.ts` `checkConflict` method to see the response shape — it might return `{ exists: boolean }` or similar instead of `{ conflict: boolean }`).

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-platform && npm run build`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts
git commit -m "feat(platform): check enrollment conflicts before creating enrollments"
```

---

## Task 4: Final Verification & PR

- [ ] **Step 1: Full build check**

```bash
cd sinaloka-platform && npm run build && npm run lint
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat: sprint 4 quick wins — attendance summary, login redirect, enrollment conflict check" --body "$(cat <<'EOF'
## Summary
- **Attendance Summary**: wire existing `useAttendanceSummary` hook to show class-level monthly stats (attendance rate, present, absent, late) when a session is selected
- **Login Redirect**: preserve original URL in `?redirect=` param when redirecting to login, restore after successful login. Validates redirect starts with `/` to prevent open redirect.
- **Enrollment Conflict Check**: call existing `checkConflict` endpoint before creating enrollments, skip students already enrolled with warning toast

## Test plan
- [ ] Select a session on Attendance page → class summary cards appear with monthly stats
- [ ] Change selected date → summary updates for that month
- [ ] Access `/finance/payments` while logged out → redirect to `/login?redirect=/finance/payments`
- [ ] Login → redirected back to `/finance/payments` (not `/`)
- [ ] SUPER_ADMIN login → always goes to `/super/institutions` (ignores redirect)
- [ ] Enroll student already in class → warning toast, student skipped
- [ ] Enroll mix of new + existing students → only new ones enrolled, existing ones warned

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
