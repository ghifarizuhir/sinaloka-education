import { test, expect } from '../../fixtures/auth.fixture';
import { setupDashboardMocks } from '../../helpers/api-mocker';
import { DashboardPage } from '../../pages/dashboard.page';

test.describe('Dashboard', () => {
  test('stats cards load with correct data', async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // From dashboard.json: total_students: 150, active_tutors: 12
    await expect(page.getByText('Total Students').first()).toBeVisible();
    await expect(page.getByText('Active Tutors').first()).toBeVisible();
    // attendance_rate: 92.5 → renders as "92.5%"
    await expect(page.getByText(/92\.5%/).first()).toBeVisible();
  });

  test('activity feed renders items', async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.activitySection).toBeVisible();

    // Activity feed items from dashboard.json
    await expect(dashboardPage.getActivityItem('Aisyah Putri enrolled in Math Advanced')).toBeVisible();
    await expect(dashboardPage.getActivityItem('Payment received from Rizki Pratama')).toBeVisible();
    await expect(dashboardPage.getActivityItem('Attendance marked for Physics Basic')).toBeVisible();
  });

  test('quick action links navigate correctly', async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);
    // Mock pages we navigate to
    await mockApi.onGet('**/api/admin/students').respondWith(200, { data: [], meta: { page: 1, limit: 10, total: 0, total_pages: 0 } });
    await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, { total_students: 0, active_tutors: 0, monthly_revenue: 0, attendance_rate: 0, upcoming_sessions: 0 });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click "View All Students" quick link (uses button, not <a>)
    await page.getByRole('button', { name: /view all students/i }).click();
    await expect(page).toHaveURL(/\/students/);
  });

  test('command palette opens', async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await dashboardPage.openCommandPalette();

    await expect(dashboardPage.commandPaletteModal).toBeVisible();
    await expect(dashboardPage.commandPaletteInput).toBeVisible();
  });
});
