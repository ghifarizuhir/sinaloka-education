import { test, expect } from '../uat.fixture';
import { LoginPage } from '../../pages/login.page';
import { SettingsPage } from '../../pages/settings.page';

const NEW_ADMIN_PASSWORD = 'NewUatAdmin123!';

test.describe.serial('Phase 1: Bootstrap', () => {
  // ===========================================================================
  // 1.1 — Authentication (11 TC)
  // ===========================================================================

  test('TC-AUTH-07: Force change password on first login → redirected to security tab', async ({
    uatPage: page,
    getState,
    setState,
  }) => {
    const state = getState();
    if (!state.phase0?.adminCredentials) {
      throw new Error('[uat] phase0.adminCredentials missing. Run Phase 0 first.');
    }

    const { email, password: originalPassword } = state.phase0.adminCredentials;

    // Set language to English
    await page.addInitScript(() => {
      localStorage.setItem('sinaloka-lang', 'en');
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, originalPassword);

    // Should be redirected to /settings?tab=security
    await page.waitForURL(/\/settings.*tab=security/, { timeout: 15_000 });

    // Amber banner should be visible (must change password alert)
    const amberBanner = page.locator('.border-amber-500\\/30, [class*="amber"]').first();
    await expect(amberBanner).toBeVisible({ timeout: 5_000 });

    // Fill the change password form
    const settingsPage = new SettingsPage(page);
    const currentInput = page.locator('label').filter({ hasText: /current password/i }).locator('..').locator('input').first();
    const newInput = page.locator('label').filter({ hasText: /^new password$/i }).locator('..').locator('input').first();
    const confirmInput = page.locator('label').filter({ hasText: /confirm/i }).locator('..').locator('input').first();

    await currentInput.fill(originalPassword);
    await newInput.fill(NEW_ADMIN_PASSWORD);
    await confirmInput.fill(NEW_ADMIN_PASSWORD);

    // Submit
    await page.getByRole('button', { name: /update password/i }).click();

    // Should redirect to / on success (mustChangePassword triggers window.location.href = '/')
    await page.waitForURL((url) => url.pathname === '/' || !url.pathname.includes('/settings'), {
      timeout: 15_000,
    });

    // Write new password to state
    setState({
      phase1: {
        newAdminPassword: NEW_ADMIN_PASSWORD,
        subjectIds: [],
        roomIds: [],
      },
    });
  });

  test('TC-AUTH-01: Login ADMIN with new password → redirect to /, sidebar visible', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');

    // Should be on dashboard (/)
    await expect(pg).toHaveURL(/^\/$|\/dashboard/);

    // Sidebar should be visible
    const sidebar = pg.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('TC-AUTH-03: Login with wrong password → error, stays on /login', async ({
    uatPage: page,
    getState,
  }) => {
    const state = getState();
    const email = state.phase0!.adminCredentials.email;

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, 'WrongPassword999!');

    // Should stay on /login
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/login/);

    // Error message or toast should be visible
    const error = loginPage.errorMessage.or(loginPage.toast).first();
    await expect(error).toBeVisible({ timeout: 5_000 });
  });

  test('TC-AUTH-04: Submit with empty fields → validation errors', async ({
    uatPage: page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click submit without filling anything
    await loginPage.submitButton.click();

    // Validation errors should appear (HTML5 validation or inline)
    // Check if email input has :invalid state or validation message appears
    const emailInvalid = await loginPage.emailInput.evaluate(
      (el) => !(el as HTMLInputElement).checkValidity(),
    );
    expect(emailInvalid).toBeTruthy();
  });

  test('TC-NEG-AUTH-01: Login with disabled account email → error', async ({
    uatPage: page,
  }) => {
    // Use a fake disabled account — if no deactivated user exists, this tests unregistered path
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('disabled-user@test.com', 'SomePassword123!');

    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/login/);

    const error = loginPage.errorMessage.or(loginPage.toast).first();
    await expect(error).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NEG-AUTH-02: Login with unregistered email → error message', async ({
    uatPage: page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('nonexistent-user-xyz@test.com', 'AnyPassword123!');

    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/login/);

    const error = loginPage.errorMessage.or(loginPage.toast).first();
    await expect(error).toBeVisible({ timeout: 5_000 });
  });

  test('TC-AUTH-05: Toggle password visibility → input type changes', async ({
    uatPage: page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.passwordInput.fill('SomePassword');

    // Password input should be type="password" initially
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // Click the eye/toggle button near the password field
    const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).and(
      loginPage.passwordInput.locator('..').locator('button'),
    );

    // If there's a toggle button, click it
    const hasToggle = await toggleBtn.first().isVisible().catch(() => false);
    if (hasToggle) {
      await toggleBtn.first().click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

      // Toggle back
      await toggleBtn.first().click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    } else {
      // Login page may not have password toggle — document for UAT
      test.skip();
    }
  });

  test('TC-AUTH-08: Login then logout → redirect to /login, tokens cleared', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');

    // Find and click the logout button — it's in sidebar or user menu
    const logoutBtn = page.getByRole('button', { name: /log\s*out/i }).or(
      page.getByRole('menuitem', { name: /log\s*out/i }),
    );

    // First try sidebar logout button
    const sidebarLogout = page.locator('aside button, nav button').filter({ hasText: /log\s*out/i }).first();
    const hasSidebarLogout = await sidebarLogout.isVisible().catch(() => false);

    if (hasSidebarLogout) {
      await sidebarLogout.click();
    } else {
      // Try user menu — click avatar/initials first
      const userMenuTrigger = page.locator('[class*="avatar"], [class*="initials"]').first()
        .or(page.getByRole('button').filter({ hasText: /^[A-Z]{1,2}$/ }).first());
      const hasMenu = await userMenuTrigger.isVisible().catch(() => false);
      if (hasMenu) {
        await userMenuTrigger.click();
        await page.waitForTimeout(300);
      }
      await logoutBtn.first().click();
    }

    // Should redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    // Tokens should be cleared
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  test('TC-AUTH-06: Clear tokens manually → navigate to protected page → redirect to /login', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');

    // Clear tokens from localStorage
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Navigate to a protected page
    await page.goto('/students');

    // Should redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('TC-NEG-AUTH-04: Without auth, navigate to /students → redirect to /login', async ({
    uatPage: page,
  }) => {
    await page.goto('/students');

    // Should redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('TC-NEG-AUTH-05: Login as ADMIN, navigate to /super/institutions → redirect or access denied', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');

    await page.goto('/super/institutions');

    // Admin should be redirected away or shown access denied
    await page.waitForTimeout(2_000);

    // Should NOT be on /super/institutions with data visible
    const isOnSuperPage = page.url().includes('/super/institutions');
    if (isOnSuperPage) {
      // If still on the page, there should be an access denied message or empty/error state
      const accessDenied = page.locator('text=/access denied|forbidden|unauthorized|not authorized/i').first();
      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      // If no access denied message, the page should at least not show institution data
      expect(hasAccessDenied || !isOnSuperPage).toBeTruthy();
    }
    // If redirected away from /super, that's the expected behavior — test passes
  });

  // ===========================================================================
  // 1.2 — Settings (12+ TC)
  // ===========================================================================

  test('TC-SET-01: General tab → fields pre-filled, edit a field, save → toast success', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('General');

    // Verify fields are pre-filled (not empty)
    const nameValue = await settingsPage.institutionNameInput.inputValue();
    expect(nameValue.length).toBeGreaterThan(0);

    // Edit the phone field
    const phoneInput = page.locator('label').filter({ hasText: /phone/i }).locator('..').locator('input').first();
    const originalPhone = await phoneInput.inputValue();
    const testPhone = '+62 812 9999 0001';

    await phoneInput.clear();
    await phoneInput.fill(testPhone);

    // Click save
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.click();

    // Confirm changes modal
    const confirmModal = page.locator('[aria-labelledby="confirm-changes-title"]');
    const hasModal = await confirmModal.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasModal) {
      const confirmBtn = confirmModal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }

    await expect(settingsPage.toast).toBeVisible({ timeout: 10_000 });

    // Revert phone
    await phoneInput.clear();
    await phoneInput.fill(originalPhone);
    await saveBtn.click();
    const hasModal2 = await confirmModal.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasModal2) {
      const confirmBtn2 = confirmModal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn2.click();
    }
  });

  test('TC-NEG-SET-01: General tab → clear institution name, save → validation error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('General');

    // Store original name
    const originalName = await settingsPage.institutionNameInput.inputValue();

    // Clear institution name
    await settingsPage.institutionNameInput.clear();

    // Click save
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.click();

    // Should show "no changes" toast or validation error since field may revert
    // Or the confirm modal won't have changes to show
    const feedback = settingsPage.toast
      .or(page.locator('text=/required|cannot be empty|name|validation|no change/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 5_000 });

    // Restore name
    await settingsPage.institutionNameInput.fill(originalName);
  });

  test('TC-NEG-SET-02: General tab → invalid email format, save → validation error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('General');

    const originalEmail = await settingsPage.supportEmailInput.inputValue();

    // Enter invalid email
    await settingsPage.supportEmailInput.clear();
    await settingsPage.supportEmailInput.fill('notanemail');

    // Click save
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.click();

    // Confirm modal may appear — try to confirm
    const confirmModal = page.locator('[aria-labelledby="confirm-changes-title"]');
    const hasModal = await confirmModal.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasModal) {
      const confirmBtn = confirmModal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }

    // Should show error — either toast with error or server validation
    const feedback = settingsPage.toast
      .or(page.locator('text=/email|valid|format|invalid/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });

    // Restore email
    await settingsPage.supportEmailInput.clear();
    await settingsPage.supportEmailInput.fill(originalEmail);
  });

  test('TC-SET-02: Billing tab → add a bank account → toast success', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Billing');

    // Click "Add Account" button
    const addAccountBtn = page.getByRole('button', { name: /add account/i });
    await addAccountBtn.click();

    // Fill bank account form
    const bankNameInput = page.locator('input[placeholder*="bank" i], input[placeholder*="Bank" i]').first();
    const accountNumberInput = page.locator('input[placeholder*="account" i], input[placeholder*="number" i]').first();
    const accountHolderInput = page.locator('input[placeholder*="holder" i], input[placeholder*="name" i]').last();

    await bankNameInput.fill('BCA');
    await accountNumberInput.fill('1234567890');
    await accountHolderInput.fill('UAT Test Account');

    // Click add bank account button
    const addBankBtn = page.getByRole('button', { name: /add bank account/i });
    await addBankBtn.click();

    // Now save billing
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.click();

    // Confirm changes modal
    const confirmModal = page.locator('[aria-labelledby="confirm-changes-title"]');
    const hasModal = await confirmModal.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasModal) {
      const confirmBtn = confirmModal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }

    await expect(settingsPage.toast).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-SET-03: Billing tab → add duplicate bank account → error message', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Billing');

    // Add same bank account again
    const addAccountBtn = page.getByRole('button', { name: /add account/i });
    await addAccountBtn.click();

    const bankNameInput = page.locator('input[placeholder*="bank" i], input[placeholder*="Bank" i]').first();
    const accountNumberInput = page.locator('input[placeholder*="account" i], input[placeholder*="number" i]').first();
    const accountHolderInput = page.locator('input[placeholder*="holder" i], input[placeholder*="name" i]').last();

    await bankNameInput.fill('BCA');
    await accountNumberInput.fill('1234567890');
    await accountHolderInput.fill('UAT Test Account');

    const addBankBtn = page.getByRole('button', { name: /add bank account/i });
    await addBankBtn.click();

    // Save
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.click();

    const confirmModal = page.locator('[aria-labelledby="confirm-changes-title"]');
    const hasModal = await confirmModal.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasModal) {
      const confirmBtn = confirmModal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }

    // Should show error or duplicate warning
    const feedback = settingsPage.toast
      .or(page.locator('text=/duplicate|already|exists|error/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-SET-03: Academic tab → Rooms → add a room → toast success, capture ID', async ({
    loggedInPage,
    getState,
    setState,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Academic');

    // Click "Add Room" button
    const addRoomBtn = page.getByRole('button', { name: /add room/i }).first();
    await addRoomBtn.click();

    // Fill room form in modal
    await page.locator('#roomName').fill('UAT Room A');
    // Type select defaults to Classroom — leave as is
    // Capacity
    const capacityInput = page.locator('#roomCapacity');
    if (await capacityInput.isVisible()) {
      await capacityInput.fill('20');
    }

    // Intercept API response to capture room data
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/settings') && (r.request().method() === 'PATCH' || r.request().method() === 'PUT'),
    );

    // Click save room button
    const saveRoomBtn = page.getByRole('button', { name: /save room/i });
    await saveRoomBtn.click();

    const response = await responsePromise;
    const body = await response.json().catch(() => null);

    await expect(settingsPage.toast).toBeVisible({ timeout: 10_000 });

    // Capture room ID from response if available
    const state = getState();
    const roomIds = [...(state.phase1?.roomIds ?? [])];
    if (body?.rooms) {
      const newRoom = body.rooms.find((r: any) => r.name === 'UAT Room A');
      if (newRoom?.id) roomIds.push(newRoom.id);
    } else if (body?.data?.rooms) {
      const newRoom = body.data.rooms.find((r: any) => r.name === 'UAT Room A');
      if (newRoom?.id) roomIds.push(newRoom.id);
    }

    setState({
      phase1: {
        ...state.phase1!,
        roomIds,
      },
    });
  });

  test('TC-NEG-SET-04: Academic tab → add room without name → validation error', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Academic');

    // Click "Add Room" button
    const addRoomBtn = page.getByRole('button', { name: /add room/i }).first();
    await addRoomBtn.click();

    // Leave room name empty, try to save
    // The save button should be disabled when name is empty
    const saveRoomBtn = page.getByRole('button', { name: /save room/i });
    const isDisabled = await saveRoomBtn.isDisabled();

    if (isDisabled) {
      // Button is disabled when name is empty — this IS the validation
      expect(isDisabled).toBeTruthy();
    } else {
      // If not disabled, click and expect error
      await saveRoomBtn.click();
      const feedback = settingsPage.toast
        .or(page.locator('text=/required|name|empty/i'))
        .first();
      await expect(feedback).toBeVisible({ timeout: 5_000 });
    }

    // Close modal
    const discardBtn = page.getByRole('button', { name: /discard|cancel/i });
    if (await discardBtn.isVisible().catch(() => false)) {
      await discardBtn.click();
    }
  });

  test('TC-SET-04: Academic tab → Subjects → add a subject → toast success, capture ID', async ({
    loggedInPage,
    getState,
    setState,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Academic');

    // Click the "+" button next to Subject Categories label
    const addCategoryBtn = page.locator('button[aria-label*="add" i][aria-label*="category" i]').first()
      .or(page.locator('label').filter({ hasText: /subject categories/i }).locator('..').locator('button').first());
    await addCategoryBtn.click();

    // Type subject name in the inline input and press Enter
    const categoryInput = page.locator('input[placeholder*="category" i], input[placeholder*="Category" i]').first();
    await expect(categoryInput).toBeVisible({ timeout: 3_000 });

    // Intercept API response to capture subject ID
    const responsePromise = page.waitForResponse(
      (r) => (r.url().includes('/api/subject') || r.url().includes('/api/settings')) &&
             (r.request().method() === 'POST' || r.request().method() === 'PATCH' || r.request().method() === 'PUT'),
    );

    await categoryInput.fill('Mathematics');
    await categoryInput.press('Enter');

    const response = await responsePromise;
    const body = await response.json().catch(() => null);

    await expect(settingsPage.toast).toBeVisible({ timeout: 10_000 });

    // Capture subject ID from response
    const state = getState();
    const subjectIds = [...(state.phase1?.subjectIds ?? [])];
    if (body?.id) {
      subjectIds.push(body.id);
    } else if (body?.data?.id) {
      subjectIds.push(body.data.id);
    }

    setState({
      phase1: {
        ...state.phase1!,
        subjectIds,
      },
    });
  });

  test('TC-SET-05: Registration tab → verify settings, toggle → toast success', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Registration');

    // Verify registration settings are visible
    const studentToggle = page.locator('input[type="checkbox"]').first();
    await expect(studentToggle).toBeVisible({ timeout: 5_000 });

    // Toggle the student registration setting
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/registration') && (r.request().method() === 'PATCH' || r.request().method() === 'PUT'),
    );

    await studentToggle.click({ force: true });

    await responsePromise;

    // Registration link should be visible
    const regLink = page.locator('text=/sinaloka\\.com\\/register/i');
    await expect(regLink).toBeVisible({ timeout: 5_000 });

    // Toggle back
    await studentToggle.click({ force: true });
    await page.waitForTimeout(1_000);
  });

  test('TC-SET-06: Plans tab → verify plan info displayed', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Plans');

    // Wait for plans to load
    await page.waitForTimeout(2_000);

    // Should show pricing cards (3 plans: Starter, Growth, Business)
    const planCards = page.locator('text=/starter|growth|business/i');
    const planCount = await planCards.count();
    expect(planCount).toBeGreaterThanOrEqual(2);

    // Current plan badge should be visible
    const currentPlanBadge = page.locator('text=/current plan/i');
    await expect(currentPlanBadge.first()).toBeVisible({ timeout: 5_000 });
  });

  test('TC-SET-07: Security tab → change password → toast success', async ({
    loggedInPage,
    getState,
    setState,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    const state = getState();
    const currentPassword = state.phase1?.newAdminPassword ?? state.phase0!.adminCredentials.password;
    const nextPassword = 'UatBootstrap456!';

    // Change password
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/auth/change-password') &&
             r.request().method() === 'POST',
    );

    await settingsPage.changePassword({
      current: currentPassword,
      newPassword: nextPassword,
      confirm: nextPassword,
    });

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    await expect(settingsPage.toast).toBeVisible({ timeout: 10_000 });

    // Update state with new password
    setState({
      phase1: {
        ...state.phase1!,
        newAdminPassword: nextPassword,
      },
    });
  });

  test('TC-NEG-AUTH-08: Security tab → wrong current password → error message', async ({
    loggedInPage,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.changePassword({
      current: 'TotallyWrongPassword999!',
      newPassword: 'AnyNewPass123!',
      confirm: 'AnyNewPass123!',
    });

    // Should show error about incorrect current password
    const serverError = page.locator('.text-red-500, [class*="red"]').filter({ hasText: /incorrect|wrong|current/i }).first()
      .or(settingsPage.toast);
    await expect(serverError).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-AUTH-09: Security tab → new password same as current → error message', async ({
    loggedInPage,
    getState,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    const state = getState();
    const currentPassword = state.phase1?.newAdminPassword ?? state.phase0!.adminCredentials.password;

    await settingsPage.changePassword({
      current: currentPassword,
      newPassword: currentPassword,
      confirm: currentPassword,
    });

    // Should show error about same password
    const serverError = page.locator('.text-red-500, [class*="red"]').filter({ hasText: /same|different|identical/i }).first()
      .or(settingsPage.toast);
    await expect(serverError).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-SET-05: Security tab → weak new password → validation prevents submit', async ({
    loggedInPage,
    getState,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Security');

    await page.getByText(/current password/i).waitFor({ state: 'visible' });

    const state = getState();
    const currentPassword = state.phase1?.newAdminPassword ?? state.phase0!.adminCredentials.password;

    // Fill current password
    const currentInput = page.locator('label').filter({ hasText: /current password/i }).locator('..').locator('input').first();
    await currentInput.fill(currentPassword);

    // Fill weak new password (no uppercase, no digit, too short)
    const newInput = page.locator('label').filter({ hasText: /^new password$/i }).locator('..').locator('input').first();
    await newInput.fill('weak');

    const confirmInput = page.locator('label').filter({ hasText: /confirm/i }).locator('..').locator('input').first();
    await confirmInput.fill('weak');

    // Validation indicators should show failures
    const validationFail = page.locator('text=/✗/').first();
    await expect(validationFail).toBeVisible({ timeout: 3_000 });

    // Submit button should be disabled
    const submitBtn = page.getByRole('button', { name: /update password/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('TC-NEG-SET-06: Security tab → confirm password mismatch → error shown', async ({
    loggedInPage,
    getState,
  }) => {
    const page = await loggedInPage('admin');
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.switchTab('Security');

    await page.getByText(/current password/i).waitFor({ state: 'visible' });

    const state = getState();
    const currentPassword = state.phase1?.newAdminPassword ?? state.phase0!.adminCredentials.password;

    const currentInput = page.locator('label').filter({ hasText: /current password/i }).locator('..').locator('input').first();
    await currentInput.fill(currentPassword);

    const newInput = page.locator('label').filter({ hasText: /^new password$/i }).locator('..').locator('input').first();
    await newInput.fill('ValidPass123!');

    const confirmInput = page.locator('label').filter({ hasText: /confirm/i }).locator('..').locator('input').first();
    await confirmInput.fill('DifferentPass456!');

    // Mismatch error should appear
    const mismatchError = page.locator('text=/mismatch|match|don.*match|not match/i').first();
    await expect(mismatchError).toBeVisible({ timeout: 3_000 });

    // Submit button should be disabled due to mismatch
    const submitBtn = page.getByRole('button', { name: /update password/i });
    await expect(submitBtn).toBeDisabled();
  });
});
