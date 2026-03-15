import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

test.describe('@integration Auth', () => {
  test('real login and logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@sinaloka.com', 'password123');
    await expect(page).toHaveURL('/');
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
