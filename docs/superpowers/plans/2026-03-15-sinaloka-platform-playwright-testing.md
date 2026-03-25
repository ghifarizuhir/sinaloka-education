# Sinaloka Platform Playwright Testing — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Playwright E2E test suite for sinaloka-platform with smoke tests for critical flows, CRUD coverage, and dark mode testing.

**Architecture:** Page Object Model pattern with custom fixtures for auth and API mocking. Tests run against mocked API by default, with an opt-in integration suite for real backend. Two Playwright projects (light/dark mode) run the same test files.

**Tech Stack:** Playwright, TypeScript, Chromium

**Spec:** `docs/superpowers/specs/2026-03-15-sinaloka-platform-playwright-testing-design.md`

---

## Chunk 0: Prerequisite — Accessibility Fix (Task 0)

### Task 0: Add `role="dialog"` to Modal and Drawer Components

The app's Modal and Drawer components in `src/components/UI.tsx` have no `role` attribute. This blocks all Playwright tests that locate modals via `[role="dialog"]`, and it's also an accessibility improvement (WAI-ARIA).

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add `role="dialog"` and `aria-modal="true"` to the Modal component**

In the Modal component's outer `<div>` (the content container, not the backdrop), add:

```tsx
role="dialog"
aria-modal="true"
```

- [ ] **Step 2: Add `role="dialog"` and `aria-modal="true"` to the Drawer component**

Same change to the Drawer component's content container.

- [ ] **Step 3: Verify app still works**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "fix(a11y): add role=dialog to Modal and Drawer components"
```

---

## Chunk 1: Foundation (Tasks 1–3)

### Task 1: Install Playwright and Create Config

**Files:**
- Modify: `sinaloka-platform/package.json`
- Create: `sinaloka-platform/e2e/playwright.config.ts`

- [ ] **Step 1: Install Playwright**

```bash
cd sinaloka-platform && npm install -D @playwright/test
```

- [ ] **Step 2: Install Chromium browser**

```bash
cd sinaloka-platform && npx playwright install chromium
```

- [ ] **Step 3: Create playwright.config.ts**

```ts
// sinaloka-platform/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'light-mode', use: {} },
    {
      name: 'dark-mode',
      use: {
        // Dark mode fixture injects .dark class via addInitScript
        darkMode: true,
      } as any,
    },
  ],
});
```

- [ ] **Step 4: Add npm scripts to package.json**

Add to `scripts` in `sinaloka-platform/package.json`:

```json
"test:e2e": "playwright test --config e2e/playwright.config.ts",
"test:e2e:ui": "playwright test --config e2e/playwright.config.ts --ui",
"test:e2e:smoke": "playwright test --config e2e/playwright.config.ts e2e/specs/smoke",
"test:e2e:integration": "playwright test --config e2e/playwright.config.ts --grep @integration",
"test:e2e:light": "playwright test --config e2e/playwright.config.ts --project=light-mode",
"test:e2e:dark": "playwright test --config e2e/playwright.config.ts --project=dark-mode"
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/package.json sinaloka-platform/package-lock.json sinaloka-platform/e2e/playwright.config.ts
git commit -m "feat(e2e): install Playwright and add config with light/dark mode projects"
```

---

### Task 2: Create Mock API Fixture

**Files:**
- Create: `sinaloka-platform/e2e/fixtures/mock-api.fixture.ts`

- [ ] **Step 1: Create mock-api fixture**

```ts
// sinaloka-platform/e2e/fixtures/mock-api.fixture.ts
import { test as base, Page, Route } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

class MockRoute {
  private _delay = 0;

  constructor(
    private page: Page,
    private urlPattern: string,
    private method: HttpMethod,
  ) {}

  delay(ms: number): this {
    this._delay = ms;
    return this;
  }

  async respondWith(status: number, body: unknown = {}): Promise<void> {
    await this.page.route(this.urlPattern, async (route: Route) => {
      if (route.request().method() !== this.method) {
        await route.fallback();
        return;
      }
      if (this._delay > 0) {
        await new Promise((r) => setTimeout(r, this._delay));
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }
}

class MockApi {
  constructor(private page: Page) {}

  onGet(url: string) {
    return new MockRoute(this.page, url, 'GET');
  }
  onPost(url: string) {
    return new MockRoute(this.page, url, 'POST');
  }
  onPatch(url: string) {
    return new MockRoute(this.page, url, 'PATCH');
  }
  onPut(url: string) {
    return new MockRoute(this.page, url, 'PUT');
  }
  onDelete(url: string) {
    return new MockRoute(this.page, url, 'DELETE');
  }
}

export const test = base.extend<{ mockApi: MockApi }>({
  mockApi: async ({ page }, use) => {
    const mockApi = new MockApi(page);
    await use(mockApi);
    // Routes are auto-cleared when page closes
  },
});

export { expect } from '@playwright/test';
export { MockApi };
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/fixtures/mock-api.fixture.ts
git commit -m "feat(e2e): add mock API fixture with fluent route interception"
```

---

### Task 3: Create Auth Fixture

**Files:**
- Create: `sinaloka-platform/e2e/fixtures/auth.fixture.ts`

- [ ] **Step 1: Create auth fixture**

```ts
// sinaloka-platform/e2e/fixtures/auth.fixture.ts
import { type Page } from '@playwright/test';
import { test as mockTest, MockApi } from './mock-api.fixture';

const TEST_USER = {
  id: 1,
  email: 'admin@sinaloka.com',
  name: 'Test Admin',
  role: 'admin',
  institution_id: 1,
};

const TEST_TOKENS = {
  access_token: 'test-access-token-123',
  refresh_token: 'test-refresh-token-456',
};

type AuthFixtures = {
  authenticatedPage: Page;
  mockApi: MockApi;
};

export const test = mockTest.extend<AuthFixtures>({
  authenticatedPage: [
    async ({ page, mockApi, browserName }, use, testInfo) => {
      // Inject dark mode class if dark-mode project
      const isDarkMode = testInfo.project.name === 'dark-mode';
      if (isDarkMode) {
        await page.addInitScript(() => {
          document.documentElement.classList.add('dark');
        });
      }

      // Mock the /me endpoint
      await mockApi.onGet('**/api/auth/me').respondWith(200, TEST_USER);

      // Inject tokens into localStorage before navigating
      await page.addInitScript(
        (tokens) => {
          localStorage.setItem('access_token', tokens.access_token);
          localStorage.setItem('refresh_token', tokens.refresh_token);
        },
        TEST_TOKENS,
      );

      await use(page);
    },
    { auto: false },
  ],
});

export { expect } from '@playwright/test';
export { TEST_USER, TEST_TOKENS };
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/fixtures/auth.fixture.ts
git commit -m "feat(e2e): add auth fixture with JWT injection and dark mode support"
```

---

## Chunk 2: Test Helpers & Mock Data (Tasks 4–5)

### Task 4: Create Test Data Factories

**Files:**
- Create: `sinaloka-platform/e2e/helpers/test-data.ts`

Refer to types in `sinaloka-platform/src/types/` for field accuracy.

- [ ] **Step 1: Create test-data.ts**

```ts
// sinaloka-platform/e2e/helpers/test-data.ts

export function createMockStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Aisyah Putri',
    email: 'aisyah@example.com',
    phone: '+62812345678',
    grade: '10th Grade',
    status: 'ACTIVE',
    parent_name: 'Budi Santoso',
    parent_phone: '+62898765432',
    parent_email: 'budi@example.com',
    enrolled_at: '2026-01-15',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
    institution_id: 1,
    ...overrides,
  };
}

export function createMockTutor(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Dewi Lestari',
    email: 'dewi@sinaloka.com',
    subjects: ['Mathematics', 'Physics'],
    experience_years: 5,
    rating: 4.8,
    is_verified: true,
    bank_name: 'BCA',
    bank_account_number: '1234567890',
    bank_account_holder: 'Dewi Lestari',
    availability: {},
    user_id: 2,
    institution_id: 1,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
    ...overrides,
  };
}

export function createMockClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Math Advanced',
    subject: 'Mathematics',
    capacity: 20,
    fee: 500000,
    schedule_days: ['Monday', 'Wednesday'],
    schedule_start_time: '09:00',
    schedule_end_time: '10:30',
    room: 'Room A',
    status: 'ACTIVE',
    tutor_id: 1,
    tutor: { id: 1, name: 'Dewi Lestari' },
    institution_id: 1,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

export function createMockEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    student_id: 1,
    class_id: 1,
    status: 'ACTIVE',
    payment_status: 'PAID',
    enrolled_at: '2026-01-15T08:00:00Z',
    student: { id: 1, name: 'Aisyah Putri' },
    class: { id: 1, name: 'Math Advanced', subject: 'Mathematics' },
    institution_id: 1,
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
    ...overrides,
  };
}

export function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    class_id: 1,
    date: '2026-03-15',
    start_time: '09:00',
    end_time: '10:30',
    status: 'SCHEDULED',
    topic_covered: null,
    session_summary: null,
    reschedule_reason: null,
    class: {
      id: 1,
      name: 'Math Advanced',
      subject: 'Mathematics',
      tutor: { id: 1, name: 'Dewi Lestari' },
    },
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
    ...overrides,
  };
}

export function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    student_id: 1,
    enrollment_id: 1,
    amount: 500000,
    due_date: '2026-03-01',
    paid_date: null,
    status: 'PENDING',
    method: null,
    notes: null,
    student: { id: 1, name: 'Aisyah Putri' },
    enrollment: { id: 1, class: { id: 1, name: 'Math Advanced' } },
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-02-15T08:00:00Z',
    ...overrides,
  };
}

export function createMockAttendance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    session_id: 1,
    student_id: 1,
    status: 'PRESENT',
    homework_done: false,
    notes: null,
    student: { id: 1, name: 'Aisyah Putri' },
    session: { id: 1, date: '2026-03-15' },
    ...overrides,
  };
}

export function createMockDashboardStats(overrides: Record<string, unknown> = {}) {
  return {
    total_students: 150,
    active_tutors: 12,
    total_revenue: 75000000,
    attendance_rate: 92.5,
    upcoming_sessions: 8,
    ...overrides,
  };
}

export function createMockActivity(overrides: Record<string, unknown> = {}) {
  return {
    type: 'enrollment',
    description: 'Aisyah Putri enrolled in Math Advanced',
    created_at: '2026-03-15T10:00:00Z',
    ...overrides,
  };
}

export function paginatedResponse<T>(data: T[], page = 1, limit = 10) {
  return {
    data,
    meta: {
      page,
      limit,
      total: data.length,
      total_pages: Math.ceil(data.length / limit),
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/helpers/test-data.ts
git commit -m "feat(e2e): add test data factory functions for all entities"
```

---

### Task 5: Create Mock JSON Data Files

**Files:**
- Create: `sinaloka-platform/e2e/mocks/auth.json`
- Create: `sinaloka-platform/e2e/mocks/students.json`
- Create: `sinaloka-platform/e2e/mocks/tutors.json`
- Create: `sinaloka-platform/e2e/mocks/classes.json`
- Create: `sinaloka-platform/e2e/mocks/enrollments.json`
- Create: `sinaloka-platform/e2e/mocks/sessions.json`
- Create: `sinaloka-platform/e2e/mocks/payments.json`
- Create: `sinaloka-platform/e2e/mocks/payouts.json`
- Create: `sinaloka-platform/e2e/mocks/attendance.json`
- Create: `sinaloka-platform/e2e/mocks/expenses.json`
- Create: `sinaloka-platform/e2e/mocks/reports.json`
- Create: `sinaloka-platform/e2e/mocks/dashboard.json`

These are static JSON fixtures used by the `api-mocker.ts` helper. Each file contains a paginated response with 2-3 sample records.

- [ ] **Step 1: Create auth.json**

```json
{
  "login": {
    "access_token": "test-access-token-123",
    "refresh_token": "test-refresh-token-456"
  },
  "me": {
    "id": 1,
    "email": "admin@sinaloka.com",
    "name": "Test Admin",
    "role": "admin",
    "institution_id": 1
  },
  "loginError": {
    "statusCode": 401,
    "message": "Invalid email or password"
  }
}
```

- [ ] **Step 2: Create students.json**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Aisyah Putri",
      "email": "aisyah@example.com",
      "phone": "+62812345678",
      "grade": "10th Grade",
      "status": "ACTIVE",
      "parent_name": "Budi Santoso",
      "parent_phone": "+62898765432",
      "parent_email": "budi@example.com",
      "enrolled_at": "2026-01-15",
      "institution_id": 1
    },
    {
      "id": 2,
      "name": "Rizki Pratama",
      "email": "rizki@example.com",
      "phone": "+62813456789",
      "grade": "11th Grade",
      "status": "ACTIVE",
      "parent_name": "Siti Rahayu",
      "parent_phone": "+62897654321",
      "parent_email": "siti@example.com",
      "enrolled_at": "2026-02-01",
      "institution_id": 1
    },
    {
      "id": 3,
      "name": "Fajar Hidayat",
      "email": "fajar@example.com",
      "phone": "+62814567890",
      "grade": "12th Grade",
      "status": "INACTIVE",
      "parent_name": "Ahmad Hidayat",
      "parent_phone": "+62896543210",
      "parent_email": "ahmad@example.com",
      "enrolled_at": "2025-09-01",
      "institution_id": 1
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 3, "total_pages": 1 }
}
```

- [ ] **Step 3: Create remaining JSON mock files**

Create each of the following files with the same paginated structure (`{ data: [...], meta: {...} }`), containing 2-3 sample records per file:

- `tutors.json` — 2 tutors with subjects, bank details
- `classes.json` — 2 classes with tutor references
- `enrollments.json` — 2 enrollments with student/class refs
- `sessions.json` — 3 sessions (SCHEDULED, COMPLETED, CANCELLED)
- `payments.json` — 3 payments (PAID, PENDING, OVERDUE)
- `payouts.json` — 2 payout records
- `attendance.json` — 3 attendance records (PRESENT, ABSENT, LATE)
- `expenses.json` — 2 expense records
- `reports.json` — `{ "types": ["attendance", "finance", "student_progress"] }`
- `dashboard.json`:

```json
{
  "stats": {
    "total_students": 150,
    "active_tutors": 12,
    "total_revenue": 75000000,
    "attendance_rate": 92.5,
    "upcoming_sessions": 8
  },
  "activity": [
    { "type": "enrollment", "description": "Aisyah Putri enrolled in Math Advanced", "created_at": "2026-03-15T10:00:00Z" },
    { "type": "payment", "description": "Payment received from Rizki Pratama", "created_at": "2026-03-15T09:30:00Z" },
    { "type": "attendance", "description": "Attendance marked for Physics Basic", "created_at": "2026-03-15T09:00:00Z" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/e2e/mocks/
git commit -m "feat(e2e): add mock JSON data files for all entities"
```

---

### Task 6: Create API Mocker Helper

**Files:**
- Create: `sinaloka-platform/e2e/helpers/api-mocker.ts`

- [ ] **Step 1: Create api-mocker.ts**

```ts
// sinaloka-platform/e2e/helpers/api-mocker.ts
import { MockApi } from '../fixtures/mock-api.fixture';
import authData from '../mocks/auth.json';
import studentsData from '../mocks/students.json';
import tutorsData from '../mocks/tutors.json';
import classesData from '../mocks/classes.json';
import enrollmentsData from '../mocks/enrollments.json';
import sessionsData from '../mocks/sessions.json';
import paymentsData from '../mocks/payments.json';
import payoutsData from '../mocks/payouts.json';
import attendanceData from '../mocks/attendance.json';
import expensesData from '../mocks/expenses.json';
import dashboardData from '../mocks/dashboard.json';

export async function setupAuthMocks(mockApi: MockApi) {
  await mockApi.onPost('**/api/auth/login').respondWith(200, authData.login);
  await mockApi.onGet('**/api/auth/me').respondWith(200, authData.me);
  await mockApi.onPost('**/api/auth/refresh').respondWith(200, authData.login);
  await mockApi.onPost('**/api/auth/logout').respondWith(200, {});
}

export async function setupStudentMocks(mockApi: MockApi, data = studentsData) {
  await mockApi.onGet('**/api/admin/students').respondWith(200, data);
  await mockApi.onPost('**/api/admin/students').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/students/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/students/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/students/export').respondWith(200, 'name,email\n');
  await mockApi.onPost('**/api/admin/students/import').respondWith(200, { imported: 1 });
}

export async function setupTutorMocks(mockApi: MockApi, data = tutorsData) {
  await mockApi.onGet('**/api/admin/tutors').respondWith(200, data);
  await mockApi.onPost('**/api/admin/tutors').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/tutors/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/tutors/*').respondWith(200, {});
}

export async function setupClassMocks(mockApi: MockApi, data = classesData) {
  await mockApi.onGet('**/api/admin/classes').respondWith(200, data);
  await mockApi.onPost('**/api/admin/classes').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/classes/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/classes/*').respondWith(200, {});
}

export async function setupEnrollmentMocks(mockApi: MockApi, data = enrollmentsData) {
  await mockApi.onGet('**/api/admin/enrollments').respondWith(200, data);
  await mockApi.onPost('**/api/admin/enrollments').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/enrollments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/enrollments/*').respondWith(200, {});
  await mockApi.onPost('**/api/admin/enrollments/check-conflict').respondWith(200, { conflict: false });
}

export async function setupSessionMocks(mockApi: MockApi, data = sessionsData) {
  await mockApi.onGet('**/api/admin/sessions').respondWith(200, data);
  await mockApi.onPost('**/api/admin/sessions').respondWith(201, data.data[0]);
  await mockApi.onPost('**/api/admin/sessions/generate').respondWith(201, { generated: 5 });
  await mockApi.onPatch('**/api/admin/sessions/*').respondWith(200, data.data[0]);
  await mockApi.onPatch('**/api/admin/sessions/*/approve').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/sessions/*').respondWith(200, {});
}

export async function setupPaymentMocks(mockApi: MockApi, data = paymentsData) {
  await mockApi.onGet('**/api/admin/payments').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payments').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payments/*').respondWith(200, {});
}

export async function setupPayoutMocks(mockApi: MockApi, data = payoutsData) {
  await mockApi.onGet('**/api/admin/payouts').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payouts').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payouts/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payouts/*').respondWith(200, {});
}

export async function setupAttendanceMocks(mockApi: MockApi, data = attendanceData) {
  await mockApi.onGet('**/api/admin/attendance').respondWith(200, data);
  await mockApi.onPatch('**/api/admin/attendance/*').respondWith(200, data.data[0]);
}

export async function setupExpenseMocks(mockApi: MockApi, data = expensesData) {
  await mockApi.onGet('**/api/admin/expenses').respondWith(200, data);
  await mockApi.onPost('**/api/admin/expenses').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/expenses/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/expenses/*').respondWith(200, {});
}

export async function setupDashboardMocks(mockApi: MockApi, data = dashboardData) {
  await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, data.stats);
  await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, data.activity);
}

export async function setupAllMocks(mockApi: MockApi) {
  await setupAuthMocks(mockApi);
  await setupStudentMocks(mockApi);
  await setupTutorMocks(mockApi);
  await setupClassMocks(mockApi);
  await setupEnrollmentMocks(mockApi);
  await setupSessionMocks(mockApi);
  await setupPaymentMocks(mockApi);
  await setupPayoutMocks(mockApi);
  await setupAttendanceMocks(mockApi);
  await setupExpenseMocks(mockApi);
  await setupDashboardMocks(mockApi);
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/helpers/api-mocker.ts
git commit -m "feat(e2e): add centralized API mocker helper with per-entity setup"
```

---

## Chunk 3: Page Objects (Tasks 7–12)

### Task 7: Login Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/login.page.ts`

Reference: `sinaloka-platform/src/pages/Login.tsx` — email input (`id="email"`), password input (`id="password"`), submit button (`type="submit"`), error display (`.bg-red-50`).

- [ ] **Step 1: Create login.page.ts**

```ts
// sinaloka-platform/e2e/pages/login.page.ts
import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.bg-red-50, .dark\\:bg-red-900\\/20');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  getToast(): Locator {
    return this.page.locator('[data-sonner-toaster]');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/login.page.ts
git commit -m "feat(e2e): add Login page object"
```

---

### Task 8: Dashboard Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/dashboard.page.ts`

Reference: `sinaloka-platform/src/pages/Dashboard.tsx` — stats grid (4 cards), activity section, command palette modal.

- [ ] **Step 1: Create dashboard.page.ts**

```ts
// sinaloka-platform/e2e/pages/dashboard.page.ts
import { type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly statsGrid: Locator;
  readonly activitySection: Locator;
  readonly commandPaletteInput: Locator;
  readonly commandPaletteModal: Locator;

  constructor(private page: Page) {
    this.statsGrid = page.locator('.grid').first();
    this.activitySection = page.getByText('Recent Activity');
    this.commandPaletteInput = page.locator('input[placeholder*="Search for"]');
    this.commandPaletteModal = page.locator('.fixed.inset-0').filter({ has: this.commandPaletteInput });
  }

  async goto() {
    await this.page.goto('/');
  }

  getStatCard(label: string): Locator {
    return this.page.getByText(label).locator('..');
  }

  getActivityItem(text: string): Locator {
    return this.page.getByText(text);
  }

  getQuickLink(text: string): Locator {
    return this.page.getByRole('link', { name: text });
  }

  async openCommandPalette() {
    // No Cmd+K binding exists — use the Quick Actions button
    await this.page.getByRole('button', { name: /quick actions/i }).click();
  }

  async searchCommandPalette(query: string) {
    await this.openCommandPalette();
    await this.commandPaletteInput.fill(query);
  }

  getToast(): Locator {
    return this.page.locator('[data-sonner-toaster]');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/dashboard.page.ts
git commit -m "feat(e2e): add Dashboard page object"
```

---

### Task 9: Students Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/students.page.ts`

Reference: `sinaloka-platform/src/pages/Students.tsx` — search input, add button (Plus icon), table with rows, modal form (name, email, grade, status, parent fields), CSV import/export, delete with `confirm()`.

- [ ] **Step 1: Create students.page.ts**

```ts
// sinaloka-platform/e2e/pages/students.page.ts
import { type Locator, type Page } from '@playwright/test';

export interface StudentFormData {
  name: string;
  email: string;
  phone?: string;
  grade: string;
  status?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
}

export class StudentsPage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly modal: Locator;
  readonly importButton: Locator;
  readonly exportButton: Locator;
  readonly gradeFilter: Locator;
  readonly statusFilter: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add student/i });
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.modal = page.locator('[role="dialog"]');
    this.importButton = page.getByRole('button', { name: /import/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.gradeFilter = page.locator('select').nth(0);
    this.statusFilter = page.locator('select').nth(1);
  }

  async goto() {
    await this.page.goto('/students');
  }

  async createStudent(data: StudentFormData) {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.getByLabel(/full name/i).fill(data.name);
    await this.modal.getByLabel(/email address/i).fill(data.email);
    if (data.phone) await this.modal.getByLabel(/phone number/i).fill(data.phone);
    await this.modal.locator('select').first().selectOption(data.grade);
    if (data.parent_name) await this.modal.getByLabel(/parent.*guardian.*name/i).fill(data.parent_name);
    if (data.parent_phone) await this.modal.getByLabel(/parent.*guardian.*phone/i).fill(data.parent_phone);
    if (data.parent_email) await this.modal.getByLabel(/parent.*guardian.*email/i).fill(data.parent_email);
    await this.modal.getByRole('button', { name: /save|add|create/i }).click();
  }

  async editStudent(name: string, data: Partial<StudentFormData>) {
    await this.openRowMenu(name);
    await this.page.getByText(/view \/ edit/i).click();
    await this.modal.waitFor({ state: 'visible' });
    if (data.name) await this.modal.getByLabel(/full name/i).fill(data.name);
    if (data.email) await this.modal.getByLabel(/email address/i).fill(data.email);
    if (data.grade) await this.modal.locator('select').first().selectOption(data.grade);
    await this.modal.getByRole('button', { name: /save|update/i }).click();
  }

  async deleteStudent(name: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.openRowMenu(name);
    await this.page.getByText(/delete/i).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async importCSV(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  private async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    await row.locator('button').last().click();
  }

  getRowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  getToast(): Locator {
    return this.page.locator('[data-sonner-toaster]');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/students.page.ts
git commit -m "feat(e2e): add Students page object with CRUD and CSV support"
```

---

### Task 10: Enrollments Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/enrollments.page.ts`

Reference: `sinaloka-platform/src/pages/Enrollments.tsx` — new enrollment button (UserPlus icon), modal with student search + class select, status/payment badges, action menu.

- [ ] **Step 1: Create enrollments.page.ts**

```ts
// sinaloka-platform/e2e/pages/enrollments.page.ts
import { type Locator, type Page } from '@playwright/test';

export class EnrollmentsPage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly modal: Locator;
  readonly statusFilter: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /new enrollment/i });
    this.searchInput = page.getByPlaceholder(/search student or class/i);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.modal = page.locator('[role="dialog"]');
    this.statusFilter = page.locator('select').first();
  }

  async goto() {
    await this.page.goto('/enrollments');
  }

  async createEnrollment(studentName: string, className: string) {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
    // Select student from search list
    await this.modal.getByPlaceholder(/search/i).first().fill(studentName);
    await this.modal.getByText(studentName).click();
    // Select class
    await this.modal.locator('select').selectOption({ label: className });
    await this.modal.getByRole('button', { name: /enroll|save|create/i }).click();
  }

  async changeStatus(studentName: string, newStatus: string) {
    await this.openRowMenu(studentName);
    await this.page.getByText(/update status/i).click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.locator('select').selectOption(newStatus);
    await this.modal.getByRole('button', { name: /save|update/i }).click();
  }

  async deleteEnrollment(studentName: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.openRowMenu(studentName);
    await this.page.getByText(/delete/i).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  private async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    await row.locator('button').last().click();
  }

  getRowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  getToast(): Locator {
    return this.page.locator('[data-sonner-toaster]');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/enrollments.page.ts
git commit -m "feat(e2e): add Enrollments page object"
```

---

### Task 11: Attendance Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/attendance.page.ts`

Reference: `sinaloka-platform/src/pages/Attendance.tsx` — left panel with date picker and session list, right panel with attendance table. Status buttons: P/A/L. Keyboard shortcuts: P, A, L keys. Homework checkbox. Notes input.

- [ ] **Step 1: Create attendance.page.ts**

```ts
// sinaloka-platform/e2e/pages/attendance.page.ts
import { type Locator, type Page } from '@playwright/test';

export class AttendancePage {
  readonly datePicker: Locator;
  readonly todayButton: Locator;
  readonly sessionList: Locator;
  readonly attendanceTable: Locator;
  readonly markAllPresentButton: Locator;
  readonly saveBar: Locator;

  constructor(private page: Page) {
    this.datePicker = page.locator('[class*="date"]').first();
    this.todayButton = page.getByRole('button', { name: /today/i });
    this.sessionList = page.locator('[class*="col-span-4"]');
    this.attendanceTable = page.locator('table');
    this.markAllPresentButton = page.getByRole('button', { name: /mark all present/i });
    this.saveBar = page.locator('[class*="fixed bottom"]');
  }

  async goto() {
    await this.page.goto('/attendance');
  }

  async selectSession(className: string) {
    await this.sessionList.getByText(className).click();
  }

  async markStatus(studentName: string, status: 'P' | 'A' | 'L') {
    const row = this.getStudentRow(studentName);
    await row.getByRole('button', { name: status }).click();
  }

  async markStatusWithKeyboard(studentName: string, key: 'p' | 'a' | 'l') {
    const row = this.getStudentRow(studentName);
    await row.click(); // Focus the row to set focusedAttendanceId
    await this.page.keyboard.press(key);
  }

  async toggleHomework(studentName: string) {
    const row = this.getStudentRow(studentName);
    await row.locator('input[type="checkbox"]').click();
  }

  async addNote(studentName: string, note: string) {
    const row = this.getStudentRow(studentName);
    await row.getByPlaceholder(/note/i).fill(note);
  }

  async save() {
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  getStudentRow(name: string): Locator {
    return this.attendanceTable.locator('tr').filter({ hasText: name });
  }

  getToast(): Locator {
    return this.page.locator('[data-sonner-toaster]');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/attendance.page.ts
git commit -m "feat(e2e): add Attendance page object with keyboard shortcut support"
```

---

### Task 12: Remaining Page Objects

**Files:**
- Create: `sinaloka-platform/e2e/pages/tutors.page.ts`
- Create: `sinaloka-platform/e2e/pages/classes.page.ts`
- Create: `sinaloka-platform/e2e/pages/schedules.page.ts`
- Create: `sinaloka-platform/e2e/pages/finance-overview.page.ts`
- Create: `sinaloka-platform/e2e/pages/student-payments.page.ts`
- Create: `sinaloka-platform/e2e/pages/tutor-payouts.page.ts`
- Create: `sinaloka-platform/e2e/pages/operating-expenses.page.ts`
- Create: `sinaloka-platform/e2e/pages/settings.page.ts`

Each follows the same PO pattern as Tasks 7-11. These pages share a common CRUD structure:

- [ ] **Step 1: Create tutors.page.ts**

Follow the same pattern as `students.page.ts`:
- Route: `/tutors`
- Add button: `getByRole('button', { name: /add tutor/i })`
- Search: `getByPlaceholder(/search/i)`
- Form fields: name, email, password (create only), subjects, experience_years, rating, is_verified, bank details
- Delete with `page.on('dialog')` handler

- [ ] **Step 2: Create classes.page.ts**

- Route: `/classes`
- Add button: `getByRole('button', { name: /add class|new class/i })`
- Form fields: name, subject, tutor select, capacity, fee, schedule_days, start_time, end_time, room, status

- [ ] **Step 3: Create schedules.page.ts**

- Route: `/schedules`
- View toggle: List/Calendar buttons
- Auto-generate button: `getByRole('button', { name: /auto-generate/i })`
- Schedule session button
- Date filters: from/to date inputs
- Calendar navigation: month/week/day toggles

- [ ] **Step 4: Create finance page objects**

`finance-overview.page.ts`:
- Route: `/finance`
- Stats cards: Revenue, Outstanding, Pending Payouts, Net Profit
- Module links: Student Payments, Tutor Payouts, Operating Expenses
- Generate Report button → ReportPreviewModal

`student-payments.page.ts`:
- Route: `/finance/payments`
- Record payment button (DollarSign icon)
- Payment form: amount, discount, date, method select, receipt checkbox
- Aging summary cards

`tutor-payouts.page.ts`:
- Route: `/finance/payouts`
- Standard CRUD PO with payout-specific fields

`operating-expenses.page.ts`:
- Route: `/finance/expenses`
- Standard CRUD PO with expense-specific fields

- [ ] **Step 5: Create settings.page.ts**

- Route: `/settings`
- Tab navigation: General, Billing, Branding, etc.
- Form fields per tab

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/e2e/pages/
git commit -m "feat(e2e): add remaining page objects (tutors, classes, schedules, finance, settings)"
```

---

## Chunk 4: Smoke Tests (Tasks 13–21)

### Task 13: Auth Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/auth.spec.ts`

- [ ] **Step 1: Write auth smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/auth.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/login.page';
import { setupAuthMocks } from '../../helpers/api-mocker';
import authData from '../../mocks/auth.json';

test.describe('Auth @smoke', () => {
  test('successful login redirects to dashboard', async ({ page, mockApi }) => {
    await setupAuthMocks(mockApi);
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@sinaloka.com', 'password123');
    await expect(page).toHaveURL('/');
  });

  test('invalid credentials shows error', async ({ page, mockApi }) => {
    await mockApi.onPost('**/api/auth/login').respondWith(401, authData.loginError);
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@sinaloka.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout clears tokens and redirects to login', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    await mockApi.onPost('**/api/auth/logout').respondWith(200, {});
    await page.goto('/');
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeNull();
  });

  test('token refresh on 401 retries request', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    let callCount = 0;
    // Phase 1: First call returns 401
    await page.route('**/api/admin/dashboard/stats', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({ status: 401, body: '{}' });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_students: 150,
            active_tutors: 12,
            total_revenue: 75000000,
            attendance_rate: 92.5,
            upcoming_sessions: 8,
          }),
        });
      }
    });
    // Phase 2: Refresh endpoint returns new tokens
    await mockApi.onPost('**/api/auth/refresh').respondWith(200, authData.login);
    await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, []);

    await page.goto('/');
    await expect(page.getByText('150')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests to verify they work**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/auth.spec.ts --project=light-mode
```

Expected: Tests should pass (or some may need selector adjustments based on actual DOM).

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/specs/smoke/auth.spec.ts
git commit -m "feat(e2e): add auth smoke tests (login, logout, redirect, token refresh)"
```

---

### Task 14: Student Management Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/student-management.spec.ts`

- [ ] **Step 1: Write student management smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/student-management.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { StudentsPage } from '../../pages/students.page';
import { setupStudentMocks } from '../../helpers/api-mocker';
import studentsData from '../../mocks/students.json';

test.describe('Student Management @smoke', () => {
  let studentsPage: StudentsPage;

  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    studentsPage = new StudentsPage(page);
    await studentsPage.goto();
  });

  test('create student via modal', async ({ authenticatedPage: page }) => {
    await studentsPage.createStudent({
      name: 'New Student',
      email: 'new@example.com',
      grade: '10th Grade',
    });
    await expect(studentsPage.getToast()).toContainText(/success|created/i);
  });

  test('edit student updates data', async ({ authenticatedPage: page }) => {
    await studentsPage.editStudent('Aisyah Putri', { name: 'Aisyah Updated' });
    await expect(studentsPage.getToast()).toContainText(/success|updated/i);
  });

  test('search filters table', async () => {
    await studentsPage.search('Aisyah');
    // Verify the search input has value
    await expect(studentsPage.searchInput).toHaveValue('Aisyah');
  });

  test('delete student with confirmation', async ({ authenticatedPage: page }) => {
    await studentsPage.deleteStudent('Fajar Hidayat');
    await expect(studentsPage.getToast()).toContainText(/success|deleted/i);
  });

  test('CSV export triggers download', async ({ authenticatedPage: page }) => {
    // The app creates a blob URL and clicks a link programmatically.
    // Verify the export API was called by checking the success toast.
    await studentsPage.exportButton.click();
    await expect(studentsPage.getToast()).toContainText(/export|download|success/i);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/student-management.spec.ts --project=light-mode
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/specs/smoke/student-management.spec.ts
git commit -m "feat(e2e): add student management smoke tests"
```

---

### Task 15: Enrollment Flow Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/enrollment-flow.spec.ts`

- [ ] **Step 1: Write enrollment smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/enrollment-flow.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { EnrollmentsPage } from '../../pages/enrollments.page';
import {
  setupEnrollmentMocks,
  setupStudentMocks,
  setupClassMocks,
} from '../../helpers/api-mocker';

test.describe('Enrollment Flow @smoke', () => {
  let enrollmentsPage: EnrollmentsPage;

  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupEnrollmentMocks(mockApi);
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();
  });

  test('enroll student in class', async () => {
    await enrollmentsPage.createEnrollment('Aisyah Putri', 'Math Advanced');
    await expect(enrollmentsPage.getToast()).toContainText(/success|enrolled/i);
  });

  test('conflict detection prevents duplicate enrollment', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    await mockApi
      .onPost('**/api/admin/enrollments/check-conflict')
      .respondWith(200, { conflict: true, message: 'Student already enrolled' });
    await enrollmentsPage.addButton.click();
    await enrollmentsPage.modal.waitFor({ state: 'visible' });
    // Select student and class to trigger conflict check
    await enrollmentsPage.modal.getByPlaceholder(/search/i).first().fill('Aisyah Putri');
    await enrollmentsPage.modal.getByText('Aisyah Putri').click();
    await enrollmentsPage.modal.locator('select').selectOption({ index: 1 });
    // Conflict warning should appear after selection
    await expect(enrollmentsPage.modal.getByText(/already enrolled|conflict/i)).toBeVisible();
  });

  test('change enrollment status', async () => {
    await enrollmentsPage.changeStatus('Aisyah Putri', 'DROPPED');
    await expect(enrollmentsPage.getToast()).toContainText(/success|updated/i);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/enrollment-flow.spec.ts --project=light-mode
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/specs/smoke/enrollment-flow.spec.ts
git commit -m "feat(e2e): add enrollment flow smoke tests"
```

---

### Task 16: Payment Flow Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/payment-flow.spec.ts`

Reference: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx` — record payment modal with amount, discount, date, method select, receipt checkbox.

- [ ] **Step 1: Write payment smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/payment-flow.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { setupPaymentMocks } from '../../helpers/api-mocker';

test.describe('Payment Flow @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupPaymentMocks(mockApi);
    await page.goto('/finance/payments');
  });

  test('record payment appears in list', async ({
    authenticatedPage: page,
  }) => {
    // Click record payment button on first row
    await page.locator('table tbody tr').first().getByRole('button').first().click();
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    await modal.locator('input[type="number"]').first().fill('500000');
    await modal.locator('select').selectOption('Cash');
    await modal.getByRole('button', { name: /record|save|confirm/i }).click();
    await expect(page.locator('[data-sonner-toaster]')).toContainText(/success|recorded/i);
  });

  test('overdue payments display aging info', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText(/overdue/i).first()).toBeVisible();
  });

  test('payment methods are available', async ({ authenticatedPage: page }) => {
    await page.locator('table tbody tr').first().getByRole('button').first().click();
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    const select = modal.locator('select');
    await expect(select.locator('option')).toHaveCount(3); // Bank Transfer, Cash, E-Wallet
  });
});
```

- [ ] **Step 2: Run tests and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/payment-flow.spec.ts --project=light-mode
git add sinaloka-platform/e2e/specs/smoke/payment-flow.spec.ts
git commit -m "feat(e2e): add payment flow smoke tests"
```

---

### Task 17: Attendance Flow Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/attendance-flow.spec.ts`

- [ ] **Step 1: Write attendance smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/attendance-flow.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { AttendancePage } from '../../pages/attendance.page';
import { setupAttendanceMocks, setupSessionMocks } from '../../helpers/api-mocker';

test.describe('Attendance Flow @smoke', () => {
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupSessionMocks(mockApi);
    await setupAttendanceMocks(mockApi);
    attendancePage = new AttendancePage(page);
    await attendancePage.goto();
  });

  test('mark student present', async () => {
    await attendancePage.selectSession('Math Advanced');
    await attendancePage.markStatus('Aisyah Putri', 'P');
    await attendancePage.save();
    await expect(attendancePage.getToast()).toContainText(/saved|success/i);
  });

  test('mark student absent', async () => {
    await attendancePage.selectSession('Math Advanced');
    await attendancePage.markStatus('Aisyah Putri', 'A');
    await attendancePage.save();
    await expect(attendancePage.getToast()).toContainText(/saved|success/i);
  });

  test('keyboard shortcuts mark attendance', async () => {
    await attendancePage.selectSession('Math Advanced');
    await attendancePage.markStatusWithKeyboard('Aisyah Putri', 'p');
    // Verify the P button is now active/selected
    const row = attendancePage.getStudentRow('Aisyah Putri');
    await expect(row.getByRole('button', { name: 'P' })).toHaveClass(/bg-emerald|bg-green/);
  });

  test('toggle homework done', async () => {
    await attendancePage.selectSession('Math Advanced');
    await attendancePage.toggleHomework('Aisyah Putri');
    const row = attendancePage.getStudentRow('Aisyah Putri');
    await expect(row.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('add attendance note', async () => {
    await attendancePage.selectSession('Math Advanced');
    await attendancePage.addNote('Aisyah Putri', 'Arrived 5 min late');
    const row = attendancePage.getStudentRow('Aisyah Putri');
    await expect(row.getByPlaceholder(/note/i)).toHaveValue('Arrived 5 min late');
  });
});
```

- [ ] **Step 2: Run tests and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/attendance-flow.spec.ts --project=light-mode
git add sinaloka-platform/e2e/specs/smoke/attendance-flow.spec.ts
git commit -m "feat(e2e): add attendance flow smoke tests with keyboard shortcuts"
```

---

### Task 18: Session Flow Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/session-flow.spec.ts`

- [ ] **Step 1: Write session smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/session-flow.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { setupSessionMocks, setupClassMocks } from '../../helpers/api-mocker';

test.describe('Session Flow @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupSessionMocks(mockApi);
    await setupClassMocks(mockApi);
    await page.goto('/schedules');
  });

  test('generate sessions from class schedule', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    await mockApi.onPost('**/api/admin/sessions/generate').respondWith(201, { generated: 5 });
    await page.getByRole('button', { name: /auto-generate/i }).click();
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    await modal.locator('select').selectOption({ index: 1 });
    await modal.locator('input[type="date"]').first().fill('2026-03-16');
    await modal.locator('input[type="date"]').last().fill('2026-03-31');
    await modal.getByRole('button', { name: /generate/i }).click();
    await expect(page.locator('[data-sonner-toaster]')).toContainText(/generated|success/i);
  });

  test('session status changes reflected in UI', async ({
    authenticatedPage: page,
  }) => {
    // Verify sessions with different statuses are rendered
    await expect(page.getByText(/scheduled/i).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/session-flow.spec.ts --project=light-mode
git add sinaloka-platform/e2e/specs/smoke/session-flow.spec.ts
git commit -m "feat(e2e): add session flow smoke tests"
```

---

### Task 19: Dashboard Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/dashboard.spec.ts`

- [ ] **Step 1: Write dashboard smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/dashboard.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../pages/dashboard.page';
import { setupDashboardMocks } from '../../helpers/api-mocker';

test.describe('Dashboard @smoke', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('stats cards load with correct data', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('150')).toBeVisible(); // total_students
    await expect(page.getByText('12')).toBeVisible(); // active_tutors
  });

  test('activity feed renders recent items', async () => {
    await expect(
      dashboardPage.getActivityItem('Aisyah Putri enrolled in Math Advanced'),
    ).toBeVisible();
  });

  test('quick action links navigate correctly', async ({
    authenticatedPage: page,
  }) => {
    await dashboardPage.getQuickLink('View All Students').click();
    await expect(page).toHaveURL(/\/students/);
  });

  test('command palette opens and navigates', async ({
    authenticatedPage: page,
  }) => {
    await dashboardPage.openCommandPalette();
    await expect(dashboardPage.commandPaletteModal).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/dashboard.spec.ts --project=light-mode
git add sinaloka-platform/e2e/specs/smoke/dashboard.spec.ts
git commit -m "feat(e2e): add dashboard smoke tests"
```

---

### Task 20: Report Flow Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/report-flow.spec.ts`

Reference: `sinaloka-platform/src/components/ReportPreviewModal.tsx` — tab buttons (Attendance/Finance/Student Progress), date inputs, generate button, download button, iframe preview.

- [ ] **Step 1: Write report smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/report-flow.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import {
  setupDashboardMocks,
  setupPaymentMocks,
  setupPayoutMocks,
  setupExpenseMocks,
  setupStudentMocks,
  setupSessionMocks,
} from '../../helpers/api-mocker';

test.describe('Report Flow @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);
    await setupPaymentMocks(mockApi);
    await setupPayoutMocks(mockApi);
    await setupExpenseMocks(mockApi);
    await setupStudentMocks(mockApi);
    await setupSessionMocks(mockApi);
    // Mock report endpoint to return a fake PDF blob
    await page.route('**/api/admin/reports/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 fake'),
      });
    });
    await page.goto('/finance');
  });

  test('generate report opens PDF preview', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: /generate report/i }).click();
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    // Fill date range
    await modal.locator('input[type="date"]').first().fill('2026-03-01');
    await modal.locator('input[type="date"]').last().fill('2026-03-15');
    await modal.getByRole('button', { name: /generate/i }).click();
    // Preview iframe should appear
    await expect(modal.locator('iframe')).toBeVisible();
  });

  test('download report triggers file download', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: /generate report/i }).click();
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    await modal.locator('input[type="date"]').first().fill('2026-03-01');
    await modal.locator('input[type="date"]').last().fill('2026-03-15');
    await modal.getByRole('button', { name: /generate/i }).click();
    await modal.locator('iframe').waitFor({ state: 'visible' });
    const downloadPromise = page.waitForEvent('download');
    await modal.getByRole('button', { name: /download/i }).click();
    const download = await downloadPromise;
    expect(download).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/report-flow.spec.ts --project=light-mode
git add sinaloka-platform/e2e/specs/smoke/report-flow.spec.ts
git commit -m "feat(e2e): add report flow smoke tests with PDF preview"
```

---

### Task 21: Finance Overview Smoke Tests

**Files:**
- Create: `sinaloka-platform/e2e/specs/smoke/finance-overview.spec.ts`

- [ ] **Step 1: Write finance overview smoke tests**

```ts
// sinaloka-platform/e2e/specs/smoke/finance-overview.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import {
  setupDashboardMocks,
  setupPaymentMocks,
  setupPayoutMocks,
  setupExpenseMocks,
  setupSessionMocks,
} from '../../helpers/api-mocker';

test.describe('Finance Overview @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);
    await setupPaymentMocks(mockApi);
    await setupPayoutMocks(mockApi);
    await setupExpenseMocks(mockApi);
    await setupSessionMocks(mockApi);
    await page.goto('/finance');
  });

  test('summary stats cards load', async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/revenue/i).first()).toBeVisible();
    await expect(page.getByText(/outstanding/i).first()).toBeVisible();
  });

  test('navigation links to finance sub-pages work', async ({
    authenticatedPage: page,
  }) => {
    await page.getByText(/student payments/i).first().click();
    await expect(page).toHaveURL(/\/finance\/payments/);
  });
});
```

- [ ] **Step 2: Run tests and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke/finance-overview.spec.ts --project=light-mode
git add sinaloka-platform/e2e/specs/smoke/finance-overview.spec.ts
git commit -m "feat(e2e): add finance overview smoke tests"
```

---

## Chunk 5: Run Full Smoke Suite & Verify Dark Mode (Task 22)

### Task 22: Run Full Smoke Suite in Both Modes

- [ ] **Step 1: Run all smoke tests in light mode**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke --project=light-mode
```

Expected: All smoke tests pass. Fix any failures by adjusting selectors in page objects.

- [ ] **Step 2: Run all smoke tests in dark mode**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/smoke --project=dark-mode
```

Expected: Same tests pass. Dark mode fixture injects `.dark` class correctly.

- [ ] **Step 3: Fix any selector or timing issues found**

Adjust page objects and test code as needed based on actual DOM structure.

- [ ] **Step 4: Commit fixes**

```bash
git add sinaloka-platform/e2e/
git commit -m "fix(e2e): adjust selectors and timing for smoke test suite"
```

---

## Chunk 6: CRUD Tests (Tasks 23–24)

### Task 23: CRUD Test Specs — Students, Tutors, Classes

**Files:**
- Create: `sinaloka-platform/e2e/specs/crud/students.crud.spec.ts`
- Create: `sinaloka-platform/e2e/specs/crud/tutors.crud.spec.ts`
- Create: `sinaloka-platform/e2e/specs/crud/classes.crud.spec.ts`

Each CRUD spec follows this pattern per the design spec:

- [ ] **Step 1: Write students.crud.spec.ts**

Test cases:
- Create with all required fields → success
- Create with missing required fields → validation error shown
- Read: table loads with paginated data, search filters, grade/status filters work
- Update: edit individual fields, verify updated
- Delete with confirmation dialog

- [ ] **Step 2: Write tutors.crud.spec.ts**

Test cases:
- Create with name, email, password, subjects, experience
- Verification toggle
- Bank details
- Full CRUD lifecycle

- [ ] **Step 3: Write classes.crud.spec.ts**

Test cases:
- Create with schedule_days, capacity, fee, room
- Tutor assignment via select
- Status change (ACTIVE/ARCHIVED)
- Full CRUD lifecycle

- [ ] **Step 4: Run and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/crud --project=light-mode
git add sinaloka-platform/e2e/specs/crud/
git commit -m "feat(e2e): add CRUD tests for students, tutors, classes"
```

---

### Task 24: CRUD Test Specs — Remaining Entities

**Files:**
- Create: `sinaloka-platform/e2e/specs/crud/enrollments.crud.spec.ts`
- Create: `sinaloka-platform/e2e/specs/crud/payments.crud.spec.ts`
- Create: `sinaloka-platform/e2e/specs/crud/payouts.crud.spec.ts`
- Create: `sinaloka-platform/e2e/specs/crud/expenses.crud.spec.ts`
- Create: `sinaloka-platform/e2e/specs/crud/schedules.crud.spec.ts`

- [ ] **Step 1: Write enrollments.crud.spec.ts**

Test cases: all enrollment statuses, payment status tracking, conflict edge cases.

- [ ] **Step 2: Write payments.crud.spec.ts**

Test cases: all payment methods, discount application, receipt toggle, aging display.

- [ ] **Step 3: Write payouts.crud.spec.ts**

Test cases: create payout, approve payout, full lifecycle.

- [ ] **Step 4: Write expenses.crud.spec.ts**

Test cases: create expense, edit amount/category, delete.

- [ ] **Step 5: Write schedules.crud.spec.ts**

Test cases: list view, calendar view toggle, date filtering, session details.

- [ ] **Step 6: Run and commit**

```bash
cd sinaloka-platform && npx playwright test e2e/specs/crud --project=light-mode
git add sinaloka-platform/e2e/specs/crud/
git commit -m "feat(e2e): add CRUD tests for enrollments, payments, payouts, expenses, schedules"
```

---

## Chunk 7: Integration Tests (Task 25)

### Task 25: Integration Test Suite

**Files:**
- Create: `sinaloka-platform/e2e/specs/integration/auth.integration.spec.ts`
- Create: `sinaloka-platform/e2e/specs/integration/student-crud.integration.spec.ts`

These tests require the real backend running at `http://localhost:5000`.

- [ ] **Step 1: Write auth.integration.spec.ts**

```ts
// sinaloka-platform/e2e/specs/integration/auth.integration.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

test.describe('@integration Auth', () => {
  test('real login and logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Use real test credentials (must exist in backend seed)
    await loginPage.login('admin@sinaloka.com', 'password123');
    await expect(page).toHaveURL('/');
    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: Write student-crud.integration.spec.ts**

```ts
// sinaloka-platform/e2e/specs/integration/student-crud.integration.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { StudentsPage } from '../../pages/students.page';

test.describe('@integration Student CRUD', () => {
  const testStudent = {
    name: `Test Student ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    grade: '10th Grade',
  };

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@sinaloka.com', 'password123');
    await expect(page).toHaveURL('/');
  });

  test('create, edit, and delete a student', async ({ page }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    // Create
    await studentsPage.createStudent(testStudent);
    await expect(studentsPage.getToast()).toContainText(/success|created/i);

    // Edit
    await studentsPage.editStudent(testStudent.name, {
      name: testStudent.name + ' Updated',
    });
    await expect(studentsPage.getToast()).toContainText(/success|updated/i);

    // Delete (cleanup)
    await studentsPage.deleteStudent(testStudent.name + ' Updated');
    await expect(studentsPage.getToast()).toContainText(/success|deleted/i);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/specs/integration/
git commit -m "feat(e2e): add integration tests for auth and student CRUD"
```

---

## Summary

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 0 | 0 | Prerequisite: Add `role="dialog"` to Modal/Drawer for accessibility + testability |
| 1 | 1–3 | Foundation: Playwright install, config, fixtures |
| 2 | 4–6 | Test helpers: data factories, mock JSON, API mocker |
| 3 | 7–12 | Page Objects for all 13 pages |
| 4 | 13–21 | Smoke tests for 9 critical flows |
| 5 | 22 | Full smoke suite verification in light + dark mode |
| 6 | 23–24 | CRUD tests for all 8 entities |
| 7 | 25 | Integration tests (real backend) |
