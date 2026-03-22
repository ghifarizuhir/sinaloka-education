import { test, expect } from '../fixtures/mock-api.fixture';
import {
  setupAuthMocks,
  setupFinanceOverviewMocks,
  setupDashboardMocks,
  setupReportMocks,
} from '../helpers/api-mocker';
import { FinanceOverviewPage } from '../pages/finance-overview.page';

test.describe('Finance Overview', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupAuthMocks(mockApi);
    await setupFinanceOverviewMocks(mockApi);
    await setupDashboardMocks(mockApi);
    await setupReportMocks(mockApi);
  });

  test.describe('Smoke', () => {
    test('stat cards visible', async ({ authedPage }) => {
      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await expect(finance.totalRevenue).toBeVisible();
      await expect(finance.totalPayouts).toBeVisible();
      await expect(finance.totalExpenses).toBeVisible();
      await expect(finance.netProfit).toBeVisible();
    });

    test('period tabs work', async ({ authedPage }) => {
      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await finance.selectPeriod('This Quarter');
      await expect(finance.thisQuarterTab).toBeVisible();
    });

    test('quick nav links navigate', async ({ mockApi, authedPage }) => {
      // Mock payments page so navigation works
      await mockApi.onGet('**/api/admin/payments**').respondWith(200, { data: [], meta: { total: 0 } });

      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await finance.studentPaymentsLink.click();
      await authedPage.waitForURL('**/finance/payments**');
      expect(authedPage.url()).toContain('/finance/payments');
    });
  });

  test.describe('Positive', () => {
    test('overdue alert visible when count > 0', async ({ mockApi, authedPage }) => {
      await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
        overdue_count: 3,
        total_overdue_amount: 360000,
        flagged_students: [
          { student_id: 'stu-1', student_name: 'Student A', overdue_count: 1 },
          { student_id: 'stu-2', student_name: 'Student B', overdue_count: 1 },
          { student_id: 'stu-3', student_name: 'Student C', overdue_count: 1 },
        ],
      });

      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await expect(authedPage.getByText(/overdue/i).first()).toBeVisible();
    });
  });

  test.describe('Report Modal', () => {
    test('generate finance report', async ({ authedPage }) => {
      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await finance.openReportModal();
      await finance.fillReportDates('2026-03-01', '2026-03-31');
      await finance.generateReport();

      // Verify preview/content appears in the modal
      await expect(authedPage.getByRole('dialog')).toBeVisible();
    });

    test('switch to attendance tab', async ({ authedPage }) => {
      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await finance.openReportModal();
      await finance.selectReportTab('Attendance');
      await finance.fillReportDates('2026-03-01', '2026-03-31');
      await finance.generateReport();

      await expect(authedPage.getByRole('dialog')).toBeVisible();
    });

    test('switch to student progress tab', async ({ mockApi, authedPage }) => {
      // Mock students endpoint for the student select
      await mockApi.onGet('**/api/admin/students**').respondWith(200, {
        data: [{ id: 'stu-1', name: 'Rizki Pratama', grade: '10' }],
        meta: { total: 1 },
      });

      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await finance.openReportModal();
      await finance.selectReportTab('Student Progress');

      // Select student if a select element exists in the modal
      const studentSelect = authedPage.getByRole('dialog').locator('select').first();
      if (await studentSelect.isVisible().catch(() => false)) {
        await studentSelect.selectOption({ index: 0 });
      }

      await finance.fillReportDates('2026-03-01', '2026-03-31');
      await finance.generateReport();

      await expect(authedPage.getByRole('dialog')).toBeVisible();
    });

    test('download pdf', async ({ authedPage }) => {
      const finance = new FinanceOverviewPage(authedPage);
      await finance.goto();

      await finance.openReportModal();
      await finance.fillReportDates('2026-03-01', '2026-03-31');
      await finance.generateReport();

      const downloadPromise = authedPage.waitForEvent('download');
      await finance.downloadPdf();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    });
  });
});
