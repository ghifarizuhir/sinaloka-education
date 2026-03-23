# UAT Playwright Test Suite — Design Spec

**Date:** 2026-03-23
**Scope:** Implementasi UAT test suite menggunakan Playwright untuk sinaloka-platform, testing against real backend.
**Cycle 1 Implementation:** Phase 0-3 (~95 test cases)
**Total Coverage Target:** 251 test cases (4 cycles)

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Playwright Config Changes](#playwright-config-changes)
4. [NPM Scripts](#npm-scripts)
5. [Global Setup & Teardown](#global-setup--teardown)
6. [State Management](#state-management)
7. [UAT Fixture](#uat-fixture)
8. [Page Objects — New](#page-objects--new)
9. [Page Objects — Reused](#page-objects--reused)
10. [Phase 0-3 Test Details](#phase-0-3-test-details)
11. [Cycle Roadmap](#cycle-roadmap)
12. [Test Naming & Traceability](#test-naming--traceability)
13. [Test Execution Guide](#test-execution-guide)
14. [Conventions & Best Practices](#conventions--best-practices)
15. [Risks & Mitigations](#risks--mitigations)

---

## Overview

### Approach

UAT suite terpisah dari existing mocked E2E tests. Key differences:

| Aspect | Existing E2E | UAT Suite |
|--------|-------------|-----------|
| Backend | Fully mocked (MockApi) | Real backend (localhost:5000) |
| Data | Static JSON fixtures | DB reset + seed per run |
| Auth | Token injected to localStorage | Real login flow via UI |
| Execution | Parallel, isolated | Sequential, state shared via JSON |
| Purpose | UI rendering & interaction | Full-stack user acceptance |

### Starting Point

- DB di-reset dan di-seed sebelum setiap run (`prisma migrate reset --force` + `prisma db seed`)
- SUPER_ADMIN credentials dari seed: `super@sinaloka.com` / `password`
- Phase 0 creates NEW institution + admin from scratch (onboarding flow)
- Phase 1+ login sebagai ADMIN yang dibuat Phase 0

---

## File Structure

```
sinaloka-platform/e2e/
├── fixtures/               # existing (tidak dipakai UAT)
├── helpers/                # existing (api-mocker tidak dipakai UAT)
├── mocks/                  # existing (tidak dipakai UAT)
├── pages/                  # existing + new page objects
│   ├── login.page.ts              # REUSED
│   ├── dashboard.page.ts          # REUSED
│   ├── students.page.ts           # REUSED
│   ├── tutors.page.ts             # REUSED
│   ├── classes.page.ts            # REUSED
│   ├── settings.page.ts           # REUSED
│   ├── enrollments.page.ts        # REUSED (Cycle 2+)
│   ├── schedules.page.ts          # REUSED (Cycle 2+)
│   ├── super-admin/               # NEW — SA-specific pages
│   │   ├── institutions.page.ts
│   │   ├── users.page.ts
│   │   ├── subscriptions.page.ts
│   │   └── upgrade-requests.page.ts
│   └── registrations.page.ts      # NEW (Cycle 2)
├── specs/                  # existing mocked specs (unchanged)
└── uat/                    # NEW — UAT suite root
    ├── global-setup.ts
    ├── global-teardown.ts
    ├── uat.fixture.ts
    ├── state/
    │   ├── uat-state.ts            # Interface + read/write helpers
    │   ├── uat-state.json          # Runtime state (gitignored)
    │   └── .gitkeep
    └── specs/
        ├── phase-0-super-admin.spec.ts
        ├── phase-1-bootstrap.spec.ts
        ├── phase-2-master-data.spec.ts
        └── phase-3-academic-setup.spec.ts
```

**Isolation:** UAT specs live in `e2e/uat/specs/`, completely separate from `e2e/specs/`. Running `npm run test:e2e` will NOT run UAT tests.

---

## Playwright Config Changes

Add `uat` project to existing `playwright.config.ts`:

```typescript
{
  name: 'uat',
  testDir: './uat/specs',
  fullyParallel: false,          // phases must run sequentially
  retries: 0,                    // no retry — UAT harus pass clean
  globalSetup: require.resolve('./uat/global-setup.ts'),
  globalTeardown: require.resolve('./uat/global-teardown.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    storageState: undefined,     // UAT manages its own auth
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
}
```

**Design decisions:**
- `fullyParallel: false` — phase specs must run in order, data flows between them
- `retries: 0` — retry on real DB would create duplicates and corrupt state
- `storageState: undefined` — prevent inheriting pre-authenticated state from existing fixtures
- `video: 'retain-on-failure'` — useful for UAT review without disk bloat

**`webServer` handling:** The existing config has a `webServer` that auto-starts `npm run dev` (frontend). The UAT project can reuse this — it will auto-start the frontend on port 3000. The backend must be started manually by the developer (no `webServer` for it). The `globalSetup` health check will catch if the backend isn't running.

**Isolation from existing tests:** Existing projects (`chromium`) use `testDir: './specs'`. The `uat` project uses `testDir: './uat/specs'`. They never overlap.

---

## NPM Scripts

```json
{
  "test:uat": "playwright test --project=uat",
  "test:uat:phase0": "playwright test --project=uat phase-0",
  "test:uat:phase1": "playwright test --project=uat phase-1",
  "test:uat:phase2": "playwright test --project=uat phase-2",
  "test:uat:phase3": "playwright test --project=uat phase-3"
}
```

### Prerequisites

```bash
# Terminal 1 — PostgreSQL must be running on localhost:5432

# Terminal 2 — Backend
cd sinaloka-backend && npm run start:dev

# Terminal 3 — Platform
cd sinaloka-platform && npm run dev

# Terminal 4 — Run UAT
cd sinaloka-platform && npm run test:uat
```

`globalSetup` performs health checks on both services before running any tests.

---

## Global Setup & Teardown

### `global-setup.ts`

```typescript
import { execSync } from 'child_process';
import * as path from 'path';
import { writeState } from './state/uat-state';

const BACKEND_DIR = path.resolve(__dirname, '../../../sinaloka-backend');
const MAX_RETRIES = 15;       // 15 retries × 3s = 45s budget
const RETRY_DELAY_MS = 3000;

async function waitForUrl(url: string, label: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[global-setup] ${label} ready`);
        return;
      }
    } catch {
      if (attempt === MAX_RETRIES) {
        throw new Error(`[global-setup] ${label} not ready after ${MAX_RETRIES} attempts at ${url}`);
      }
      console.log(`[global-setup] ${label} not ready (${attempt}/${MAX_RETRIES})...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

export default async function globalSetup(): Promise<void> {
  // 1. Reset + seed database
  // NOTE: This drops and recreates the DB while the backend may be running.
  // The backend's Prisma connection pool will temporarily lose connection.
  // The health check below has a generous retry budget (45s) to account
  // for the backend reconnecting after the pool is invalidated.
  console.log('[global-setup] Resetting database...');
  execSync('npx prisma migrate reset --force', { cwd: BACKEND_DIR, stdio: 'inherit' });
  console.log('[global-setup] Database reset complete.');

  // 2. Health checks (with extended retry for backend reconnection after DB reset)
  await waitForUrl('http://localhost:5000/api/health', 'Backend API');
  await waitForUrl('http://localhost:3000', 'Frontend');

  // 3. Initialize state file
  writeState({
    superAdmin: { email: 'super@sinaloka.com', password: 'password' },
    phase0: null,
    phase1: null,
    phase2: null,
    phase3: null,
  });
  console.log('[global-setup] UAT ready.');
}
```

### `global-teardown.ts`

DB dan state file dibiarkan intact setelah run untuk debugging. Akan di-overwrite pada run berikutnya.

---

## State Management

### UatState Interface

```typescript
// e2e/uat/state/uat-state.ts

export interface Credentials {
  email: string;
  password: string;
}

export interface Phase0State {
  institutionId: string;
  institutionName: string;
  adminCredentials: Credentials;
}

export interface Phase1State {
  subjectIds: string[];
  roomIds: string[];
  passwordChanged: boolean;    // admin changed from must_change_password
  newAdminPassword: string;    // password setelah force change
}

export interface Phase2State {
  studentIds: string[];
  tutorIds: string[];
}

export interface Phase3State {
  classIds: string[];
}

export interface UatState {
  superAdmin: Credentials;
  phase0: Phase0State | null;
  phase1: Phase1State | null;
  phase2: Phase2State | null;
  phase3: Phase3State | null;
}

// Read/write helpers
export function readState(): UatState { /* read from uat-state.json */ }
export function writeState(state: UatState): void { /* write to uat-state.json */ }
export function patchState(patch: Partial<UatState>): void { /* merge into existing */ }
```

### What Each Phase Writes

| Phase | Writes |
|-------|--------|
| global-setup | `superAdmin` credentials |
| Phase 0 | `phase0.institutionId`, `phase0.institutionName`, `phase0.adminCredentials` |
| Phase 1 | `phase1.subjectIds`, `phase1.roomIds`, `phase1.newAdminPassword` |
| Phase 2 | `phase2.studentIds`, `phase2.tutorIds` |
| Phase 3 | `phase3.classIds` |

### Gitignore

```gitignore
e2e/uat/state/uat-state.json
```

---

## UAT Fixture

```typescript
// e2e/uat/uat.fixture.ts
import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { UatState, readState, patchState } from './state/uat-state';

export interface UatFixtures {
  uatPage: Page;
  loginAs: (email: string, password: string) => Promise<Page>;
  loggedInPage: (role: 'superAdmin' | 'admin') => Promise<Page>;
  readState: () => UatState;
  writeState: (partial: Partial<UatState>) => void;
}

export const test = base.extend<UatFixtures>({
  uatPage: async ({ page }, use) => {
    await use(page);
  },

  // Reuses existing LoginPage to avoid locator drift between mocked and UAT tests
  loginAs: async ({ page }, use) => {
    await use(async (email, password) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      return page;
    });
  },

  // Reads credentials from state file, uses LoginPage for login.
  // For 'admin': uses phase1.newAdminPassword if available (after force change),
  // falls back to phase0.adminCredentials.password.
  loggedInPage: async ({ page }, use) => {
    await use(async (role) => {
      let email: string;
      let password: string;

      if (role === 'superAdmin') {
        const state = readState();
        email = state.superAdmin.email;
        password = state.superAdmin.password;
      } else {
        const state = readState();
        if (!state.phase0?.adminCredentials) {
          throw new Error('Phase 0 state missing — run full suite first');
        }
        email = state.phase0.adminCredentials.email;
        // Use updated password from Phase 1 if available (after must_change_password)
        password = state.phase1?.newAdminPassword ?? state.phase0.adminCredentials.password;
      }

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      return page;
    });
  },

  readState: async ({}, use) => { await use(() => readState()); },
  writeState: async ({}, use) => { await use((partial) => patchState(partial)); },
});

export { expect } from '@playwright/test';
```

**Key differences from existing auth fixture:**
- No token injection — real login via UI
- Reuses `LoginPage` page object to avoid locator drift with existing mocked tests
- `loggedInPage('admin')` reads `phase1.newAdminPassword` if available (after force change), falls back to `phase0.adminCredentials.password`
- `writeState` persists data for subsequent phases

> **Note on `patchState` concurrency:** `patchState` reads, merges, and writes back — NOT safe for concurrent access. This is fine because `fullyParallel: false` guarantees sequential execution.

---

## Page Objects — New

### Super Admin Pages

#### `pages/super-admin/institutions.page.ts`

| Method | Purpose |
|--------|---------|
| `goto()` | Navigate to `/super/institutions` |
| `rowByName(name)` | Find table row by institution name |
| `search(query)` | Fill search input |
| `openCreateForm()` | Click Create Institution, wait for form |
| `fillCreateForm(data)` | Fill institution + admin fields |
| `submitCreate()` | Submit and wait for redirect to list |
| `openDetail(name)` | Click institution name → detail page |
| `editInstitution(data)` | Edit fields on detail page |
| `clickTab(name)` | Switch between tabs (General, Billing, Admins, Overview, Plan) |
| `overridePlan(plan)` | Change plan on Plan tab |
| `impersonate(name)` | Click Enter button on institution row |
| `exitImpersonation()` | Click Exit to Super Admin banner |

#### `pages/super-admin/users.page.ts`

| Method | Purpose |
|--------|---------|
| `goto()` | Navigate to `/super/users` |
| `rowByEmail(email)` | Find row by email |
| `filterByRole(role)` | Select role filter |
| `filterByInstitution(id)` | Select institution filter |
| `openCreateModal()` | Open create user modal |
| `fillCreateForm(data)` | Fill name, email, password, institution, role |
| `submitCreate()` | Submit and wait for modal close |
| `openEditModal(email)` | Open edit modal for user |
| `toggleActive()` | Toggle active/inactive |

#### `pages/super-admin/subscriptions.page.ts`

| Method | Purpose |
|--------|---------|
| `goto()` | Navigate to `/super/subscriptions` |
| `switchTab(tab)` | Switch between Subscriptions, Pending Payments, Payment History |
| `openOverrideModal(name)` | Open override modal for subscription |
| `fillOverride(data)` | Fill plan, expiry, status, notes |
| `submitOverride()` | Submit override |
| `confirmPayment(name)` | Approve pending payment |
| `rejectPayment(name, notes?)` | Reject pending payment |

#### `pages/super-admin/upgrade-requests.page.ts`

| Method | Purpose |
|--------|---------|
| `goto()` | Navigate to `/super/upgrade-requests` |
| `switchTab(tab)` | Pending, Approved, Rejected |
| `approveRequest(name, notes?)` | Approve upgrade request |
| `rejectRequest(name, notes)` | Reject upgrade request |

---

## Page Objects — Reused

| Page Object | UAT Phase | Modification Needed |
|-------------|-----------|-------------------|
| `login.page.ts` | All phases | None |
| `dashboard.page.ts` | All phases | None — avoid asserting exact mock values |
| `students.page.ts` | Phase 2 | None |
| `tutors.page.ts` | Phase 2 | None |
| `classes.page.ts` | Phase 3 | None |
| `settings.page.ts` | Phase 1 | None |

**Key difference for UAT:** All reused page objects work with real API responses. Use `toBeVisible()` instead of asserting exact text from mock data. After mutations, wait for `waitForResponse` or toast visibility rather than assuming instant response.

---

## Phase 0-3 Test Details

### Phase 0: Super Admin Setup (~29 TC)

`test.describe.serial('Phase 0: Super Admin Setup')`

Login as SUPER_ADMIN, create institution + admin, manage subscriptions and upgrade requests.

#### 0.1 Login
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-AUTH-02 | Login SUPER_ADMIN | `toHaveURL(/super\/institutions/)`, sidebar SA items | None |

#### 0.2 Institutions
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-SA-INST-01 | List Institutions | Table visible, columns: Name, Email, Status, Date | None |
| TC-SA-INST-02 ★ | Create Institution (name: "UAT Test Institution", admin: uat-admin@test.com / UatAdmin123!) | New institution in table, toast success | `phase0.institutionId`, `phase0.adminCredentials` |
| TC-NEG-SA-01 | Create — Nama Duplikat (reuse "UAT Test Institution") | Error message visible, form stays open | None |
| TC-NEG-SA-02 | Create — Tanpa Admin | Validation error on admin section | None |
| TC-NEG-SA-03 | Create — Email Invalid | Format email error | None |
| TC-SA-INST-03 | View Detail | Tabs visible: General, Billing, Admins, Overview, Plan | None |
| TC-SA-INST-04 | Edit Institution | Toast success after save | None |
| TC-SA-INST-06 | Search | Table filtered by search query | None |
| TC-SA-INST-07 | Manage Plan | Plan changed to BUSINESS | None |

#### 0.3 Users
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-SA-USR-01 | List Users | Table with Name, Email, Role, Institution, Status | None |
| TC-SA-USR-02 | Filter Users | Filtered by role, institution, status | None |
| TC-SA-USR-03 | Create User | User in table, toast success | None |
| TC-NEG-SA-04 | Create — Email Duplicate | Error: email already registered | None |
| TC-NEG-SA-05 | Create — Weak Password | Password validation error | None |
| TC-SA-USR-04 | Edit User | Toast success, toggle active | None |

#### 0.4 Subscriptions
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-SA-SUB-01 | Dashboard | 3 tabs visible, stats cards | None |
| TC-SA-SUB-02 | Subscription List | Columns: Institution, Plan, Status, Expiry | None |
| TC-SA-SUB-03 | Override Subscription | Modal close, data updated | None |
| TC-NEG-SA-06 | Override — Past Expiry | Warning or error | None |
| TC-SA-SUB-04 | Confirm Payment | Status updated to confirmed | None |
| TC-NEG-SA-08 | Reject — No Notes | Behavior documented | None |
| TC-SA-SUB-05 | Payment History | Columns: Amount, Method, Date, Status | None |

#### 0.5 Upgrade Requests
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-SA-UPG-01 | View Requests | Table visible with columns | None |
| TC-SA-UPG-02 | Filter by Status | Tabs filter correctly | None |
| TC-SA-UPG-03 | Approve Request | Status → Approved | None |
| TC-SA-UPG-04 | Reject Request | Status → Rejected | None |

#### 0.6 Impersonate
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-SA-INST-05 | Impersonate | Amber banner visible, data scoped, exit works | None |
| TC-NEG-SA-07 | Deactivate Institution | Login blocked for institution users | None |

---

### Phase 1: Bootstrap (~23 TC)

`test.describe.serial('Phase 1: Bootstrap')`

Login as ADMIN (from Phase 0), handle force change password, configure settings.

#### 1.1 Authentication
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-AUTH-07 ★ | Force Change Password | Redirect to change password, then dashboard | `phase1.newAdminPassword` |
| TC-AUTH-01 | Login ADMIN | Redirect to `/`, sidebar + header visible | None |
| TC-AUTH-03 | Login — Wrong Credentials | Error toast, stays on `/login` | None |
| TC-AUTH-04 | Login — Empty Fields | Validation errors | None |
| TC-NEG-AUTH-01 | Login — Disabled Account | Login rejected | None |
| TC-NEG-AUTH-02 | Login — Unregistered Email | Error message | None |
| TC-AUTH-05 | Toggle Password Visibility | Eye icon toggles type | None |
| TC-AUTH-08 | Logout | Redirect to `/login`, tokens cleared | None |
| TC-AUTH-06 | Session Expired Redirect | Redirect to `/login` | None |
| TC-NEG-AUTH-04 | Protected Page Without Auth | Redirect to `/login` | None |
| TC-NEG-AUTH-05 | ADMIN Access SA Area | Redirect or 403 | None |

#### 1.2 Settings
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-SET-01 | General Tab | Fields pre-filled, save success | None |
| TC-NEG-SET-01 | General — Empty Name | Validation error | None |
| TC-NEG-SET-02 | General — Invalid Email | Email format error | None |
| TC-SET-02 | Billing Tab | Bank accounts configured | None |
| TC-NEG-SET-03 | Billing — Duplicate Bank | Error message | None |
| TC-SET-03 | Academic — Rooms | Room CRUD works | `phase1.roomIds` |
| TC-NEG-SET-04 | Academic — Room No Name | Validation error | None |
| TC-SET-04 ★ | Academic — Subjects | Subject CRUD works | `phase1.subjectIds` |
| TC-SET-05 | Registration Tab | Settings configured | None |
| TC-SET-06 | Plans Tab | Plan info displayed | None |
| TC-SET-07 | Security — Change Password | Password changed | None |
| TC-NEG-AUTH-08 | Change Password — Wrong Current | Error message | None |
| TC-NEG-AUTH-09 | Change Password — Same as Current | Error message | None |
| TC-NEG-SET-05 | Security — Weak Password | Validation error | None |
| TC-NEG-SET-06 | Security — Confirm Mismatch | Validation error | None |

**Critical note:** TC-AUTH-07 (force change password) HARUS jalan pertama di Phase 1. Admin dari Phase 0 punya `must_change_password: true`. Setelah password diganti, simpan password baru ke state agar test selanjutnya pakai password yang benar.

---

### Phase 2: Master Data (~28 TC)

`test.describe.serial('Phase 2: Master Data')`

Login as ADMIN, create students and tutors.

#### 2.1 Students
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-STU-04 ★ | Create Student | Student in table, toast success | `phase2.studentIds` |
| TC-STU-05 | Create — Validation Error | Required field errors | None |
| TC-NEG-STU-01 | Create — Duplicate Email | Error message | None |
| TC-NEG-STU-04 | Create — Invalid Email | Format error | None |
| TC-NEG-STU-03 | Create — Very Long Name | Behavior documented | None |
| TC-NEG-STU-02 | Create — XSS Input | Input sanitized or escaped | None |
| TC-STU-01 | List with Pagination | Table renders, pagination works | None |
| TC-STU-02 | Search | Filtered results | None |
| TC-STU-03 | Filter by Status/Grade | Filtered results | None |
| TC-STU-06 | Edit Student | Toast success | None |
| TC-NEG-STU-09 | Edit — Clear Required Name | Validation error | None |
| TC-STU-11 | View Detail Drawer | Drawer shows student info | None |
| TC-STU-09 | Import CSV | Students imported | None |
| TC-NEG-STU-05 | Import — Wrong Format | Error message | None |
| TC-NEG-STU-06 | Import — Incomplete Data | Error/warning | None |
| TC-NEG-STU-07 | Import — Empty File | Error message | None |
| TC-STU-10 | Export CSV | File downloaded | None |
| TC-STU-12 | Invite Parent | Invite sent | None |
| TC-NEG-STU-10 | Invite — Invalid Email | Format error | None |

#### 2.2 Tutors
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-TUT-04 ★ | Create Tutor | Tutor in list, toast success | `phase2.tutorIds` |
| TC-NEG-TUT-02 | Create — No Subject | Validation error | None |
| TC-TUT-05 | Upload Avatar | Avatar displayed | None |
| TC-NEG-TUT-03 | Upload — File Too Large | Error message | None |
| TC-NEG-TUT-04 | Upload — Not Image | Error message | None |
| TC-TUT-01 | List — Grid View | Grid cards visible | None |
| TC-TUT-02 | Toggle Grid/List | View switches | None |
| TC-TUT-03 | Search and Filter | Results filtered | None |
| TC-TUT-11 | Edit Tutor | Toast success | None |
| TC-TUT-06 | Invite via Email | Invite sent | None |
| TC-NEG-TUT-01 | Invite — Email Registered | Error message | None |
| TC-TUT-07 | Resend Invite | Resend success | None |
| TC-TUT-08 | Cancel Invite | Invite cancelled | None |
| TC-NEG-TUT-05 | Resend — Already Verified | Error or disabled | None |
| TC-TUT-09 | Bulk Verify | Selected tutors verified | None |
| TC-NEG-TUT-06 | Bulk Delete — None Selected | Error or disabled | None |

---

### Phase 3: Academic Setup (~12 TC)

`test.describe.serial('Phase 3: Academic Setup')`

Login as ADMIN, create classes using tutors and subjects from previous phases.

#### 3.1 Classes
| TC ID | Description | Key Assertion | State Write |
|-------|-------------|---------------|-------------|
| TC-CLS-04 ★ | Create Class | Class in list, toast success | `phase3.classIds` |
| TC-NEG-CLS-01 | Create — Capacity 0/Negative | Validation error | None |
| TC-NEG-CLS-02 | Create — Fee Negative | Validation error | None |
| TC-NEG-CLS-04 | Create — No Schedule | Validation error | None |
| TC-NEG-CLS-05 | Create — Start > End Time | Validation error | None |
| TC-NEG-CLS-03 | Create — Tutor Schedule Overlap | Conflict error | None |
| TC-CLS-01 | List Classes | Table with class data | None |
| TC-CLS-02 | Filter and Search | Filtered results | None |
| TC-CLS-03 | Timetable View | Timetable grid rendered | None |
| TC-CLS-05 | Edit Class | Toast success | None |
| TC-CLS-07 | View Detail Drawer | Drawer shows class info | None |

**Dependencies:** Class creation requires tutor IDs (Phase 2) and subject IDs (Phase 1).

---

## Cycle Roadmap

| Cycle | Phases | TC Count | New Page Objects | Status |
|-------|--------|----------|-----------------|--------|
| **1** | Phase 0-3 | ~95 | SA institutions, users, subscriptions, upgrade-requests | **Implement now** |
| **2** | Phase 4-6 | ~65 | registrations.page.ts | Planned |
| **3** | Phase 7-8 | ~60 | whatsapp.page.ts, notifications.page.ts | Planned |
| **4** | Phase 9-12 | ~31 | audit-log.page.ts | Planned |

### Cycle 2: Enrollments, Sessions, Daily Ops (Phase 4-6)

- **Phase 4:** Enrollment CRUD, schedule conflict checks, import/export
- **Phase 5:** Session generation, manual create, cancel, reschedule
- **Phase 6:** Attendance marking, keyboard shortcuts, registrations approve/reject
- **Dependencies:** Students, tutors, classes from Cycle 1

### Cycle 3: Finance & Communication (Phase 7-8)

- **Phase 7:** Payments, payouts, expenses, finance overview
- **Phase 8:** WhatsApp integration, notification center
- **Dependencies:** Enrollments, sessions, attendance from Cycle 2

### Cycle 4: Audit, Dashboard, Edge Cases (Phase 9-12)

- **Phase 9:** Audit log viewing and filtering
- **Phase 10:** Navigation, layout, responsive
- **Phase 11:** Destructive tests (delete/cancel)
- **Phase 12:** Security, concurrency, network edge cases
- **Dependencies:** All data from Cycles 1-3

---

## Test Naming & Traceability

### Naming Convention

```typescript
test.describe.serial('Phase 0: Super Admin Setup', () => {
  test.describe('0.2 — Institutions', () => {
    test('TC-SA-INST-02: Create Institution ★ @critical @positive', async ({ ... }) => {
    });
    test('TC-NEG-SA-01: Create Institution — Nama Duplikat @negative', async ({ ... }) => {
    });
  });
});
```

### Tags

| Tag | Meaning |
|-----|---------|
| `@positive` | Happy path |
| `@negative` | Expected-failure scenario |
| `@critical` | Marked ★ in UAT doc |
| `@smoke` | Core flow, quick validation (TC-AUTH-02, TC-SA-INST-02, TC-AUTH-01, TC-SET-04, TC-STU-04, TC-TUT-04, TC-CLS-04) |
| `@destructive` | Modifies/deletes data irreversibly (Phase 11) |

### Traceability

TC IDs in test names directly map to `UAT-TEST-CASES.md`. Playwright HTML report groups by `describe` block → matches UAT doc phase/section structure.

---

## Test Execution Guide

### Prerequisites Checklist

- [ ] PostgreSQL running on `localhost:5432`
- [ ] Backend running: `curl http://localhost:5000/api/health` → `{"status":"ok"}`
- [ ] Platform running: `curl http://localhost:3000` → HTML
- [ ] Playwright browsers installed: `npx playwright install chromium`

### Commands

```bash
# Full suite
npm run test:uat

# Single phase (DB must already be in correct state)
npm run test:uat:phase0

# Force clean start
cd ../sinaloka-backend && npx prisma migrate reset --force
cd ../sinaloka-platform && npm run test:uat
```

### Debugging Failing Tests

1. **HTML report:** `npx playwright show-report`
2. **Trace viewer:** `npx playwright show-trace <trace-file.zip>`
3. **Headed mode:** `npx playwright test --project=uat --grep "TC-AUTH-02" --headed --slow-mo=500`
4. **State inspection:** Check `e2e/uat/state/uat-state.json` for missing data
5. **Backend logs:** Check terminal running `npm run start:dev`

### Estimated Run Times

| Scope | Time |
|-------|------|
| Full Cycle 1 (Phase 0-3) | 12-18 min |
| Single phase | 3-6 min |
| Full suite (all cycles) | 35-55 min |

---

## Conventions & Best Practices

### Locator Strategy (priority order)

1. `getByRole` — buttons, links, inputs, headings
2. `getByLabel` — form fields with labels
3. `getByPlaceholder` — inputs without labels
4. `getByText` — non-interactive content
5. `locator('[data-sonner-toast]')` — toast only (no semantic alternative)

### Waiting for Real API

```typescript
// Correct — wait for specific API response
const responsePromise = page.waitForResponse(r =>
  r.url().includes('/api/students') && r.request().method() === 'POST'
);
await page.getByRole('button', { name: 'Simpan' }).click();
await responsePromise;

// Avoid — arbitrary timeout
await page.waitForTimeout(2000); // ❌
```

### Toast Assertions

```typescript
const toast = page.locator('[data-sonner-toast]');
await expect(toast).toBeVisible();
await expect(toast).toContainText('berhasil');
```

### State Discipline

- Only write what future phases need
- Write immediately after the creating action
- Always check state existence at phase start:
  ```typescript
  const state = readState();
  if (!state.phase0) throw new Error('Phase 0 state missing');
  ```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Test flakiness** (real backend timing) | Tests fail intermittently | `waitForResponse` instead of timeouts, generous `actionTimeout: 15s` |
| **Seed data changes** | Tests break if seed changes | Phase 0 creates own data; only depend on SUPER_ADMIN creds from seed |
| **Cascade failures** | Phase 0 fail → all blocked | Explicit state checks at phase start, clear error messages |
| **Slow execution** | 251 TC × real API = slow | Per-phase run commands, auth reuse within phase, `@smoke` subset |
| **Port conflicts** | Services not running | `globalSetup` health checks with retry + descriptive errors |
