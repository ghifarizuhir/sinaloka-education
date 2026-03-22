import { test, expect } from '../fixtures/mock-api.fixture';
import { TEST_USER, TEST_TOKENS } from '../fixtures/auth.fixture';
import { setupAuthMocks } from '../helpers/api-mocker';
import { LoginPage } from '../pages/login.page';

test.describe('Auth', () => {
  test.describe('Smoke', () => {
    test('successful login redirects to dashboard', async ({ mockApi, authedPage }) => {
      await setupAuthMocks(mockApi);
      const loginPage = new LoginPage(authedPage);
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, 'password123');
      await authedPage.waitForURL('**/');
      await expect(authedPage).toHaveURL(/\/$/);
    });

    test('unauthenticated visit redirects to login', async ({ mockApi, authedPage }) => {
      // Mock /auth/me to return 401 (unauthenticated)
      await mockApi.onGet('**/api/auth/me').respondWith(401, { message: 'Unauthorized' });
      await authedPage.goto('/');
      await authedPage.waitForURL('**/login**');
      expect(authedPage.url()).toContain('/login');
    });

    test('token refresh on 401', async ({ mockApi, authedPage }) => {
      // First /auth/me call returns 401, refresh endpoint returns new tokens,
      // then subsequent /auth/me returns the user
      let meCallCount = 0;
      await authedPage.route('**/api/auth/me', async (route) => {
        meCallCount++;
        if (meCallCount <= 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(TEST_USER),
          });
        }
      });
      await mockApi.onPost('**/api/auth/refresh').respondWith(200, TEST_TOKENS);
      // Mock dashboard endpoints so page can render after auth succeeds
      await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, { total_students: 0, active_tutors: 0, attendance_rate: 0, monthly_revenue: 0, upcoming_sessions: 0 });
      await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/upcoming-sessions').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/attendance-trend').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/student-growth').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/revenue-expenses').respondWith(200, []);
      await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, { overdue_count: 0, total_overdue_amount: 0, flagged_students: [] });

      await authedPage.goto('/');
      // Page should eventually load (not stay on /login)
      await authedPage.waitForTimeout(2000);
      expect(authedPage.url()).not.toContain('/login');
    });

    test('logout redirects to login', async ({ mockApi, authedPage }) => {
      await setupAuthMocks(mockApi);
      // Mock dashboard endpoints so page loads
      await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, { total_students: 0, active_tutors: 0, attendance_rate: 0, monthly_revenue: 0, upcoming_sessions: 0 });
      await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/upcoming-sessions').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/attendance-trend').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/student-growth').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/revenue-expenses').respondWith(200, []);
      await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, { overdue_count: 0, total_overdue_amount: 0, flagged_students: [] });

      await authedPage.goto('/');
      await authedPage.waitForURL('**/');
      const loginPage = new LoginPage(authedPage);
      await loginPage.logoutButton.click();
      await authedPage.waitForURL('**/login**');
      expect(authedPage.url()).toContain('/login');
    });
  });

  test.describe('Positive', () => {
    test('SUPER_ADMIN login redirects to /super/institutions', async ({ mockApi, authedPage }) => {
      const superAdminUser = { ...TEST_USER, role: 'SUPER_ADMIN' };
      await mockApi.onPost('**/api/auth/login').respondWith(200, TEST_TOKENS);
      await mockApi.onGet('**/api/auth/me').respondWith(200, superAdminUser);
      await mockApi.onPost('**/api/auth/refresh').respondWith(200, TEST_TOKENS);

      const loginPage = new LoginPage(authedPage);
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, 'password123');
      await authedPage.waitForURL('**/super/institutions**');
      expect(authedPage.url()).toContain('/super/institutions');
    });

    test('login preserves redirect param', async ({ mockApi, authedPage }) => {
      await setupAuthMocks(mockApi);
      // Mock students page endpoint so it doesn't error
      await mockApi.onGet('**/api/admin/students**').respondWith(200, { data: [], meta: { total: 0 } });

      const loginPage = new LoginPage(authedPage);
      await authedPage.goto('/login?redirect=/students');
      await loginPage.login(TEST_USER.email, 'password123');
      await authedPage.waitForURL('**/students**');
      expect(authedPage.url()).toContain('/students');
    });

    test('already authenticated redirects away from login', async ({ mockApi, authedPage }) => {
      await setupAuthMocks(mockApi);
      // Mock dashboard endpoints
      await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, { total_students: 0, active_tutors: 0, attendance_rate: 0, monthly_revenue: 0, upcoming_sessions: 0 });
      await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/upcoming-sessions').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/attendance-trend').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/student-growth').respondWith(200, []);
      await mockApi.onGet('**/api/admin/dashboard/revenue-expenses').respondWith(200, []);
      await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, { overdue_count: 0, total_overdue_amount: 0, flagged_students: [] });

      await authedPage.goto('/login');
      await authedPage.waitForTimeout(1000);
      expect(authedPage.url()).not.toContain('/login');
    });
  });

  test.describe('Negative', () => {
    test('invalid credentials shows error', async ({ mockApi, authedPage }) => {
      await mockApi.onPost('**/api/auth/login').respondWith(401, { message: 'Invalid credentials' });
      await mockApi.onGet('**/api/auth/me').respondWith(401, { message: 'Unauthorized' });

      const loginPage = new LoginPage(authedPage);
      await loginPage.goto();
      await loginPage.login('wrong@test.com', 'wrongpassword');
      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('empty form is blocked', async ({ mockApi, authedPage }) => {
      await mockApi.onGet('**/api/auth/me').respondWith(401, { message: 'Unauthorized' });

      const loginPage = new LoginPage(authedPage);
      await loginPage.goto();
      await loginPage.submitButton.click();
      // URL should still be /login — form didn't submit
      expect(authedPage.url()).toContain('/login');
    });

    test('network error shows fallback error', async ({ mockApi, authedPage }) => {
      await mockApi.onGet('**/api/auth/me').respondWith(401, { message: 'Unauthorized' });
      // Abort the login request to simulate network error
      await authedPage.route('**/api/auth/login', async (route) => {
        await route.abort('connectionrefused');
      });

      const loginPage = new LoginPage(authedPage);
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, 'password123');
      // Either the inline error or a toast should appear
      const errorVisible = await loginPage.errorMessage.isVisible().catch(() => false);
      const toastVisible = await loginPage.toast.isVisible().catch(() => false);
      expect(errorVisible || toastVisible).toBeTruthy();
    });
  });
});
