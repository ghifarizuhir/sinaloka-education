import { type Page } from '@playwright/test';
import { test as mockTest, MockApi } from './mock-api.fixture';

const TEST_USER = {
  id: 1,
  email: 'admin@sinaloka.com',
  name: 'Test Admin',
  role: 'admin',
  institution_id: 1,
};

const TEST_TOKENS = {
  access_token: 'test-access-token-123',
  refresh_token: 'test-refresh-token-456',
};

type AuthFixtures = {
  authenticatedPage: Page;
  mockApi: MockApi;
};

export const test = mockTest.extend<AuthFixtures>({
  authenticatedPage: [
    async ({ page, mockApi, browserName }, use, testInfo) => {
      // Inject dark mode class if dark-mode project
      const isDarkMode = testInfo.project.name === 'dark-mode';
      if (isDarkMode) {
        await page.addInitScript(() => {
          document.documentElement.classList.add('dark');
        });
      }

      // Mock auth endpoints to prevent token refresh loops
      await mockApi.onGet('**/api/auth/me').respondWith(200, TEST_USER);
      await mockApi.onPost('**/api/auth/refresh').respondWith(200, TEST_TOKENS);

      // Inject tokens into localStorage before navigating
      await page.addInitScript(
        (tokens) => {
          localStorage.setItem('access_token', tokens.access_token);
          localStorage.setItem('refresh_token', tokens.refresh_token);
        },
        TEST_TOKENS,
      );

      await use(page);
    },
    { auto: false },
  ],
});

export { expect } from '@playwright/test';
export { TEST_USER, TEST_TOKENS };
