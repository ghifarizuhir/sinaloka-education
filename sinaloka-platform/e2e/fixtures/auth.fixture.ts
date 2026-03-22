import { test as base, type Page } from '@playwright/test';

export const TEST_USER = {
  id: 'usr-00000000-0000-0000-0000-000000000001',
  email: 'admin@test.sinaloka.com',
  name: 'Test Admin',
  role: 'ADMIN' as const,
  avatar_url: null,
  is_active: true,
  last_login_at: '2026-03-22T00:00:00.000Z',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
  institution: {
    id: 'inst-00000000-0000-0000-0000-000000000001',
    name: 'Test Institution',
    slug: 'test-institution',
    logo_url: null,
    timezone: 'Asia/Jakarta',
    default_language: 'id',
  },
};

export const TEST_TOKENS = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
};

async function setupAuth(page: Page) {
  await page.addInitScript((data) => {
    localStorage.setItem('sinaloka-lang', 'en');
    localStorage.setItem('access_token', data.tokens.access_token);
    localStorage.setItem('refresh_token', data.tokens.refresh_token);
  }, { tokens: TEST_TOKENS });
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
