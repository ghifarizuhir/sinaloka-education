# Flexible Tutor Payout Modes

**Date:** 2026-03-17
**Status:** Approved

## Problem

Tutor payout currently supports only one model: fixed fee per session (`class.tutor_fee`). Institutions need flexibility to pay tutors differently depending on the class type:

- Private classes: pay per attending student
- Group classes: fixed per session
- Full-time tutors: monthly salary

## Solution

Add `tutor_fee_mode` per class with 3 modes, and `monthly_salary` on the Tutor model.

## Schema Changes

### New Enum

```prisma
enum TutorFeeMode {
  FIXED_PER_SESSION
  PER_STUDENT_ATTENDANCE
  MONTHLY_SALARY
}
```

### Class Model — Add 2 Fields

```prisma
tutor_fee_mode        TutorFeeMode @default(FIXED_PER_SESSION)
tutor_fee_per_student Decimal?     // used when mode = PER_STUDENT_ATTENDANCE
```

Existing `tutor_fee` field remains for `FIXED_PER_SESSION` mode. Existing classes default to `FIXED_PER_SESSION` with no migration issues.

### Tutor Model — Add 1 Field

```prisma
monthly_salary Decimal?  // used when class mode = MONTHLY_SALARY
```

## Payout Generation Logic

### FIXED_PER_SESSION (existing, no change)

Trigger: session completed
Payout amount: `class.tutor_fee`

### PER_STUDENT_ATTENDANCE (new)

Trigger: session completed
Logic:
1. Count attendance records with status PRESENT or LATE for the session
2. Payout amount = `class.tutor_fee_per_student` x attending count
3. Description includes student count: `"Session: {class} - {date} ({count} students)"`

Implemented in `completeSession()` and `update()` (when status changes to COMPLETED).

### MONTHLY_SALARY (new)

Trigger: cron job on 1st of each month (`0 0 1 * *`) OR manual endpoint
Logic:
1. Find all tutors in institution with `monthly_salary > 0`
2. Check for existing payout with description `"Salary: YYYY-MM"` (duplicate prevention)
3. Create PENDING payout with amount = `tutor.monthly_salary`

When a class has mode `MONTHLY_SALARY`, `completeSession()` skips per-session payout creation.

Manual endpoint: `POST /admin/payouts/generate-salaries`

## Backend Changes

### Class DTO (`class.dto.ts`)

CreateClassSchema additions:
- `tutor_fee_mode`: required, enum, default `FIXED_PER_SESSION`
- `tutor_fee_per_student`: optional, `z.number().min(0)`

Validation: if mode is `PER_STUDENT_ATTENDANCE`, `tutor_fee_per_student` must be provided and > 0.

### Tutor DTO

UpdateTutorSchema addition:
- `monthly_salary`: optional, `z.number().min(0).nullable()`

### Session Service (`session.service.ts`)

Update `completeSession()` and `update()`:

```
read class.tutor_fee_mode

if FIXED_PER_SESSION:
    payout = class.tutor_fee (existing logic)

elif PER_STUDENT_ATTENDANCE:
    count = attendance WHERE session_id AND status IN (PRESENT, LATE)
    payout = class.tutor_fee_per_student x count

elif MONTHLY_SALARY:
    skip (no per-session payout)
```

### Payout Service (`payout.service.ts`)

New method: `generateMonthlySalaries(institutionId: string)`
- Queries tutors with `monthly_salary > 0`
- Duplicate check via description containing `"Salary: YYYY-MM"`
- Creates PENDING payouts
- Returns `{ created: number }`

### Cron Job

New scheduled task in payout module:
- `@Cron('0 0 1 * *')` — runs 1st of each month at midnight
- Iterates all institutions, calls `generateMonthlySalaries`

### Payout Controller

New endpoint: `POST /admin/payouts/generate-salaries`
- Calls `generateMonthlySalaries` for the admin's institution
- Returns `{ created: number }`

## Frontend Changes

### Types

Class (`class.ts`):
- Add `tutor_fee_mode: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY'`
- Add `tutor_fee_per_student: number | null`

Tutor (`tutor.ts`):
- Add `monthly_salary: number | null`

### Class Form (`Classes.tsx`)

- Add "Tutor Fee Mode" dropdown with 3 options
- Conditional field visibility:
  - `FIXED_PER_SESSION`: show `tutor_fee` input (existing)
  - `PER_STUDENT_ATTENDANCE`: show `tutor_fee_per_student` input
  - `MONTHLY_SALARY`: show info text "Payout from tutor's monthly salary"

### Tutor Form (`Tutors.tsx`)

- Add optional "Monthly Salary" input in edit form
- Display in tutor profile card when set

### Tutor Payouts Page (`TutorPayouts.tsx`)

- Add "Generate Monthly Salaries" button
- Calls `POST /admin/payouts/generate-salaries`
- Shows toast with count of payouts created

### i18n (EN + ID)

Add labels for:
- Tutor fee mode options
- `tutor_fee_per_student` field
- `monthly_salary` field
- Generate salaries button and toast messages

## Testing

1. Create class with `FIXED_PER_SESSION` → complete session → verify payout = tutor_fee
2. Create class with `PER_STUDENT_ATTENDANCE` → complete session with 3 present → verify payout = tutor_fee_per_student x 3
3. Create class with `MONTHLY_SALARY` → complete session → verify NO per-session payout created
4. Set tutor monthly_salary → trigger generate salaries → verify PENDING payout created
5. Trigger generate salaries twice same month → verify no duplicate
6. Verify class form shows correct fields per mode
7. Verify tutor form allows setting monthly_salary
