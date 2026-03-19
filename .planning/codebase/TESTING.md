# Testing Patterns

**Analysis Date:** 2026-03-19

## Overview

| Layer | Framework | Test Count | Location |
|-------|-----------|-----------|----------|
| Backend unit tests | Jest 30.x + ts-jest | ~37 spec files | `sinaloka-backend/src/modules/*/*.spec.ts` |
| Platform E2E | Playwright 1.58.x | ~19 spec files | `sinaloka-platform/e2e/specs/` |
| Frontend unit tests | None configured | — | — |

## Backend Testing (Jest)

### Configuration

- **Framework:** Jest 30.x with `ts-jest` transform
- **Config:** `sinaloka-backend/jest.config.ts`
- **Custom setup:** Global setup/teardown patches Prisma's generated `package.json` for CJS compatibility
- **Module mapper:** Redirects `generated/prisma/client` to `test/prisma-client-shim` for test isolation

### Test Structure

Each backend module has two test files co-located with source:

```
src/modules/student/
├── student.service.ts
├── student.service.spec.ts      # Service unit tests
├── student.controller.ts
└── student.controller.spec.ts   # Controller unit tests
```

### Mocking Strategy

**Services** mock `PrismaService` and other dependencies:
```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    StudentService,
    { provide: PrismaService, useValue: mockPrismaService },
    { provide: ConfigService, useValue: mockConfigService },
  ],
}).compile();
```

**Controllers** mock the corresponding service:
```typescript
const module: TestingModule = await Test.createTestingModule({
  controllers: [StudentController],
  providers: [
    { provide: StudentService, useValue: mockStudentService },
  ],
}).compile();
```

### Running Tests

```bash
cd sinaloka-backend
npm run test                              # All unit tests
npm run test -- --testPathPattern=student  # Single module
npm run test -- --ci                      # CI mode
npm run test:e2e                          # E2E tests (backend)
```

## Platform E2E Testing (Playwright)

### Configuration

- **Config:** `sinaloka-platform/e2e/playwright.config.ts`
- **Projects:** `light-mode` and `dark-mode` (same tests, different theme)
- **Browser:** Chromium (default)
- **Base URL:** `http://localhost:3000` (Vite dev server)

### Test Organization

```
e2e/specs/
├── smoke/                    # Quick validation tests (9 specs)
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   ├── student-management.spec.ts
│   ├── enrollment-flow.spec.ts
│   ├── session-flow.spec.ts
│   ├── attendance-flow.spec.ts
│   ├── payment-flow.spec.ts
│   ├── finance-overview.spec.ts
│   └── report-flow.spec.ts
├── crud/                     # CRUD operation tests (8 specs)
│   ├── students.crud.spec.ts
│   ├── tutors.crud.spec.ts
│   ├── classes.crud.spec.ts
│   ├── enrollments.crud.spec.ts
│   ├── expenses.crud.spec.ts
│   ├── payments.crud.spec.ts
│   ├── payouts.crud.spec.ts
│   └── schedules.crud.spec.ts
└── integration/              # Integration flow tests (2 specs)
    ├── auth.integration.spec.ts
    └── student-crud.integration.spec.ts
```

### API Mocking

All E2E tests mock the backend API using Playwright route interception — no real backend needed.

**Mock API fixture** (`e2e/fixtures/mock-api.fixture.ts`):
- `MockApi` class wraps `page.route()` for method-aware mocking
- `MockRoute` supports `.delay(ms)` for simulating latency
- Methods: `onGet()`, `onPost()`, `onPatch()`, `onPut()`, `onDelete()`

**Setup helpers** (`e2e/helpers/api-mocker.ts`):
```typescript
// Pre-configured mock setups per domain
await setupAuthMocks(mockApi);       // Login, me, refresh, logout
await setupStudentMocks(mockApi);    // CRUD + export/import
await setupTutorMocks(mockApi);      // CRUD operations
```

**Mock data** (`e2e/mocks/*.json`):
- 12 JSON files, one per domain
- Structured to match backend API response format
- Used by setup helpers and directly in tests

### Auth Fixture

**Auth fixture** (`e2e/fixtures/auth.fixture.ts`):
- Extends Playwright's `test` with `authenticatedPage` fixture
- Injects test tokens into `localStorage` via `addInitScript()`
- Mocks `/api/auth/me` and `/api/auth/refresh` endpoints
- Supports dark mode via project name detection

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('student list loads', async ({ authenticatedPage, mockApi }) => {
  await setupStudentMocks(mockApi);
  await authenticatedPage.goto('/students');
  await expect(authenticatedPage.locator('table')).toBeVisible();
});
```

### Page Objects

13 page object classes in `e2e/pages/`:

| Page Object | File | Covers |
|-------------|------|--------|
| `LoginPage` | `login.page.ts` | Login form |
| `DashboardPage` | `dashboard.page.ts` | Dashboard widgets |
| `StudentsPage` | `students.page.ts` | Student CRUD |
| `TutorsPage` | `tutors.page.ts` | Tutor CRUD |
| `ClassesPage` | `classes.page.ts` | Class management |
| `EnrollmentsPage` | `enrollments.page.ts` | Enrollment management |
| `SchedulesPage` | `schedules.page.ts` | Session scheduling |
| `AttendancePage` | `attendance.page.ts` | Attendance marking |
| `StudentPaymentsPage` | `student-payments.page.ts` | Payment management |
| `TutorPayoutsPage` | `tutor-payouts.page.ts` | Payout management |
| `OperatingExpensesPage` | `operating-expenses.page.ts` | Expense tracking |
| `FinanceOverviewPage` | `finance-overview.page.ts` | Finance dashboard |
| `SettingsPage` | `settings.page.ts` | Institution settings |

### Running E2E Tests

```bash
cd sinaloka-platform
npm run test:e2e           # All E2E tests
npm run test:e2e:smoke     # Smoke tests only
npm run test:e2e:light     # Light mode project
npm run test:e2e:dark      # Dark mode project
```

## Tutors App Testing

- **Playwright configured** (`e2e/` directory exists with `playwright.config.ts`) but **no test specs written**
- **No unit tests** — no Jest/Vitest configured
- **Test infrastructure:** Playwright 1.58.2 in devDependencies, but `e2e/specs/` is empty
- **Untested areas:** All hooks (`useSchedule`, `usePayouts`, `useAttendance`, `useProfile`), all mappers, attendance submission flow, reschedule flow, optimistic update logic

## Parent App Testing

- **No tests at all** — no Playwright, no Jest, no Vitest
- **No test infrastructure** — no test runner in devDependencies
- **Untested areas:** All hooks (`useChildren`, `useChildDetail`, `useAuth`), all mappers, invite-based registration, child data display, token refresh flow

## Test Gaps

- **No frontend unit tests** — no Jest/Vitest configured for React components or hooks in any app
- **No backend integration tests** with real database in CI (unit tests mock Prisma)
- **Tutors app** — Playwright configured but zero tests written
- **Parent app** — no test infrastructure at all
- **No API contract tests** between frontend and backend
- **Mapper functions untested** — Tutors and Parent mappers (`mapSession`, `mapChild`, `mapPayout`, etc.) have no unit tests despite being the only data transformation layer
- **Optimistic update logic untested** — Tutors `useSchedule.cancelSession()` does optimistic state updates with rollback, but no tests verify the rollback path
