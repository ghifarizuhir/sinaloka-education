# Generate Sessions from Class Detail Drawer

> Date: 2026-03-17

## Problem

When an admin creates a class with schedule data (e.g., Monday/Wednesday 14:00-15:30), no sessions are created automatically. The admin must navigate to a separate Schedules page, click "Auto-Generate", select the class, and pick a date range. This feels disconnected — the schedule information was already provided during class creation but must be re-specified elsewhere.

Additionally, session generation currently requires at least one enrolled student, which blocks admins who want to prepare the schedule before enrolling students.

## Solution

Add a "Generate Sessions" button in the class detail drawer with a confirmation popup. Remove the enrolled-students constraint from session generation.

## Detailed Design

### User Flow

1. Admin opens class detail drawer (clicks a class row in the Classes table)
2. Drawer shows class info including schedule, tutor, enrolled students
3. A **"Generate Sessions"** button is visible in the drawer (below the existing action buttons, only for ACTIVE classes)
4. Admin clicks the button → confirmation popup appears with:
   - Class name and schedule info (days, time)
   - Duration input: number of days to generate (default: 30, min: 1, max: 365)
   - Computed date range: "From [today] to [today + duration - 1]" (inclusive, so duration=30 means exactly 30 calendar days)
   - Estimated session count preview
   - Cancel and Generate buttons
5. Admin clicks Generate → `POST /api/admin/sessions/generate` is called with `{ class_id, date_from, date_to }`
6. Success toast shows count of sessions created (from response `count` field)
7. Popup closes, drawer stays open

### Backend Changes

**File:** `sinaloka-backend/src/modules/session/session.service.ts`

The enrolled-students check lives in `validateClassForSession()`, a shared private method called by both `create()` (single session) and `generateSessions()` (bulk).

**Change:** Remove the enrollment check from `validateClassForSession()` entirely. This allows both single-session creation and bulk generation without enrolled students. This is intentional — admins should be able to prepare schedules before enrolling students.

The method after the change:
1. Checks class exists and is ACTIVE → keep
2. ~~Checks class has enrolled students~~ → **remove**
3. Returns class record

No new endpoints needed — the existing `POST /api/admin/sessions/generate` with `{ class_id, date_from, date_to }` is sufficient.

### Frontend Changes

**File:** `sinaloka-platform/src/pages/Classes.tsx`

In the class detail drawer section (below existing Edit/Delete action buttons), add:
- A "Generate Sessions" button (Calendar icon + text), only visible when `classDetail.data.status === 'ACTIVE'`
- Use `classDetail.data` (fetched detail, not the list item) for schedule data to avoid stale data from filtered lists

**Confirmation modal** that appears on click:
- Class name and schedule summary (read-only display from `classDetail.data`)
- Duration input (number field, default 30, min 1, max 365)
- Auto-computed dates:
  - `date_from`: `format(new Date(), 'yyyy-MM-dd')`
  - `date_to`: `format(addDays(new Date(), duration - 1), 'yyyy-MM-dd')` (using date-fns, already a dependency)
- Estimated session count: iterate from `date_from` to `date_to`, count dates whose weekday matches any day in `schedule_days`. Use `getDay()` mapped against the class's `schedule_days` array. This is O(N) where N ≤ 365 — trivial.
- Generate button (disabled during `generateSessions.isPending`, shows loading state)
- Cancel button

**Hook usage:**
- Uses existing `useGenerateSessions()` hook from `useSessions.ts`
- The hook's `sessionsService.generate()` return type needs to be corrected from `Session[]` to `{ count: number; sessions: Session[] }` to match the actual backend response

**Files to update for return type fix:**
- `sinaloka-platform/src/services/sessions.service.ts` — fix return type of `generate()`
- `sinaloka-platform/src/types/session.ts` — add `GenerateSessionsResponse` type if needed

**Files:** `sinaloka-platform/src/locales/en.json` and `id.json`

Add i18n keys:
- `classes.drawer.generateSessions` — button label
- `classes.generateModal.title` — modal title
- `classes.generateModal.duration` — duration label
- `classes.generateModal.days` — "days" unit
- `classes.generateModal.dateRange` — date range display template
- `classes.generateModal.estimatedSessions` — estimated count label
- `classes.generateModal.confirm` — generate button label
- `classes.toast.generateSuccess` — success message with {{count}}
- `classes.toast.generateError` — error message

### What Does NOT Change

- Schedules page Auto-Generate modal remains (alternative path for power users)
- Session model / schema — no changes
- All existing session endpoints — no changes
- Tutor app, parent app — no changes
- Enrollment flow — no changes

## Edge Cases

- **Class with no schedule_days:** Button should be hidden (defensive, shouldn't happen since schedule_days is required on create)
- **Duplicate sessions:** Backend already handles this via date comparison + `skipDuplicates: true`. If admin generates twice for overlapping ranges, duplicates are silently skipped and `count` reflects only newly created sessions.
- **Archived class:** Button does not appear (guarded by `status === 'ACTIVE'` check)
- **Duration of 0:** Prevented by `min=1` on the number input
- **Class detail loading:** Button disabled while `classDetail.isLoading`
