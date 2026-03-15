import { test, expect } from '../../fixtures/auth.fixture';
import { setupSessionMocks, setupClassMocks } from '../../helpers/api-mocker';

test.describe('Session Flow', () => {
  test('generate sessions from class schedule shows confirmation', async ({ authenticatedPage: page, mockApi }) => {
    await setupClassMocks(mockApi);
    await setupSessionMocks(mockApi);

    await page.goto('/schedules');

    // Open the create/generate session modal
    const generateButton = page.getByRole('button', { name: /generate/i }).or(
      page.getByRole('button', { name: /add session/i })
    ).first();
    await generateButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // Fill in date range for generation
    const dateFromInput = modal.locator('input[type="date"]').first();
    const dateToInput = modal.locator('input[type="date"]').nth(1);
    await dateFromInput.fill('2026-03-15');
    await dateToInput.fill('2026-03-31');

    // Click the Generate Sessions button
    const submitButton = modal.getByRole('button', { name: /generate sessions/i });
    await submitButton.click();

    // Should show success toast
    await expect(page.locator('[data-sonner-toaster]')).toContainText(/generated/i);
  });

  test('session statuses are displayed correctly', async ({ authenticatedPage: page, mockApi }) => {
    await setupClassMocks(mockApi);
    await setupSessionMocks(mockApi);

    await page.goto('/schedules');

    // Switch to list view to inspect statuses more easily
    const listViewButton = page.getByRole('button', { name: /list/i });
    if (await listViewButton.isVisible()) {
      await listViewButton.click();
    }

    // Sessions with different statuses should all be rendered
    // The mock data has SCHEDULED, COMPLETED, CANCELLED statuses
    await expect(page.getByText(/scheduled/i).first()).toBeVisible();
    await expect(page.getByText(/completed/i).first()).toBeVisible();
    await expect(page.getByText(/cancelled/i).first()).toBeVisible();
  });
});
