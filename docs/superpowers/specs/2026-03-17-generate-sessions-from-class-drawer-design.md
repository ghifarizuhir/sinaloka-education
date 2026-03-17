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
3. A **"Generate Sessions"** button is visible in the drawer
4. Admin clicks the button → confirmation popup appears with:
   - Class name and schedule info (days, time)
   - Duration input: number of days to generate (default: 30, max: 365)
   - Computed date range: "From [today] to [today + N days]"
   - Estimated session count preview (calculated from schedule_days × duration)
   - Cancel and Generate buttons
5. Admin clicks Generate → `POST /api/admin/sessions/generate` is called
6. Success toast shows count of sessions created
7. Popup closes, drawer stays open

### Backend Change

**File:** `sinaloka-backend/src/modules/session/session.service.ts`

Remove the enrolled-students validation in `generateSessions()`. Currently the method:
1. Checks class exists and is ACTIVE
2. Checks class has enrolled students (ACTIVE or TRIAL) → **remove this check**
3. Validates date range
4. Generates sessions

After the change, step 2 is removed. Sessions can be generated for any ACTIVE class regardless of enrollment status.

No new endpoints needed — the existing `POST /api/admin/sessions/generate` with `{ class_id, date_from, date_to }` is sufficient.

### Frontend Changes

**File:** `sinaloka-platform/src/pages/Classes.tsx`

In the class detail drawer section, add:
- A "Generate Sessions" button (Calendar icon + text)
- A confirmation modal/popup that appears on click with:
  - Class name and schedule summary (read-only display)
  - Duration input (number field, default 30, min 1, max 365)
  - Auto-computed `date_from` (today) and `date_to` (today + duration)
  - Estimated session count: `Math.floor(duration / 7) * schedule_days.length` + remainder calculation
  - Generate button (disabled during pending, shows loading state)
  - Cancel button
- Uses existing `useGenerateSessions()` hook from `useSessions.ts`
- On success: toast with session count, close popup
- On error: toast with error message

**Files:** `sinaloka-platform/src/locales/en.json` and `id.json`

Add i18n keys:
- `classes.drawer.generateSessions` — button label
- `classes.generateModal.title` — modal title
- `classes.generateModal.duration` — duration label
- `classes.generateModal.days` — "days" unit
- `classes.generateModal.dateRange` — date range display
- `classes.generateModal.estimatedSessions` — estimated count label
- `classes.generateModal.confirm` — generate button label
- `classes.generateModal.description` — confirmation description
- `classes.toast.generateSuccess` — success message with {{count}}
- `classes.toast.generateError` — error message

### What Does NOT Change

- Schedules page Auto-Generate modal remains (alternative path for power users)
- Session model / schema — no changes
- All existing session endpoints — no changes
- Tutor app, parent app — no changes
- Enrollment flow — no changes

## Edge Cases

- **Class with no schedule_days:** Button should be disabled or hidden (defensive, shouldn't happen since schedule_days is required)
- **Duplicate sessions:** Backend already handles this via date comparison + `skipDuplicates: true`
- **Archived class:** Button should not appear for ARCHIVED classes
- **Duration of 0:** Prevented by min=1 validation on the input
