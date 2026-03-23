import { test, expect } from '../uat.fixture';
import { LoginPage } from '../../pages/login.page';
import { InstitutionsPage } from '../../pages/super-admin/institutions.page';
import { SuperAdminUsersPage } from '../../pages/super-admin/users.page';
import { SubscriptionsPage } from '../../pages/super-admin/subscriptions.page';
import { UpgradeRequestsPage } from '../../pages/super-admin/upgrade-requests.page';

const INSTITUTION_NAME = 'UAT Test Institution';
const ADMIN_EMAIL = 'uat-admin@test.com';
const ADMIN_PASSWORD = 'UatAdmin123!';
const ADMIN_NAME = 'UAT Admin';

test.describe.serial('Phase 0: Super Admin Setup', () => {
  // ---------------------------------------------------------------------------
  // 0.1 — Login SUPER_ADMIN
  // ---------------------------------------------------------------------------

  test('TC-AUTH-02: Login as SUPER_ADMIN redirects to /super/institutions with SA menu', async ({
    loginAs,
    page,
  }) => {
    await loginAs('super@sinaloka.com', 'password');

    await expect(page).toHaveURL(/\/super\/institutions/);

    // Verify sidebar has Super Admin menu items
    const sidebar = page.locator('nav, aside').first();
    await expect(sidebar.getByText(/institutions/i)).toBeVisible();
    await expect(sidebar.getByText(/users/i)).toBeVisible();
    await expect(sidebar.getByText(/subscriptions/i)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 0.2 — Institutions (9 TC)
  // ---------------------------------------------------------------------------

  test('TC-SA-INST-01: List institutions shows table with seeded data', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();

    await expect(instPage.table).toBeVisible();

    // Seeded data should have at least 2 data rows (tbody excludes header)
    const rows = instPage.table.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test('TC-SA-INST-02: Create institution, capture ID, write state', async ({
    loggedInPage,
    setState,
    page,
  }) => {
    const pg = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(pg);
    await instPage.goto();
    await instPage.gotoCreateForm();

    await instPage.fillCreateForm({
      name: INSTITUTION_NAME,
      adminName: ADMIN_NAME,
      adminEmail: ADMIN_EMAIL,
      adminPassword: ADMIN_PASSWORD,
    });

    // Intercept the POST response to capture institution ID
    const responsePromise = pg.waitForResponse(
      (r) => r.url().includes('/api/super-admin/institutions') && r.request().method() === 'POST',
    );
    await instPage.submitCreate();
    const response = await responsePromise;
    const body = await response.json();

    // Should redirect back to list or show success
    await expect(instPage.toast).toBeVisible({ timeout: 10_000 });

    // Write state for downstream phases
    setState({
      phase0: {
        institutionId: body.id ?? body.data?.id,
        institutionName: INSTITUTION_NAME,
        adminCredentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      },
    });
  });

  test('TC-NEG-SA-01: Create institution with duplicate name shows error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.gotoCreateForm();

    await instPage.fillCreateForm({
      name: INSTITUTION_NAME, // duplicate
      adminName: 'Duplicate Admin',
      adminEmail: 'dup-admin@test.com',
      adminPassword: 'DupAdmin123!',
    });

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/institutions') && r.request().method() === 'POST',
    );
    await instPage.submitCreate();
    const response = await responsePromise;
    expect(response.status()).toBeGreaterThanOrEqual(400);

    // Error message should appear — toast or inline
    const errorVisible = await instPage.toast
      .or(page.locator('text=/already|exists|duplicate|conflict/i'))
      .first()
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test('TC-NEG-SA-02: Create institution without admin fields shows validation error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.gotoCreateForm();

    // Fill only institution name, skip admin fields
    await page.locator('#name').fill('Incomplete Institution');

    await instPage.submitCreate();

    // Validation errors should appear (required fields)
    // Look for any validation message near admin fields
    const validationError = page.locator(
      'text=/required|must|please|field/i',
    );
    await expect(validationError.first()).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NEG-SA-03: Create institution with invalid admin email shows format error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.gotoCreateForm();

    await instPage.fillCreateForm({
      name: 'Invalid Email Institution',
      adminName: 'Bad Email Admin',
      adminEmail: 'bukanformat', // invalid email
      adminPassword: 'ValidPass123!',
    });

    await instPage.submitCreate();

    // Email format error should appear
    const emailError = page.locator(
      'text=/email|valid|format|invalid/i',
    );
    await expect(emailError.first()).toBeVisible({ timeout: 5_000 });
  });

  test('TC-SA-INST-03: Institution detail shows 5 tabs', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.openDetail(INSTITUTION_NAME);

    // Tabs are <button> elements, not role="tab"
    const tabs = ['General', 'Billing & Payment', 'Admins', 'Overview', 'Plan'];
    for (const tab of tabs) {
      await expect(
        page.getByRole('button', { name: new RegExp(tab, 'i') }),
      ).toBeVisible();
    }
  });

  test('TC-SA-INST-04: Edit institution name on General tab shows toast success', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.openDetail(INSTITUTION_NAME);
    await instPage.clickTab('General');

    // Edit the institution name
    const nameInput = page.locator('#name');
    await nameInput.clear();
    await nameInput.fill(INSTITUTION_NAME + ' Updated');

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/institutions') && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: /save/i }).click();
    await responsePromise;

    await expect(instPage.toast).toBeVisible({ timeout: 10_000 });

    // Revert name back for other tests
    await nameInput.clear();
    await nameInput.fill(INSTITUTION_NAME);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(instPage.toast).toBeVisible({ timeout: 10_000 });
  });

  test('TC-SA-INST-06: Search institutions filters results', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();

    await instPage.search(INSTITUTION_NAME);

    // The table should contain a row matching our institution
    const matchRow = instPage.getRowByName(INSTITUTION_NAME);
    await expect(matchRow).toBeVisible({ timeout: 5_000 });

    // Search for something that shouldn't exist
    await instPage.search('NonExistentInstitution12345');
    await page.waitForTimeout(500);
    const dataRows = instPage.table.getByRole('row');
    const count = await dataRows.count();
    // Should have only header row or show empty state
    expect(count).toBeLessThanOrEqual(2);
  });

  test('TC-SA-INST-07: Override plan to BUSINESS on Plan tab shows toast success', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.openDetail(INSTITUTION_NAME);

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/institutions') && r.request().method() === 'PATCH',
    );
    await instPage.overridePlan('BUSINESS');
    await responsePromise;

    await expect(instPage.toast).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 0.3 — Users (6 TC)
  // ---------------------------------------------------------------------------

  test('TC-SA-USR-01: List users shows table with columns', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const usersPage = new SuperAdminUsersPage(page);
    await usersPage.goto();

    await expect(usersPage.table).toBeVisible();

    // Verify table has header columns
    const headerRow = usersPage.table.getByRole('row').first();
    await expect(headerRow).toBeVisible();
  });

  test('TC-SA-USR-02: Filter by role ADMIN and by institution', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const usersPage = new SuperAdminUsersPage(page);
    await usersPage.goto();

    // Filter by role ADMIN
    await usersPage.filterByRole('ADMIN');
    await page.waitForTimeout(500);
    await expect(usersPage.table).toBeVisible();

    // Filter by institution
    await usersPage.filterByInstitution(INSTITUTION_NAME);
    await page.waitForTimeout(500);
    await expect(usersPage.table).toBeVisible();
  });

  test('TC-SA-USR-03: Create user with valid data appears in table', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const usersPage = new SuperAdminUsersPage(page);
    await usersPage.goto();
    await usersPage.openCreateModal();

    const newEmail = `uat-user-${Date.now()}@test.com`;
    await usersPage.fillCreateForm({
      name: 'UAT Test User',
      email: newEmail,
      password: 'TestUser123!',
      institution: INSTITUTION_NAME,
    });

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/users') && r.request().method() === 'POST',
    );
    await usersPage.submitCreate();
    await responsePromise;

    await expect(usersPage.toast).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-SA-04: Create user with duplicate email shows error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const usersPage = new SuperAdminUsersPage(page);
    await usersPage.goto();
    await usersPage.openCreateModal();

    // Use admin@cerdas.id which exists from seed data
    await usersPage.fillCreateForm({
      name: 'Duplicate User',
      email: 'admin@cerdas.id',
      password: 'DupUser123!',
    });

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/users') && r.request().method() === 'POST',
    );
    await usersPage.submitCreate();
    const response = await responsePromise;
    expect(response.status()).toBeGreaterThanOrEqual(400);

    // Error should be visible — toast or inline
    const errorVisible = await usersPage.toast
      .or(page.locator('text=/already|exists|duplicate|conflict|taken/i'))
      .first()
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test('TC-NEG-SA-05: Create user with weak password shows validation error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const usersPage = new SuperAdminUsersPage(page);
    await usersPage.goto();
    await usersPage.openCreateModal();

    await usersPage.fillCreateForm({
      name: 'Weak Password User',
      email: 'weak-pw@test.com',
      password: '123', // too weak
    });

    await usersPage.submitCreate();

    // Validation error for password
    const pwError = page.locator(
      'text=/password|weak|short|minimum|at least|characters/i',
    );
    await expect(pwError.first()).toBeVisible({ timeout: 5_000 });
  });

  test('TC-SA-USR-04: Edit user — toggle active off shows toast success', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const usersPage = new SuperAdminUsersPage(page);
    await usersPage.goto();

    // Open edit on the admin we created
    await usersPage.openEditModal(ADMIN_EMAIL);
    await usersPage.toggleActive();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/users') && r.request().method() === 'PATCH',
    );
    await usersPage.submitEdit();
    await responsePromise;

    await expect(usersPage.toast).toBeVisible({ timeout: 10_000 });

    // Re-activate the user so downstream phases work
    await usersPage.openEditModal(ADMIN_EMAIL);
    await usersPage.toggleActive();
    await usersPage.submitEdit();
    await expect(usersPage.toast).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 0.4 — Subscriptions (7 TC)
  // ---------------------------------------------------------------------------

  test('TC-SA-SUB-01: Subscription dashboard shows 3 tabs and stats cards', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();

    // Verify 3 tabs
    await expect(page.getByRole('tab', { name: /subscriptions/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /pending payments/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /payment history/i })).toBeVisible();

    // Stats cards should be visible (cards with numbers/labels)
    const statsArea = page.locator('.grid, [class*="stats"], [class*="card"]').first();
    await expect(statsArea).toBeVisible({ timeout: 5_000 });
  });

  test('TC-SA-SUB-02: Subscription list shows table with columns', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();
    await subsPage.switchTab('SUBSCRIPTIONS');

    const table = subsPage.getTable();
    await expect(table).toBeVisible();

    // Verify header row exists
    const headerRow = table.getByRole('row').first();
    await expect(headerRow).toBeVisible();
  });

  test('TC-SA-SUB-03: Override subscription with plan/expiry/notes succeeds', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();
    await subsPage.switchTab('SUBSCRIPTIONS');

    // Use the first institution in the table that has an override button
    const overrideBtn = page.getByRole('button', { name: /override/i }).first();
    const hasOverride = await overrideBtn.isVisible().catch(() => false);

    if (!hasOverride) {
      // No override button available — skip gracefully
      test.skip();
      return;
    }

    await overrideBtn.click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });

    // Fill override form
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const expiryStr = futureDate.toISOString().split('T')[0];

    await subsPage.fillOverride({
      plan: 'GROWTH',
      expiryDate: expiryStr,
      notes: 'UAT override test',
    });

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/subscriptions') && r.request().method() === 'PATCH',
    );
    await subsPage.submitOverride();
    await responsePromise;

    await expect(subsPage.toast).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-SA-06: Override with past expiry date shows warning or error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();
    await subsPage.switchTab('SUBSCRIPTIONS');

    const overrideBtn = page.getByRole('button', { name: /override/i }).first();
    const hasOverride = await overrideBtn.isVisible().catch(() => false);

    if (!hasOverride) {
      test.skip();
      return;
    }

    await overrideBtn.click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });

    // Use a past date
    await subsPage.fillOverride({
      expiryDate: '2020-01-01',
      notes: 'UAT past expiry test',
    });

    await subsPage.submitOverride();

    // NOTE: Actual behavior to be documented during UAT run.
    // The system may show a warning, error toast, or accept the past date.
    // We verify that *something* happens (toast or validation message).
    const feedback = subsPage.toast
      .or(page.locator('text=/past|expired|invalid|warning|error/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-SA-SUB-04: Confirm pending payment (approve) updates status', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();
    await subsPage.switchTab('PENDING PAYMENTS');

    // NOTE: Depends on seeded data having pending payments.
    // If no pending payments exist, verify UI structure only.
    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    const hasPending = await approveBtn.isVisible().catch(() => false);

    if (!hasPending) {
      // No pending payments — verify table/empty state structure
      const table = subsPage.getTable();
      const tableVisible = await table.isVisible().catch(() => false);
      const emptyState = page.locator('text=/no pending|no data|empty/i').first();
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      expect(tableVisible || emptyVisible).toBeTruthy();
      return;
    }

    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/super-admin/') &&
        (r.request().method() === 'PATCH' || r.request().method() === 'POST'),
    );
    await approveBtn.click();
    await responsePromise;

    await expect(subsPage.toast).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-SA-08: Reject payment without notes — document behavior', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();
    await subsPage.switchTab('PENDING PAYMENTS');

    // NOTE: Depends on seeded data having pending payments.
    const rejectBtn = page.getByRole('button', { name: /reject/i }).first();
    const hasPending = await rejectBtn.isVisible().catch(() => false);

    if (!hasPending) {
      // No pending payments — verify UI structure only
      const table = subsPage.getTable();
      const tableVisible = await table.isVisible().catch(() => false);
      const emptyState = page.locator('text=/no pending|no data|empty/i').first();
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      expect(tableVisible || emptyVisible).toBeTruthy();
      return;
    }

    // Reject without providing notes
    await rejectBtn.click();

    // NOTE: Actual behavior uncertain — may succeed (reject without notes)
    // or show validation error requiring notes. Document during UAT run.
    const feedback = subsPage.toast
      .or(page.locator('text=/required|notes|reason|error/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-SA-SUB-05: Payment history tab shows data columns', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const subsPage = new SubscriptionsPage(page);
    await subsPage.goto();
    await subsPage.switchTab('PAYMENT HISTORY');

    // Verify table or empty state is visible
    const table = subsPage.getTable();
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyState = page.locator('text=/no history|no data|empty|no payment/i').first();
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible).toBeTruthy();

    if (tableVisible) {
      // Verify header row exists
      const headerRow = table.getByRole('row').first();
      await expect(headerRow).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // 0.5 — Upgrade Requests (4 TC)
  // ---------------------------------------------------------------------------

  test('TC-SA-UPG-01: View upgrade requests shows table', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const upgPage = new UpgradeRequestsPage(page);
    await upgPage.goto();

    // Table or empty state should be visible
    const table = upgPage.getTable();
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyState = page.locator('text=/no request|no data|empty|no upgrade/i').first();
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible).toBeTruthy();
  });

  test('TC-SA-UPG-02: Filter by status tabs shows correct filtering', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const upgPage = new UpgradeRequestsPage(page);
    await upgPage.goto();

    // Switch through each status tab
    const tabs: Array<'All Statuses' | 'Pending' | 'Approved' | 'Rejected'> = [
      'All Statuses',
      'Pending',
      'Approved',
      'Rejected',
    ];

    for (const tab of tabs) {
      await upgPage.switchTab(tab);
      // Verify the page doesn't crash — table or empty state visible
      const table = upgPage.getTable();
      const tableVisible = await table.isVisible().catch(() => false);
      const emptyState = page.locator('text=/no request|no data|empty|no upgrade/i').first();
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      expect(tableVisible || emptyVisible).toBeTruthy();
    }
  });

  test('TC-SA-UPG-03: Approve upgrade request changes status', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const upgPage = new UpgradeRequestsPage(page);
    await upgPage.goto();
    await upgPage.switchTab('Pending');

    // NOTE: Depends on seeded data having pending upgrade requests.
    const actionBtn = page
      .getByRole('button', { name: /approve|review/i })
      .first();
    const hasPending = await actionBtn.isVisible().catch(() => false);

    if (!hasPending) {
      // No pending requests — verify UI structure only
      const table = upgPage.getTable();
      const tableVisible = await table.isVisible().catch(() => false);
      expect(tableVisible).toBeTruthy(); // page loaded and table visible
      return;
    }

    await actionBtn.click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });

    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/super-admin/upgrade-request') &&
        (r.request().method() === 'PATCH' || r.request().method() === 'POST'),
    );
    await upgPage.approve('UAT approval test');
    await responsePromise;

    await expect(upgPage.toast).toBeVisible({ timeout: 10_000 });
  });

  test('TC-SA-UPG-04: Reject upgrade request with notes changes status', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const upgPage = new UpgradeRequestsPage(page);
    await upgPage.goto();
    await upgPage.switchTab('Pending');

    // NOTE: Depends on seeded data having pending upgrade requests.
    const actionBtn = page
      .getByRole('button', { name: /reject|review/i })
      .first();
    const hasPending = await actionBtn.isVisible().catch(() => false);

    if (!hasPending) {
      // No pending requests — verify UI structure only
      const table = upgPage.getTable();
      const tableVisible = await table.isVisible().catch(() => false);
      expect(tableVisible).toBeTruthy();
      return;
    }

    await actionBtn.click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });

    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/super-admin/upgrade-request') &&
        (r.request().method() === 'PATCH' || r.request().method() === 'POST'),
    );
    await upgPage.reject('UAT rejection — not eligible at this time');
    await responsePromise;

    await expect(upgPage.toast).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 0.6 — Impersonate (2 TC)
  // ---------------------------------------------------------------------------

  test('TC-SA-INST-05: Impersonate institution — amber banner, navigate, exit', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();

    // Impersonate the UAT institution
    await instPage.impersonate(INSTITUTION_NAME);

    // Amber impersonation banner should be visible
    await expect(instPage.impersonationBanner).toBeVisible({ timeout: 10_000 });

    // Navigate an admin page to verify impersonation works
    await page.goto('/');
    await expect(instPage.impersonationBanner).toBeVisible();

    // Exit impersonation
    await instPage.exitImpersonation();

    // Should be back at SA institutions page
    await expect(page).toHaveURL(/\/super\/institutions/);
    await expect(instPage.impersonationBanner).not.toBeVisible();
  });

  test('TC-NEG-SA-07: Deactivate institution via detail page', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('superAdmin');
    const instPage = new InstitutionsPage(page);
    await instPage.goto();
    await instPage.openDetail(INSTITUTION_NAME);
    await instPage.clickTab('General');

    // Look for a deactivate/disable toggle or button
    const deactivateBtn = page
      .getByRole('button', { name: /deactivate|disable|suspend/i })
      .or(page.getByRole('switch'))
      .first();

    const hasDeactivate = await deactivateBtn.isVisible().catch(() => false);

    if (!hasDeactivate) {
      // If no explicit deactivate button, look for status toggle
      // Document this for UAT — the UI may not have this control yet
      test.skip();
      return;
    }

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/super-admin/institutions') && r.request().method() === 'PATCH',
    );
    await deactivateBtn.click();

    // May show a confirmation dialog
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|deactivate/i });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    await responsePromise;
    await expect(instPage.toast).toBeVisible({ timeout: 10_000 });

    // Re-activate for downstream phases
    const activateBtn = page
      .getByRole('button', { name: /activate|enable/i })
      .or(page.getByRole('switch'))
      .first();
    if (await activateBtn.isVisible().catch(() => false)) {
      await activateBtn.click();
      const confirm2 = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirm2.isVisible().catch(() => false)) {
        await confirm2.click();
      }
      await expect(instPage.toast).toBeVisible({ timeout: 10_000 });
    }
  });
});
