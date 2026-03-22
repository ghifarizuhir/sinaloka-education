# Integration E2E Test Suite — Design Spec

**Date**: 2026-03-22
**Status**: Draft
**Scope**: Full-stack browser-based E2E tests with real database for sinaloka-platform

---

## 1. Overview

Merancang suite integration E2E test baru yang menjalankan Playwright tests terhadap real backend + real database, menggantikan API mocking dengan interaksi full-stack. Tujuan utama:

1. **Confidence sebelum deploy** — memastikan UI → API → DB benar-benar works
2. **Regression detection** — catch bugs yang lolos dari mock-based tests (API contract changes, DB constraint violations)

### Scope

- 13 spec files mirroring semua halaman platform (auth, dashboard, students, tutors, classes, schedules, attendance, enrollments, payments, payouts, expenses, finance-overview, settings)
- Happy path + negative cases termasuk validasi form per field
- Database reset per test suite (per spec file)
- Sequential execution (1 worker)

### Non-Goals

- Tidak menggantikan mock-based E2E yang sudah ada
- Tidak test tutors app atau parent app (hanya platform)
- Tidak test Midtrans payment gateway integration (sandbox)
- Tidak parallel execution (untuk v1)

---

## 2. Architecture

### Directory Structure

```
e2e-integration/                     # Root-level, independent dari sinaloka-platform/e2e
├── docker-compose.yml               # PostgreSQL 16 container
├── playwright.config.ts             # Playwright config with webServer
├── .env.test                        # Test environment variables
├── package.json                     # Scripts & dependencies
├── tsconfig.json
├── scripts/
│   ├── setup.sh                     # docker up → wait → migrate → seed
│   ├── reset-db.sh                  # prisma migrate reset --force (per suite)
│   └── teardown.sh                  # docker down -v
├── fixtures/
│   ├── base.fixture.ts              # DB reset fixture
│   └── auth.fixture.ts              # Real login fixture
├── helpers/
│   ├── api-client.ts                # Axios wrapper for direct API calls
│   ├── db-reset.ts                  # Node wrapper for reset-db.sh
│   └── test-accounts.ts             # Seed credentials constants
├── pages/                           # Page objects (adapted from existing)
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── students.page.ts
│   ├── tutors.page.ts
│   ├── classes.page.ts
│   ├── schedules.page.ts
│   ├── attendance.page.ts
│   ├── enrollments.page.ts
│   ├── payments.page.ts
│   ├── payouts.page.ts
│   ├── expenses.page.ts
│   ├── finance-overview.page.ts
│   └── settings.page.ts
└── specs/                           # 13 spec files
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    ├── students.spec.ts
    ├── tutors.spec.ts
    ├── classes.spec.ts
    ├── schedules.spec.ts
    ├── attendance.spec.ts
    ├── enrollments.spec.ts
    ├── payments.spec.ts
    ├── payouts.spec.ts
    ├── expenses.spec.ts
    ├── finance-overview.spec.ts
    └── settings.spec.ts
```

### Infrastructure

| Component | Config |
|-----------|--------|
| **PostgreSQL** | Docker container, `postgres:16-alpine`, port `5435`, DB name `sinaloka_test` |
| **Backend** | Started by Playwright `webServer`, port `5555`, pointed to test DB |
| **Frontend** | Started by Playwright `webServer`, port `3000`, `VITE_API_URL=http://localhost:5555/api` |
| **Execution** | 1 worker, sequential, no parallel |

### Docker Compose

```yaml
# e2e-integration/docker-compose.yml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sinaloka_test
    ports:
      - "5435:5432"
    tmpfs:
      - /var/lib/postgresql/data  # RAM-backed for speed
```

### Environment Variables (.env.test)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/sinaloka_test
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-jwt-refresh-secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PORT=5555
CORS_ORIGINS=http://localhost:3000
UPLOAD_DIR=./uploads-test
UPLOAD_MAX_SIZE=5242880
RESEND_API_KEY=re_test_fake
EMAIL_FROM=test@sinaloka.com
TUTOR_PORTAL_URL=http://localhost:5173
PARENT_PORTAL_URL=http://localhost:5174
# WhatsApp (no-op without real token, but prevents undefined errors)
FONNTE_TOKEN=
FONNTE_DEVICE_NUMBER=
```

### Playwright Config

```typescript
// e2e-integration/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  globalSetup: './scripts/global-setup.ts',
  globalTeardown: './scripts/global-teardown.ts',

  webServer: [
    {
      command: 'npx dotenv-cli -e .env.test -- bash -c "cd ../sinaloka-backend && npx nest start"',
      port: 5555,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'cd ../sinaloka-platform && VITE_API_URL=http://localhost:5555/api npm run build && VITE_API_URL=http://localhost:5555/api npx vite preview --port 3000',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
});
```

**Key decisions:**
- **`dotenv-cli`** instead of `env $(cat | xargs)` — properly handles env vars with special characters
- **`nest start`** (no `--watch`) — avoids HMR-triggered rebuilds during tests
- **`vite preview`** instead of `npm run dev` — serves built assets like production, no HMR noise
- **`globalSetup/globalTeardown`** — ensures Docker lifecycle runs even with `npx playwright test` directly

---

## 3. Execution Flow

```
npm run test:integration
│
├─ 1. scripts/setup.sh
│     ├── docker-compose up -d
│     ├── wait for pg_isready (max 30s)
│     ├── cd sinaloka-backend
│     ├── DATABASE_URL=...5435 npx prisma migrate deploy
│     └── DATABASE_URL=...5435 npx prisma db seed
│
├─ 2. npx playwright test
│     ├── webServer 1: backend (PORT=5555, DATABASE_URL=...5435)
│     ├── webServer 2: frontend (VITE_API_URL=http://localhost:5555/api)
│     ├── wait both servers ready
│     │
│     ├── auth.spec.ts        → beforeAll: resetDatabase()
│     ├── dashboard.spec.ts   → beforeAll: resetDatabase()
│     ├── students.spec.ts    → beforeAll: resetDatabase()
│     ├── ... (13 spec files, each resets DB)
│     │
│     └── specs run sequentially (1 worker)
│
└─ 3. scripts/teardown.sh
      └── docker-compose down -v
```

### Database Reset (per suite)

```typescript
// e2e-integration/helpers/db-reset.ts
import { execSync } from 'child_process';
import path from 'path';

const DB_URL = 'postgresql://postgres:postgres@localhost:5435/sinaloka_test';
const BACKEND_DIR = path.resolve(__dirname, '../../sinaloka-backend');
const SCRIPTS_DIR = path.resolve(__dirname, '../scripts');

export async function resetDatabase() {
  // 1. Drop all tables, re-migrate, re-seed
  execSync(
    `DATABASE_URL=${DB_URL} npx prisma migrate reset --force --skip-generate`,
    { cwd: BACKEND_DIR, stdio: 'pipe' }
  );
  // 2. Apply test overlay (disable must_change_password for admins)
  execSync(
    `PGPASSWORD=postgres psql -h localhost -p 5435 -U postgres -d sinaloka_test -f ${SCRIPTS_DIR}/post-seed.sql`,
    { stdio: 'pipe' }
  );
}
```

`prisma migrate reset --force` = drop all → re-migrate → re-seed. `--skip-generate` karena Prisma client sudah ada. Post-seed SQL disables `must_change_password` flag.

### Global Setup & Teardown

```typescript
// e2e-integration/scripts/global-setup.ts
import { execSync } from 'child_process';

export default async function globalSetup() {
  // Start Docker container
  execSync('docker-compose up -d', { cwd: __dirname + '/..', stdio: 'inherit' });

  // Wait for PostgreSQL ready
  for (let i = 0; i < 30; i++) {
    try {
      execSync('pg_isready -h localhost -p 5435', { stdio: 'pipe' });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Run initial migration + seed
  const DB_URL = 'postgresql://postgres:postgres@localhost:5435/sinaloka_test';
  execSync(`DATABASE_URL=${DB_URL} npx prisma migrate deploy`, {
    cwd: __dirname + '/../../sinaloka-backend',
    stdio: 'inherit',
  });
  execSync(`DATABASE_URL=${DB_URL} npx prisma db seed`, {
    cwd: __dirname + '/../../sinaloka-backend',
    stdio: 'inherit',
  });
  // Apply test overlay
  execSync(
    'PGPASSWORD=postgres psql -h localhost -p 5435 -U postgres -d sinaloka_test -f scripts/post-seed.sql',
    { cwd: __dirname + '/..', stdio: 'inherit' }
  );
}

// e2e-integration/scripts/global-teardown.ts
import { execSync } from 'child_process';

export default async function globalTeardown() {
  execSync('docker-compose down -v', { cwd: __dirname + '/..', stdio: 'inherit' });
}
```

This ensures Docker lifecycle runs even when using `npx playwright test` directly.

---

## 4. Fixtures & Helpers

### Test Accounts (from seed)

```typescript
// e2e-integration/helpers/test-accounts.ts
export const ACCOUNTS = {
  SUPER_ADMIN: { email: 'super@sinaloka.com', password: 'password' },
  ADMIN_CERDAS: { email: 'admin@cerdas.id', password: 'password', mustChangePassword: true },
  ADMIN_PRIMA: { email: 'admin@prima.id', password: 'password', mustChangePassword: true },
  TUTOR1_CERDAS: { email: 'tutor1@cerdas.id', password: 'password' },
  TUTOR2_CERDAS: { email: 'tutor2@cerdas.id', password: 'password' },
  PARENT_CERDAS: { email: 'parent@cerdas.id', password: 'password' },
} as const;
```

### Auth Strategy: Seed Modification for Test

**Problem**: Admin accounts have `must_change_password: true` in seed. After each `prisma migrate reset`, the password resets to `password` with `must_change_password: true`. The auth fixture would need to handle password change on every spec, which is slow and fragile.

**Solution**: Create a **test-specific seed overlay** (`e2e-integration/scripts/post-seed.sql`) that runs after the standard seed to disable `must_change_password` for admin accounts:

```sql
-- e2e-integration/scripts/post-seed.sql
UPDATE users SET must_change_password = false WHERE email IN ('admin@cerdas.id', 'admin@prima.id');
```

This runs as part of `reset-db.sh` after `prisma db seed`. The auth spec itself tests `must_change_password` flow by temporarily re-enabling the flag via API or direct DB update in its own `beforeAll`.

### Auth Fixture (real login)

```typescript
// e2e-integration/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';
import { ACCOUNTS } from '../helpers/test-accounts';

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.locator('#email').fill(ACCOUNTS.ADMIN_CERDAS.email);
    await page.locator('#password').fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 10_000 });
    await use(page);
  },
});
```

**Note**: Login always uses `password` (seed default). The post-seed SQL disables `must_change_password` so login goes straight to dashboard. Auth spec tests the `must_change_password` flow separately by setting the flag back to `true` in its `beforeAll`.

### API Client (for setup/teardown)

```typescript
// e2e-integration/helpers/api-client.ts
import axios, { AxiosInstance } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private token: string = '';

  constructor(baseURL = 'http://localhost:5555/api') {
    this.client = axios.create({ baseURL });
  }

  async loginAs(account: { email: string; password: string }) {
    const res = await this.client.post('/auth/login', account);
    this.token = res.data.access_token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    return res.data;
  }

  async get(path: string) { return this.client.get(path); }
  async post(path: string, data?: any) { return this.client.post(path, data); }
  async patch(path: string, data?: any) { return this.client.patch(path, data); }
  async delete(path: string) { return this.client.delete(path); }
}
```

---

## 5. Page Objects

Page objects di-adapt dari `sinaloka-platform/e2e/pages/` dengan perubahan:

1. **Hapus semua mock-related code** — tidak ada `MockApi`, `page.route()`, atau mock data
2. **Tambah `waitForResponse`** — setelah setiap mutation (create/update/delete) untuk menunggu real API response
3. **Tambah error state locators** — server error toasts, validation error messages, inline errors
4. **Perbaiki locator strategy** — prioritaskan semantic locators (`getByRole`, `getByLabel`, `getByPlaceholder`)
5. **Tambah locators yang missing** — stats cards values, filter dropdowns, pagination controls, drawer content

### Key Differences dari Mock-Based Page Objects

| Aspect | Mock-Based | Integration |
|--------|-----------|-------------|
| Network | Instant (mocked) | Real latency |
| After mutation | Immediate UI update | `waitForResponse` + query refetch |
| Error handling | Override mock response | Real backend errors |
| Data assertions | Match mock JSON | Match seed data |
| Form submission | Always succeeds (unless overridden) | Real validation |

---

## 6. Spec Coverage Detail

### 6.1 auth.spec.ts (33 test cases)

**Smoke (3)**:
1. Login happy path → dashboard redirect
2. Unauthenticated access → login redirect with return URL
3. Logout → clears state and redirects

**Happy Path (6)**:
4. SUPER_ADMIN login → redirects to `/super/institutions`
5. Login preserves `?redirect=` parameter
6. Already authenticated → auto-redirect from login
7. Token refresh on 401 — transparent retry
8. Change password — success flow
9. Forced password change — full flow (must_change_password)

**Negative — Login (9)**:
10. Invalid credentials (wrong password)
11. Empty email — HTML validation blocks
12. Empty password — blocks
13. Both fields empty — blocks
14. Invalid email format
15. Inactive user account → error message
16. Inactive institution → error message
17. Uninvited user (no password hash) → error message
18. Network error → error display

**Negative — Change Password (7)**:
19. Wrong current password → server error
20. New password same as current → error
21. New password too short (< 8 chars) → validation indicator red
22. New password missing uppercase → indicator red
23. New password missing digit → indicator red
24. Confirm password mismatch → error text
25. All fields empty → submit disabled

**Edge Cases (8)**:
26. Open redirect prevention (`?redirect=//evil.com`)
27. Forgot password info toggle
28. Login button disabled while submitting
29. Refresh token expired → falls back to login
30. Password visibility toggle on login
31. Change password eye toggle for all 3 fields
32. Settings tab locking during forced password change
33. Multiple rapid login attempts

---

### 6.2 dashboard.spec.ts (17 test cases)

**Smoke (5)**:
1. Dashboard loads and shows stat cards with real values
2. Activity feed renders with real data
3. Upcoming sessions section renders
4. Charts section renders without errors
5. Quick links all navigate correctly (4 links)

**Data Verification (8)**:
6. Total Students count matches seed (5)
7. Active Tutors count matches seed (2)
8. Monthly Revenue reflects PAID payments
9. Attendance Rate calculation is correct
10. Activity feed contains all 3 activity types
11. Upcoming sessions show correct class/tutor info
12. Revenue vs Expenses chart has current month data
13. Overdue alert chip visibility

**Edge Cases (4)**:
14. Tenant isolation — inst2 data does not leak into inst1
15. Command palette opens, filters, and navigates
16. Command palette "No results" for non-matching search
17. Charts handle months with zero data gracefully

---

### 6.3 students.spec.ts (23 test cases)

**Smoke (3)**:
1. Table loads and displays students from API
2. Stats cards show correct counts
3. Pagination controls render

**Search & Filter (5)**:
4. Search by name
5. Search by email
6. Filter by status ACTIVE/INACTIVE
7. Filter by grade
8. Combined search + filter

**Create — Happy (2)**:
9. Create with required fields only
10. Create with all fields

**Create — Negative per field (6)**:
11. Empty name → validation error "Nama lengkap wajib diisi"
12. Empty grade → "Kelas wajib dipilih"
13. Empty parent name → "Nama orang tua wajib diisi"
14. Empty parent phone → "Telepon orang tua wajib diisi"
15. Invalid student email → "Format email tidak valid"
16. Invalid parent email → "Format email tidak valid"

**Update (4)**:
17. Edit student name
18. Edit with all fields changed
19. Clear required name → validation error
20. Edit with invalid email → validation error

**Delete (3)**:
21. Delete with confirmation ("delete" text)
22. Cancel delete → student stays
23. Confirmation requires exact text "delete"

---

### 6.4 tutors.spec.ts (27 test cases)

**Smoke (3)**:
1. List page loads with tutor cards
2. Status badges reflect real data (Verified/Unverified/Pending)
3. Search debounces and queries backend

**Create/Invite (5)**:
4. Invite tutor with required fields (name + email + subjects)
5. Invite validates required email
6. Invite requires at least one subject
7. Duplicate email → 409 error toast
8. Plan limit prevents invite

**Update (5)**:
9. Edit tutor name
10. Edit bank details
11. Toggle verified status
12. Edit tutor subjects
13. Edit with no changes

**Subjects & Sort (2)**:
14. Filter by subject
15. Sort by different criteria

**Invite Lifecycle (4)**:
16. Pending tutor shows invite menu (Resend/Cancel)
17. Resend invite
18. Cancel invite with confirm dialog
19. Active tutor shows edit/delete menu

**Delete (3)**:
20. Delete via confirm dialog
21. Cancel delete dialog
22. Bulk delete

**Bulk Actions (3)**:
23. Bulk verify
24. Bulk resend invite
25. Select all / deselect all

**View Modes (2)**:
26. Toggle grid/list view
27. Pagination navigates pages

---

### 6.5 classes.spec.ts (34 test cases)

**Smoke (3)**:
1. Page loads and displays classes table
2. Search filters by class name
3. Search filters by tutor name

**Create — Happy (3)**:
4. Create with minimum required fields
5. Create with all optional fields
6. Create with multiple schedule days

**Create — Negative per field (11)**:
7. Empty name → validation error
8. No subject selected
9. No tutor selected (disabled until subject chosen)
10. No schedule days selected
11. Capacity = 0
12. Capacity negative
13. Fee negative
14. FIXED_PER_SESSION mode with empty tutor_fee
15. PER_STUDENT_ATTENDANCE mode with empty per_student_fee
16. Backend: tutor does not teach subject → 400
17. Backend: unverified tutor → 400

**Schedule Management (6)**:
18. Toggle day on/off
19. Default times on day toggle (14:00-15:30)
20. Edit schedule times
21. Remove schedule day via trash icon
22. Schedule conflict with tutor's other class → toast
23. start_time >= end_time → validation error

**Update (6)**:
24. Update class name
25. Update capacity
26. Change subject and tutor
27. Update schedules (add new day)
28. Change status to ARCHIVED
29. Backend: update with invalid tutor → 404

**Archive/Delete (5)**:
30. Delete class with no enrollments
31. Delete confirmation requires typing "delete"
32. Delete button disabled with partial text
33. Cancel delete
34. Delete class with active enrollments fails (FK constraint)

---

### 6.6 schedules.spec.ts (27 test cases)

**Smoke (3)**:
1. Page loads with session data in calendar view
2. Switch to list view shows table with real data
3. Switch between calendar sub-modes (month/week/day)

**View/Filter (6)**:
4. Filter by date range
5. Filter by class
6. Filter by status (SCHEDULED)
7. Filter by status (COMPLETED)
8. Combined filters
9. Empty state when no results

**Create Session (4)**:
10. Create session successfully
11. Create form validation — no class (button disabled)
12. Create with API error (archived class)
13. Auto-generate sessions from class schedules

**Edit/Reschedule (5)**:
14. Edit session date/time
15. Edit session status to CANCELLED
16. Approve reschedule request
17. Reject reschedule request
18. Cannot edit completed session (locked)

**Cancel (3)**:
19. Cancel session from list view dropdown
20. Cancel session from drawer
21. Cannot cancel already cancelled session

**Complete (2)**:
22. Admin marks session as COMPLETED
23. Locked state for past sessions

**Session Detail Drawer (4)**:
24. Drawer shows session details
25. Drawer shows attendance list
26. Drawer shows reschedule info for RESCHEDULE_REQUESTED
27. Drawer shows topic/summary for COMPLETED

---

### 6.7 attendance.spec.ts (31 test cases)

**Smoke (4)**:
1. Page loads and shows session list
2. Selecting session loads attendance table
3. Present/total counter displays correctly
4. Monthly summary stats display

**Mark Attendance — Happy (6)**:
5. Mark student Present
6. Mark student Absent
7. Mark student Late
8. Change status from one to another
9. Mark All Present
10. Save multiple changes at once

**Mark Attendance — Negative (5)**:
11. Cannot edit completed session (controls disabled)
12. Cannot edit past-date session
13. Backend rejects edit on completed session (400)
14. Save failure shows error toast
15. Invalid attendance ID → 404

**Homework Tracking (3)**:
16. Toggle homework on
17. Toggle homework off
18. Homework state independent of status

**Notes (4)**:
19. Add a note and save
20. Edit existing note
21. Clear a note
22. Note max length 500 chars → backend rejects

**Edge Cases (9)**:
23. Date navigation (prev/next/today)
24. No sessions for a date → empty state
25. Switching sessions clears unsaved changes
26. Discard button clears pending changes
27. Sticky save bar visibility
28. Student without attendance record (pending state)
29. Keyboard shortcuts (P/A/L)
30. Concurrent save of many records
31. Per-session payment generation side effect

---

### 6.8 enrollments.spec.ts (16 test cases)

**Smoke (2)**:
1. Page loads and shows enrollment table
2. Search filters enrollments

**Create — Happy (3)**:
3. Enroll single student into a class
4. Enroll student as TRIAL
5. Enroll multiple students at once

**Create — Negative (3)**:
6. Duplicate enrollment → 409 error
7. Schedule conflict → warning toast
8. Enroll button disabled without selections

**Status Change (3)**:
9. Change status via edit modal
10. Quick status change via dropdown (Set Active)
11. Convert TRIAL to ACTIVE

**Delete (2)**:
12. Delete single enrollment
13. Delete and verify removal

**Bulk Operations (2)**:
14. Bulk status change
15. Bulk delete

**Filter (1)**:
16. Filter by status

---

### 6.9 payments.spec.ts (35 test cases)

**Smoke (5)**:
1. Table loads with payments
2. Overdue summary cards display
3. Pagination renders
4. Loading skeleton appears
5. Empty state when no payments match filter

**Status Filter (5)**:
6. Filter by PENDING
7. Filter by PAID
8. Filter by OVERDUE
9. Filter by All
10. Filter resets page to 1

**Record Payment — Happy (7)**:
11. Record as CASH
12. Record as TRANSFER
13. Record as OTHER (E-Wallet)
14. Record OVERDUE payment
15. Record with discount
16. Payment date sent correctly
17. "Record Payment" button disappears after recording

**Record Payment — Negative (3)**:
18. Server error → error toast
19. Button not visible on PAID rows
20. Close modal → no API call

**Batch Record (4)**:
21. Select 2+ → "Record Batch" appears
22. Batch record success with count
23. Deselect → button disappears
24. Select all via header checkbox

**Overdue Auto-detection (3)**:
25. PENDING with past due_date → OVERDUE
26. Summary count updates after recording
27. Enrollment payment_status syncs

**Invoice (3)**:
28. Generate invoice → success, download appears
29. Duplicate invoice → 409 error
30. Download invoice opens file

**Reminder (2)**:
31. Send reminder on PENDING
32. Send reminder on OVERDUE

**Delete (3)**:
33. Delete with confirm
34. Cancel delete
35. Delete nonexistent → error

---

### 6.10 payouts.spec.ts (25 test cases)

**Smoke (2)**:
1. Page loads and table renders
2. Empty state when no payouts

**Create — Happy (4)**:
3. Create basic payout
4. Create with description
5. Create with period + calculate
6. Overlap warning displayed

**Create — Negative (4)**:
7. Without selecting tutor → error toast
8. Amount = 0 → error
9. Amount negative → backend 400
10. Description > 500 chars → backend 400

**Reconciliation (3)**:
11. Reconcile PENDING to PAID
12. Reconcile with bonus and deduction
13. PAID payout disables inputs

**Proof Upload (2)**:
14. Upload proof successfully
15. Proof persists after navigating away

**Slip Generation (2)**:
16. Generate slip for PAID payout
17. Duplicate slip → 409

**Delete (2)**:
18. Delete successfully
19. Delete non-existent → 404

**Filter & Search (3)**:
20. Filter by status
21. Search by tutor name
22. Pagination

**Generate Salaries (2)**:
23. Generate monthly salaries
24. Idempotent (second call creates 0)

**Export (1)**:
25. Export audit CSV

---

### 6.11 expenses.spec.ts (26 test cases)

**Smoke (3)**:
1. Page loads and shows table
2. Summary cards display
3. Category badges render

**Create — Happy (5)**:
4. Create basic expense
5. Create with minimum fields
6. Create recurring (monthly)
7. Create recurring (weekly)
8. Create with each category

**Create — Negative per field (5)**:
9. Amount = 0 → toast error
10. Amount empty → toast error
11. Amount negative → backend 400
12. Date empty → toast error
13. Description > 500 chars → backend 400

**Update (6)**:
14. Edit amount
15. Edit category
16. Edit description
17. Drawer pre-fills values
18. Toggle recurring on existing non-recurring
19. Toggle recurring off

**Delete (2)**:
20. Delete with confirm
21. Delete with cancel

**Search & Filter (4)**:
22. Search by description
23. Search no results → empty state
24. Filter by category
25. Clear filter

**Export (1)**:
26. Export CSV

---

### 6.12 finance-overview.spec.ts (26 test cases)

**Smoke (5)**:
1. Page loads with all sections visible
2. Default period is This Month
3. Revenue and expense charts render
4. Revenue breakdown sections render
5. Expense by category renders

**Data Accuracy (8)**:
6. Net profit = revenue - payouts - expenses
7. Net profit positive → green theme
8. Net profit negative → red theme
9. Transaction counts match
10. Revenue breakdown by class
11. Revenue breakdown by payment method
12. Revenue breakdown by status
13. Overdue summary values

**Filters (5)**:
14. Switch to This Quarter
15. Switch to Year to Date
16. Custom date range
17. Period switch updates all sections
18. Custom range with no data → zero values

**Export & Reports (8)**:
19. Export payments CSV
20. Export payouts CSV
21. Export expenses CSV
22. Generate finance PDF report
23. Generate attendance PDF report
24. Generate student progress report
25. Download generated PDF
26. Report modal — no dates validation

---

### 6.13 settings.spec.ts (26 test cases)

**Smoke (2)**:
1. Page loads with data from API
2. All 6 tabs switch correctly

**General Settings (6)**:
3. Edit institution name and save (ConfirmChangesModal)
4. Edit multiple fields
5. Change timezone and language
6. No changes → info toast
7. Cancel ConfirmChangesModal
8. API failure → error toast

**Billing Settings (4)**:
9. Add expense category
10. Remove expense category
11. Add bank account
12. Save with ConfirmChangesModal (array diff)

**Academic Settings (6)**:
13. Rooms table displays existing rooms
14. Add room via modal
15. Edit room
16. Delete room with ConfirmDialog
17. Toggle working days and save
18. Add and remove grade level

**Registration Settings (3)**:
19. Toggle student registration on/off
20. Toggle tutor registration
21. Copy registration link

**Security / Change Password (3)**:
22. Change password successfully
23. Password validation indicators
24. Wrong current password → server error

**Confirm Changes Modal (2)**:
25. Modal shows scalar diff correctly
26. Modal shows array diff correctly

---

## 7. Test Ordering & Data Strategy

### Spec Execution Order

Auth spec runs first because it tests the login flow itself. Subsequent specs login normally (post-seed SQL disables `must_change_password`).

**Ordering enforcement**: Use a numbering prefix in filenames (e.g., `01-auth.spec.ts`, `02-dashboard.spec.ts`) or configure `testMatch` in Playwright config to guarantee execution order.

```
1. auth.spec.ts         ← Tests login, change password, must_change_password flow
2. dashboard.spec.ts    ← Read-only, safe
3. students.spec.ts
4. tutors.spec.ts
5. classes.spec.ts
6. schedules.spec.ts
7. attendance.spec.ts
8. enrollments.spec.ts
9. payments.spec.ts
10. payouts.spec.ts
11. expenses.spec.ts
12. finance-overview.spec.ts  ← Read-only aggregation
13. settings.spec.ts
```

### Within Each Spec: Test Ordering Discipline

```
Smoke (read-only) → Search/Filter → Create (happy) → Create (negative) → Update → Delete
```

Read-only tests first, write operations last. Create before update/delete to ensure data exists.

### Seed Data — Full Database (both institutions)

| Entity         | Total | Inst1 "Bimbel Cerdas"                                  | Inst2 "Tutor Prima"                               |
| -------------- | ----- | ------------------------------------------------------ | ------------------------------------------------- |
| Students       | 10    | 5 (Rina, Dimas, Putri, Fajar, Lina)                    | 5 (Arief, Maya, Rizky, Nadia, Yusuf)              |
| Tutors         | 4     | 2 (Budi: Math+Physics, Siti: English+Indo)             | 2 (Andi: Math+Physics, Dewi: English+Indo)        |
| Subjects       | 8     | 4 (Matematika, Fisika, B.Inggris, B.Indonesia)         | 4 (same names, different IDs)                     |
| Classes        | 4     | 2 ("Matematika SMP" FIXED, "English SMP" PER_STUDENT)  | 2 ("Fisika SMA" FIXED, "B.Indonesia SMA" MONTHLY) |
| ClassSchedules | 8     | 4 (2 per class: Mon+Wed, Tue+Thu)                      | 4 (Mon+Fri, Wed+Sat)                              |
| Enrollments    | 8     | 4 (2 per class, ACTIVE+PAID / ACTIVE+PENDING)          | 4 (ACTIVE+PAID / TRIAL+PENDING)                   |
| Sessions       | 8     | 4 (2 SCHEDULED today, 2 COMPLETED -7d)                 | 4 (same pattern)                                  |
| Attendance     | 8     | 4 (completed sessions, 1 PRESENT + 1 LATE per session) | 4 (same pattern)                                  |
| Payments       | 4     | 4 (PAID/TRANSFER 500k, PENDING/CASH 500k, PAID/TRANSFER 600k, PENDING/CASH 600k) | 0 |
| Expenses       | 3     | 2 (SUPPLIES 150k, RENT 2M)                             | 1 (UTILITIES 750k)                                |
| Payouts        | 2     | 1 (Budi 1.5M PAID)                                     | 1 (Andi 1.8M PENDING)                             |
| Parents        | 2     | 1 (linked to Rina+Dimas)                               | 1 (linked to Arief+Maya)                          |

**Important**: Tests login as `admin@cerdas.id` and only see inst1 data due to tenant scoping. But the full seed is in the database — useful for tenant isolation tests (e.g., dashboard test case "inst2 data does not leak").

---

## 8. Tests Requiring Data Setup Beyond Seed

Some test cases assume data states that the seed does not provide. These tests must create the required state via API calls (using `ApiClient`) or direct DB queries in their `beforeAll`:

| Test Case | Missing State | Setup Strategy |
|-----------|--------------|----------------|
| Auth #15: Inactive user | No inactive users in seed | `beforeAll`: UPDATE user via DB to `is_active: false`, test login, then `resetDatabase()` covers cleanup |
| Auth #16: Inactive institution | No inactive institutions | `beforeAll`: UPDATE institution via DB, test, cleanup via reset |
| Auth #17: Uninvited user | No users without password_hash | `beforeAll`: INSERT user via DB without password_hash |
| Auth #9: must_change_password flow | Disabled by post-seed SQL | `beforeAll`: UPDATE user SET `must_change_password = true` |
| Tutors #3: Unverified/Pending badges | All tutors are verified | `beforeAll`: create unverified tutor via API invite flow |
| Tutors #8: Plan limit | No plan limits configured | Skip for v1 or create subscription with limit via DB |
| Payments #25: Overdue auto-detection | Seed payments have `due_date: today` | `beforeAll`: create payment with past `due_date` via API |

These `beforeAll` setups are within the spec file itself, after `resetDatabase()`. They do NOT modify seed.ts.

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate folder (`e2e-integration/`) | Fully independent from mock-based tests, different config/deps |
| Docker PostgreSQL (tmpfs) | Fast, ephemeral, no data persistence needed |
| `prisma migrate reset` per suite | Clean state guarantee, ~2-3s per reset |
| Playwright `webServer` for both servers | Single command runs everything, auto-cleanup |
| Port 5555 (backend) + 5435 (DB) | No conflict with dev ports (5000, 5434) |
| Sequential (1 worker) | Simpler, no DB concurrency issues |
| Real login (not localStorage inject) | Tests actual auth flow including token management |
| Post-seed SQL overlay | Disables `must_change_password` so every spec can login cleanly without handling password change flow |
| `nest start` (no --watch) | Avoids HMR-triggered rebuilds causing flaky tests |
| `vite preview` (not dev) | Serves built assets like production, no HMR websocket noise |
| `dotenv-cli` for env loading | Properly handles env vars vs fragile `env $(cat | xargs)` |
| `globalSetup/globalTeardown` | Docker lifecycle runs even with `npx playwright test` directly |

---

## 10. Total Test Count

| Spec | Tests |
|------|-------|
| auth | 33 |
| dashboard | 17 |
| students | 23 |
| tutors | 27 |
| classes | 34 |
| schedules | 27 |
| attendance | 31 |
| enrollments | 16 |
| payments | 35 |
| payouts | 25 |
| expenses | 26 |
| finance-overview | 26 |
| settings | 26 |
| **Total** | **346** |

---

## 11. CI Integration (Future)

Not in scope for v1 but designed to support:

```yaml
# .github/workflows/ci-e2e-integration.yml
jobs:
  integration-e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: ...
    steps:
      - uses: actions/checkout@v4
      - run: cd sinaloka-backend && npm ci && npx prisma migrate deploy && npx prisma db seed
      - run: cd sinaloka-platform && npm ci
      - run: cd e2e-integration && npm ci && npx playwright install chromium
      - run: cd e2e-integration && npx playwright test
```
