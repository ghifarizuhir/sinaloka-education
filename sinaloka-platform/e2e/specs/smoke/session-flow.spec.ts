import { test, expect } from '../../fixtures/auth.fixture';
import { setupSessionMocks, setupClassMocks } from '../../helpers/api-mocker';

test.describe.skip('Session Flow', () => {
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

    // Wait for the page to load sessions data
    await page.waitForLoadState('networkidle');

    // Switch to list view — the list button is an icon-only button (first in the view toggle group)
    const viewToggle = page.locator('.flex.bg-zinc-100, .flex.bg-zinc-900').filter({ has: page.locator('button') }).first();
    await viewToggle.locator('button').first().click();

    // Wait for list view table to appear
    await expect(page.locator('table')).toBeVisible();

    // Sessions with different statuses should all be rendered as Badge text
    // The mock data has SCHEDULED, COMPLETED, CANCELLED statuses
    // Target badge spans inside the table, not hidden <option> elements
    await expect(page.locator('table').getByText(/scheduled/i).first()).toBeVisible();
    await expect(page.locator('table').getByText(/completed/i).first()).toBeVisible();
    await expect(page.locator('table').getByText(/cancelled/i).first()).toBeVisible();
  });
});
