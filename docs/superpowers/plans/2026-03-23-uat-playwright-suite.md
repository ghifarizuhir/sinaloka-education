# UAT Playwright Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-backend UAT Playwright test suite covering Phase 0-3 (~92 test cases) in `sinaloka-platform/e2e/uat/`.

**Architecture:** Separate UAT project in existing Playwright config, sequential phase execution with JSON state file for inter-phase data sharing. Real login via existing `LoginPage`, real API calls, DB reset+seed per run.

**Tech Stack:** Playwright 1.58+, TypeScript, Prisma CLI (for DB reset), existing page objects.

**Spec:** `docs/superpowers/specs/2026-03-23-uat-playwright-suite-design.md`

**Working directory:** `/home/zet/Project/sinaloka-uat` (git worktree, branch `feat/uat-playwright-suite`)

---

## File Map

### New Files (13)

| File | Responsibility |
|------|---------------|
| `e2e/uat/state/uat-state.ts` | UatState interface + read/write/patch helpers |
| `e2e/uat/state/.gitkeep` | Keep directory in git |
| `e2e/uat/global-setup.ts` | DB reset, seed, health checks, init state |
| `e2e/uat/global-teardown.ts` | Summary logging (no-op cleanup) |
| `e2e/uat/uat.fixture.ts` | Custom fixtures: loginAs, loggedInPage, state access |
| `e2e/uat/specs/phase-0-super-admin.spec.ts` | Phase 0: 29 TC |
| `e2e/uat/specs/phase-1-bootstrap.spec.ts` | Phase 1: 23 TC |
| `e2e/uat/specs/phase-2-master-data.spec.ts` | Phase 2: ~35 TC |
| `e2e/uat/specs/phase-3-academic-setup.spec.ts` | Phase 3: 11 TC |
| `e2e/pages/super-admin/institutions.page.ts` | SA Institutions CRUD |
| `e2e/pages/super-admin/users.page.ts` | SA Users management |
| `e2e/pages/super-admin/subscriptions.page.ts` | SA Subscriptions + payments |
| `e2e/pages/super-admin/upgrade-requests.page.ts` | SA Upgrade Requests review |

### Modified Files (3)

| File | Change |
|------|--------|
| `e2e/playwright.config.ts` | Add `uat` project |
| `package.json` | Add 5 `test:uat*` scripts |
| `.gitignore` (root) | Add `e2e/uat/state/uat-state.json` |

---

## Task Dependency Graph

```
T1 (Config)  ─────────────────────────────────────────┐
T2 (State) ──→ T3 (Global Setup) ──→ T4 (Fixture) ──→│
              ┌─ T5 (SA Institutions) ─┐               │
              ├─ T6 (SA Users) ────────┤               │
              ├─ T7 (SA Subscriptions) ┤               ├──→ T9 (Phase 0 Spec)
              └─ T8 (SA Upgrade Req) ──┘               │        ↓
                                                       │    T10 (Phase 1 Spec)
                                                       │        ↓
                                                       │    T11 (Phase 2 Spec)
                                                       │        ↓
                                                       └──→ T12 (Phase 3 Spec)
```

**Parallel opportunities:** T1+T2, T5+T6+T7+T8, T9+T10+T11+T12 (all can be written in parallel, tested sequentially)

---

### Task 1: Playwright Config & NPM Scripts

**Files:**
- Modify: `sinaloka-platform/e2e/playwright.config.ts`
- Modify: `sinaloka-platform/package.json`
- Modify: `.gitignore` (root)

- [ ] **Step 1: Add UAT project to Playwright config**

In `sinaloka-platform/e2e/playwright.config.ts`, add to the `projects` array:

```typescript
{
  name: 'uat',
  testDir: './uat/specs',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    storageState: undefined,
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  globalSetup: require.resolve('./uat/global-setup.ts'),
  globalTeardown: require.resolve('./uat/global-teardown.ts'),
},
```

- [ ] **Step 2: Add NPM scripts to package.json**

In `sinaloka-platform/package.json`, add to `scripts`:

```json
"test:uat": "playwright test --config e2e/playwright.config.ts --project=uat --workers=1",
"test:uat:phase0": "playwright test --config e2e/playwright.config.ts --project=uat --workers=1 phase-0",
"test:uat:phase1": "playwright test --config e2e/playwright.config.ts --project=uat --workers=1 phase-1",
"test:uat:phase2": "playwright test --config e2e/playwright.config.ts --project=uat --workers=1 phase-2",
"test:uat:phase3": "playwright test --config e2e/playwright.config.ts --project=uat --workers=1 phase-3"
```

- [ ] **Step 3: Add gitignore entry**

In root `.gitignore`, add:

```
e2e/uat/state/uat-state.json
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/e2e/playwright.config.ts sinaloka-platform/package.json .gitignore
git commit -m "chore(e2e): add UAT project config and npm scripts"
```

---

### Task 2: State Management

**Files:**
- Create: `sinaloka-platform/e2e/uat/state/uat-state.ts`
- Create: `sinaloka-platform/e2e/uat/state/.gitkeep`

- [ ] **Step 1: Create state directory**

```bash
mkdir -p sinaloka-platform/e2e/uat/state
touch sinaloka-platform/e2e/uat/state/.gitkeep
```

- [ ] **Step 2: Write UatState interface and helpers**

Create `sinaloka-platform/e2e/uat/state/uat-state.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

export const STATE_FILE = path.resolve(__dirname, 'uat-state.json');

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
  newAdminPassword: string;
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

export function readState(): UatState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`[uat-state] State file not found: ${STATE_FILE}. Did global-setup run?`);
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

export function writeState(state: UatState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, STATE_FILE);
}

// NOTE: Not safe for concurrent access. Relies on fullyParallel:false + workers:1.
export function patchState(patch: Partial<UatState>): void {
  const current = readState();
  writeState({ ...current, ...patch });
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/uat/state/
git commit -m "feat(e2e): add UAT state management with typed interface"
```

---

### Task 3: Global Setup & Teardown

**Files:**
- Create: `sinaloka-platform/e2e/uat/global-setup.ts`
- Create: `sinaloka-platform/e2e/uat/global-teardown.ts`

- [ ] **Step 1: Write global-setup.ts**

Create `sinaloka-platform/e2e/uat/global-setup.ts`:

```typescript
import { execSync } from 'child_process';
import * as path from 'path';
import { writeState } from './state/uat-state';

const BACKEND_DIR = path.resolve(__dirname, '../../../sinaloka-backend');
const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 3000;

async function waitForUrl(url: string, label: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[uat-setup] ${label} ready`);
        return;
      }
    } catch {
      // retry
    }
    if (attempt === MAX_RETRIES) {
      throw new Error(`[uat-setup] ${label} not reachable at ${url} after ${MAX_RETRIES} attempts`);
    }
    console.log(`[uat-setup] Waiting for ${label} (${attempt}/${MAX_RETRIES})...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}

export default async function globalSetup(): Promise<void> {
  console.log('[uat-setup] Resetting database...');
  execSync('npx prisma migrate reset --force', {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    env: { ...process.env },
  });

  // Backend connection pool may need to reconnect after DB reset
  await waitForUrl('http://localhost:5000/api/health', 'Backend API');
  await waitForUrl('http://localhost:3000', 'Frontend');

  writeState({
    superAdmin: { email: 'super@sinaloka.com', password: 'password' },
    phase0: null,
    phase1: null,
    phase2: null,
    phase3: null,
  });
  console.log('[uat-setup] Ready.');
}
```

- [ ] **Step 2: Write global-teardown.ts**

Create `sinaloka-platform/e2e/uat/global-teardown.ts`:

```typescript
export default async function globalTeardown(): Promise<void> {
  console.log('[uat-teardown] Run complete. DB and state left intact for inspection.');
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/uat/global-setup.ts sinaloka-platform/e2e/uat/global-teardown.ts
git commit -m "feat(e2e): add UAT global setup (DB reset + health checks) and teardown"
```

---

### Task 4: UAT Fixture

**Files:**
- Create: `sinaloka-platform/e2e/uat/uat.fixture.ts`

**Important context:** The existing `LoginPage` uses these locators:
- `page.getByLabel(/email address/i)` for email
- `page.getByLabel(/password/i)` for password
- `page.getByRole('button', { name: /sign in/i })` for submit
- `goto()` navigates to `/login`
- `login(email, password)` fills and submits

- [ ] **Step 1: Write the UAT fixture**

Create `sinaloka-platform/e2e/uat/uat.fixture.ts`:

```typescript
import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { readState, patchState, type UatState } from './state/uat-state';

export interface UatFixtures {
  uatPage: Page;
  loginAs: (email: string, password: string) => Promise<Page>;
  loggedInPage: (role: 'superAdmin' | 'admin') => Promise<Page>;
  getState: () => UatState;
  setState: (partial: Partial<UatState>) => void;
}

export const test = base.extend<UatFixtures>({
  uatPage: async ({ page }, use) => {
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    await use(async (email: string, password: string) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      return page;
    });
  },

  loggedInPage: async ({ page }, use) => {
    await use(async (role: 'superAdmin' | 'admin') => {
      const state = readState();
      let email: string;
      let password: string;

      if (role === 'superAdmin') {
        email = state.superAdmin.email;
        password = state.superAdmin.password;
      } else {
        if (!state.phase0?.adminCredentials) {
          throw new Error('[uat] phase0.adminCredentials missing. Run Phase 0 first.');
        }
        email = state.phase0.adminCredentials.email;
        password = state.phase1?.newAdminPassword ?? state.phase0.adminCredentials.password;
      }

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      return page;
    });
  },

  getState: async ({}, use) => {
    await use(() => readState());
  },

  setState: async ({}, use) => {
    await use((partial: Partial<UatState>) => patchState(partial));
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 2: Verify import path works**

Run from `sinaloka-platform`:
```bash
npx tsc --noEmit e2e/uat/uat.fixture.ts 2>&1 || echo "Type check (may have config issues, verify manually)"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/uat/uat.fixture.ts
git commit -m "feat(e2e): add UAT fixture with real login and state management"
```

---

### Task 5: SA Institutions Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/super-admin/institutions.page.ts`

**UI context:** Route is `/super/institutions`. Create form is at `/super/institutions/new` (separate page, not modal). Detail page at `/super/institutions/:id` has 5 tabs. Table has columns: Name, Admins, Plan, Status, Created, Actions (Edit + Enter buttons).

- [ ] **Step 1: Create the page object**

Create `sinaloka-platform/e2e/pages/super-admin/institutions.page.ts`:

```typescript
import { type Page, type Locator } from '@playwright/test';

export class InstitutionsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/search institutions/i);
    this.addButton = page.getByRole('link', { name: /add institution/i });
    this.table = page.getByRole('table');
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/institutions');
    await this.table.waitFor({ state: 'visible', timeout: 10_000 });
  }

  getRowByName(name: string): Locator {
    return this.table.getByRole('row').filter({ hasText: name });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300); // debounce
  }

  // --- Create Institution (navigates to /super/institutions/new) ---

  async gotoCreateForm() {
    await this.addButton.click();
    await this.page.waitForURL(/\/super\/institutions\/new/);
  }

  async fillCreateForm(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    await this.page.locator('#name').fill(data.name);
    if (data.email) await this.page.locator('#email').fill(data.email);
    if (data.phone) await this.page.locator('#phone').fill(data.phone);
    if (data.address) await this.page.locator('#address').fill(data.address);
    await this.page.locator('#adminName').fill(data.adminName);
    await this.page.locator('#adminEmail').fill(data.adminEmail);
    await this.page.locator('#adminPassword').fill(data.adminPassword);
  }

  async submitCreate() {
    await this.page.getByRole('button', { name: /add institution/i }).click();
  }

  // --- Detail Page ---

  async openDetail(institutionName: string) {
    await this.getRowByName(institutionName).getByRole('link', { name: /edit/i }).click();
    await this.page.waitForURL(/\/super\/institutions\/.+/);
  }

  async clickTab(tabName: 'General' | 'Billing & Payment' | 'Admins' | 'Overview' | 'Plan') {
    await this.page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
  }

  async overridePlan(plan: 'STARTER' | 'GROWTH' | 'BUSINESS') {
    await this.clickTab('Plan');
    // Select plan from dropdown and save
    await this.page.getByRole('combobox').selectOption(plan);
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  // --- Impersonate ---

  async impersonate(institutionName: string) {
    await this.getRowByName(institutionName).getByRole('button', { name: /enter/i }).click();
    await this.page.waitForURL('/');
  }

  get impersonationBanner(): Locator {
    return this.page.locator('.bg-amber-500');
  }

  async exitImpersonation() {
    await this.impersonationBanner.getByRole('button').click();
    await this.page.waitForURL(/\/super\/institutions/);
  }

  getToast(): Locator {
    return this.toast;
  }
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p sinaloka-platform/e2e/pages/super-admin
git add sinaloka-platform/e2e/pages/super-admin/institutions.page.ts
git commit -m "feat(e2e): add SA Institutions page object for UAT"
```

---

### Task 6: SA Users Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/super-admin/users.page.ts`

**UI context:** Route `/super/users`. Create/Edit via modals. Filters: role, institution, status. Table columns: Name, Email, Role, Institution, Status, Last Login, Actions.

- [ ] **Step 1: Create the page object**

Create `sinaloka-platform/e2e/pages/super-admin/users.page.ts`:

```typescript
import { type Page, type Locator } from '@playwright/test';

export class SuperAdminUsersPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
    this.addButton = page.getByRole('button', { name: /add admin/i });
    this.table = page.getByRole('table');
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/users');
    await this.table.waitFor({ state: 'visible', timeout: 10_000 });
  }

  getRowByEmail(email: string): Locator {
    return this.table.getByRole('row').filter({ hasText: email });
  }

  // --- Filters ---

  async filterByRole(role: string) {
    await this.page.getByRole('combobox').first().selectOption(role);
  }

  async filterByInstitution(name: string) {
    await this.page.getByRole('combobox').nth(1).selectOption({ label: name });
  }

  async filterByStatus(status: 'Active' | 'Inactive') {
    await this.page.getByRole('combobox').nth(2).selectOption(status);
  }

  // --- Create Admin Modal ---

  async openCreateModal() {
    await this.addButton.click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async fillCreateForm(data: {
    name: string;
    email: string;
    password: string;
    institution?: string;
  }) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder(/john doe/i).fill(data.name);
    await dialog.getByPlaceholder(/admin@institution/i).fill(data.email);
    await dialog.getByPlaceholder(/password/i).fill(data.password);
    if (data.institution) {
      await dialog.getByRole('combobox').selectOption({ label: data.institution });
    }
  }

  async submitCreate() {
    await this.page.getByRole('dialog').getByRole('button', { name: /save/i }).click();
  }

  // --- Edit User Modal ---

  async openEditModal(email: string) {
    await this.getRowByEmail(email).getByRole('button', { name: /edit/i }).click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async toggleActive() {
    await this.page.getByRole('dialog').getByRole('switch').click();
  }

  async submitEdit() {
    await this.page.getByRole('dialog').getByRole('button', { name: /save/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/super-admin/users.page.ts
git commit -m "feat(e2e): add SA Users page object for UAT"
```

---

### Task 7: SA Subscriptions Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/super-admin/subscriptions.page.ts`

**UI context:** Route `/super/subscriptions`. 3 tabs: SUBSCRIPTIONS, PENDING_PAYMENTS, PAYMENT_HISTORY. Override modal for subscriptions. Approve/Reject for pending payments.

- [ ] **Step 1: Create the page object**

Create `sinaloka-platform/e2e/pages/super-admin/subscriptions.page.ts`:

```typescript
import { type Page, type Locator } from '@playwright/test';

export class SubscriptionsPage {
  readonly page: Page;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/subscriptions');
    await this.page.waitForLoadState('networkidle');
  }

  // --- Tabs ---

  async switchTab(tab: 'SUBSCRIPTIONS' | 'PENDING_PAYMENTS' | 'PAYMENT_HISTORY') {
    await this.page.getByRole('tab', { name: new RegExp(tab.replace('_', ' '), 'i') }).click();
    await this.page.waitForLoadState('networkidle');
  }

  get statsCards(): Locator {
    return this.page.locator('[class*="rounded"]').filter({ has: this.page.locator('p') });
  }

  getTable(): Locator {
    return this.page.getByRole('table');
  }

  getRowByInstitution(name: string): Locator {
    return this.getTable().getByRole('row').filter({ hasText: name });
  }

  // --- Override Subscription ---

  async openOverrideModal(institutionName: string) {
    await this.getRowByInstitution(institutionName).getByRole('button', { name: /override/i }).click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async fillOverride(data: { plan?: string; expiryDate?: string; status?: string; notes: string }) {
    const dialog = this.page.getByRole('dialog');
    if (data.plan) await dialog.locator('select').first().selectOption(data.plan);
    if (data.expiryDate) await dialog.getByLabel(/expires/i).fill(data.expiryDate);
    if (data.status) await dialog.locator('select').nth(1).selectOption(data.status);
    await dialog.getByPlaceholder(/reason/i).fill(data.notes);
  }

  async submitOverride() {
    await this.page.getByRole('dialog').getByRole('button', { name: /override/i }).click();
  }

  // --- Pending Payments ---

  async approvePayment(institutionName: string) {
    await this.getRowByInstitution(institutionName).getByRole('button', { name: /approve/i }).click();
  }

  async rejectPayment(institutionName: string) {
    await this.getRowByInstitution(institutionName).getByRole('button', { name: /reject/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/super-admin/subscriptions.page.ts
git commit -m "feat(e2e): add SA Subscriptions page object for UAT"
```

---

### Task 8: SA Upgrade Requests Page Object

**Files:**
- Create: `sinaloka-platform/e2e/pages/super-admin/upgrade-requests.page.ts`

**UI context:** Route `/super/upgrade-requests`. 4 filter tabs: All Statuses, Pending, Approved, Rejected. Review modal with Approve/Reject + notes.

- [ ] **Step 1: Create the page object**

Create `sinaloka-platform/e2e/pages/super-admin/upgrade-requests.page.ts`:

```typescript
import { type Page, type Locator } from '@playwright/test';

export class UpgradeRequestsPage {
  readonly page: Page;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/upgrade-requests');
    await this.page.waitForLoadState('networkidle');
  }

  async switchTab(tab: 'All Statuses' | 'Pending' | 'Approved' | 'Rejected') {
    await this.page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') }).click();
    await this.page.waitForLoadState('networkidle');
  }

  getTable(): Locator {
    return this.page.getByRole('table');
  }

  getRowByInstitution(name: string): Locator {
    return this.getTable().getByRole('row').filter({ hasText: name });
  }

  async openReviewModal(institutionName: string) {
    await this.getRowByInstitution(institutionName)
      .getByRole('button', { name: /approve|reject/i })
      .click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async approve(notes?: string) {
    const dialog = this.page.getByRole('dialog');
    if (notes) await dialog.getByPlaceholder(/note/i).fill(notes);
    await dialog.getByRole('button', { name: /approve/i }).click();
  }

  async reject(notes: string) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder(/note/i).fill(notes);
    await dialog.getByRole('button', { name: /reject/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/pages/super-admin/upgrade-requests.page.ts
git commit -m "feat(e2e): add SA Upgrade Requests page object for UAT"
```

---

### Task 9: Phase 0 — Super Admin Setup Spec

**Files:**
- Create: `sinaloka-platform/e2e/uat/specs/phase-0-super-admin.spec.ts`

**Page objects:** `LoginPage`, `InstitutionsPage`, `SuperAdminUsersPage`, `SubscriptionsPage`, `UpgradeRequestsPage`

**State writes:** `phase0.institutionId`, `phase0.institutionName`, `phase0.adminCredentials`

**TC IDs (29):** TC-AUTH-02, TC-SA-INST-01 through TC-SA-INST-07, TC-NEG-SA-01 through TC-NEG-SA-08, TC-SA-USR-01 through TC-SA-USR-04, TC-SA-SUB-01 through TC-SA-SUB-05, TC-SA-UPG-01 through TC-SA-UPG-04

- [ ] **Step 1: Write the spec file**

Create `sinaloka-platform/e2e/uat/specs/phase-0-super-admin.spec.ts`. This is a large file — structure:

```typescript
import { test, expect } from '../uat.fixture';
import { LoginPage } from '../../pages/login.page';
import { InstitutionsPage } from '../../pages/super-admin/institutions.page';
import { SuperAdminUsersPage } from '../../pages/super-admin/users.page';
import { SubscriptionsPage } from '../../pages/super-admin/subscriptions.page';
import { UpgradeRequestsPage } from '../../pages/super-admin/upgrade-requests.page';

const INSTITUTION_NAME = 'UAT Test Institution';
const ADMIN_EMAIL = 'uat-admin@test.com';
const ADMIN_PASSWORD = 'UatAdmin123!';

test.describe.serial('Phase 0: Super Admin Setup', () => {

  test.describe('0.1 — Login SUPER_ADMIN', () => {
    test('TC-AUTH-02: Login Berhasil (SUPER_ADMIN) @smoke @critical', async ({ loginAs }) => {
      const page = await loginAs('super@sinaloka.com', 'password');
      await expect(page).toHaveURL(/\/super\/institutions/);
      // Verify SA sidebar items
      await expect(page.getByRole('link', { name: /institutions/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
    });
  });

  test.describe('0.2 — Institutions', () => {
    test('TC-SA-INST-01: List Institutions @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await expect(instPage.table).toBeVisible();
      // Seed creates 2 institutions
      const rows = instPage.table.getByRole('row');
      await expect(rows).toHaveCount({ minimum: 3 }); // header + 2 rows
    });

    test('TC-SA-INST-02: Create Institution ★ @smoke @critical', async ({ loggedInPage, setState }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.gotoCreateForm();

      // Fill institution + admin
      await instPage.fillCreateForm({
        name: INSTITUTION_NAME,
        email: 'uat@test.com',
        adminName: 'UAT Admin',
        adminEmail: ADMIN_EMAIL,
        adminPassword: ADMIN_PASSWORD,
      });

      // Capture API response for institution ID
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/super-admin/institutions') && r.request().method() === 'POST'
      );
      await instPage.submitCreate();
      const response = await responsePromise;
      const body = await response.json();

      // Verify redirect back to list
      await page.waitForURL(/\/super\/institutions$/);
      await expect(instPage.getRowByName(INSTITUTION_NAME)).toBeVisible();

      // Save state for Phase 1
      setState({
        phase0: {
          institutionId: body.id ?? body.data?.id,
          institutionName: INSTITUTION_NAME,
          adminCredentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        },
      });
    });

    test('TC-NEG-SA-01: Create Institution — Nama Duplikat @negative', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.gotoCreateForm();
      await instPage.fillCreateForm({
        name: INSTITUTION_NAME, // duplicate
        adminName: 'Dup Admin',
        adminEmail: 'dup@test.com',
        adminPassword: 'DupAdmin123!',
      });
      await instPage.submitCreate();
      // Expect error — form stays open or toast error
      await expect(instPage.getToast().or(page.getByText(/already|sudah/i))).toBeVisible();
    });

    test('TC-NEG-SA-02: Create Institution — Tanpa Admin User @negative', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.gotoCreateForm();
      // Fill institution only, leave admin empty
      await page.locator('#name').fill('No Admin Institution');
      await instPage.submitCreate();
      // Expect validation error on admin fields
      await expect(page.getByText(/required|wajib/i)).toBeVisible();
    });

    test('TC-NEG-SA-03: Create Institution — Admin Email Invalid @negative', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.gotoCreateForm();
      await instPage.fillCreateForm({
        name: 'Invalid Email Inst',
        adminName: 'Admin',
        adminEmail: 'bukanformat', // invalid
        adminPassword: 'Admin123!',
      });
      await instPage.submitCreate();
      await expect(page.getByText(/email.*valid|format.*email/i)).toBeVisible();
    });

    test('TC-SA-INST-03: View Institution Detail @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.openDetail(INSTITUTION_NAME);
      // Verify tabs exist
      for (const tab of ['General', 'Billing', 'Admins', 'Overview', 'Plan']) {
        await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') })).toBeVisible();
      }
    });

    test('TC-SA-INST-04: Edit Institution @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.openDetail(INSTITUTION_NAME);
      await instPage.clickTab('General');
      // Edit name field (already pre-filled)
      const nameInput = page.locator('#name');
      await nameInput.clear();
      await nameInput.fill(INSTITUTION_NAME); // keep same for other tests
      await page.getByRole('button', { name: /save/i }).click();
      await expect(instPage.getToast()).toBeVisible();
    });

    test('TC-SA-INST-06: Search Institutions @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.search(INSTITUTION_NAME);
      await expect(instPage.getRowByName(INSTITUTION_NAME)).toBeVisible();
    });

    test('TC-SA-INST-07: Manage Institution Plan @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('superAdmin');
      const instPage = new InstitutionsPage(page);
      await instPage.goto();
      await instPage.openDetail(INSTITUTION_NAME);
      await instPage.overridePlan('BUSINESS');
      await expect(instPage.getToast()).toBeVisible();
    });
  });

  // 0.3 — Users: TC-SA-USR-01 through TC-SA-USR-04, TC-NEG-SA-04, TC-NEG-SA-05
  // 0.4 — Subscriptions: TC-SA-SUB-01 through TC-SA-SUB-05, TC-NEG-SA-06, TC-NEG-SA-08
  // 0.5 — Upgrade Requests: TC-SA-UPG-01 through TC-SA-UPG-04
  // 0.6 — Impersonate: TC-SA-INST-05, TC-NEG-SA-07

  // ... (follow same pattern for remaining sections)
  // Each test follows: login → navigate → action → assert → optionally write state
});
```

**Note to implementer:** The above shows the first section (0.1 + 0.2) with full code. Sections 0.3-0.6 follow the exact same pattern. Implement all 29 TCs using the page objects from Tasks 5-8. Reference the UAT doc at `docs/UAT-TEST-CASES.md` for exact step/assertion details per TC.

- [ ] **Step 2: Run the spec to verify structure**

```bash
cd sinaloka-platform
npx playwright test --config e2e/playwright.config.ts --project=uat --list
```

Expected: Lists all test names with TC IDs.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/uat/specs/phase-0-super-admin.spec.ts
git commit -m "feat(e2e): add Phase 0 Super Admin Setup UAT spec (29 TC)"
```

---

### Task 10: Phase 1 — Bootstrap Spec

**Files:**
- Create: `sinaloka-platform/e2e/uat/specs/phase-1-bootstrap.spec.ts`

**Page objects:** `LoginPage`, `SettingsPage` (existing), `DashboardPage` (existing)

**State reads:** `phase0.adminCredentials`
**State writes:** `phase1.newAdminPassword`, `phase1.subjectIds`, `phase1.roomIds`

**TC IDs (23+):** TC-AUTH-07 (critical, must be FIRST), TC-AUTH-01, TC-AUTH-03, TC-AUTH-04, TC-NEG-AUTH-01 through TC-NEG-AUTH-05, TC-AUTH-05, TC-AUTH-06, TC-AUTH-08, TC-SET-01 through TC-SET-07, TC-NEG-SET-01 through TC-NEG-SET-06, TC-NEG-AUTH-08, TC-NEG-AUTH-09

- [ ] **Step 1: Write the spec file**

Key pattern for Phase 1:

```typescript
import { test, expect } from '../uat.fixture';
import { LoginPage } from '../../pages/login.page';
import { SettingsPage } from '../../pages/settings.page';

test.describe.serial('Phase 1: Bootstrap', () => {

  test.describe('1.1 — Authentication', () => {
    // MUST be first — admin has must_change_password: true
    test('TC-AUTH-07: Force Change Password ★ @critical', async ({ uatPage, getState, setState }) => {
      const state = getState();
      const creds = state.phase0!.adminCredentials;
      const loginPage = new LoginPage(uatPage);
      await loginPage.goto();
      await loginPage.login(creds.email, creds.password);

      // Should redirect to /settings?tab=security with force-change banner
      await expect(uatPage).toHaveURL(/settings.*tab=security/);
      await expect(uatPage.getByText(/must change.*password|harus.*ganti.*password/i)).toBeVisible();

      // Fill change password form
      const newPassword = 'NewUatAdmin123!';
      await uatPage.getByLabel(/current password/i).fill(creds.password);
      await uatPage.getByLabel(/^new password$/i).fill(newPassword);
      await uatPage.getByLabel(/confirm.*password/i).fill(newPassword);
      await uatPage.getByRole('button', { name: /update password/i }).click();

      // Should redirect to dashboard after success
      await uatPage.waitForURL('/', { timeout: 10_000 });

      // Save new password to state
      setState({
        phase1: {
          newAdminPassword: newPassword,
          subjectIds: [],
          roomIds: [],
        },
      });
    });

    test('TC-AUTH-01: Login ADMIN @smoke @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('admin'); // reads newAdminPassword
      await expect(page).toHaveURL('/');
    });

    test('TC-AUTH-03: Login gagal — kredensial salah @negative', async ({ uatPage }) => {
      const loginPage = new LoginPage(uatPage);
      await loginPage.goto();
      await loginPage.login('uat-admin@test.com', 'wrongpassword');
      await expect(loginPage.getErrorMessage()).toBeVisible();
      await expect(uatPage).toHaveURL(/\/login/);
    });

    // ... remaining auth TCs following same pattern
  });

  test.describe('1.2 — Settings', () => {
    // TC-SET-01 through TC-SET-07, TC-NEG-SET-01 through TC-NEG-SET-06
    // Use existing SettingsPage page object
    // For Academic Subjects (TC-SET-04): capture created subject IDs into state
    // For Academic Rooms (TC-SET-03): capture created room IDs into state

    test('TC-SET-04: Academic — Subjects ★ @critical', async ({ loggedInPage, getState, setState }) => {
      const page = await loggedInPage('admin');
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();
      // Navigate to Academic tab
      await page.getByRole('tab', { name: /academic/i }).click();
      // ... create subjects, capture IDs from API response
      // Update state with subject IDs
      const state = getState();
      setState({
        phase1: { ...state.phase1!, subjectIds: [/* captured IDs */] },
      });
    });
  });
});
```

**Note to implementer:** The settings page has Subjects and Rooms CRUD within the Academic tab. Use `waitForResponse` to capture created entity IDs. Each settings tab test should navigate to the tab, verify fields, make a change, save, verify toast. Negative tests: clear required fields, enter invalid data, verify validation errors.

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/uat/specs/phase-1-bootstrap.spec.ts
git commit -m "feat(e2e): add Phase 1 Bootstrap UAT spec (23+ TC)"
```

---

### Task 11: Phase 2 — Master Data Spec

**Files:**
- Create: `sinaloka-platform/e2e/uat/specs/phase-2-master-data.spec.ts`

**Page objects:** `StudentsPage` (existing), `TutorsPage` (existing)

**State reads:** `phase0.adminCredentials`, `phase1.newAdminPassword`, `phase1.subjectIds`
**State writes:** `phase2.studentIds`, `phase2.tutorIds`

**TC IDs (~35):** TC-STU-01 through TC-STU-12, TC-NEG-STU-01 through TC-NEG-STU-10, TC-TUT-01 through TC-TUT-11, TC-NEG-TUT-01 through TC-NEG-TUT-06

- [ ] **Step 1: Write the spec file**

Key pattern:

```typescript
import { test, expect } from '../uat.fixture';
import { StudentsPage } from '../../pages/students.page';
import { TutorsPage } from '../../pages/tutors.page';

test.describe.serial('Phase 2: Master Data', () => {

  test.describe('2.1 — Students', () => {
    test('TC-STU-04: Tambah Student Baru ★ @smoke @critical', async ({ loggedInPage, getState, setState }) => {
      const page = await loggedInPage('admin');
      const studentsPage = new StudentsPage(page);
      await studentsPage.goto();

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/admin/students') && r.request().method() === 'POST'
      );
      await studentsPage.createStudent({
        name: 'UAT Student',
        email: 'uat-student@test.com',
        phone: '081234567890',
        grade: '7',
        parentName: 'Parent UAT',
        parentPhone: '081234567891',
        parentEmail: 'parent-uat@test.com',
      });
      const response = await responsePromise;
      const body = await response.json();

      await expect(studentsPage.getToast()).toBeVisible();
      await expect(studentsPage.getRowByName('UAT Student')).toBeVisible();

      setState({
        phase2: {
          studentIds: [body.id ?? body.data?.id],
          tutorIds: [],
        },
      });
    });

    // TC-STU-05, TC-NEG-STU-01 through TC-NEG-STU-10, TC-STU-01 through TC-STU-12
    // Use existing StudentsPage methods for CRUD
    // For Import CSV (TC-STU-09): use page.setInputFiles() on the file input
    // For Export CSV (TC-STU-10): use page.waitForDownload()
  });

  test.describe('2.2 — Tutors', () => {
    test('TC-TUT-04: Tambah Tutor Baru ★ @smoke @critical', async ({ loggedInPage, getState, setState }) => {
      const page = await loggedInPage('admin');
      const tutorsPage = new TutorsPage(page);
      await tutorsPage.goto();

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/admin/tutors') && r.request().method() === 'POST'
      );
      await tutorsPage.inviteTutor({
        name: 'UAT Tutor',
        email: 'uat-tutor@test.com',
        subjects: ['Matematika'],
      });
      const response = await responsePromise;
      const body = await response.json();

      await expect(tutorsPage.getToast()).toBeVisible();

      const state = getState();
      setState({
        phase2: {
          ...state.phase2!,
          tutorIds: [...(state.phase2?.tutorIds ?? []), body.id ?? body.data?.id],
        },
      });
    });

    // Remaining tutor TCs...
  });
});
```

**Note to implementer:** The existing `StudentsPage.createStudent()` and `TutorsPage.inviteTutor()` methods handle form filling. For negative tests, fill invalid data and assert error messages/toasts. For import/export, use Playwright's `setInputFiles` and `waitForDownload`. Capture IDs via `waitForResponse` and save to state.

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/e2e/uat/specs/phase-2-master-data.spec.ts
git commit -m "feat(e2e): add Phase 2 Master Data UAT spec (~35 TC)"
```

---

### Task 12: Phase 3 — Academic Setup Spec

**Files:**
- Create: `sinaloka-platform/e2e/uat/specs/phase-3-academic-setup.spec.ts`

**Page objects:** `ClassesPage` (existing)

**State reads:** `phase0.adminCredentials`, `phase1.newAdminPassword`, `phase1.subjectIds`, `phase2.tutorIds`
**State writes:** `phase3.classIds`

**TC IDs (11):** TC-CLS-04 (critical), TC-NEG-CLS-01 through TC-NEG-CLS-05, TC-CLS-01, TC-CLS-02, TC-CLS-03, TC-CLS-05, TC-CLS-07

- [ ] **Step 1: Write the spec file**

```typescript
import { test, expect } from '../uat.fixture';
import { ClassesPage } from '../../pages/classes.page';

test.describe.serial('Phase 3: Academic Setup', () => {

  test.describe('3.1 — Classes', () => {
    test('TC-CLS-04: Tambah Class Baru ★ @smoke @critical', async ({ loggedInPage, setState }) => {
      const page = await loggedInPage('admin');
      const classesPage = new ClassesPage(page);
      await classesPage.goto();

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/admin/classes') && r.request().method() === 'POST'
      );
      await classesPage.createClass({
        name: 'UAT Math Class',
        subject: 'Matematika',
        tutor: 'UAT Tutor',
        days: ['Mon', 'Wed'],
        startTime: '09:00',
        endTime: '10:30',
        capacity: '20',
        fee: '500000',
        tutorFee: '200000',
      });
      const response = await responsePromise;
      const body = await response.json();

      await expect(classesPage.getToast()).toBeVisible();
      await expect(classesPage.getRowByName('UAT Math Class')).toBeVisible();

      setState({
        phase3: {
          classIds: [body.id ?? body.data?.id],
        },
      });
    });

    test('TC-NEG-CLS-01: Buat Class — Capacity 0 @negative', async ({ loggedInPage }) => {
      const page = await loggedInPage('admin');
      const classesPage = new ClassesPage(page);
      await classesPage.goto();
      // Open create, fill with capacity 0
      await page.getByRole('button', { name: /add class/i }).click();
      await page.locator('#class-name').fill('Zero Capacity Class');
      await page.locator('#capacity').fill('0');
      await page.locator('#fee').fill('500000');
      // Try submit
      await page.getByRole('button', { name: /add class/i }).last().click();
      // Expect validation error
      await expect(page.getByText(/capacity|kapasitas/i).filter({ hasText: /min|minimal|greater/i })).toBeVisible();
    });

    // TC-NEG-CLS-02: Fee negative
    // TC-NEG-CLS-04: No schedule
    // TC-NEG-CLS-05: Start > End time
    // TC-NEG-CLS-03: Tutor schedule overlap
    // TC-CLS-01: List classes
    // TC-CLS-02: Filter and search
    // TC-CLS-03: Timetable view
    // TC-CLS-05: Edit class
    // TC-CLS-07: View detail drawer

    test('TC-CLS-01: List Classes @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('admin');
      const classesPage = new ClassesPage(page);
      await classesPage.goto();
      await expect(classesPage.table).toBeVisible();
      await expect(classesPage.getRowByName('UAT Math Class')).toBeVisible();
    });

    test('TC-CLS-03: Timetable View @positive', async ({ loggedInPage }) => {
      const page = await loggedInPage('admin');
      const classesPage = new ClassesPage(page);
      await classesPage.goto();
      // Switch to timetable view
      await page.getByRole('button', { name: /timetable|calendar/i }).click();
      // Verify timetable rendered
      await expect(page.getByText(/monday|senin/i)).toBeVisible();
    });
  });
});
```

**Note to implementer:** Class creation requires a subject and tutor to exist (created in Phases 1-2). The existing `ClassesPage.createClass()` selects subject/tutor from dropdowns. For negative tests with schedule overlap, create two classes with the same tutor and overlapping times.

- [ ] **Step 2: Run full UAT suite to verify end-to-end flow**

```bash
cd sinaloka-platform
npm run test:uat
```

Expected: All phases run sequentially. Phase 0 creates data, Phase 1 configures, Phase 2 adds students/tutors, Phase 3 creates classes. All tests use TC IDs.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/uat/specs/phase-3-academic-setup.spec.ts
git commit -m "feat(e2e): add Phase 3 Academic Setup UAT spec (11 TC)"
```

---

## Post-Implementation Checklist

- [ ] All 12 tasks committed
- [ ] `npm run test:uat` lists all ~92 test cases
- [ ] Phase 0 can login as SUPER_ADMIN and create institution
- [ ] Phase 1 can handle force-change-password and configure settings
- [ ] Phase 2 can create students and tutors
- [ ] Phase 3 can create classes using Phase 1-2 data
- [ ] State file correctly passes data between phases
- [ ] `npm run test:e2e` (existing mocked tests) still works unaffected
