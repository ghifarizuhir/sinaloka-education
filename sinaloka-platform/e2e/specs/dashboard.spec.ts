import { test, expect } from '../fixtures/mock-api.fixture';
import { setupAuthMocks, setupDashboardMocks } from '../helpers/api-mocker';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupAuthMocks(mockApi);
    await setupDashboardMocks(mockApi);
  });

  test.describe('Smoke', () => {
    test('displays stat cards', async ({ authedPage }) => {
      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      await expect(dashboard.totalStudents).toBeVisible();
      await expect(dashboard.activeTutors).toBeVisible();
      await expect(dashboard.attendanceRate).toBeVisible();
      await expect(dashboard.monthlyRevenue).toBeVisible();
    });

    test('shows activity feed', async ({ authedPage }) => {
      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      await expect(dashboard.recentActivity).toBeVisible();
      // Verify at least one activity item is rendered
      await expect(authedPage.getByText('Rizki Pratama enrolled in Math Advanced')).toBeVisible();
    });

    test('shows upcoming sessions', async ({ authedPage }) => {
      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      await expect(dashboard.upcomingSessions).toBeVisible();
    });

    test('quick links navigate correctly', async ({ mockApi, authedPage }) => {
      // Mock students page so navigation works
      await mockApi.onGet('**/api/admin/students**').respondWith(200, { data: [], meta: { total: 0 } });
      // Mock finance endpoints
      await mockApi.onGet('**/api/admin/finance/financial-summary**').respondWith(200, { total_revenue: 0, total_payouts: 0, total_expenses: 0, net_profit: 0 });
      await mockApi.onGet('**/api/admin/finance/revenue-breakdown**').respondWith(200, { by_class: [], by_method: [] });
      await mockApi.onGet('**/api/admin/finance/expense-breakdown**').respondWith(200, { by_category: [] });
      await mockApi.onGet('**/api/admin/payments**').respondWith(200, { data: [], meta: { total: 0 } });

      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      // Click "View All Students"
      await dashboard.viewAllStudentsLink.click();
      await authedPage.waitForURL('**/students**');
      expect(authedPage.url()).toContain('/students');

      // Go back and click "Manage Finance"
      await authedPage.goBack();
      await dashboard.manageFinanceLink.click();
      await authedPage.waitForURL('**/finance**');
      expect(authedPage.url()).toContain('/finance');
    });
  });

  test.describe('Positive', () => {
    test('command palette opens and filters', async ({ authedPage }) => {
      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      await dashboard.openCommandPalette();
      await expect(dashboard.commandPaletteInput).toBeVisible();

      await dashboard.commandPaletteInput.fill('enroll');
      // Verify filtered results appear (the palette should show matching items)
      await expect(authedPage.getByText(/enroll/i).first()).toBeVisible();
    });

    test('overdue alert visible when overdue count > 0', async ({ mockApi, authedPage }) => {
      // Override overdue-summary with count > 0 (already set by setupDashboardMocks with overdue_count: 1)
      await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
        overdue_count: 2,
        total_overdue_amount: 240000,
        flagged_students: [
          { student_id: 'stu-1', student_name: 'Student A', overdue_count: 1 },
          { student_id: 'stu-2', student_name: 'Student B', overdue_count: 1 },
        ],
      });

      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      await expect(dashboard.overdueAlert).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('charts show empty state when no data', async ({ mockApi, authedPage }) => {
      // Override chart endpoints to return empty arrays
      await mockApi.onGet('**/api/admin/dashboard/attendance-trend').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/student-growth').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/revenue-expenses').respondWith(200, []);

      const dashboard = new DashboardPage(authedPage);
      await dashboard.goto();

      await expect(authedPage.getByText(/no data yet/i).first()).toBeVisible();
    });
  });
});
