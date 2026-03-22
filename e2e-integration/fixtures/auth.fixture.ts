import { test as base, type Page } from '@playwright/test';
import { ACCOUNTS, type AccountKey } from '../helpers/test-accounts.js';

type AuthFixtures = {
  authedPage: Page;
  loginAs: (role: AccountKey) => Promise<Page>;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await performLogin(page, ACCOUNTS.ADMIN_CERDAS);
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    const fn = async (role: AccountKey): Promise<Page> => {
      await performLogin(page, ACCOUNTS[role]);
      return page;
    };
    await use(fn);
  },
});

async function performLogin(page: Page, account: { email: string; password: string }): Promise<void> {
  // Clear any stale state from previous test
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto('/login');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/auth/login') && resp.status() === 200),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
}

export { expect } from '@playwright/test';
