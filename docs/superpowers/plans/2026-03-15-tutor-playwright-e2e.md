# Playwright E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright end-to-end tests for sinaloka-tutors covering login, schedule, attendance, payouts, profile, and logout flows.

**Architecture:** Playwright tests run against real backend (localhost:3000) with seeded database. A globalSetup script resets and re-seeds the DB before each run for idempotency. Tests run serially in Chromium.

**Tech Stack:** Playwright, TypeScript, Prisma (for DB reset/seed)

**Spec:** `docs/superpowers/specs/2026-03-15-tutor-playwright-e2e-design.md`

---

## Chunk 1: Setup and Infrastructure

### Task 1: Install Playwright and configure

**Files:**
- Modify: `sinaloka-tutors/package.json`
- Create: `sinaloka-tutors/playwright.config.ts`

- [ ] **Step 1: Install Playwright**

Run:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npm install -D @playwright/test
```

Then install browsers:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright install chromium
```

- [ ] **Step 2: Add npm scripts to package.json**

Add to the `"scripts"` section of `sinaloka-tutors/package.json`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Create playwright.config.ts**

Create `sinaloka-tutors/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  timeout: 30000,
});
```

- [ ] **Step 4: Add Playwright artifacts to .gitignore**

Append to `sinaloka-tutors/.gitignore`:

```
test-results/
playwright-report/
```

- [ ] **Step 5: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/package.json sinaloka-tutors/package-lock.json sinaloka-tutors/playwright.config.ts sinaloka-tutors/.gitignore
git commit -m "feat(tutors): install Playwright and add config"
```

---

### Task 2: Create global setup (DB reset + seed)

**Files:**
- Create: `sinaloka-tutors/e2e/global-setup.ts`

- [ ] **Step 1: Create global-setup.ts**

Create `sinaloka-tutors/e2e/global-setup.ts`:

```typescript
import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '../../sinaloka-backend');

  console.log('[global-setup] Resetting database...');
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('[global-setup] Seeding database...');
  execSync('npx prisma db seed', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('[global-setup] Database ready.');
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/e2e/global-setup.ts
git commit -m "feat(tutors): add Playwright globalSetup for DB reset and seed"
```

---

### Task 3: Create login helper

**Files:**
- Create: `sinaloka-tutors/e2e/helpers.ts`

- [ ] **Step 1: Create helpers.ts**

Create `sinaloka-tutors/e2e/helpers.ts`:

```typescript
import type { Page } from '@playwright/test';

export const TEST_USER = {
  email: 'tutor1@cerdas.id',
  password: 'password',
  name: 'Budi Santoso',
  firstName: 'Budi',
};

export async function login(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('tutor@example.com').fill(TEST_USER.email);
  await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
  await page.getByRole('button', { name: /masuk/i }).click();
  await page.getByText(`Halo, ${TEST_USER.firstName}!`).waitFor({ timeout: 15000 });
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/e2e/helpers.ts
git commit -m "feat(tutors): add Playwright login helper and test user constants"
```

---

## Chunk 2: Test Files

### Task 4: Auth tests (login + logout)

**Files:**
- Create: `sinaloka-tutors/e2e/auth.spec.ts`

- [ ] **Step 1: Create auth.spec.ts**

Create `sinaloka-tutors/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './helpers';

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sinaloka')).toBeVisible();
    await expect(page.getByText('Portal Tutor')).toBeVisible();
    await expect(page.getByPlaceholder('tutor@example.com')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page);
    await expect(page.getByText(`Halo, ${TEST_USER.firstName}!`)).toBeVisible();
    await expect(page.getByText('Jadwal Mengajar Kamu')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('tutor@example.com').fill('wrong@email.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /masuk/i }).click();
    await expect(page.getByRole('alert').or(page.locator('text=/gagal|invalid|salah/i'))).toBeVisible({ timeout: 10000 });
  });

  test('should logout and return to login page', async ({ page }) => {
    await login(page);

    // Navigate to Profile tab
    await page.getByText('Profil').click();
    await expect(page.getByText(TEST_USER.name)).toBeVisible();

    // Click logout
    await page.getByText('Keluar Platform').click();

    // Should be back at login page
    await expect(page.getByText('Portal Tutor')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('tutor@example.com')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test e2e/auth.spec.ts
```
Expected: All 4 tests pass

- [ ] **Step 3: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/e2e/auth.spec.ts
git commit -m "test(tutors): add auth e2e tests (login, invalid credentials, logout)"
```

---

### Task 5: Schedule tests

**Files:**
- Create: `sinaloka-tutors/e2e/schedule.spec.ts`

- [ ] **Step 1: Create schedule.spec.ts**

Create `sinaloka-tutors/e2e/schedule.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display schedule page with sessions', async ({ page }) => {
    // Navigate to Schedule tab
    await page.getByText('Jadwal').click();
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible();
    await expect(page.getByText('Manajemen sesi dan absensi')).toBeVisible();

    // Verify at least one session card renders (look for subject name)
    await expect(page.getByText('Matematika').first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter schedule by status', async ({ page }) => {
    await page.getByText('Jadwal').click();
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible();

    // Click Completed filter
    await page.getByRole('button', { name: 'Completed' }).click();
    // The Completed button should now have lime-400 styling (active)
    await expect(page.getByRole('button', { name: 'Completed' })).toHaveClass(/bg-lime-400/);

    // Click Upcoming filter
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await expect(page.getByRole('button', { name: 'Upcoming' })).toHaveClass(/bg-lime-400/);
  });
});
```

- [ ] **Step 2: Run tests**

Run:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test e2e/schedule.spec.ts
```
Expected: All 2 tests pass

- [ ] **Step 3: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/e2e/schedule.spec.ts
git commit -m "test(tutors): add schedule e2e tests (view sessions, filter tabs)"
```

---

### Task 6: Attendance test

**Files:**
- Create: `sinaloka-tutors/e2e/attendance.spec.ts`

- [ ] **Step 1: Create attendance.spec.ts**

Create `sinaloka-tutors/e2e/attendance.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Attendance', () => {
  test('should mark attendance and complete session', async ({ page }) => {
    await login(page);

    // Navigate to Schedule tab
    await page.getByText('Jadwal').click();
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible();

    // Make sure we see Upcoming sessions (click filter to be explicit)
    await page.getByRole('button', { name: 'Upcoming' }).click();

    // Click "Absen Murid" on the first scheduled session
    await page.getByText('Absen Murid').first().click({ timeout: 10000 });

    // Verify attendance view opened — look for "Student List" heading
    await expect(page.getByText('Student List')).toBeVisible({ timeout: 10000 });

    // Mark all present using the "Mark All Present" button
    await page.getByText('Mark All Present').click();

    // Fill topic covered
    await page.getByPlaceholder('e.g., Algebraic Fractions').fill('Persamaan Linear');

    // Click Finalize & Close
    await page.getByText('Finalize & Close').click();

    // Verify success toast
    await expect(page.getByText('Absensi kelas berhasil disimpan!')).toBeVisible({ timeout: 10000 });

    // Verify we returned to schedule view (attendance view closed)
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible({ timeout: 10000 });
  });
});
```

- [ ] **Step 2: Run test**

Run:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test e2e/attendance.spec.ts
```
Expected: 1 test passes

- [ ] **Step 3: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/e2e/attendance.spec.ts
git commit -m "test(tutors): add attendance e2e test (mark attendance, complete session)"
```

---

### Task 7: Payouts and profile tests

**Files:**
- Create: `sinaloka-tutors/e2e/payouts.spec.ts`

- [ ] **Step 1: Create payouts.spec.ts**

Create `sinaloka-tutors/e2e/payouts.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './helpers';

test.describe('Payouts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display payouts page with totals', async ({ page }) => {
    // Navigate to Payout tab
    await page.getByText('Payout').click();
    await expect(page.getByText('Payouts').first()).toBeVisible();
    await expect(page.getByText('Total Pendapatan')).toBeVisible();

    // Verify amounts are rendered (look for "Rp" currency prefix)
    await expect(page.getByText(/Rp\s/).first()).toBeVisible();

    // Verify transaction section exists
    await expect(page.getByText('Transaksi Terakhir')).toBeVisible();
  });
});

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display tutor profile information', async ({ page }) => {
    // Navigate to Profile tab
    await page.getByText('Profil').click();

    // Verify tutor name
    await expect(page.getByText(TEST_USER.name)).toBeVisible();

    // Verify subject displayed
    await expect(page.getByText(/Matematika/)).toBeVisible();

    // Verify rating is displayed
    await expect(page.getByText(/\d\.\d/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests**

Run:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test e2e/payouts.spec.ts
```
Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/e2e/payouts.spec.ts
git commit -m "test(tutors): add payouts and profile e2e tests"
```

---

## Chunk 3: Full Suite Verification

### Task 8: Run full test suite

- [ ] **Step 1: Run the complete suite**

Run:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test
```

Expected: All tests pass (globalSetup resets DB first, then all specs run serially):
- `auth.spec.ts` — 4 tests
- `schedule.spec.ts` — 2 tests
- `attendance.spec.ts` — 1 test
- `payouts.spec.ts` — 2 tests

Total: 9 tests passing

- [ ] **Step 2: Run suite a second time to verify idempotency**

Run the same command again:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test
```

Expected: All 9 tests pass again (globalSetup re-seeds before each run, so the attendance test has fresh data).

- [ ] **Step 3: Fix any failing tests**

If any tests fail, debug with:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test --ui
```

Or run a specific file:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test e2e/auth.spec.ts --headed
```
