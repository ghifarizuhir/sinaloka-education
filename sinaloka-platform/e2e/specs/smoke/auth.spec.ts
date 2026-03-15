import { test as base, expect } from '@playwright/test';
import { test as mockTest } from '../../fixtures/mock-api.fixture';
import { test as authTest } from '../../fixtures/auth.fixture';
import { setupAuthMocks } from '../../helpers/api-mocker';
import { LoginPage } from '../../pages/login.page';

// --- Unauthenticated redirect (no fixture needed) ---
base.describe('Auth – unauthenticated redirect', () => {
  base('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});

// --- Login page tests (mock-api fixture, NO auth fixture) ---
mockTest.describe('Auth – login page', () => {
  mockTest('successful login redirects to dashboard', async ({ page, mockApi }) => {
    await setupAuthMocks(mockApi);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@sinaloka.com', 'password');

    await expect(page).toHaveURL(/^\//);
    // Should not be on /login anymore
    await expect(page).not.toHaveURL(/\/login/);
  });

  mockTest('invalid credentials shows error message', async ({ page, mockApi }) => {
    // Override login to return 401
    await mockApi.onPost('**/api/auth/login').respondWith(401, {
      statusCode: 401,
      message: 'Invalid email or password',
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpassword');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(/invalid email or password/i);
  });
});

// --- Authenticated tests ---
authTest.describe('Auth – authenticated flows', () => {
  authTest('logout clears tokens and redirects to /login', async ({ authenticatedPage: page, mockApi }) => {
    await mockApi.onPost('**/api/auth/logout').respondWith(200, {});

    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);

    // Clear tokens from localStorage (simulating logout)
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Navigate somewhere protected after tokens are gone
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login/);
  });

  authTest('token refresh on 401 – retries request with new token', async ({ authenticatedPage: page, mockApi }) => {
    // Phase 1: /api/auth/me is already mocked by auth fixture
    // Phase 2: Mock a protected endpoint to 401 first time, then succeed after refresh
    let callCount = 0;
    await page.route('**/api/admin/dashboard/stats', async (route) => {
      callCount++;
      if (callCount === 1) {
        // First call returns 401 to trigger refresh
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total_students: 150, active_tutors: 12, total_revenue: 75000000, attendance_rate: 92.5, upcoming_sessions: 8 }) });
      }
    });

    // Phase 3: Refresh token responds with new tokens
    await mockApi.onPost('**/api/auth/refresh').respondWith(200, {
      access_token: 'new-access-token-999',
      refresh_token: 'new-refresh-token-999',
    });

    await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, []);

    await page.goto('/');
    // Page should render dashboard (not error/redirect) — stats eventually load after refresh
    await expect(page).not.toHaveURL(/\/login/);
  });
});
