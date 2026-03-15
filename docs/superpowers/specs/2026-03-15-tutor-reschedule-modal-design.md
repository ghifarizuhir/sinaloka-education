# Reschedule Request Modal for sinaloka-tutors

**Date:** 2026-03-15
**Status:** Approved

## Overview

Add a reschedule request modal to the tutor app so tutors can request session reschedules directly from their phone instead of calling the admin. The backend endpoint already exists.

## User Flow

1. Tutor sees a SCHEDULED session card with "Atur Ulang" button
2. Taps "Atur Ulang" → modal opens showing current session info
3. Fills in: proposed date, start time, end time, reason (all required)
4. Taps "Kirim Permintaan" → `PATCH /api/tutor/schedule/:id/request-reschedule`
5. On success: modal closes, toast "Permintaan reschedule berhasil dikirim", schedule refetches (status becomes `rescheduled`)
6. On error: error message shown in modal

## API Contract

**Endpoint:** `PATCH /api/tutor/schedule/:id/request-reschedule` (already exists)

**Request body:**
```json
{
  "proposed_date": "2026-03-20",
  "proposed_start_time": "16:00",
  "proposed_end_time": "17:30",
  "reschedule_reason": "Ada keperluan keluarga"
}
```

**Validation (from `RequestRescheduleSchema`):**
- `proposed_date`: coerced date, required
- `proposed_start_time`: HH:MM format, required
- `proposed_end_time`: HH:MM format, required
- `reschedule_reason`: string, min 1, max 500, required

**Response:** Updated session with status `RESCHEDULE_REQUESTED`.

## Modal Layout

- Header: "Atur Ulang Jadwal" + close (X) button
- Session info: subject name, current date, current time range
- Form: date input, two time inputs side-by-side, reason textarea
- Submit button: "Kirim Permintaan" (lime-400 accent)
- Loading state: button shows spinner + "Mengirim..." while submitting
- Error state: red error message above submit button

## Input Types

Native HTML inputs: `<input type="date">`, `<input type="time">`. No new dependencies. Styled with zinc theme to match existing inputs.

## ScheduleCard Changes

Restore "Atur Ulang" button to the action grid:
- Grid changes from 2-col back to 3-col: Absen Murid | Atur Ulang | Cancel
- Add `onReschedule` prop back to ScheduleCard interface
- Only shows on sessions with status `upcoming` (SCHEDULED)

## Files

- **Create:** `src/components/RescheduleModal.tsx` — modal with form, validation, API call
- **Modify:** `src/components/ScheduleCard.tsx` — restore Atur Ulang button and `onReschedule` prop, 3-col grid
- **Modify:** `src/App.tsx` — add `rescheduleSessionId` state, handler to open/close modal, pass props

## What stays the same

- All other pages and components unchanged
- Backend unchanged (endpoint already exists)
- `useSchedule` hook already has `requestReschedule` method
