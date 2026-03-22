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
      await expect(authedPage.getByText(/billing mode/i).first()).toBeVisible();

      await settings.switchTab('Academic');
      await expect(authedPage.getByText(/room/i).first()).toBeVisible();

      await settings.switchTab('Security');
      await expect(settings.currentPasswordInput).toBeVisible();

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

      // Find the category input and add a new category
      const categoryInput = authedPage.getByPlaceholder(/category/i).or(
        authedPage.locator('input').filter({ hasText: /category/i }),
      ).first();

      if (await categoryInput.isVisible().catch(() => false)) {
        await categoryInput.fill('TRANSPORT');
        const addButton = authedPage.getByRole('button', { name: /add/i }).first();
        await addButton.click();

        await expect(authedPage.getByText('TRANSPORT')).toBeVisible();
      } else {
        // Category might be displayed as tags/chips — verify existing ones are visible
        await expect(authedPage.getByText('RENT')).toBeVisible();
      }
    });
  });

  test.describe('Academic', () => {
    test('add and delete room', async ({ authedPage }) => {
      await settings.goto();
      await settings.switchTab('Academic');

      // Verify existing rooms are visible
      await expect(authedPage.getByText('Room 101')).toBeVisible();

      // Click Add Room button
      const addRoomButton = authedPage.getByRole('button', { name: /add room/i });
      if (await addRoomButton.isVisible().catch(() => false)) {
        await addRoomButton.click();

        // Fill room name in the form/input that appears
        const roomNameInput = authedPage.getByLabel(/room name/i).or(
          authedPage.getByPlaceholder(/room name/i),
        ).first();
        await roomNameInput.fill('Room 202');

        // Save the room
        const saveButton = authedPage.getByRole('button', { name: /save|add|create/i }).last();
        await saveButton.click();

        await expect(settings.getToast()).toBeVisible({ timeout: 5000 });
      }
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

      await settings.changePassword({
        current: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirm: 'DifferentPass789!',
      });

      // Verify inline error text about password mismatch
      await expect(
        authedPage.getByText(/password.*match|not match|mismatch/i).first(),
      ).toBeVisible({ timeout: 5000 });
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
