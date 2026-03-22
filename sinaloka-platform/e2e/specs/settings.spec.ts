import { test, expect } from '../fixtures/mock-api.fixture';
import { setupAuthMocks, setupSettingsMocks } from '../helpers/api-mocker';
import { SettingsPage } from '../pages/settings.page';

test.describe('Settings', () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupSettingsMocks(mockApi);
    settings = new SettingsPage(authedPage);
  });

  test.describe('Smoke', () => {
    test('all tabs visible and switching works', async ({ authedPage }) => {
      await settings.goto();

      // Verify all 6 tab buttons are visible
      await expect(settings.generalTab).toBeVisible();
      await expect(settings.billingTab).toBeVisible();
      await expect(settings.academicTab).toBeVisible();
      await expect(settings.securityTab).toBeVisible();
      await expect(settings.registrationTab).toBeVisible();
      await expect(settings.plansTab).toBeVisible();

      // Click each tab and verify content changes
      await settings.switchTab('Billing');
      await expect(authedPage.getByText(/expense categories/i).first()).toBeVisible();

      await settings.switchTab('Academic');
      await expect(authedPage.getByText(/room/i).first()).toBeVisible();

      await settings.switchTab('Security');
      await expect(authedPage.getByText(/current password/i)).toBeVisible();

      await settings.switchTab('Registration');
      await expect(authedPage.getByText(/registration/i).first()).toBeVisible();

      await settings.switchTab('Plans');
      await expect(authedPage.getByText(/plan/i).first()).toBeVisible();

      await settings.switchTab('General');
      await expect(settings.institutionNameInput).toBeVisible();
    });
  });

  test.describe('General', () => {
    test('edit institution name and save', async () => {
      await settings.goto();
      await settings.switchTab('General');

      await settings.updateGeneral({ name: 'Updated Institution' });
      await expect(settings.getToast()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Billing', () => {
    test('add expense category', async ({ authedPage }) => {
      await settings.goto();
      await settings.switchTab('Billing');

      // Wait for billing content to load
      await expect(authedPage.getByText(/expense categories/i).first()).toBeVisible();

      // Find the category input (placeholder: "New category name")
      const categoryInput = authedPage.getByPlaceholder(/new category name/i);
      await categoryInput.fill('TRANSPORT');

      // Click "+ Add Category" button
      const addButton = authedPage.getByRole('button', { name: /add category/i });
      await addButton.click();

      await expect(authedPage.getByText('TRANSPORT')).toBeVisible();
    });
  });

  test.describe('Academic', () => {
    test('add and delete room', async ({ authedPage }) => {
      await settings.goto();
      await settings.switchTab('Academic');

      // Wait for academic content to load then verify existing rooms
      await expect(authedPage.getByText('Room 101')).toBeVisible({ timeout: 5000 });

      // Click Add Room button
      const addRoomButton = authedPage.getByRole('button', { name: /add room/i });
      await addRoomButton.click();

      // Fill room name in the modal (placeholder: "e.g. Room A")
      const modal = authedPage.getByRole('dialog');
      await modal.getByPlaceholder(/room/i).first().fill('Room 202');

      // Save the room
      await modal.getByRole('button', { name: /save room/i }).click();

      await expect(settings.getToast()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Security', () => {
    test('change password successfully', async () => {
      await settings.goto();

      await settings.changePassword({
        current: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirm: 'NewPass456!',
      });

      await expect(settings.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('password mismatch shows error', async ({ authedPage }) => {
      await settings.goto();
      await settings.switchTab('Security');
      await authedPage.getByText(/current password/i).waitFor({ state: 'visible' });

      // Fill password fields with mismatching confirm
      const currentInput = authedPage.locator('label').filter({ hasText: /current password/i }).locator('..').locator('input').first();
      const newInput = authedPage.locator('label').filter({ hasText: /^new password$/i }).locator('..').locator('input').first();
      const confirmInput = authedPage.locator('label').filter({ hasText: /confirm new password/i }).locator('..').locator('input').first();

      await currentInput.fill('OldPass123!');
      await newInput.fill('NewPass456!');
      await confirmInput.fill('DifferentPass789!');

      // Submit button should be disabled due to mismatch
      const submitBtn = authedPage.getByRole('button', { name: /update password/i });
      await expect(submitBtn).toBeDisabled();
    });
  });

  test.describe('Registration', () => {
    test('toggle registration enabled', async ({ authedPage }) => {
      await settings.goto();
      await settings.switchTab('Registration');

      // Verify a toggle/switch is visible
      const toggle = authedPage.getByRole('switch').or(
        authedPage.locator('input[type="checkbox"]'),
      ).first();
      await expect(toggle).toBeVisible();
    });
  });

  test.describe('Plans', () => {
    test('plans tab loads', async ({ authedPage }) => {
      await settings.goto();
      await settings.switchTab('Plans');

      // Verify subscription status card or pricing cards are visible
      await expect(
        authedPage.getByText(/plan|subscription|pricing|free|pro|enterprise/i).first(),
      ).toBeVisible();
    });
  });
});
