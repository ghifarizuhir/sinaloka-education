# Playwright E2E Test Full Rewrite — Design Spec

**Date:** 2026-03-22
**Scope:** Full rewrite of all Playwright E2E tests for sinaloka-platform
**Reason:** ~60% of existing tests are outdated/broken after Sprint 4-5 changes

## Scope Exclusions

The following pages exist in `App.tsx` but are **excluded** from this rewrite:

| Route | Reason |
|---|---|
| `/registrations` | Read-only list page with minimal interaction, low regression risk |
| `/whatsapp` | External integration page, better tested via integration tests with real API |
| `/notifications` | Read-only notification list, low complexity |
| `/audit-logs` | Read-only log viewer, low regression risk |
| `/super/*` (SuperAdmin) | Separate admin context, different auth flow, out of scope |

These can be added incrementally in future sprints.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Selector strategy | Hybrid — `getByRole`/`getByLabel` primary, `data-testid` fallback for custom components | Semantic + pragmatic without full accessibility rewrite |
| Mock strategy | Full mock, fix all shapes to match current Prisma schema | Keeps CI fast, real API integration is separate project |
| Coverage depth | Smoke + CRUD + key negative cases (~5-8 tests per page) | 80% regression coverage, maintainable |
| i18n handling | Force English locale in test fixture | Test purpose is regressions, not translations |
| Dark mode | Removed — single light-mode project only | Dark mode bugs are visual, not functional; mock tests don't catch them |

## Test Structure

```
e2e/
├── playwright.config.ts          # Single project, light mode, en locale
├── fixtures/
│   ├── auth.fixture.ts           # Auth setup, force en locale, inject tokens
│   └── mock-api.fixture.ts       # Base fixture with ApiMocker instance
├── helpers/
│   ├── api-mocker.ts             # Route interceptor (keep pattern, fix implementation)
│   ├── test-data.ts              # Factory functions matching current Prisma schema
│   ├── confirm-dialog.ts         # Helper for ConfirmDialog (role="alertdialog", typed text + confirm)
│   └── confirm-changes-modal.ts  # Helper for ConfirmChangesModal (Settings save flow)
├── mocks/                        # Static JSON, ALL matching current schema shapes
│   ├── auth.json                 # role: "ADMIN", nested institution object
│   ├── students.json
│   ├── tutors.json               # nested user + tutor_subjects structure
│   ├── classes.json              # nested subject object + schedules array
│   ├── sessions.json
│   ├── enrollments.json
│   ├── payments.json
│   ├── payouts.json              # period_start/period_end, valid status enum
│   ├── expenses.json             # + is_recurring, receipt_url
│   ├── attendance.json
│   ├── dashboard.json            # + chart data (3 endpoints)
│   └── settings.json             # NEW: general, billing, academic
├── pages/                        # Page objects — hybrid selectors
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── students.page.ts
│   ├── classes.page.ts
│   ├── schedules.page.ts
│   ├── enrollments.page.ts
│   ├── tutors.page.ts
│   ├── attendance.page.ts
│   ├── payments.page.ts
│   ├── payouts.page.ts
│   ├── expenses.page.ts
│   ├── finance-overview.page.ts
│   └── settings.page.ts
└── specs/                        # Flat — one file per page
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    ├── students.spec.ts
    ├── classes.spec.ts
    ├── schedules.spec.ts
    ├── enrollments.spec.ts
    ├── tutors.spec.ts
    ├── attendance.spec.ts
    ├── payments.spec.ts
    ├── payouts.spec.ts
    ├── expenses.spec.ts
    ├── finance-overview.spec.ts  # Includes report modal tests (no standalone /reports route)
    └── settings.spec.ts
```

### Key Patterns

- **Flat spec structure** — No `crud/`, `smoke/`, `integration/` folders. One spec file per page with `describe` blocks inside.
- **ConfirmDialog helper** (`confirm-dialog.ts`) — Interacts with custom React `ConfirmDialog` (replaces all `page.on('dialog')` patterns). Finds element with `role="alertdialog"`, optionally types confirmation text (e.g. "delete") into the confirm input, clicks the confirm button. Signature: `confirmDialog(page, { typedText?: string })`. Used by: Students, Tutors, Enrollments, Payments, Payouts, Expenses, Settings (room/subject delete).
- **ConfirmChangesModal helper** (`confirm-changes-modal.ts`) — Separate helper for the Settings save flow. Both `ConfirmDialog` and `ConfirmChangesModal` use `role="alertdialog"`. Distinguish by `aria-labelledby` attribute: `ConfirmChangesModal` has `aria-labelledby="confirm-changes-title"`. Finds this specific element and clicks the Confirm button. Signature: `confirmChangesModal(page)`.
- **ClassDeleteModal exception** — The Classes page uses a bespoke `ClassDeleteModal` (wraps plain `<Modal>` with `role="dialog"`, not `role="alertdialog"`). It has `<Input id="delete-confirm">` where user types "delete". The Classes page object handles this directly: `page.locator('#delete-confirm').fill('delete')` then click confirm button. Does NOT use the shared `confirmDialog` helper.
- **Mock setup per page** — Each spec sets up only the mock endpoints its page needs. No implicit global mocks.
- **`data-testid` convention** — Format: `{page}-{element}`, e.g. `student-add-button`, `class-delete-confirm`. Only used as fallback when role/label selectors are not feasible (custom Select, custom Modal, etc).
- **English locale forced** — `auth.fixture.ts` already sets `localStorage` `sinaloka-lang=en` (keep this). The rewrite only changes the `TEST_USER` response shape (role casing, nested institution object).
- **Mock route isolation** — Each test gets a fresh `page` (Playwright default with `fullyParallel: true`). No route cleanup needed between tests. If a test needs to override a mock mid-test (e.g. token refresh → 401 then success), use `page.route()` directly after the initial mock setup — last-registered route wins for same URL pattern.

## Mock Data Schema Fixes

All mock JSON files must match current Prisma schema. Key fixes needed:

| File | Current (broken) | Fixed |
|---|---|---|
| `auth.json` | `role: "admin"`, `institution_id: 1` | `role: "ADMIN"`, `institution: { id, name, slug, ... }` |
| `tutors.json` | flat `subjects: ["Math"]` | `user: { name, email }`, `tutor_subjects: [{ subject: { id, name } }]` |
| `classes.json` | `subject: "Mathematics"`, `schedule_days` | `subject: { id, name }`, `schedules: [{ day, start_time, end_time }]` |
| `payouts.json` | `period: "2026-03"`, `status: "APPROVED"` | `period_start`, `period_end`, `status: "PROCESSING"` |
| `sessions.json` | missing fields | add `topic_covered`, `session_summary`, `created_by` |
| `expenses.json` | missing fields | add `is_recurring`, `receipt_url` |
| `dashboard.json` | missing chart data | add `attendance_trend`, `student_growth`, `revenue_expenses` |

## API Mock Coverage

All endpoints that each page calls must be mocked. New endpoints to add:

**Dashboard:** `GET /admin/dashboard/stats`, `GET /admin/dashboard/activity`, `GET /admin/dashboard/upcoming-sessions`, `GET /admin/dashboard/attendance-trend`, `GET /admin/dashboard/student-growth`, `GET /admin/dashboard/revenue-expenses`
**Tutors:** `POST /admin/tutors/invite`, `GET /admin/subjects`
**Classes:** `GET /subjects`, `GET /subjects/:id/tutors`, `GET /settings/billing`, `GET /settings/academic`
**Schedules:** `GET /admin/sessions/:id/students`, `POST /admin/sessions/generate`
**Enrollments:** `POST /admin/enrollments/check-conflict`, `GET /payments/overdue-summary`
**Attendance:** `GET /admin/sessions/:id/students`, `GET /admin/attendance/summary`
**Payments:** `GET /admin/payments/overdue-summary`
**Finance Overview:** `GET /admin/reports/financial-summary`, `GET /admin/reports/revenue-breakdown`, `GET /admin/reports/expense-breakdown`
**Finance Overview (report modal):** `GET /admin/reports/finance`, `GET /admin/reports/attendance`, `GET /admin/reports/student-progress` (all GET with query params, return PDF blob)
**Settings:** `GET/PATCH /settings/general`, `GET/PATCH /settings/billing`, `GET/PATCH /settings/academic`, `POST /auth/change-password`, `GET/POST/DELETE /admin/subjects`, `GET/PATCH /admin/registration-settings`

## Test Cases Per Page

### Auth (~10 tests)

**Smoke:**
- Successful login (ADMIN) → redirect to `/`
- Unauthenticated visit → redirect to `/login`
- Token refresh on 401 → retry request
- Logout → redirect to `/login`

**Positive:**
- SUPER_ADMIN login → redirect to `/super/institutions`
- Login with `?redirect=/students` → redirect preserved
- Already authenticated → redirect away from `/login`

**Negative:**
- Invalid credentials → error message shown
- Empty email/password → form blocked (HTML5 required)
- Network error → fallback error message

### Dashboard (~7 tests)

**Smoke:**
- 4 stat cards visible (Total Students, Active Tutors, Attendance Rate, Monthly Revenue)
- Activity feed shows items
- Upcoming sessions card visible
- Quick links navigate correctly (all 4)

**Positive:**
- Command palette opens, search filters actions, action navigates
- Overdue alert chip visible when `overdue_count > 0`

**Negative:**
- Charts show "No data yet" when endpoints return empty

### Students (~8 tests)

**Smoke:**
- Table loads with students, stats cards visible
- Search by name filters results
- Search no match → empty state

**CRUD:**
- Create student (name, grade, parent_name, parent_phone)
- Create with optional fields (email, phone, parent_email)
- Edit student name + grade
- Delete student (ConfirmDialog)

**Negative:**
- Empty name → validation error
- Missing grade → validation error
- Missing parent fields → validation error
- Invalid email → validation error
- Server 422 → toast error

### Tutors (~7 tests)

**Smoke:**
- Cards visible (grid view), search filters
- Status badges correct (Verified/Unverified/Pending)

**CRUD:**
- Invite tutor (name, email, subjects) → `POST /invite`
- Edit tutor (name, email, bank details, monthly_salary)
- Delete tutor (ConfirmDialog)

**Negative:**
- Empty name/email → validation error
- Duplicate email → server error toast

### Classes (~8 tests)

**Smoke:**
- Table loads with subject badge + tutor name
- Search filters, stats cards visible

**CRUD:**
- Create class (name, subject, tutor, schedule days + times, capacity, fee)
- Edit class name + capacity
- Delete class (ConfirmDialog, type "delete")

**Negative:**
- No name → validation error
- No subject → validation error
- No schedule days → validation error
- Capacity ≤ 0 → validation error

### Schedules (~7 tests)

**Smoke:**
- Loads in calendar view (default) — calendar component visible
- Switch to list view (click list toggle) → table visible
- Switch back to calendar → table hidden
- Calendar sub-views (month/week/day tabs) are **out of scope** — only test the list/calendar toggle

**CRUD:**
- Create session via `ScheduleSessionModal` (click "Schedule Session" button → select class, date, start/end time) → success toast
- Auto-generate via `GenerateSessionsModal` (click "Auto-Generate" button → select class, date range) → success toast with count
- Edit session via `EditSessionModal` (switch to list view → click row → session detail drawer opens → click "Edit Session" button → modal opens → edit date, time, status) → success toast
- Cancel session (list view → row dropdown → "Cancel Session") → status CANCELLED

**Negative:**
- No class selected in ScheduleSessionModal → submit button disabled
- No class selected in GenerateSessionsModal → generate button disabled

### Enrollments (~8 tests)

**Smoke:**
- Table loads with payment status badges
- Search by student/class
- Stats cards visible

**CRUD:**
- Enroll student (search, select class) → toast
- Change status (ACTIVE → TRIAL → WAITLISTED → DROPPED)
- Delete enrollment (ConfirmDialog)

**Negative:**
- No student selected → button disabled
- No class selected → button disabled
- Conflict detected → warning toast
- Server error → error toast

### Attendance (~8 tests)

**Smoke:**
- Session list visible, select session → table appears
- Present/Total counter visible

**CRUD:**
- Mark Present (P), Absent (A), Late (L)
- Toggle homework checkbox
- Add note
- Save → success toast

**Negative:**
- Locked session → inputs disabled
- Save with no changes → no-op

### Payments (~8 tests)

**Smoke:**
- Table with status badges (PAID/PENDING/OVERDUE)
- Status filter works
- Overdue aging text visible

**CRUD:**
- Record CASH, Record TRANSFER, Record with discount
- Delete payment (ConfirmDialog)

**Negative:**
- Empty amount → blocked
- Server error → error toast

### Payouts (~7 tests)

**Smoke:**
- Table with tutor name + status badge
- Search filters

**CRUD:**
- Create payout (tutor, amount, date, description) → toast
- Reconcile → confirm flow
- Delete (ConfirmDialog)

**Negative:**
- No tutor → blocked
- No amount → blocked

### Expenses (~7 tests)

**Smoke:**
- Table with category badges + amounts
- Summary cards visible

**CRUD:**
- Create expense (amount, date, category, description) — all 5 categories
- Edit expense (amount, category, date)
- Delete (ConfirmDialog)

**Negative:**
- Empty amount → toast error
- Empty date → toast error

### Settings (~10 tests)

**Smoke:**
- 6 tabs visible (General, Billing, Academic, Security, Registration, Plans), tab switching works

**General:** Edit name + email → Save → ConfirmChangesModal (uses `confirm-changes-modal.ts` helper) → Confirm → success toast
**Billing:** Add/remove expense category, add/delete bank account → Save → ConfirmChangesModal → Confirm
**Academic:** Toggle working days, add/delete room (via modal), add/delete subject → Save → ConfirmChangesModal → Confirm
**Security:** Change password (current + new + confirm) → success toast; password mismatch → inline error shown
**Registration:** Toggle student/tutor registration enabled → Save (out of scope for deeper tests — simple toggle)
**Plans:** Tab loads, subscription status card visible (out of scope for payment modal — involves real payment flow)

### Finance Overview + Reports (~8 tests)

Report tests live inside `finance-overview.spec.ts` because there is no standalone `/reports` route. Reports are accessed via `ReportPreviewModal` opened from the Finance Overview page.

**Smoke (Finance Overview):**
- Navigate to `/finance`, stat cards visible (Revenue, Payouts, Net Profit, Overdue)
- Chart renders
- Period tabs work (This Month / This Quarter / Year to Date)
- Quick nav links navigate correctly

**Positive (Finance Overview):**
- Overdue alert visible when `overdue_count > 0`

**Report Modal (inside Finance Overview):**
- Click "Generate Report" → modal opens → Finance tab (default) → fill dates → Generate → preview renders
- Switch to Attendance tab → fill dates + optional class filter → Generate
- Switch to Student Progress tab → select student + fill dates (dates optional but fill for deterministic filename) → Generate
- Download PDF → file downloads with correct filename (pattern: `{activeTab}-report-{dateFrom}-{dateTo}.pdf`, e.g. `finance-report-2026-03-01-2026-03-31.pdf`). Note: `student_progress` tab uses underscore in tab ID, so filename is `student_progress-report-*.pdf`.

**Report modal selector guidance:** `ReportPreviewModal` renders as `role="dialog"` (same as regular `<Modal>`, not `alertdialog`). Tab buttons inside are plain `<button>` elements. Scope all report modal selectors within `page.getByRole('dialog')`. Date inputs are `input[type="date"]`, Generate button uses `getByRole('button', { name: /generate/i })`.

**Report mock endpoints use GET (not POST):** `GET /admin/reports/finance?date_from=&date_to=`, `GET /admin/reports/attendance?date_from=&date_to=`, `GET /admin/reports/student-progress?student_id=` — all return PDF blob responses.

## Implementation Strategy

### Phase 1: Infrastructure (sequential)
1. Update `playwright.config.ts` (single project, remove dark mode)
2. Update `auth.fixture.ts` (keep en locale setup, fix `TEST_USER` shape: `role: "ADMIN"`, nested `institution` object, add `must_change_password`, `avatar_url`, `is_active`)
3. Rewrite `mock-api.fixture.ts`
4. Rewrite `api-mocker.ts` (keep pattern, add missing setup functions)
5. Create `confirm-dialog.ts` helper (for ConfirmDialog with typed text)
5b. Create `confirm-changes-modal.ts` helper (for Settings ConfirmChangesModal)
6. Rewrite ALL mock JSON files to match current Prisma schema. Delete orphaned `reports.json` (never imported in api-mocker).
7. Rewrite `test-data.ts` factory functions

### Phase 2: Page Objects (parallel — all independent)
Each page object rewritten with hybrid selectors. 14 files, all independent.

### Phase 3: Spec Files (parallel — all independent)
Each spec file written fresh. 14 files, all independent. Each spec imports its page object and sets up its own mocks.

### Component Changes Required

Some components need `data-testid` attributes added for custom elements where role/label selectors are not feasible:

- Custom `<Select>` components (subject, tutor, grade, status filters)
- Custom `<ConfirmDialog>` / `<Modal>` components
- Stat cards on Dashboard, Students, Classes, etc.
- View toggle buttons (list/calendar on Schedules)
- Tab components (Settings)

These are minimal, non-breaking additions.

## Total Estimates

- **13 spec files** (reports merged into finance-overview), **13 page objects** (no reports.page.ts), **~12 mock JSONs**, **5 helper/fixture files**
- **~90-105 test cases total**
- Infrastructure is sequential (foundation), page objects and specs are fully parallelizable via subagents
