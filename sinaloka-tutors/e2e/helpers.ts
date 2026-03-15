import type { Page } from '@playwright/test';

export const TEST_USER = {
  email: 'tutor1@cerdas.id',
  password: 'password',
  name: 'Budi Santoso',
  firstName: 'Budi',
};

export async function login(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('tutor@example.com').fill(TEST_USER.email);
  await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
  await page.getByRole('button', { name: /masuk/i }).click();
  await page.getByText(`Halo, ${TEST_USER.firstName}!`).waitFor({ timeout: 15000 });
}
