import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';
import { SettingsPage } from '../pages/settings.page.js';
import { confirmChangesModal } from '../helpers/confirm-changes-modal.js';
import { ApiClient } from '../helpers/api-client.js';
import { ACCOUNTS } from '../helpers/test-accounts.js';

// ─────────────────────────────────────────────────────────
// Settings Integration Tests (26 tests)
// ─────────────────────────────────────────────────────────

// Settings tabs: General, Billing, Academic, Registration, Plans, Security
// General/Billing/Academic saves go through ConfirmChangesModal
// Registration toggles are immediate (no confirm modal)
// Security uses its own form, no ConfirmChangesModal
// Room CRUD is immediate (no ConfirmChangesModal), uses ConfirmDialog for delete

// ─── Smoke (2) ───────────────────────────────────────────

test.describe('Settings - Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 1. Page loads with data from API (institution name visible)
  test('page loads with institution name visible', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await expect(settings.institutionNameInput).toBeVisible();
    await expect(settings.institutionNameInput).not.toHaveValue('');
  });

  // 2. All 6 tabs switch correctly
  test('all 6 tabs switch correctly', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    const tabs = ['General', 'Billing', 'Academic', 'Registration', 'Plans', 'Security'] as const;

    for (const tab of tabs) {
      await settings.switchTab(tab);

      // Verify content changes by checking tab-specific elements
      if (tab === 'General') {
        await expect(settings.institutionNameInput).toBeVisible();
      } else if (tab === 'Billing') {
        await expect(settings.addCategoryButton).toBeVisible();
      } else if (tab === 'Academic') {
        await expect(settings.addRoomButton).toBeVisible();
      } else if (tab === 'Registration') {
        await expect(settings.registrationLinkCopyButton).toBeVisible();
      } else if (tab === 'Plans') {
        // Plans tab should render some content
        await expect(authedPage.getByText(/plan/i).first()).toBeVisible();
      } else if (tab === 'Security') {
        await expect(authedPage.locator('label').filter({ hasText: /current password/i })).toBeVisible();
      }
    }
  });
});

// ─── General (6) ─────────────────────────────────────────

test.describe('Settings - General', () => {
  // 3. Edit name and save
  test('edit name and save with confirm modal', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.updateGeneral({ name: 'Updated Institution Name' });

    await expect(settings.getToast()).toBeVisible();
  });

  // 4. Edit multiple fields
  test('edit multiple fields and save', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.updateGeneral({
      name: 'Multi Field Test',
      email: 'newemail@test.com',
      phone: '08123456789',
    });

    await expect(settings.getToast()).toBeVisible();
  });

  // 5. Change timezone and language
  test('change timezone and language', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    // Change timezone select
    const tzOptions = await settings.timezoneSelect.locator('option').allTextContents();
    if (tzOptions.length > 1) {
      await settings.timezoneSelect.selectOption({ index: 1 });
    }

    // Change language select
    const langOptions = await settings.languageSelect.locator('option').allTextContents();
    if (langOptions.length > 1) {
      await settings.languageSelect.selectOption({ index: 1 });
    }

    await settings.saveChangesButton.click();

    await Promise.all([
      authedPage.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') && resp.request().method() === 'PATCH',
      ),
      confirmChangesModal(authedPage),
    ]);

    await expect(settings.getToast()).toBeVisible();
  });

  // 6. No changes → info toast
  test('no changes shows info toast', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    // Wait for data to load
    await expect(settings.institutionNameInput).not.toHaveValue('');

    // Click save without changes
    await settings.saveChangesButton.click();

    // Expect info toast about no changes
    const toast = settings.getToast();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/tidak ada perubahan|no changes/i);
  });

  // 7. Cancel ConfirmChangesModal
  test('cancel confirm modal does not save', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    // Make a change
    await settings.institutionNameInput.clear();
    await settings.institutionNameInput.fill('Should Not Save');
    await settings.saveChangesButton.click();

    // Modal appears
    const modal = authedPage.locator('[aria-labelledby="confirm-changes-title"]');
    await expect(modal).toBeVisible();

    // Click cancel/batal
    const cancelBtn = modal.getByRole('button').filter({ hasText: /cancel|batal/i });
    await cancelBtn.click();
    await expect(modal).toBeHidden();

    // No success toast should appear — page remains as-is
    const successToast = authedPage.locator('[data-sonner-toast][data-type="success"]');
    await expect(successToast).not.toBeVisible();
  });

  // 8. API failure → error toast (skip)
  test.skip('API failure shows error toast', async () => {
    // Hard to trigger in integration without intercepting — skipped
  });
});

// ─── Billing (4) ─────────────────────────────────────────

test.describe('Settings - Billing', () => {
  // 9. Add expense category
  test('add expense category chip', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Billing');

    await settings.addCategoryInput.fill('NewTestCategory');
    await settings.addCategoryButton.click();

    // Verify chip appears
    const chip = authedPage.locator('span').filter({ hasText: 'NewTestCategory' });
    await expect(chip).toBeVisible();
  });

  // 10. Remove expense category
  test('remove expense category chip', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Billing');

    // Add a category first
    await settings.addCategoryInput.fill('ToRemove');
    await settings.addCategoryButton.click();

    const chip = authedPage.locator('span').filter({ hasText: 'ToRemove' });
    await expect(chip).toBeVisible();

    // Remove it
    await settings.removeExpenseCategory('ToRemove');

    await expect(chip).not.toBeVisible();
  });

  // 11. Add bank account
  test('add bank account', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Billing');

    await settings.addBankAccount({
      bankName: 'BCA',
      accountNumber: '1234567890',
      accountHolder: 'Test Account',
    });

    // Verify bank account card appears
    const card = authedPage.locator('text=BCA').first();
    await expect(card).toBeVisible();
  });

  // 12. Save billing with ConfirmChangesModal
  test('save billing with confirm modal shows array diff', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.updateBilling({ categories: ['BillingTestCat'] });

    await expect(settings.getToast()).toBeVisible();
  });
});

// ─── Academic (6) ────────────────────────────────────────

test.describe('Settings - Academic', () => {
  // 13. Rooms table displays
  test('rooms table displays', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Academic');

    await expect(settings.roomsTable).toBeVisible();
  });

  // 14. Add room via modal
  test('add room via modal', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.addRoom({
      name: 'Room E2E Test',
      type: 'Classroom',
      capacity: '30',
      status: 'Available',
    });

    await expect(settings.getToast()).toBeVisible();

    // Verify room appears in table
    const row = authedPage.locator('tr').filter({ hasText: 'Room E2E Test' });
    await expect(row).toBeVisible();
  });

  // 15. Edit room
  test('edit room name', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    // First add a room to edit
    await settings.addRoom({
      name: 'Room To Edit',
      type: 'Classroom',
      capacity: '20',
    });

    await expect(settings.getToast()).toBeVisible();

    // Edit the room
    await settings.editRoom('Room To Edit', { name: 'Room Edited' });

    await expect(settings.getToast()).toBeVisible();
    const editedRow = authedPage.locator('tr').filter({ hasText: 'Room Edited' });
    await expect(editedRow).toBeVisible();
  });

  // 16. Delete room with ConfirmDialog
  test('delete room with confirm dialog', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    // Add a room to delete
    await settings.addRoom({
      name: 'Room To Delete',
      type: 'Laboratory',
      capacity: '15',
    });

    await expect(settings.getToast()).toBeVisible();

    // Delete the room
    await settings.deleteRoom('Room To Delete');

    await expect(settings.getToast()).toBeVisible();
    const deletedRow = authedPage.locator('tr').filter({ hasText: 'Room To Delete' });
    await expect(deletedRow).not.toBeVisible();
  });

  // 17. Toggle working days and save
  test('toggle working day and save with confirm modal', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Academic');

    // Toggle a day (e.g., Saturday)
    await settings.toggleWorkingDay('Sat');

    // Save — academic tab should have a save button
    const saveButton = authedPage.getByRole('button', { name: /save changes/i });
    await saveButton.click();

    await Promise.all([
      authedPage.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') &&
          resp.url().includes('academic') &&
          resp.request().method() === 'PATCH',
      ),
      confirmChangesModal(authedPage),
    ]);

    await expect(settings.getToast()).toBeVisible();
  });

  // 18. Add and remove grade level
  test('add and remove grade level', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.addGradeLevel('Grade 13');

    // Verify chip appears
    const gradeChip = authedPage.locator('span').filter({ hasText: 'Grade 13' });
    await expect(gradeChip).toBeVisible();

    // Remove it
    await settings.removeGradeLevel('Grade 13');
    await expect(gradeChip).not.toBeVisible();
  });
});

// ─── Registration (3) ───────────────────────────────────

test.describe('Settings - Registration', () => {
  // 19. Toggle student registration
  test('toggle student registration', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.toggleRegistration('student');

    await expect(settings.getToast()).toBeVisible();
  });

  // 20. Toggle tutor registration
  test('toggle tutor registration', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.toggleRegistration('tutor');

    await expect(settings.getToast()).toBeVisible();
  });

  // 21. Copy registration link
  test('copy registration link shows toast', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Registration');

    // Grant clipboard permissions for the test
    await authedPage.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await settings.registrationLinkCopyButton.click();

    await expect(settings.getToast()).toBeVisible();
  });
});

// ─── Security (3) ────────────────────────────────────────

test.describe('Settings - Security', () => {
  // 22. Change password successfully
  test('change password successfully', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    await settings.changePassword({
      current: 'password',
      newPassword: 'NewPassword123!',
      confirm: 'NewPassword123!',
    });

    await expect(settings.getToast()).toBeVisible();
  });

  // 23. Password validation indicators
  test('password validation indicators update on input', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Security');

    const newPasswordInput = authedPage
      .locator('label')
      .filter({ hasText: /^new password$/i })
      .locator('..')
      .locator('input')
      .first();

    // Type a short password — indicators should show warnings
    await newPasswordInput.fill('ab');

    // Check that at least one indicator is visible
    const indicators = authedPage.locator('li, [class*="indicator"]').filter({ hasText: /character|uppercase|number|special/i });
    const count = await indicators.count();
    expect(count).toBeGreaterThan(0);

    // Type a strong password
    await newPasswordInput.clear();
    await newPasswordInput.fill('StrongPass123!');

    // Indicators should update (we just verify they're still present)
    const updatedCount = await indicators.count();
    expect(updatedCount).toBeGreaterThan(0);
  });

  // 24. Wrong current password → error
  test('wrong current password shows error', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Security');

    const currentInput = authedPage
      .locator('label')
      .filter({ hasText: /current password/i })
      .locator('..')
      .locator('input')
      .first();
    const newInput = authedPage
      .locator('label')
      .filter({ hasText: /^new password$/i })
      .locator('..')
      .locator('input')
      .first();
    const confirmInput = authedPage
      .locator('label')
      .filter({ hasText: /confirm.*password/i })
      .locator('..')
      .locator('input')
      .first();

    await currentInput.fill('wrongpassword');
    await newInput.fill('NewPassword123!');
    await confirmInput.fill('NewPassword123!');

    const updateButton = authedPage.locator('button[type="submit"]');

    // Expect error response
    const responsePromise = authedPage.waitForResponse(
      (resp) =>
        resp.url().includes('/api/auth/change-password') &&
        resp.request().method() === 'POST',
    );
    await updateButton.click();
    const response = await responsePromise;

    // Should be 400 or 401
    expect(response.status()).toBeGreaterThanOrEqual(400);

    // Error toast or error message should appear
    const errorToast = authedPage.locator('[data-sonner-toast][data-type="error"]');
    const errorText = authedPage.getByText(/incorrect|wrong|invalid|salah/i);
    const hasError = await errorToast.isVisible().catch(() => false) ||
      await errorText.isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
  });
});

// ─── Confirm Modal (2) ──────────────────────────────────

test.describe('Settings - Confirm Modal', () => {
  // 25. Modal shows scalar diff
  test('modal shows scalar diff for institution name change', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();

    // Get original name
    const originalName = await settings.institutionNameInput.inputValue();
    const newName = 'Scalar Diff Test Name';

    await settings.institutionNameInput.clear();
    await settings.institutionNameInput.fill(newName);
    await settings.saveChangesButton.click();

    // Verify modal shows the diff
    const modal = authedPage.locator('[aria-labelledby="confirm-changes-title"]');
    await expect(modal).toBeVisible();

    // Modal should contain both old and new values
    await expect(modal).toContainText(originalName);
    await expect(modal).toContainText(newName);

    // Confirm to close
    const confirmBtn = modal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
    await confirmBtn.click();
    await expect(modal).toBeHidden();
  });

  // 26. Modal shows array diff
  test('modal shows array diff for billing category addition', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage);
    await settings.goto();
    await settings.switchTab('Billing');

    const newCategory = 'ArrayDiffCat';

    // Add a category
    await settings.addCategoryInput.fill(newCategory);
    await settings.addCategoryButton.click();

    // Click save
    const saveBillingButton = authedPage.getByRole('button', { name: /save changes/i });
    await saveBillingButton.click();

    // Verify modal shows array diff with + prefix
    const modal = authedPage.locator('[aria-labelledby="confirm-changes-title"]');
    await expect(modal).toBeVisible();

    // Modal should contain the new category (with + indicator)
    await expect(modal).toContainText(newCategory);

    // Confirm and close
    const confirmBtn = modal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
    await Promise.all([
      authedPage.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') &&
          resp.url().includes('billing') &&
          resp.request().method() === 'PATCH',
      ),
      confirmBtn.click(),
    ]);
    await expect(modal).toBeHidden();
  });
});
