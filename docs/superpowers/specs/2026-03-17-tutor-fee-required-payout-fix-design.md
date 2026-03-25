# Tutor Fee Required & Payout Auto-Generation Fix

**Date:** 2026-03-17
**Status:** Approved

## Problem

When tutors complete sessions, no pending payouts are created. Root cause: `tutor_fee` on the Class model is optional (`Decimal?`) and often NULL. The payout auto-creation logic checks `if (tutorFee > 0)` before creating a payout — when tutor_fee is NULL, this evaluates to 0 and the payout is skipped.

## Solution

Make `tutor_fee` a required field across all layers so that every class has a tutor fee, and payouts are always generated when sessions are completed.

## Changes

### 1. Prisma Schema

- Change `tutor_fee Decimal?` to `tutor_fee Decimal @default(0)` in the Class model
- Create migration to set existing NULL values to 0

### 2. Backend DTO (`class.dto.ts`)

- `CreateClassSchema`: change `tutor_fee` from `z.number().min(0).optional().nullable()` to `z.number().min(0)` (required)
- `UpdateClassSchema`: keep optional for partial updates but remove `.nullable()`

### 3. Backend Service (`class.service.ts`)

- Remove `?? null` fallback in create method since field is now required

### 4. Frontend Type (`class.ts`)

- `Class` interface: change `tutor_fee: number | null` to `tutor_fee: number`
- `CreateClassDto`: change `tutor_fee?: number | null` to `tutor_fee: number` (required)

### 5. Frontend Form (`Classes.tsx`)

- Add `required` attribute to tutor_fee input field

### 6. Seed Data (`prisma/seed.ts`)

- Add `tutor_fee` values to all seeded classes (typically a fraction of the class `fee`)

## What Already Works (No Changes Needed)

- `session.service.ts` — payout auto-creation logic in `completeSession()` and `update()` is correct
- `payout.service.ts` — create method works correctly
- Platform payout page — fetches from correct endpoint
- Tutor app payout page — fetches from correct endpoint
- Session module imports PayoutModule correctly

## Testing

1. Create a class with tutor_fee set
2. Create a session for that class
3. As tutor, complete the session (submit attendance + complete)
4. Verify a PENDING payout appears in admin platform (Finance > Tutor Payouts)
5. Verify the same payout appears in the tutor app (Payouts page)
6. Verify creating a class without tutor_fee is rejected by validation
