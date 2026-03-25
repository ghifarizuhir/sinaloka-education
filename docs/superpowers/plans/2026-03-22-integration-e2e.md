# Integration E2E Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack browser-based E2E test suite using Playwright with real PostgreSQL database and real NestJS backend, covering all 13 platform pages with 346 test cases.

**Architecture:** Docker PostgreSQL container (port 5435) + Playwright webServer for backend (port 5555) and frontend (port 3000, vite preview). Database reset per spec file via `prisma migrate reset`. Sequential execution (1 worker). Post-seed SQL overlay disables `must_change_password` for admin accounts.

**Tech Stack:** Playwright ^1.58.2, Docker Compose, PostgreSQL 16, dotenv-cli, Axios, tsx

**Spec:** `docs/superpowers/specs/2026-03-22-integration-e2e-design.md`

---

## File Structure

```
e2e-integration/
├── docker-compose.yml                  # PostgreSQL 16 container (tmpfs, port 5435)
├── playwright.config.ts                # webServer: backend + frontend, globalSetup/Teardown
├── .env.test                           # Test environment variables
├── package.json                        # Dependencies + scripts
├── tsconfig.json                       # TypeScript config
├── scripts/
│   ├── global-setup.ts                 # Docker up + migrate + seed + post-seed
│   ├── global-teardown.ts              # Docker down -v
│   ├── post-seed.sql                   # Disable must_change_password for admins
│   ├── setup.sh                        # Manual setup (docker + migrate + seed)
│   ├── reset-db.sh                     # Per-suite reset (migrate reset + post-seed)
│   └── teardown.sh                     # Manual teardown
├── fixtures/
│   └── auth.fixture.ts                 # Real login fixture (authedPage + loginAs)
├── helpers/
│   ├── db-reset.ts                     # Node wrapper for reset-db.sh
│   ├── test-accounts.ts                # Seed credentials constants
│   ├── api-client.ts                   # Axios wrapper for API setup/teardown
│   ├── confirm-dialog.ts              # Copy from existing (no changes)
│   └── confirm-changes-modal.ts       # Copy from existing (no changes)
├── pages/
│   ├── login.page.ts                   # Adapted: add change-password locators
│   ├── dashboard.page.ts              # Adapted: add stat value locators
│   ├── students.page.ts              # Adapted: add filters, validation errors
│   ├── tutors.page.ts                # Adapted: add bulk actions, invite lifecycle
│   ├── classes.page.ts               # Adapted: add fee mode, validation errors
│   ├── schedules.page.ts             # Adapted: add filters, drawer, sub-modes
│   ├── attendance.page.ts            # Adapted: add date nav, summary, discard
│   ├── enrollments.page.ts           # Adapted: add multi-select, bulk actions
│   ├── payments.page.ts              # Adapted: add summary cards, batch, invoice
│   ├── payouts.page.ts               # Adapted: add reconciliation, proof, slip
│   ├── expenses.page.ts              # Adapted: add recurring, receipt, filters
│   ├── finance-overview.page.ts      # Adapted: add stat values, breakdowns
│   └── settings.page.ts              # Adapted: add billing/academic/registration tabs
└── specs/
    ├── 01-auth.spec.ts                # 33 tests
    ├── 02-dashboard.spec.ts           # 17 tests
    ├── 03-students.spec.ts            # 23 tests
    ├── 04-tutors.spec.ts              # 27 tests
    ├── 05-classes.spec.ts             # 34 tests
    ├── 06-schedules.spec.ts           # 27 tests
    ├── 07-attendance.spec.ts          # 31 tests
    ├── 08-enrollments.spec.ts         # 16 tests
    ├── 09-payments.spec.ts            # 35 tests
    ├── 10-payouts.spec.ts             # 25 tests
    ├── 11-expenses.spec.ts            # 26 tests
    ├── 12-finance-overview.spec.ts    # 26 tests
    └── 13-settings.spec.ts            # 26 tests
```

---

## Phase 1: Infrastructure (Tasks 1-5)

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `e2e-integration/package.json`
- Create: `e2e-integration/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "e2e-integration",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "npx playwright test",
    "test:headed": "npx playwright test --headed",
    "test:ui": "npx playwright test --ui",
    "test:debug": "npx playwright test --debug",
    "setup": "bash scripts/setup.sh",
    "teardown": "bash scripts/teardown.sh",
    "reset-db": "bash scripts/reset-db.sh"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "typescript": "~5.8.2",
    "tsx": "^4.21.0",
    "@types/node": "^22.14.0",
    "dotenv-cli": "^8.0.0"
  },
  "dependencies": {
    "axios": "^1.13.6",
    "pg": "^8.16.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd e2e-integration && npm install`
Then: `npx playwright install chromium`

- [ ] **Step 4: Commit**

```bash
git add e2e-integration/package.json e2e-integration/tsconfig.json e2e-integration/package-lock.json
git commit -m "chore(e2e): initialize integration test project with dependencies"
```

---

### Task 2: Docker Compose and environment config

**Files:**
- Create: `e2e-integration/docker-compose.yml`
- Create: `e2e-integration/.env.test`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
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
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 5s
      retries: 10
```

- [ ] **Step 2: Create .env.test**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/sinaloka_test
JWT_SECRET=test-jwt-secret-e2e-integration
JWT_REFRESH_SECRET=test-jwt-refresh-secret-e2e-integration
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
FONNTE_TOKEN=
FONNTE_DEVICE_NUMBER=
```

- [ ] **Step 3: Verify Docker container starts**

Run: `cd e2e-integration && docker compose up -d --wait && docker compose ps`
Expected: Container running, healthy.
Then: `docker compose down -v`

- [ ] **Step 4: Commit**

```bash
git add e2e-integration/docker-compose.yml e2e-integration/.env.test
git commit -m "chore(e2e): add Docker Compose and test environment config"
```

---

### Task 3: Shell scripts and post-seed SQL

**Files:**
- Create: `e2e-integration/scripts/post-seed.sql`
- Create: `e2e-integration/scripts/setup.sh`
- Create: `e2e-integration/scripts/reset-db.sh`
- Create: `e2e-integration/scripts/teardown.sh`

- [ ] **Step 1: Create post-seed.sql**

```sql
-- Disable must_change_password for admin accounts so tests can login directly
UPDATE users SET must_change_password = false WHERE email IN ('admin@cerdas.id', 'admin@prima.id');
```

- [ ] **Step 2: Create setup.sh**

```bash
#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="postgresql://postgres:postgres@localhost:5435/sinaloka_test"

echo "Starting PostgreSQL container..."
docker compose up -d --wait

echo "Generating Prisma client..."
cd ../sinaloka-backend
DATABASE_URL=$DB_URL npx prisma generate

echo "Running migrations..."
DATABASE_URL=$DB_URL npx prisma migrate deploy

echo "Seeding database..."
DATABASE_URL=$DB_URL npx prisma db seed

echo "Applying post-seed overlay..."
cd ../e2e-integration
npx tsx -e "
import pg from 'pg';
import { readFileSync } from 'fs';
const c = new pg.Client({ connectionString: '$DB_URL' });
await c.connect();
await c.query(readFileSync('scripts/post-seed.sql', 'utf-8'));
await c.end();
"

echo "Setup complete."
```

- [ ] **Step 3: Create reset-db.sh**

```bash
#!/bin/bash
set -euo pipefail
DB_URL="postgresql://postgres:postgres@localhost:5435/sinaloka_test"

cd "$(dirname "$0")/../../sinaloka-backend"
DATABASE_URL=$DB_URL npx prisma migrate reset --force --skip-generate 2>/dev/null

cd ../e2e-integration
npx tsx -e "
import pg from 'pg';
import { readFileSync } from 'fs';
const c = new pg.Client({ connectionString: '$DB_URL' });
await c.connect();
await c.query(readFileSync('scripts/post-seed.sql', 'utf-8'));
await c.end();
" 2>/dev/null
```

- [ ] **Step 4: Create teardown.sh**

```bash
#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose down -v
echo "Teardown complete."
```

- [ ] **Step 5: Make scripts executable**

Run: `chmod +x e2e-integration/scripts/*.sh`

- [ ] **Step 6: Test setup → teardown cycle**

Run: `cd e2e-integration && bash scripts/setup.sh && bash scripts/reset-db.sh && bash scripts/teardown.sh`
Expected: All steps complete without errors.

- [ ] **Step 7: Commit**

```bash
git add e2e-integration/scripts/
git commit -m "chore(e2e): add setup, reset, teardown scripts and post-seed SQL"
```

---

### Task 4: Global setup/teardown and Playwright config

**Files:**
- Create: `e2e-integration/scripts/global-setup.ts`
- Create: `e2e-integration/scripts/global-teardown.ts`
- Create: `e2e-integration/playwright.config.ts`

- [ ] **Step 1: Create global-setup.ts**

```typescript
import { execSync } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';

const ROOT = resolve(import.meta.dirname, '..');
const BACKEND = resolve(ROOT, '../sinaloka-backend');
const DB_URL = 'postgresql://postgres:postgres@localhost:5435/sinaloka_test';

async function waitForPostgres(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new pg.Client({ connectionString: DB_URL });
      await client.connect();
      await client.end();
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('PostgreSQL not ready after 30s');
}

export default async function globalSetup() {
  console.log('[global-setup] Starting Docker container...');
  execSync('docker compose up -d', { cwd: ROOT, stdio: 'inherit' });

  console.log('[global-setup] Waiting for PostgreSQL...');
  await waitForPostgres();

  console.log('[global-setup] Generating Prisma client...');
  execSync(`DATABASE_URL=${DB_URL} npx prisma generate`, { cwd: BACKEND, stdio: 'inherit' });

  console.log('[global-setup] Running migrations...');
  execSync(`DATABASE_URL=${DB_URL} npx prisma migrate deploy`, { cwd: BACKEND, stdio: 'inherit' });

  console.log('[global-setup] Seeding database...');
  execSync(`DATABASE_URL=${DB_URL} npx prisma db seed`, { cwd: BACKEND, stdio: 'inherit' });

  console.log('[global-setup] Applying post-seed overlay...');
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  const sql = readFileSync(resolve(ROOT, 'scripts/post-seed.sql'), 'utf-8');
  await client.query(sql);
  await client.end();

  console.log('[global-setup] Done.');
}
```

- [ ] **Step 2: Create global-teardown.ts**

```typescript
import { execSync } from 'child_process';
import { resolve } from 'path';

export default async function globalTeardown() {
  const ROOT = resolve(import.meta.dirname, '..');
  console.log('[global-teardown] Stopping Docker container...');
  execSync('docker compose down -v', { cwd: ROOT, stdio: 'inherit' });
  console.log('[global-teardown] Done.');
}
```

- [ ] **Step 3: Create playwright.config.ts**

```typescript
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
      timeout: 60_000,  // globalSetup already runs prisma generate
    },
    {
      command: 'cd ../sinaloka-platform && VITE_API_URL=http://localhost:5555/api npm run build && VITE_API_URL=http://localhost:5555/api npx vite preview --port 3000',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
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

- [ ] **Step 4: Commit**

```bash
git add e2e-integration/scripts/global-setup.ts e2e-integration/scripts/global-teardown.ts e2e-integration/playwright.config.ts
git commit -m "chore(e2e): add Playwright config with globalSetup and webServer"
```

---

### Task 5: Helpers and fixtures

**Files:**
- Create: `e2e-integration/helpers/test-accounts.ts`
- Create: `e2e-integration/helpers/db-reset.ts`
- Create: `e2e-integration/helpers/api-client.ts`
- Create: `e2e-integration/fixtures/auth.fixture.ts`
- Copy: `e2e-integration/helpers/confirm-dialog.ts` (from `sinaloka-platform/e2e/helpers/confirm-dialog.ts`)
- Copy: `e2e-integration/helpers/confirm-changes-modal.ts` (from `sinaloka-platform/e2e/helpers/confirm-changes-modal.ts`)

- [ ] **Step 1: Create test-accounts.ts**

```typescript
export const ACCOUNTS = {
  SUPER_ADMIN: { email: 'super@sinaloka.com', password: 'password' },
  ADMIN_CERDAS: { email: 'admin@cerdas.id', password: 'password' },
  ADMIN_PRIMA: { email: 'admin@prima.id', password: 'password' },
  TUTOR1_CERDAS: { email: 'tutor1@cerdas.id', password: 'password' },
  TUTOR2_CERDAS: { email: 'tutor2@cerdas.id', password: 'password' },
  PARENT_CERDAS: { email: 'parent@cerdas.id', password: 'password' },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;
```

- [ ] **Step 2: Create db-reset.ts**

Uses `pg` package (already an Axios-level dep) instead of `psql` CLI to avoid host dependency.

```typescript
import { execSync } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';

const DB_URL = 'postgresql://postgres:postgres@localhost:5435/sinaloka_test';
const BACKEND_DIR = resolve(import.meta.dirname, '../../sinaloka-backend');
const POST_SEED_SQL = resolve(import.meta.dirname, '../scripts/post-seed.sql');

export async function resetDatabase(): Promise<void> {
  execSync(`DATABASE_URL=${DB_URL} npx prisma migrate reset --force --skip-generate`, {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
  });

  // Apply post-seed overlay via pg (no psql CLI dependency)
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  const sql = readFileSync(POST_SEED_SQL, 'utf-8');
  await client.query(sql);
  await client.end();
}
```

- [ ] **Step 3: Create api-client.ts**

```typescript
import axios, { type AxiosInstance } from 'axios';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL = 'http://localhost:5555/api') {
    this.client = axios.create({ baseURL });
  }

  async loginAs(account: { email: string; password: string }): Promise<void> {
    const res = await this.client.post('/auth/login', {
      email: account.email,
      password: account.password,
    });
    this.client.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
  }

  async get<T = any>(path: string) {
    return this.client.get<T>(path);
  }

  async post<T = any>(path: string, data?: any) {
    return this.client.post<T>(path, data);
  }

  async patch<T = any>(path: string, data?: any) {
    return this.client.patch<T>(path, data);
  }

  async delete<T = any>(path: string) {
    return this.client.delete<T>(path);
  }
}
```

- [ ] **Step 4: Create auth.fixture.ts**

```typescript
import { test as base, type Page } from '@playwright/test';
import { ACCOUNTS, type AccountKey } from '../helpers/test-accounts.js';

type AuthFixtures = {
  authedPage: Page;
  loginAs: (role: AccountKey) => Promise<Page>;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await performLogin(page, ACCOUNTS.ADMIN_CERDAS);
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    const fn = async (role: AccountKey): Promise<Page> => {
      await performLogin(page, ACCOUNTS[role]);
      return page;
    };
    await use(fn);
  },
});

async function performLogin(page: Page, account: { email: string; password: string }): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/auth/login') && resp.status() === 200),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  // Wait for redirect (ADMIN -> /, SUPER_ADMIN -> /super/institutions)
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
}

export { expect } from '@playwright/test';
```

- [ ] **Step 5: Copy confirm-dialog.ts and confirm-changes-modal.ts**

Copy from `sinaloka-platform/e2e/helpers/` to `e2e-integration/helpers/`. These are pure UI helpers with zero mock dependencies.

- [ ] **Step 6: Write a smoke test to verify the full pipeline**

Create `e2e-integration/specs/00-smoke.spec.ts`:

```typescript
import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';

test.describe('Infrastructure Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test('login and see dashboard', async ({ authedPage }) => {
    await expect(authedPage).toHaveURL('/');
    await expect(authedPage.getByText('Total Students')).toBeVisible();
  });
});
```

- [ ] **Step 7: Run the smoke test**

Run: `cd e2e-integration && npx playwright test specs/00-smoke.spec.ts`
Expected: PASS — Docker starts, backend starts, frontend builds, login works, dashboard loads.

- [ ] **Step 8: Commit**

```bash
git add e2e-integration/helpers/ e2e-integration/fixtures/ e2e-integration/specs/00-smoke.spec.ts
git commit -m "feat(e2e): add auth fixture, helpers, and smoke test"
```

---

## Phase 2: Page Objects (Tasks 6-8)

### Task 6: Core page objects (login, dashboard, students, tutors)

**Files:**
- Create: `e2e-integration/pages/login.page.ts`
- Create: `e2e-integration/pages/dashboard.page.ts`
- Create: `e2e-integration/pages/students.page.ts`
- Create: `e2e-integration/pages/tutors.page.ts`

For each page object:
1. Copy the existing page object from `sinaloka-platform/e2e/pages/`
2. Remove any imports from mock fixtures
3. Import `Page` and `Locator` from `@playwright/test`
4. Add `waitForResponse` wrappers to mutation methods
5. Add missing locators per the spec coverage

- [ ] **Step 1: Create login.page.ts** — copy from existing, add change-password locators (currentPasswordInput, newPasswordInput, confirmPasswordInput, passwordValidationIndicators, forgotPasswordToggle). Add `changePassword(current, newPw, confirm)` method with `waitForResponse('/auth/change-password')`. Add `togglePasswordVisibility()` method.

- [ ] **Step 2: Create dashboard.page.ts** — copy from existing, add stat card VALUE locators (find numeric sibling of label text). Add `getStatCardValue(label)` method. Add `activityFeedItems`, `upcomingSessionItems`, `commandPaletteResults` locators. Add `waitForDashboardData()` method that waits for `/api/admin/dashboard/stats` response.

- [ ] **Step 3: Create students.page.ts** — copy from existing, add: `statusFilter`, `gradeFilter`, `pagination`, `statsCards` locators. Add `getValidationError(fieldId)` method. Wrap `createStudent()`, `editStudent()`, `deleteStudent()` with `waitForResponse` on POST/PATCH/DELETE `/api/admin/students`. Add `filterByStatus(status)`, `filterByGrade(grade)` methods.

- [ ] **Step 4: Create tutors.page.ts** — copy from existing, add: `gridViewButton`, `listViewButton`, `subjectFilter`, `selectAllCheckbox`, `bulkActionBar`, `pagination` locators. Add `resendInvite(name)`, `cancelInvite(name)`, `toggleView(mode)`, `filterBySubject(subject)`, `selectTutor(name)`, `bulkVerify()`, `bulkDelete()` methods. Wrap mutations with `waitForResponse`.

- [ ] **Step 5: Commit**

```bash
git add e2e-integration/pages/login.page.ts e2e-integration/pages/dashboard.page.ts e2e-integration/pages/students.page.ts e2e-integration/pages/tutors.page.ts
git commit -m "feat(e2e): add core page objects (login, dashboard, students, tutors)"
```

---

### Task 7: CRUD page objects (classes, schedules, attendance, enrollments)

**Files:**
- Create: `e2e-integration/pages/classes.page.ts`
- Create: `e2e-integration/pages/schedules.page.ts`
- Create: `e2e-integration/pages/attendance.page.ts`
- Create: `e2e-integration/pages/enrollments.page.ts`

- [ ] **Step 1: Create classes.page.ts** — copy from existing, extend `fillForm()` with `tutorFeeMode`, `tutorFee`, `perStudentFee`, `status`, `room` params. Add `removeScheduleDay(dayAbbr)`, `getValidationError(fieldId)` methods. Add `waitForResponse` to `createClass()`, `editClass()`, `deleteClass()`.

- [ ] **Step 2: Create schedules.page.ts** — copy from existing, add: `monthViewButton`, `weekViewButton`, `dayViewButton`, `classFilter`, `statusFilter`, `dateRangeFrom`, `dateRangeTo`, `emptyState`, `sessionDrawer` locators. Add `editSession()`, `cancelSession()`, `openSessionDrawer()`, `approveReschedule()`, `rejectReschedule()`, `filterByClass()`, `filterByStatus()`, `filterByDateRange()` methods. Add `waitForResponse`.

- [ ] **Step 3: Create attendance.page.ts** — copy from existing, add: `presentCounter`, `monthlySummary`, `prevDateButton`, `nextDateButton`, `todayButton`, `emptyState`, `discardButton`, `stickyBar` locators. Wrap `save()` with `waitForResponse` (may need to wait for multiple PATCH calls). Add `navigateDate(direction)` method.

- [ ] **Step 4: Create enrollments.page.ts** — copy from existing, add: `statusFilter`, `selectAllCheckbox`, `bulkActionBar` locators. Extend `enrollStudent()` with optional `enrollmentType` param. Add `enrollMultipleStudents()`, `quickStatusChange()`, `bulkChangeStatus()`, `bulkDelete()`, `selectAll()` methods. Add `waitForResponse`.

- [ ] **Step 5: Commit**

```bash
git add e2e-integration/pages/classes.page.ts e2e-integration/pages/schedules.page.ts e2e-integration/pages/attendance.page.ts e2e-integration/pages/enrollments.page.ts
git commit -m "feat(e2e): add CRUD page objects (classes, schedules, attendance, enrollments)"
```

---

### Task 8: Finance and settings page objects

**Files:**
- Create: `e2e-integration/pages/payments.page.ts`
- Create: `e2e-integration/pages/payouts.page.ts`
- Create: `e2e-integration/pages/expenses.page.ts`
- Create: `e2e-integration/pages/finance-overview.page.ts`
- Create: `e2e-integration/pages/settings.page.ts`

- [ ] **Step 1: Create payments.page.ts** — copy from existing, add: `overdueSummary`, `overdueCount`, `overdueAmount`, `pagination`, `emptyState`, `selectAllCheckbox`, `batchRecordButton` locators. Extend `recordPayment()` with `date` param. Add `generateInvoice()`, `sendReminder()`, `selectPayment()`, `batchRecordPayments()` methods. Add `waitForResponse`.

- [ ] **Step 2: Create payouts.page.ts** — copy from existing, add: `statusFilter`, `pagination`, `emptyState`, `generateSalariesButton`, `exportCsvButton` locators. Extend `reconcilePayout()` with `bonus`, `deduction` params. Add `uploadProof()`, `generateSlip()`, `generateSalaries()`, `exportCsv()`, `filterByStatus()` methods. Add `waitForResponse`.

- [ ] **Step 3: Create expenses.page.ts** — copy from existing, add: `summaryCards`, `categoryFilter`, `exportCsvButton` locators. Extend `fillForm()` with `isRecurring`, `recurrenceFrequency`, `recurrenceEndDate` params. Add `filterByCategory()`, `clearFilter()`, `exportCsv()` methods. Add `waitForResponse`.

- [ ] **Step 4: Create finance-overview.page.ts** — copy from existing, add stat value locators (`totalRevenueValue`, `totalPayoutsValue`, `totalExpensesValue`, `netProfitValue`), `netProfitContainer` (for color theme check), `revenueByClass`, `revenueByMethod`, `revenueByStatus`, `expenseByCategory` section locators, `customDateFrom`, `customDateTo`, `exportPaymentsCsvButton`, `exportPayoutsCsvButton`, `exportExpensesCsvButton`. Add `getStatCardValue()`, `getNetProfitTheme()`, `setCustomDateRange()`, `exportCsv(type)` methods.

- [ ] **Step 5: Create settings.page.ts** — copy from existing, add: `timezoneSelect`, `languageSelect`, `phoneInput`, `addressInput` (general tab), `expenseCategoryList`, `addCategoryButton`, `bankAccountInputs` (billing tab), `roomsTable`, `addRoomButton`, `workingDayToggles`, `gradeLevelList` (academic tab), `studentRegistrationToggle`, `tutorRegistrationToggle`, `registrationLinkCopyButton` (registration tab), `passwordIndicators` (security tab). Add `updateBilling()`, `addRoom()`, `editRoom()`, `deleteRoom()`, `toggleWorkingDay()`, `addGradeLevel()`, `removeGradeLevel()`, `toggleRegistration()`, `addExpenseCategory()`, `removeExpenseCategory()`, `addBankAccount()` methods.

- [ ] **Step 6: Commit**

```bash
git add e2e-integration/pages/payments.page.ts e2e-integration/pages/payouts.page.ts e2e-integration/pages/expenses.page.ts e2e-integration/pages/finance-overview.page.ts e2e-integration/pages/settings.page.ts
git commit -m "feat(e2e): add finance and settings page objects"
```

---

## Phase 3: Spec Files (Tasks 9-21)

Each spec follows this structure:
```typescript
import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';
import { XxxPage } from '../pages/xxx.page.js';

test.describe('Module Name', () => {
  let page: XxxPage;

  test.beforeAll(async () => {
    await resetDatabase();
  });

  test.beforeEach(async ({ authedPage }) => {
    page = new XxxPage(authedPage);
  });

  test.describe('Smoke', () => { /* read-only tests */ });
  test.describe('Search & Filter', () => { /* filter tests */ });
  test.describe('Create', () => { /* happy + negative */ });
  test.describe('Update', () => { /* happy + negative */ });
  test.describe('Delete', () => { /* confirm + cancel */ });
});
```

### Task 9: Auth spec (33 tests)

**Files:**
- Create: `e2e-integration/specs/01-auth.spec.ts`

- [ ] **Step 1: Write smoke tests (3)** — login happy path, unauthenticated redirect, logout
- [ ] **Step 2: Write happy path tests (6)** — SUPER_ADMIN redirect, redirect param, auto-redirect, token refresh, change password, forced password change (re-enable `must_change_password` via DB UPDATE in beforeAll for this describe block)
- [ ] **Step 3: Write negative login tests (9)** — wrong password, empty fields, invalid email, inactive user/institution/uninvited (set up via API client in beforeAll)
- [ ] **Step 4: Write negative change-password tests (7)** — wrong current, same password, too short, no uppercase, no digit, mismatch, empty
- [ ] **Step 5: Write edge case tests (8)** — open redirect, forgot password toggle, button disabled while submitting, refresh expired, password visibility, tab locking
- [ ] **Step 6: Run and verify** — `npx playwright test specs/01-auth.spec.ts`
- [ ] **Step 7: Commit** — `git commit -m "feat(e2e): add auth integration spec (33 tests)"`

---

### Task 10: Dashboard spec (17 tests)

**Files:**
- Create: `e2e-integration/specs/02-dashboard.spec.ts`

- [ ] **Step 1: Write smoke tests (5)** — stat cards with values, activity feed, upcoming sessions, charts, quick links
- [ ] **Step 2: Write data verification tests (8)** — total students = 5, active tutors = 2, monthly revenue, attendance rate, activity types, session info, chart data, overdue alert
- [ ] **Step 3: Write edge case tests (4)** — tenant isolation (inst2 data doesn't leak), command palette search + navigate, no results, sparse chart data
- [ ] **Step 4: Run and verify** — `npx playwright test specs/02-dashboard.spec.ts`
- [ ] **Step 5: Commit** — `git commit -m "feat(e2e): add dashboard integration spec (17 tests)"`

---

### Task 11: Students spec (23 tests)

**Files:**
- Create: `e2e-integration/specs/03-students.spec.ts`

- [ ] **Step 1: Write smoke tests (3)** — table with seed data, stats cards, pagination
- [ ] **Step 2: Write search & filter tests (5)** — search by name, email, filter status, grade, combined
- [ ] **Step 3: Write create happy path (2)** — required fields only, all fields
- [ ] **Step 4: Write create negative tests (6)** — empty name, grade, parent name, parent phone, invalid student email, invalid parent email
- [ ] **Step 5: Write update tests (4)** — edit name, all fields, clear required, invalid email
- [ ] **Step 6: Write delete tests (3)** — confirm delete, cancel, exact text required
- [ ] **Step 7: Run and verify** — `npx playwright test specs/03-students.spec.ts`
- [ ] **Step 8: Commit** — `git commit -m "feat(e2e): add students integration spec (23 tests)"`

---

### Task 12: Tutors spec (27 tests)

**Files:**
- Create: `e2e-integration/specs/04-tutors.spec.ts`

- [ ] **Step 1: Write smoke tests (3)** — cards load, badges, search
- [ ] **Step 2: Write invite tests (5)** — invite happy path, email required, subject required, duplicate 409, plan limit
- [ ] **Step 3: Write update tests (5)** — edit name, bank, verified toggle, subjects, no changes
- [ ] **Step 4: Write subjects & sort tests (2)** — filter by subject, sort by different criteria
- [ ] **Step 5: Write invite lifecycle tests (4)** — pending menu, resend, cancel, active menu
- [ ] **Step 6: Write delete and bulk tests (6)** — delete confirm, cancel, bulk delete, bulk verify, bulk resend, select all
- [ ] **Step 7: Write view/pagination tests (2)** — grid/list toggle, pagination
- [ ] **Step 8: Run and verify** — `npx playwright test specs/04-tutors.spec.ts`
- [ ] **Step 9: Commit** — `git commit -m "feat(e2e): add tutors integration spec (27 tests)"`

---

### Task 13: Classes spec (34 tests)

**Files:**
- Create: `e2e-integration/specs/05-classes.spec.ts`

- [ ] **Step 1: Write smoke tests (3)** — table, search by class, search by tutor
- [ ] **Step 2: Write create happy path (3)** — min fields, all fields, multiple schedules
- [ ] **Step 3: Write create negative tests (11)** — empty name, no subject, no tutor, no schedule, capacity 0, capacity negative, fee negative, FIXED empty tutor_fee, PER_STUDENT empty fee, tutor doesn't teach subject, unverified tutor
- [ ] **Step 4: Write schedule management tests (6)** — toggle day, default times, edit times, remove via trash, conflict toast, invalid times
- [ ] **Step 5: Write update tests (6)** — name, capacity, subject+tutor, schedules, status, invalid tutor
- [ ] **Step 6: Write delete tests (5)** — no enrollments, requires "delete", partial text, cancel, FK constraint
- [ ] **Step 7: Run and verify** — `npx playwright test specs/05-classes.spec.ts`
- [ ] **Step 8: Commit** — `git commit -m "feat(e2e): add classes integration spec (34 tests)"`

---

### Task 14: Schedules spec (27 tests)

**Files:**
- Create: `e2e-integration/specs/06-schedules.spec.ts`

- [ ] **Step 1: Write smoke tests (3)** — page loads calendar, list view, sub-modes
- [ ] **Step 2: Write filter tests (6)** — date range, class, SCHEDULED, COMPLETED, combined, empty state
- [ ] **Step 3: Write create tests (4)** — create success, no class disabled, API error, auto-generate
- [ ] **Step 4: Write edit/reschedule tests (5)** — edit date/time, cancel, approve reschedule, reject, locked completed
- [ ] **Step 5: Write cancel tests (3)** — from list, from drawer, cannot cancel cancelled
- [ ] **Step 6: Write complete + drawer tests (6)** — admin complete, past locked, drawer details, attendance, reschedule info, topic/summary
- [ ] **Step 7: Run and verify** — `npx playwright test specs/06-schedules.spec.ts`
- [ ] **Step 8: Commit** — `git commit -m "feat(e2e): add schedules integration spec (27 tests)"`

---

### Task 15: Attendance spec (31 tests)

**Files:**
- Create: `e2e-integration/specs/07-attendance.spec.ts`

- [ ] **Step 1: Write smoke tests (4)** — session list, table loads, counter, summary
- [ ] **Step 2: Write mark attendance happy path (6)** — present, absent, late, change status, mark all, save multiple
- [ ] **Step 3: Write negative tests (5)** — completed locked, past locked, backend rejects, save error, invalid ID
- [ ] **Step 4: Write homework tests (3)** — toggle on, off, independent of status
- [ ] **Step 5: Write notes tests (4)** — add, edit, clear, max length
- [ ] **Step 6: Write edge case tests (9)** — date nav, no sessions, switch clears, discard, sticky bar, pending state, keyboard, concurrent save, payment generation
- [ ] **Step 7: Run and verify** — `npx playwright test specs/07-attendance.spec.ts`
- [ ] **Step 8: Commit** — `git commit -m "feat(e2e): add attendance integration spec (31 tests)"`

---

### Task 16: Enrollments spec (16 tests)

**Files:**
- Create: `e2e-integration/specs/08-enrollments.spec.ts`

- [ ] **Step 1: Write smoke tests (2)** — table loads, search
- [ ] **Step 2: Write create tests (6)** — single enroll, TRIAL, multi-student, duplicate 409, conflict, disabled button
- [ ] **Step 3: Write status + delete tests (5)** — edit modal, quick change, convert TRIAL, delete, verify removal
- [ ] **Step 4: Write bulk + filter tests (3)** — bulk status, bulk delete, filter by status
- [ ] **Step 5: Run and verify** — `npx playwright test specs/08-enrollments.spec.ts`
- [ ] **Step 6: Commit** — `git commit -m "feat(e2e): add enrollments integration spec (16 tests)"`

---

### Task 17: Payments spec (35 tests)

**Files:**
- Create: `e2e-integration/specs/09-payments.spec.ts`

- [ ] **Step 1: Write smoke + filter tests (10)** — table, summary cards, pagination, skeleton, empty, filter PENDING/PAID/OVERDUE/All, reset page
- [ ] **Step 2: Write record payment tests (10)** — CASH, TRANSFER, OTHER, overdue, discount, date, button disappears, server error, not visible on PAID, close modal
- [ ] **Step 3: Write batch tests (4)** — select 2+, batch success, deselect, select all
- [ ] **Step 4: Write overdue + invoice + reminder tests (8)** — auto-detection, summary update, sync, generate invoice, duplicate 409, download, reminder PENDING, reminder OVERDUE
- [ ] **Step 5: Write delete tests (3)** — confirm, cancel, nonexistent
- [ ] **Step 6: Run and verify** — `npx playwright test specs/09-payments.spec.ts`
- [ ] **Step 7: Commit** — `git commit -m "feat(e2e): add payments integration spec (35 tests)"`

---

### Task 18: Payouts spec (25 tests)

**Files:**
- Create: `e2e-integration/specs/10-payouts.spec.ts`

- [ ] **Step 1: Write smoke + create tests (6)** — page loads, empty state, basic, description, period+calculate, overlap warning
- [ ] **Step 2: Write create negative tests (4)** — no tutor, amount 0, negative, description too long
- [ ] **Step 3: Write reconciliation + proof + slip tests (7)** — reconcile to PAID, with bonus/deduction, disabled inputs, upload proof, proof persists, generate slip, duplicate slip
- [ ] **Step 4: Write delete + filter + generate tests (8)** — delete, nonexistent, filter status, search, pagination, generate salaries, idempotent, export
- [ ] **Step 5: Run and verify** — `npx playwright test specs/10-payouts.spec.ts`
- [ ] **Step 6: Commit** — `git commit -m "feat(e2e): add payouts integration spec (25 tests)"`

---

### Task 19: Expenses spec (26 tests)

**Files:**
- Create: `e2e-integration/specs/11-expenses.spec.ts`

- [ ] **Step 1: Write smoke + create happy tests (8)** — table, summary, badges, basic, minimum, recurring monthly, recurring weekly, each category
- [ ] **Step 2: Write create negative tests (5)** — amount 0, empty, negative, date empty, description too long
- [ ] **Step 3: Write update tests (6)** — amount, category, description, pre-fills, toggle recurring on/off
- [ ] **Step 4: Write delete + search + export tests (7)** — confirm, cancel, search description, no results, filter category, clear, export CSV
- [ ] **Step 5: Run and verify** — `npx playwright test specs/11-expenses.spec.ts`
- [ ] **Step 6: Commit** — `git commit -m "feat(e2e): add expenses integration spec (26 tests)"`

---

### Task 20: Finance overview spec (26 tests)

**Files:**
- Create: `e2e-integration/specs/12-finance-overview.spec.ts`

- [ ] **Step 1: Write smoke tests (5)** — all sections, default period, charts, revenue breakdown, expense breakdown
- [ ] **Step 2: Write data accuracy tests (8)** — net profit formula, positive green, negative red, counts, by class, by method, by status, overdue
- [ ] **Step 3: Write filter tests (5)** — quarter, YTD, custom range, updates all, no data zeros
- [ ] **Step 4: Write export + report tests (8)** — export payments/payouts/expenses CSV, generate finance/attendance/student-progress PDF, download PDF, no dates validation
- [ ] **Step 5: Run and verify** — `npx playwright test specs/12-finance-overview.spec.ts`
- [ ] **Step 6: Commit** — `git commit -m "feat(e2e): add finance-overview integration spec (26 tests)"`

---

### Task 21: Settings spec (26 tests)

**Files:**
- Create: `e2e-integration/specs/13-settings.spec.ts`

- [ ] **Step 1: Write smoke + general tests (8)** — page loads, tabs switch, edit name, multiple fields, timezone/language, no changes toast, cancel modal, API failure
- [ ] **Step 2: Write billing tests (4)** — add category, remove category, add bank account, save with modal
- [ ] **Step 3: Write academic tests (6)** — rooms table, add room, edit room, delete room, working days, grade levels
- [ ] **Step 4: Write registration + security + modal tests (8)** — student toggle, tutor toggle, copy link, change password, validation indicators, wrong password, scalar diff, array diff
- [ ] **Step 5: Run and verify** — `npx playwright test specs/13-settings.spec.ts`
- [ ] **Step 6: Commit** — `git commit -m "feat(e2e): add settings integration spec (26 tests)"`

---

## Phase 4: Cleanup and Final Verification (Task 22)

### Task 22: Full suite run and cleanup

**Files:**
- Remove: `e2e-integration/specs/00-smoke.spec.ts` (no longer needed)
- Update: `e2e-integration/playwright.config.ts` (if any adjustments needed)

- [ ] **Step 1: Run the full suite**

Run: `cd e2e-integration && npx playwright test`
Expected: All 346 tests pass. Estimated time: 15-25 minutes.

- [ ] **Step 2: Fix any failures** — debug flaky tests, adjust timeouts, fix selector issues

- [ ] **Step 3: Remove smoke test**

```bash
rm e2e-integration/specs/00-smoke.spec.ts
```

- [ ] **Step 4: Add .gitignore for test artifacts**

Create `e2e-integration/.gitignore`:
```
node_modules/
dist/
playwright-report/
test-results/
uploads-test/
```

- [ ] **Step 5: Final commit**

```bash
git add e2e-integration/
git commit -m "feat(e2e): complete integration E2E test suite (346 tests)"
```

---

## Execution Order Summary

| Phase | Tasks | Description | Est. Files |
|-------|-------|-------------|-----------|
| 1: Infrastructure | 1-5 | Project setup, Docker, scripts, fixtures, helpers | 15 files |
| 2: Page Objects | 6-8 | 13 adapted page objects | 13 files |
| 3: Spec Files | 9-21 | 13 spec files (346 tests) | 13 files |
| 4: Cleanup | 22 | Full run, fixes, .gitignore | 1 file |

**Total: 22 tasks, ~42 files**

**Critical path:** Task 5 (smoke test) validates the full pipeline. If the smoke test fails, stop and debug infrastructure before proceeding to page objects and specs.
