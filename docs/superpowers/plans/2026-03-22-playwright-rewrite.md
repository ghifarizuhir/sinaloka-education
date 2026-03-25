# Playwright E2E Test Full Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all Playwright E2E tests for sinaloka-platform with correct mock data shapes, hybrid selectors, and full smoke+CRUD+negative coverage for 13 pages.

**Architecture:** Three-phase approach — (1) Infrastructure (fixtures, helpers, mocks) built sequentially as foundation, (2) Component accessibility fixes + page objects built in parallel, (3) Spec files built in parallel. Each page gets its own page object + spec file with self-contained mock setup.

**Tech Stack:** Playwright, TypeScript, React (existing components need minor `data-testid`/ARIA additions)

**Spec:** `docs/superpowers/specs/2026-03-22-playwright-rewrite-design.md`

---

## Phase 1: Infrastructure (Sequential — Tasks 1-7)

These tasks MUST run sequentially. Each builds on the previous.

### Task 1: Clean up old test files and update Playwright config

**Files:**
- Modify: `sinaloka-platform/e2e/playwright.config.ts`
- Delete: `sinaloka-platform/e2e/mocks/reports.json` (orphaned)
- Delete: `sinaloka-platform/e2e/specs/crud/` (entire directory)
- Delete: `sinaloka-platform/e2e/specs/smoke/` (entire directory)
- Delete: `sinaloka-platform/e2e/specs/integration/` (entire directory)

- [ ] **Step 1: Delete old spec directories and orphaned mock**

```bash
cd sinaloka-platform
rm -rf e2e/specs/crud e2e/specs/smoke e2e/specs/integration
rm -f e2e/mocks/reports.json
```

- [ ] **Step 2: Rewrite playwright.config.ts — single project, no dark mode**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add -A e2e/
git commit -m "chore(e2e): clean old specs, simplify playwright config to single project"
```

---

### Task 2: Rewrite auth fixture

**Files:**
- Modify: `sinaloka-platform/e2e/fixtures/auth.fixture.ts`

The existing fixture already sets `sinaloka-lang=en` in localStorage. Keep that. Fix the `TEST_USER` shape to match the real `/api/auth/me` response.

- [ ] **Step 1: Rewrite auth.fixture.ts**

```ts
import { test as base, type Page } from '@playwright/test';

export const TEST_USER = {
  id: 'usr-00000000-0000-0000-0000-000000000001',
  email: 'admin@test.sinaloka.com',
  name: 'Test Admin',
  role: 'ADMIN' as const,
  avatar_url: null,
  is_active: true,
  last_login_at: '2026-03-22T00:00:00.000Z',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
  institution: {
    id: 'inst-00000000-0000-0000-0000-000000000001',
    name: 'Test Institution',
    slug: 'test-institution',
    logo_url: null,
    timezone: 'Asia/Jakarta',
    default_language: 'id',
  },
};

export const TEST_TOKENS = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
};

async function setupAuth(page: Page) {
  await page.addInitScript((data) => {
    localStorage.setItem('sinaloka-lang', 'en');
    localStorage.setItem('access_token', data.tokens.access_token);
    localStorage.setItem('refresh_token', data.tokens.refresh_token);
  }, { tokens: TEST_TOKENS });
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/auth.fixture.ts
git commit -m "fix(e2e): update auth fixture with correct User shape and ADMIN role"
```

---

### Task 3: Rewrite mock-api fixture

**Files:**
- Modify: `sinaloka-platform/e2e/fixtures/mock-api.fixture.ts`

- [ ] **Step 1: Rewrite mock-api.fixture.ts**

```ts
import { type Page, type Route } from '@playwright/test';
import { test as authedTest } from './auth.fixture';

export class MockApi {  // exported for use in api-mocker.ts setup functions
  constructor(private page: Page) {}

  private async intercept(method: string, pattern: string, status: number, body: unknown) {
    await this.page.route(pattern, async (route: Route) => {
      if (route.request().method() === method) {
        const contentType = body instanceof Buffer
          ? 'application/pdf'
          : 'application/json';
        await route.fulfill({
          status,
          contentType,
          body: body instanceof Buffer ? body : JSON.stringify(body),
        });
      } else {
        await route.fallback();
      }
    });
  }

  async onGet(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('GET', pattern, status, body) };
  }
  async onPost(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('POST', pattern, status, body) };
  }
  async onPatch(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('PATCH', pattern, status, body) };
  }
  async onDelete(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('DELETE', pattern, status, body) };
  }
}

export const test = authedTest.extend<{ mockApi: MockApi }>({
  mockApi: async ({ authedPage }, use) => {
    const mockApi = new MockApi(authedPage);
    await use(mockApi);
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/mock-api.fixture.ts
git commit -m "refactor(e2e): rewrite MockApi fixture with method-aware routing"
```

---

### Task 4: Create dialog helper files

**Files:**
- Create: `sinaloka-platform/e2e/helpers/confirm-dialog.ts`
- Create: `sinaloka-platform/e2e/helpers/confirm-changes-modal.ts`

**Note:** This helper works without the ARIA additions in Task 9 — it targets `role="alertdialog"` which already exists on `ConfirmDialog`. Task 9 adds `aria-labelledby` for precision but is not required for this helper to function.

- [ ] **Step 1: Create confirm-dialog.ts**

```ts
import { type Page, expect } from '@playwright/test';

/**
 * Interact with the custom ConfirmDialog component (role="alertdialog").
 * Optionally types confirmation text (e.g. "delete") before clicking confirm.
 */
export async function confirmDialog(page: Page, options?: { typedText?: string }) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();

  if (options?.typedText) {
    await dialog.getByRole('textbox').fill(options.typedText);
  }

  // The confirm button is typically the last button or has a destructive style
  // Find it by excluding the cancel button
  const confirmBtn = dialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
  await confirmBtn.click();

  // Wait for dialog to close
  await expect(dialog).toBeHidden();
}
```

- [ ] **Step 2: Create confirm-changes-modal.ts**

```ts
import { type Page, expect } from '@playwright/test';

/**
 * Interact with the ConfirmChangesModal in Settings pages.
 * Distinguished from ConfirmDialog by aria-labelledby="confirm-changes-title".
 */
export async function confirmChangesModal(page: Page) {
  const modal = page.locator('[aria-labelledby="confirm-changes-title"]');
  await expect(modal).toBeVisible();

  // Click the confirm button
  const confirmBtn = modal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
  await confirmBtn.click();

  await expect(modal).toBeHidden();
}
```

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/confirm-dialog.ts e2e/helpers/confirm-changes-modal.ts
git commit -m "feat(e2e): add ConfirmDialog and ConfirmChangesModal helpers"
```

---

### Task 5: Rewrite all mock JSON files

**Files:**
- Rewrite: `sinaloka-platform/e2e/mocks/auth.json`
- Rewrite: `sinaloka-platform/e2e/mocks/students.json`
- Rewrite: `sinaloka-platform/e2e/mocks/tutors.json`
- Rewrite: `sinaloka-platform/e2e/mocks/classes.json`
- Rewrite: `sinaloka-platform/e2e/mocks/enrollments.json`
- Rewrite: `sinaloka-platform/e2e/mocks/sessions.json`
- Rewrite: `sinaloka-platform/e2e/mocks/payments.json`
- Rewrite: `sinaloka-platform/e2e/mocks/payouts.json`
- Rewrite: `sinaloka-platform/e2e/mocks/expenses.json`
- Rewrite: `sinaloka-platform/e2e/mocks/attendance.json`
- Rewrite: `sinaloka-platform/e2e/mocks/dashboard.json`
- Create: `sinaloka-platform/e2e/mocks/settings.json`
- Create: `sinaloka-platform/e2e/mocks/subjects.json`

All mock data must follow these rules:
1. IDs are UUIDs (use readable prefixed UUIDs like `stu-00000000-...`)
2. Dates are `"YYYY-MM-DD"` strings for `@db.Date` fields, ISO-8601 for timestamps
3. Times are `"HH:MM"` strings
4. Decimal fields are numbers
5. All list endpoints return `{ data: [...], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }`
6. Nested relations match frontend type shapes exactly (see spec)

- [ ] **Step 1: Write auth.json**

```json
{
  "login": {
    "access_token": "test-access-token",
    "refresh_token": "test-refresh-token"
  },
  "me": {
    "id": "usr-00000000-0000-0000-0000-000000000001",
    "email": "admin@test.sinaloka.com",
    "name": "Test Admin",
    "role": "ADMIN",
    "avatar_url": null,
    "is_active": true,
    "last_login_at": "2026-03-22T00:00:00.000Z",
    "must_change_password": false,
    "created_at": "2026-01-01T00:00:00.000Z",
    "institution": {
      "id": "inst-00000000-0000-0000-0000-000000000001",
      "name": "Test Institution",
      "slug": "test-institution",
      "logo_url": null,
      "timezone": "Asia/Jakarta",
      "default_language": "id"
    }
  }
}
```

- [ ] **Step 2: Write subjects.json**

```json
{
  "data": [
    { "id": "sub-00000000-0000-0000-0000-000000000001", "name": "Mathematics", "institution_id": "inst-00000000-0000-0000-0000-000000000001" },
    { "id": "sub-00000000-0000-0000-0000-000000000002", "name": "Physics", "institution_id": "inst-00000000-0000-0000-0000-000000000001" },
    { "id": "sub-00000000-0000-0000-0000-000000000003", "name": "English", "institution_id": "inst-00000000-0000-0000-0000-000000000001" }
  ],
  "meta": { "total": 3, "page": 1, "limit": 100, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

- [ ] **Step 3: Write all remaining mock JSON files**

Each file must match the Prisma schema field shapes documented in the spec. Key shapes:

**students.json** — `{ data: [{ id, name, email, phone, grade, status, parent_name, parent_phone, parent_email, enrolled_at, institution_id, created_at, updated_at }], meta: {...} }` — 3 students (Rizki Pratama, Aisyah Putri, Fajar Hidayat)

**tutors.json** — `{ data: [{ id, user_id, name, email, avatar_url, tutor_subjects: [{ subject: { id, name } }], experience_years, rating, is_verified, bank_name, bank_account_number, bank_account_holder, monthly_salary, user: { id, is_active }, institution_id, created_at, updated_at }], meta: {...} }` — 2 tutors (Dewi Lestari verified, Rina Wijaya unverified)

**classes.json** — `{ data: [{ id, name, subject_id, subject: { id, name }, capacity, fee, package_fee, tutor_fee, tutor_fee_mode, tutor_fee_per_student, schedules: [{ id, day, start_time, end_time }], room, status, tutor_id, enrolled_count, tutor: { id, name }, institution_id, created_at, updated_at }], meta: {...} }` — 2 classes (Math Advanced, Physics Basic)

**sessions.json** — `{ data: [{ id, class_id, date, start_time, end_time, status, topic_covered, session_summary, created_by_id, class: { id, name, subject, tutor: { id, name } }, institution_id, created_at, updated_at }], meta: {...} }` — 3 sessions (1 SCHEDULED, 1 COMPLETED, 1 CANCELLED)

**enrollments.json** — `{ data: [{ id, student_id, class_id, status, payment_status, enrolled_at, student: { id, name }, class: { id, name }, institution_id, created_at, updated_at }], meta: {...} }` — 3 enrollments

**payments.json** — `{ data: [{ id, student_id, enrollment_id, amount, due_date, paid_date, status, method, notes, invoice_number, invoice_url, student: { id, name }, enrollment: { id, class: { id, name } }, institution_id, created_at, updated_at }], meta: {...} }` — 3 payments (1 PAID, 1 PENDING, 1 OVERDUE)

**payouts.json** — `{ data: [{ id, tutor_id, amount, date, status, description, period_start, period_end, proof_url, slip_url, tutor: { id, name, bank_name, bank_account_number, user: { name } }, institution_id, created_at, updated_at }], meta: {...} }` — 2 payouts (1 PENDING, 1 PROCESSING)

**expenses.json** — `{ data: [{ id, category, amount, date, description, receipt_url, is_recurring, recurrence_frequency, recurrence_end_date, institution_id, created_at, updated_at }], meta: { ..., total_amount } }` — 2 expenses (RENT, SUPPLIES)

**attendance.json** — `{ data: [{ id, session_id, student_id, status, homework_done, notes, student: { id, name, grade }, institution_id, created_at, updated_at }] }` — 3 attendance records for 3 students

**dashboard.json** — `{ stats: { total_students, active_tutors, attendance_rate, monthly_revenue, upcoming_sessions }, activity: [...], upcoming_sessions_list: [...], attendance_trend: [...], student_growth: [...], revenue_expenses: [...] }`

**settings.json** — `{ general: { name, email, phone, address, timezone, default_language }, billing: { billing_mode, currency, invoice_prefix, expense_categories, bank_accounts }, academic: { working_days, grade_levels, rooms } }`

- [ ] **Step 4: Commit**

```bash
git add e2e/mocks/
git commit -m "fix(e2e): rewrite all mock JSON files to match current Prisma schema"
```

---

### Task 6: Rewrite api-mocker.ts with all setup functions

**Files:**
- Modify: `sinaloka-platform/e2e/helpers/api-mocker.ts`

- [ ] **Step 1: Rewrite api-mocker.ts**

Keep the same import-and-export pattern. Add setup functions for ALL page dependencies including new endpoints. Each setup function registers all endpoints its page needs.

Key additions vs current:
- `setupDashboardMocks`: add chart endpoints (`attendance-trend`, `student-growth`, `revenue-expenses`)
- `setupTutorMocks`: add `POST /admin/tutors/invite`, `GET /admin/subjects`
- `setupClassMocks`: add `GET /subjects`, `GET /subjects/:id/tutors`, `GET /settings/billing`, `GET /settings/academic`
- `setupSessionMocks`: add `GET /admin/sessions/:id/students`
- `setupEnrollmentMocks`: fix conflict key to `has_conflict`, add `GET /payments/overdue-summary`
- `setupAttendanceMocks`: add `GET /admin/sessions/:id/students`, `GET /admin/attendance/summary`
- `setupPaymentMocks`: add `total_overdue_amount` to overdue-summary
- `setupFinanceOverviewMocks`: NEW — `GET /admin/reports/financial-summary`, `revenue-breakdown`, `expense-breakdown`, `overdue-summary`
- `setupSettingsMocks`: NEW — all settings GET/PATCH endpoints, subjects CRUD, `POST /auth/change-password`
- `setupReportMocks`: NEW — `GET /admin/reports/finance|attendance|student-progress` returning PDF buffer

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/api-mocker.ts
git commit -m "feat(e2e): rewrite api-mocker with complete endpoint coverage"
```

---

### Task 7: Rewrite test-data.ts factory functions

**Files:**
- Modify: `sinaloka-platform/e2e/helpers/test-data.ts`

- [ ] **Step 1: Rewrite with schema-correct factory functions**

Each factory returns data matching the current Prisma schema + frontend type:
- `createMockStudent(overrides?)` — UUID id, all required fields
- `createMockTutor(overrides?)` — with nested `user`, `tutor_subjects`
- `createMockClass(overrides?)` — with nested `subject`, `schedules`, `tutor`
- `createMockSession(overrides?)` — with `created_by_id`, nested `class`
- `createMockEnrollment(overrides?)` — with nested `student`, `class`
- `createMockPayment(overrides?)` — with nested `student`, `enrollment`
- `createMockPayout(overrides?)` — with `period_start`, `period_end`, nested `tutor`
- `createMockExpense(overrides?)` — with `is_recurring`, `receipt_url`
- `createMockAttendance(overrides?)` — with nested `student`
- `wrapInPaginatedResponse(data[], overrides?)` — wraps data in `{ data, meta }` envelope

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/test-data.ts
git commit -m "fix(e2e): rewrite test-data factories with schema-correct shapes"
```

---

## Phase 2: Component Fixes + Page Objects (Parallel — Tasks 8-21)

Tasks 8-9 are component accessibility fixes. Tasks 10-21 are page objects. ALL tasks in this phase are independent and can run in parallel.

### Task 8: Add data-testid to StatCard and Switch components

**Files:**
- Modify: `sinaloka-platform/src/components/ui/stat-card.tsx`
- Modify: `sinaloka-platform/src/components/ui/switch.tsx`

- [ ] **Step 1: Fix StatCard — add data-testid prop**

Add `testId?: string` prop, forward to root `<Card>`:
```tsx
// In StatCard props interface:
testId?: string;
// In JSX:
<Card data-testid={testId} ...>
```

- [ ] **Step 2: Fix Switch — add role="switch" and aria-checked**

```tsx
// Change the <button> in Switch:
<button
  role="switch"
  aria-checked={checked}
  onClick={() => onChange(!checked)}
  disabled={disabled}
  className={...}
>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/stat-card.tsx src/components/ui/switch.tsx
git commit -m "fix(ui): add accessibility attributes to StatCard and Switch"
```

---

### Task 9: Add aria-labelledby to Modal, Drawer, ConfirmDialog

**Files:**
- Modify: `sinaloka-platform/src/components/ui/modal.tsx`
- Modify: `sinaloka-platform/src/components/ui/drawer.tsx`
- Modify: `sinaloka-platform/src/components/ui/confirm-dialog.tsx`

- [ ] **Step 1: Fix Modal — wire aria-labelledby**

Add `titleId` prop (default: `'modal-title'`). Add `id={titleId}` to the `<h3>` title element. Add `aria-labelledby={titleId}` to the dialog container.

- [ ] **Step 2: Fix Drawer — same pattern as Modal**

- [ ] **Step 3: Fix ConfirmDialog — add aria-labelledby**

Add `id="confirm-dialog-title"` to the `<h3>` and `aria-labelledby="confirm-dialog-title"` to the alertdialog container.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/modal.tsx src/components/ui/drawer.tsx src/components/ui/confirm-dialog.tsx
git commit -m "fix(ui): add aria-labelledby to Modal, Drawer, ConfirmDialog"
```

---

### Task 10: Login page object

**Files:** Create `sinaloka-platform/e2e/pages/login.page.ts`

- [ ] **Step 1: Write page object with hybrid selectors**

Key selectors (from en.json):
- Email: `page.getByLabel(/email address/i)`
- Password: `page.getByLabel(/password/i)`
- Submit: `page.getByRole('button', { name: /sign in/i })`
- Error message: `page.locator('[role="alert"]')` or `data-testid="login-error"`
- Logout button (in Layout): `page.getByRole('button', { name: /log out/i })`

Methods: `goto()`, `login(email, password)`, `getErrorMessage()`, `getToast()`

- [ ] **Step 2: Commit**

---

### Task 11: Dashboard page object

**Files:** Create `sinaloka-platform/e2e/pages/dashboard.page.ts`

Key selectors:
- Stat cards: `page.getByText('Total Students')`, `page.getByText('Active Tutors')`, etc.
- Activity feed: `page.getByText('Recent Activity')`
- Upcoming sessions: `page.getByText('Upcoming Sessions')`
- Quick links: `page.getByRole('button', { name: /view all students/i })`, etc.
- Command palette trigger: `page.getByRole('button', { name: /quick actions/i })`
- Command palette input: `page.getByPlaceholder(/search for students/i)`

Methods: `goto()`, `openCommandPalette()`, `getStatValue(label)`, `clickQuickLink(name)`

---

### Task 12: Students page object

**Files:** Create `sinaloka-platform/e2e/pages/students.page.ts`

Key selectors:
- Add button: `page.getByRole('button', { name: /add student/i })`
- Search: `page.getByPlaceholder(/search by name or email/i)`
- Modal: `page.getByRole('dialog')`
- Form fields: `modal.getByLabel(/full name/i)`, `modal.getByLabel(/grade/i)`, `modal.getByLabel(/parent\/guardian name/i)`, `modal.getByLabel(/parent\/guardian phone/i)`
- Submit create: `modal.getByRole('button', { name: /add student/i })`
- Submit edit: `modal.getByRole('button', { name: /save changes/i })`
- Table: `page.locator('table')`

**Delete pattern:** Students delete uses a `<Modal>` (role="dialog") with `<Input id="delete-confirm">` where user types "delete" — same pattern as Classes. Do NOT use the shared `confirmDialog` helper. Instead: `page.locator('#delete-confirm').fill('delete')` then click the delete confirm button.

Methods: `goto()`, `createStudent(data)`, `editStudent(name, data)`, `deleteStudent(name)`, `search(query)`, `getRowByName(name)`, `getToast()`

---

### Task 13: Tutors page object

**Files:** Create `sinaloka-platform/e2e/pages/tutors.page.ts`

Key selectors:
- Add button: `page.getByRole('button', { name: /add tutor/i })`
- Search: `page.getByPlaceholder(/search tutors/i)`
- Modal: `page.getByRole('dialog')`
- Form: `modal.getByLabel(/full name/i)`, `modal.getByLabel(/email address/i)`, MultiSelect via `modal.getByPlaceholder(/search/i)`
- Submit invite: `modal.getByRole('button', { name: /send invitation/i })`
- Submit edit: `modal.getByRole('button', { name: /save changes/i })`
- Card: `page.locator('[class*="group"]').filter({ hasText: name })`
- Card menu: card's last button (MoreHorizontal icon)

Methods: `goto()`, `inviteTutor(data)`, `editTutor(name, data)`, `deleteTutor(name)`, `search(query)`, `getCardByName(name)`, `openCardMenu(name)`, `getToast()`

---

### Task 14: Classes page object

**Files:** Create `sinaloka-platform/e2e/pages/classes.page.ts`

Key selectors:
- Add button: `page.getByRole('button', { name: /add class/i })`
- Search: `page.getByPlaceholder(/search class or tutor/i)`
- Modal: `page.getByRole('dialog')`
- Form: `modal.getByLabel(/class name/i)`, subject/tutor via `modal.getByLabel(/subject/i)` (native select), schedule day buttons via `modal.getByRole('button', { name: dayShort })`, `modal.getByLabel(/capacity/i)`
- Delete modal (ClassDeleteModal): `page.locator('#delete-confirm')` for typed text
- Table: `page.locator('table')`

Methods: `goto()`, `createClass(data)`, `editClass(name, data)`, `deleteClass(name)`, `search(query)`, `getRowByName(name)`, `getToast()`

---

### Task 15: Schedules page object

**Files:** Create `sinaloka-platform/e2e/pages/schedules.page.ts`

Key selectors:
- Schedule button: `page.getByRole('button', { name: /schedule session/i })`
- Auto-generate button: `page.getByRole('button', { name: /auto-generate/i })`
- View toggle: `data-testid="view-list"` / `data-testid="view-calendar"` (needs data-testid on component)
- Modal: `page.getByRole('dialog')`
- Create form: `modal.locator('select').first()` (class), `modal.locator('input[type="date"]')` (date), `modal.locator('select').nth(1)` (start), `modal.locator('select').nth(2)` (end)
- Table: `page.locator('table')`
- List/Calendar: presence of table vs calendar component

Methods: `goto()`, `switchToListView()`, `switchToCalendarView()`, `createSession(data)`, `generateSessions(data)`, `getRowByClass(name)`, `getToast()`

---

### Task 16: Enrollments page object

**Files:** Create `sinaloka-platform/e2e/pages/enrollments.page.ts`

Key selectors:
- Add button: `page.getByRole('button', { name: /add enrollment/i })`
- Search: `page.getByPlaceholder(/search student or class/i)`
- Modal: `page.getByRole('dialog')`
- Student search in modal: `modal.getByPlaceholder(/search students/i)`
- Class select in modal: `modal.getByText(className)`
- Enroll button: `modal.getByRole('button', { name: /enroll/i })`
- Edit modal select: `modal.locator('select')` (native select for status)
- Table: `page.locator('table')`

Methods: `goto()`, `enrollStudent(studentName, className)`, `changeStatus(studentName, newStatus)`, `deleteEnrollment(studentName)`, `search(query)`, `getRowByName(name)`, `getToast()`

---

### Task 17: Attendance page object

**Files:** Create `sinaloka-platform/e2e/pages/attendance.page.ts`

Key selectors:
- Session list panel: `page.locator('.lg\\:col-span-4')`
- Session card: `page.getByText(className).first()`
- Attendance table: `page.locator('table')`
- Status buttons: `row.getByRole('button', { name: 'P' })` / `'A'` / `'L'` (English locale: Present[0]='P', Absent[0]='A', Late[0]='L')
- Homework checkbox: `row.locator('input[type="checkbox"]')`
- Notes: `row.getByPlaceholder(/note/i)`
- Save: `page.getByRole('button', { name: /save attendance/i })`

Methods: `goto()`, `selectSession(className)`, `markStatus(studentName, status)`, `toggleHomework(studentName)`, `addNote(studentName, note)`, `save()`, `getStudentRow(name)`, `getToast()`

---

### Task 18: Payments page object

**Files:** Create `sinaloka-platform/e2e/pages/payments.page.ts`

Key selectors:
- Status filter: `page.locator('select').first()`
- Record button per row: `row.getByRole('button', { name: /record payment/i })` or `row.locator('button[title="Record Payment"]')`
- Record modal: `page.getByRole('dialog')`
- Form: `modal.getByLabel(/payment amount/i)`, `modal.getByLabel(/method/i)` (if label works, else `modal.locator('select')`), `modal.getByLabel(/discount/i)`
- Confirm: `modal.getByRole('button', { name: /confirm payment/i })`
- Delete button: `row.locator('button[title="Delete"]')`
- Table: `page.locator('table')`

Methods: `goto()`, `recordPayment(studentName, data)`, `deletePayment(studentName)`, `filterByStatus(status)`, `getRowByName(name)`, `getToast()`

---

### Task 19: Payouts page object

**Files:** Create `sinaloka-platform/e2e/pages/payouts.page.ts`

Key selectors:
- Add button: `page.getByRole('button', { name: /add payout/i })`
- Search: `page.getByPlaceholder(/search tutors/i)`
- Modal: `page.getByRole('dialog')`
- Form: `modal.getByLabel(/tutor/i)` (or `modal.locator('select').first()`), `modal.getByLabel(/amount/i)` (or `modal.locator('input[type="number"]')`), `modal.locator('input[type="date"]')`, `modal.locator('textarea')`
- Submit: `modal.getByRole('button', { name: /add payout/i })`
- Reconcile button: per row, `row.getByRole('button', { name: /reconcile/i })`
- Confirm reconcile: `page.getByRole('button', { name: /confirm/i })`

Methods: `goto()`, `createPayout(data)`, `reconcilePayout(tutorName)`, `deletePayout(tutorName)`, `search(query)`, `getRowByName(name)`, `getToast()`

---

### Task 20: Expenses page object

**Files:** Create `sinaloka-platform/e2e/pages/expenses.page.ts`

Key selectors:
- Add button: `page.getByRole('button', { name: /record expense/i })`
- Search: `page.getByPlaceholder(/search expenses/i)`
- Drawer: `page.getByRole('dialog')`
- Form: `drawer.getByLabel(/expense amount/i)`, `drawer.locator('input[type="date"]')`, `drawer.getByLabel(/category/i)` (or `drawer.locator('select')`), `drawer.locator('textarea')`
- Submit create: `drawer.getByRole('button', { name: /record expense/i })`
- Submit edit: `drawer.getByRole('button', { name: /save changes/i })`
- Table: `page.locator('table')`
- Edit button in row: second-to-last button
- Delete button in row: last button

Methods: `goto()`, `createExpense(data)`, `editExpense(description, data)`, `deleteExpense(description)`, `getRowByDescription(desc)`, `getToast()`

---

### Task 21: Finance Overview + Settings page objects

**Files:**
- Create: `sinaloka-platform/e2e/pages/finance-overview.page.ts`
- Create: `sinaloka-platform/e2e/pages/settings.page.ts`

**Finance Overview** key selectors:
- Stat cards by text: `page.getByText('Total Revenue')`, etc.
- Period tabs: `page.getByRole('button', { name: /this month/i })`, etc.
- Quick nav links: `page.getByRole('link', { name: /see student payments/i })`
- Generate report button: `page.getByRole('button', { name: /generate report/i })`
- Report modal: `page.getByRole('dialog')`
- Report tab buttons: `dialog.getByRole('button', { name: /finance|attendance|student progress/i })`
- Generate button in modal: `dialog.getByRole('button', { name: /^generate$/i })`

**Settings** key selectors:
- Tab buttons: `page.getByRole('button', { name: /general|billing|academic|security|registration|plans/i })`
- General form: `page.getByLabel(/institution name/i)`, `page.getByLabel(/support email/i)`
- Save button: `page.getByRole('button', { name: /save changes/i })`
- Security form: `page.getByLabel(/current password/i)`, `page.getByLabel(/new password/i)`, `page.getByLabel(/confirm/i)`
- Update password: `page.getByRole('button', { name: /update password/i })`

---

## Phase 3: Spec Files (Parallel — Tasks 22-34)

ALL tasks in this phase are independent. Each spec file imports its page object and calls setup functions from api-mocker.ts. Each test uses the `mockApi` fixture from `mock-api.fixture.ts`.

### Task 22: auth.spec.ts (~10 tests)
### Task 23: dashboard.spec.ts (~7 tests)
### Task 24: students.spec.ts (~8 tests)
### Task 25: tutors.spec.ts (~7 tests)
### Task 26: classes.spec.ts (~8 tests)
### Task 27: schedules.spec.ts (~7 tests)
### Task 28: enrollments.spec.ts (~8 tests)
### Task 29: attendance.spec.ts (~8 tests)
### Task 30: payments.spec.ts (~8 tests)
### Task 31: payouts.spec.ts (~7 tests)
### Task 32: expenses.spec.ts (~7 tests)
### Task 33: finance-overview.spec.ts (~8 tests, includes report modal)
### Task 34: settings.spec.ts (~10 tests)

Each spec follows this pattern:

```ts
import { test, expect } from '../../fixtures/mock-api.fixture';
import { setupXxxMocks } from '../../helpers/api-mocker';
import { XxxPage } from '../../pages/xxx.page';

test.describe('Page Name', () => {
  let page: XxxPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupXxxMocks(mockApi);
    // Setup auth mock for /auth/me
    await setupAuthMocks(mockApi);
    page = new XxxPage(authedPage);
  });

  test.describe('Smoke', () => {
    test('page loads with expected elements', async () => {
      await page.goto();
      // assertions...
    });
  });

  test.describe('CRUD', () => {
    // create, edit, delete tests
  });

  test.describe('Negative', () => {
    // validation, error tests
  });
});
```

Each spec must implement ALL test cases listed in the design spec for that page. Refer to `docs/superpowers/specs/2026-03-22-playwright-rewrite-design.md` for the full test case list per page.

- [ ] **Each task: Write spec, run `npx playwright test e2e/specs/xxx.spec.ts`, verify tests pass, commit**

---

## Execution Notes

### Parallelization Strategy

- **Phase 1 (Tasks 1-7):** Sequential. Must complete before Phase 2.
- **Phase 2 (Tasks 8-21):** All parallel. Component fixes (8-9) and page objects (10-21) are independent.
- **Phase 3 (Tasks 22-34):** All parallel. Each spec is self-contained.

### Subagent Assignment

For subagent-driven execution:
- Phase 1: Single agent, 7 sequential tasks
- Phase 2: Up to 14 parallel agents (one per task)
- Phase 3: Up to 13 parallel agents (one per spec)

### Phase Boundary Requirements

- **Phase 2 → Phase 3:** Tasks 8-9 (component fixes) MUST be committed and reflected in the dev server before Phase 3 spec files run `npx playwright test`. The `data-testid` and ARIA attributes added in Tasks 8-9 are required by the page objects and specs.
- When running Phase 3 specs, ensure the dev server has reloaded with the latest component changes.

### Verification

After all phases complete, run full suite:
```bash
cd sinaloka-platform
npx playwright test --reporter=list
```

All tests should pass against mock data. No backend required.
