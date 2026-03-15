# Playwright E2E Tests for sinaloka-tutors

**Date:** 2026-03-15
**Status:** Approved

## Overview

Add Playwright end-to-end tests for the sinaloka-tutors frontend, running against the real backend with seeded database data.

## Test User

- **Email:** `tutor1@cerdas.id`
- **Password:** `password`
- **Name:** Budi Santoso
- **Institution:** Bimbel Cerdas
- **Class:** Matematika SMP (2 enrolled students: Rina Pelajar, Dimas Pelajar)
- **Sessions:** 1 SCHEDULED (today), 1 COMPLETED (7 days ago)
- **Payouts:** 1 PAID (Rp 1,500,000)

Data comes from the existing seed script at `sinaloka-backend/prisma/seed.ts`.

## Prerequisites

- Backend running on `localhost:3000`
- Frontend dev server running on `localhost:5173`
- Database accessible via `DATABASE_URL` environment variable

## Idempotency

The test suite is fully idempotent. A `globalSetup` script runs before all tests to reset and re-seed the database:

1. `npx prisma db push --force-reset` — drops and recreates all tables
2. `npx prisma db seed` — populates with known test data

This ensures every test run starts from a clean, known state regardless of what previous runs did (e.g., the attendance test completing a session).

## Test Cases

### 1. Login (`e2e/auth.spec.ts`)

- Navigate to `localhost:5173`
- Verify login page is shown
- Enter email and password
- Submit form
- Verify dashboard loads with "Halo, Budi!" greeting

### 2. Logout (`e2e/auth.spec.ts`)

- From authenticated state, navigate to Profile tab
- Click "Keluar Platform" button
- Verify redirect to login page

### 3. View Schedule (`e2e/schedule.spec.ts`)

- From authenticated state, navigate to Schedule tab
- Verify schedule page title "Jadwal Mengajar" is visible
- Verify at least one session card renders
- Click "Completed" filter tab, verify it becomes active
- Click "Upcoming" filter tab, verify it becomes active

### 4. Mark Attendance (`e2e/attendance.spec.ts`)

- From authenticated state, navigate to Schedule tab
- Click "Absen Murid" on a SCHEDULED session
- Verify attendance view opens with student list
- Mark all students as Present (click P buttons)
- Fill in topic covered field
- Click "Finalize & Close"
- Verify success toast appears
- Verify return to schedule view

**Note:** This test mutates data (completes a session). Idempotency is ensured by the globalSetup re-seeding the database before each test run.

### 5. View Payouts (`e2e/payouts.spec.ts`)

- From authenticated state, navigate to Payouts tab
- Verify "Payouts" heading is visible
- Verify "Total Pendapatan" section renders with an amount
- Verify at least one transaction card renders

### 6. View Profile (`e2e/payouts.spec.ts`)

- From authenticated state, navigate to Profile tab
- Verify tutor name "Budi Santoso" is displayed
- Verify subject "Matematika" is displayed

## File Structure

```
sinaloka-tutors/
├── playwright.config.ts       # Playwright configuration
├── e2e/
│   ├── global-setup.ts        # DB reset + re-seed before all tests
│   ├── helpers.ts             # Shared login helper
│   ├── auth.spec.ts           # Login + Logout tests
│   ├── schedule.spec.ts       # View schedule + filter tabs
│   ├── attendance.spec.ts     # Mark attendance flow
│   └── payouts.spec.ts        # View payouts + View profile
```

## Configuration

- **Browser:** Chromium only (sufficient for a mobile-first SPA)
- **Base URL:** `http://localhost:5173`
- **Timeout:** 30s per test (real backend may be slow)
- **Retries:** 0
- **Screenshots:** On failure only
- **Test order:** Serial (attendance test mutates data, must run after schedule)
- **Global setup:** `e2e/global-setup.ts` — resets and re-seeds the database

## Authentication Helper

Tests that require authentication will share a login helper that:
1. Navigates to the app
2. Fills email/password
3. Submits the form
4. Waits for dashboard to load

This avoids repeating login steps in every test file.

## npm Scripts

Add to `sinaloka-tutors/package.json`:
- `"test:e2e": "playwright test"`
- `"test:e2e:ui": "playwright test --ui"` (for interactive debugging)
