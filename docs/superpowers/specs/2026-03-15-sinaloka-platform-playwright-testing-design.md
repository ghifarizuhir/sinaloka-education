# Sinaloka Platform — Playwright Testing Design Spec

## Overview

End-to-end testing strategy for `sinaloka-platform`, a React 19 + TypeScript educational management system. The platform has 14 routes, 10+ CRUD entities, JWT authentication, and zero existing test coverage.

## Goals

- Establish a Playwright E2E test suite using the Page Object Model pattern
- Start with smoke tests for 7 critical user flows, then expand to full CRUD coverage
- Use API mocking for fast/reliable tests, with a small real-backend integration suite
- Test both light and dark mode via Playwright projects
- Local development only (no CI pipeline for now)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Testing approach | Page Object Model | 14+ pages with shared patterns; PO keeps selectors maintainable |
| API strategy | Hybrid (mock + integration) | Mocked tests for speed/reliability; small integration suite for real API confidence |
| Priority flows | Auth → Students → Enrollments → Payments → Attendance → Sessions → Dashboard | Ordered by business criticality |
| Theme coverage | Light + dark mode | Both run same tests; dark mode injects `.dark` class via fixture |
| Browsers | Chromium only (local dev) | Add Firefox/WebKit when CI is introduced |
| Environment | Local only | Run via `npx playwright test` during development |

## Project Structure

```
sinaloka-platform/
  e2e/
    playwright.config.ts
    fixtures/
      auth.fixture.ts
      mock-api.fixture.ts
    mocks/
      auth.json
      students.json
      tutors.json
      classes.json
      enrollments.json
      sessions.json
      payments.json
      payouts.json
      attendance.json
      expenses.json
      reports.json
      dashboard.json
    pages/
      login.page.ts
      dashboard.page.ts
      students.page.ts
      tutors.page.ts
      classes.page.ts
      schedules.page.ts
      enrollments.page.ts
      attendance.page.ts
      finance-overview.page.ts
      student-payments.page.ts
      tutor-payouts.page.ts
      operating-expenses.page.ts
      settings.page.ts
    specs/
      smoke/
        auth.spec.ts
        student-management.spec.ts
        enrollment-flow.spec.ts
        payment-flow.spec.ts
        attendance-flow.spec.ts
        session-flow.spec.ts
        dashboard.spec.ts
      crud/
        students.crud.spec.ts
        tutors.crud.spec.ts
        classes.crud.spec.ts
        enrollments.crud.spec.ts
        payments.crud.spec.ts
        payouts.crud.spec.ts
        expenses.crud.spec.ts
      integration/
        auth.integration.spec.ts
        student-crud.integration.spec.ts
    helpers/
      test-data.ts
      api-mocker.ts
```

## Playwright Configuration

- **Base URL**: `http://localhost:5173` (Vite dev server default port)
- **API URL**: `http://localhost:5000` (backend; all `page.route()` mocks target this host)
- **Projects**: `light-mode` (default) and `dark-mode` (injects `.dark` class on `<html>`)
- **Browser**: Chromium only
- **Retries**: 0 (local dev)
- **Reporter**: HTML reporter for visual debugging
- **Test directory**: `e2e/specs`
- **Timeout**: 30s per test, 5s per action

## Fixtures

### Auth Fixture (`auth.fixture.ts`)

Extends Playwright's base `test` to provide a pre-authenticated page:

- Injects `access_token` and `refresh_token` into localStorage before navigation
- Mocks `GET http://localhost:5000/api/auth/me` (full URL match via `**/api/auth/me`) to return a test admin user
- Login page tests use the base `test` fixture (no pre-auth)
- Saves ~2-3s per test by skipping UI login

### Mock API Fixture (`mock-api.fixture.ts`)

Provides a `mockApi` helper wrapping `page.route()`:

- `mockApi.onGet(url).respondWith(status, data)` — mock GET requests
- `mockApi.onPost(url).respondWith(status, data)` — mock POST requests
- `mockApi.onPatch(url).respondWith(status, data)` — mock PATCH requests
- `mockApi.onPut(url).respondWith(status, data)` — mock PUT requests (future-proofing)
- `mockApi.onDelete(url).respondWith(status, data)` — mock DELETE requests
- All URL patterns use glob matching (e.g., `**/api/admin/students`) to match the full backend URL (`http://localhost:5000/api/...`)
- `.delay(ms)` — simulate network latency for loading state tests
- Error simulation: `.respondWith(422, { message: 'Validation failed' })`
- All mocked routes auto-cleared in fixture teardown

### Combined Export

```ts
import { test, expect } from '../fixtures/auth.fixture';
```

Tests import from the auth fixture which composes the mock API fixture, giving each test an authenticated page with mock API capabilities.

## Page Object Pattern

### Contract

```ts
class ExamplePage {
  // Locators — lazy, defined in constructor
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly modal: Locator;

  // Navigation
  async goto(): Promise<void>;

  // Actions — single responsibility, composable
  async createItem(data: FormData): Promise<void>;
  async editItem(identifier: string, data: Partial<FormData>): Promise<void>;
  async deleteItem(identifier: string): Promise<void>;
  async search(query: string): Promise<void>;

  // Locator helpers — return Locators for test assertions
  getRowByName(name: string): Locator;
  getToast(): Locator;
}
```

### Principles

- Locators defined once in the constructor, never duplicated
- Actions do one thing — tests compose them for multi-step flows
- No assertions inside Page Objects — tests own `expect()` calls
- Form fill methods accept typed data objects matching app DTOs
- Modal interactions (open, fill, submit, close) encapsulated per page
- `deleteItem()` methods must set up `page.on('dialog', d => d.accept())` before clicking delete (app uses `window.confirm()`)
- `getToast()` targets Sonner's `[data-sonner-toaster]` container for toast assertions
- Factory functions in `test-data.ts` produce objects conforming to actual types from `src/types/` (e.g., `Student`, `Tutor`, `Class`)

## Smoke Test Suite (Priority 1)

### 1. `auth.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Successful login | Enter valid credentials → redirects to dashboard |
| Invalid credentials | Enter wrong password → shows error message |
| Unauthenticated redirect | Visit protected route without token → redirects to /login |
| Logout | Click logout → clears tokens, redirects to /login |
| Token refresh | Three-phase mock: (1) mock API returning 401 on initial call, (2) mock `/api/auth/refresh` returning new tokens, (3) mock retried original call returning 200. Verifies the queue-based refresh in `api.ts` works end-to-end |

### 2. `student-management.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Create student | Open modal, fill form, submit → student appears in table |
| Edit student | Click edit, modify fields, save → updated data displayed |
| Search students | Type in search → table filters to matching results |
| Delete student | Set up `page.on('dialog')` handler to accept `confirm()`, click delete → student removed from table |
| CSV export | Click export → file downloads |
| CSV import | Upload CSV file → bulk students created |

### 3. `enrollment-flow.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Enroll student | Select student + class, submit → success toast |
| Conflict detection | Attempt duplicate enrollment → warning shown, prevented |
| Status change | Change status (ACTIVE/TRIAL/WAITLISTED/DROPPED) → updated in table |

### 4. `payment-flow.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Record payment | Fill amount, method, submit → appears in payment list |
| Payment aging | Verify overdue payments display correct aging info |
| Payment methods | Test CASH, TRANSFER, OTHER method options |

### 5. `attendance-flow.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Mark present/absent/late | Click status → updates attendance record |
| Keyboard shortcuts | Click a row to set `focusedAttendanceId`, then use keyboard shortcuts to mark attendance → works correctly |
| Homework toggle | Toggle homework done → state updates |
| Attendance notes | Add note to attendance record → saves |

### 6. `session-flow.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Generate sessions | Select class, generate → sessions created from schedule |
| Reschedule approval | Request reschedule → approve → session date updated |
| Status changes | Change session status → reflected in UI |

### 7. `dashboard.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Stats cards | Dashboard loads with correct stat values from mock data |
| Activity feed | Recent activity items render with correct content |
| Quick actions | Quick action links navigate to correct pages |
| Command palette | Open command palette, search, navigate to result |

### 8. `report-flow.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Generate report | Select report type (attendance/finance/student_progress), generate → PDF preview modal opens |
| Download report | Click download in preview modal → PDF file downloads |
| Report preview | Modal renders PDF blob correctly with preview iframe |

### 9. `finance-overview.spec.ts`

| Test Case | Description |
|-----------|-------------|
| Summary stats | Finance overview loads with revenue, expenses, payout summary cards |
| Navigation | Links to payments, payouts, expenses pages work correctly |

## CRUD Test Suite (Priority 2)

One spec file per entity covering the full create/read/update/delete lifecycle:

- `students.crud.spec.ts` — all student fields, validation, search, filter, pagination
- `tutors.crud.spec.ts` — tutor fields, subjects, bank details, verification
- `classes.crud.spec.ts` — schedule days, capacity, fee, room, status
- `enrollments.crud.spec.ts` — all statuses, payment status, conflict edge cases
- `payments.crud.spec.ts` — all methods, discount, receipt toggle
- `payouts.crud.spec.ts` — tutor payout records
- `expenses.crud.spec.ts` — expense categories, amounts
- `schedules.crud.spec.ts` — session calendar views, date filtering

Each CRUD spec tests:
- Create with all required fields
- Create with validation errors (missing required fields, invalid data)
- Read with pagination, search, and filters
- Update individual fields
- Delete with confirmation

## Integration Test Suite

Tagged with `@integration`, runs only when backend is available.

### `auth.integration.spec.ts`
- Real login with test credentials against running backend
- Token refresh with real tokens
- Logout clearing real session

### `student-crud.integration.spec.ts`
- Create a real student via the UI → verify in API
- Edit the student → verify changes persisted
- Delete the student → verify removed

### Running Integration Tests
```bash
# Skip integration tests (default)
npx playwright test --grep-invert @integration

# Run only integration tests (requires backend)
npx playwright test --grep @integration
```

Tests self-clean: any data created during integration tests is deleted in `afterEach`/`afterAll`.

## Dark Mode Testing

The app uses **class-based dark mode** (`.dark` class on `<html>`, defined via `@variant dark (&:where(.dark, .dark *))` in `index.css`), not `prefers-color-scheme` media queries. Playwright's `colorScheme` option alone will not trigger dark mode.

Both light and dark mode run the **same test files** via two Playwright projects:

```ts
// playwright.config.ts
projects: [
  { name: 'light-mode', use: {} },
  {
    name: 'dark-mode',
    use: {
      // Custom fixture injects .dark class
      storageState: undefined, // uses dark-mode auth fixture variant
    },
  },
]
```

The `dark-mode` project uses a fixture variant that calls `page.addInitScript()` to add the `.dark` class to `document.documentElement` before page load:

```ts
// In auth.fixture.ts, dark mode variant
await page.addInitScript(() => {
  document.documentElement.classList.add('dark');
});
```

This ensures the dark theme is active for all tests in the `dark-mode` project. If elements become invisible or unclickable due to theme bugs, tests fail naturally.

## Test Helpers

### `test-data.ts`
Factory functions for generating mock data:
- `createMockStudent(overrides?)` — returns a student object
- `createMockTutor(overrides?)` — returns a tutor object
- `createMockClass(overrides?)` — etc.
- Uses realistic fake data (not lorem ipsum)

### `api-mocker.ts`
Centralized mock setup for common API patterns:
- `setupStudentMocks(page, data?)` — mocks all student endpoints
- `setupDashboardMocks(page, data?)` — mocks dashboard endpoints
- Composable: tests can override specific routes after setup

## NPM Scripts

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:smoke": "playwright test e2e/specs/smoke",
  "test:e2e:integration": "playwright test --grep @integration",
  "test:e2e:light": "playwright test --project=light-mode",
  "test:e2e:dark": "playwright test --project=dark-mode"
}
```

## Dependencies to Install

```
@playwright/test (dev dependency)
```

No other dependencies needed — Playwright includes its own assertions, mocking, and browser management.
