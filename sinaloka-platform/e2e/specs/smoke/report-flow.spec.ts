import { test, expect } from '../../fixtures/auth.fixture';
import { setupDashboardMocks, setupStudentMocks, setupClassMocks } from '../../helpers/api-mocker';
import { FinanceOverviewPage } from '../../pages/finance-overview.page';

test.describe.skip('Report Flow', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);

    // Mock the finance report endpoint with a fake PDF blob
    await page.route('**/api/admin/reports/finance**', async (route) => {
      // Return minimal valid PDF bytes
      const fakePdfContent = '%PDF-1.4 fake pdf content';
      const buffer = Buffer.from(fakePdfContent);
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: buffer,
      });
    });

    // Mock other report endpoints
    await page.route('**/api/admin/reports/attendance**', async (route) => {
      const buffer = Buffer.from('%PDF-1.4 attendance report');
      await route.fulfill({ status: 200, contentType: 'application/pdf', body: buffer });
    });
  });

  test('generate report opens PDF preview', async ({ authenticatedPage: page, mockApi }) => {
    const financeOverviewPage = new FinanceOverviewPage(page);
    await financeOverviewPage.goto();

    // Open generate report modal
    await financeOverviewPage.openReport();
    await expect(financeOverviewPage.reportModal).toBeVisible();

    // The report modal should have the "Generate Report" heading
    await expect(financeOverviewPage.reportModal.getByRole('heading', { name: /generate report/i })).toBeVisible();

    // Fill in required date fields (Finance tab is active by default)
    await financeOverviewPage.reportModal.locator('input[type="date"]').nth(0).fill('2026-03-01');
    await financeOverviewPage.reportModal.locator('input[type="date"]').nth(1).fill('2026-03-31');

    // Click the Generate button inside the modal
    await financeOverviewPage.reportModal.getByRole('button', { name: /^generate$/i }).click();

    // PDF iframe should appear after generation
    await expect(financeOverviewPage.reportModal.locator('iframe[title="Report Preview"]')).toBeVisible({ timeout: 10000 });
  });

  test('download report triggers file download', async ({ authenticatedPage: page, mockApi }) => {
    const financeOverviewPage = new FinanceOverviewPage(page);
    await financeOverviewPage.goto();

    await financeOverviewPage.openReport();
    await expect(financeOverviewPage.reportModal).toBeVisible();

    // Fill in dates and generate
    await financeOverviewPage.reportModal.locator('input[type="date"]').nth(0).fill('2026-03-01');
    await financeOverviewPage.reportModal.locator('input[type="date"]').nth(1).fill('2026-03-31');
    await financeOverviewPage.reportModal.getByRole('button', { name: /^generate$/i }).click();

    // Wait for the PDF preview to appear
    await expect(financeOverviewPage.reportModal.locator('iframe[title="Report Preview"]')).toBeVisible({ timeout: 10000 });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      financeOverviewPage.reportModal.getByRole('button', { name: /download pdf/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/finance-report.*\.pdf/i);
  });
});
