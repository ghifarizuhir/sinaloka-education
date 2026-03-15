import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './helpers';

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sinaloka')).toBeVisible();
    await expect(page.getByText('Portal Tutor')).toBeVisible();
    await expect(page.getByPlaceholder('tutor@example.com')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page);
    await expect(page.getByText(`Halo, ${TEST_USER.firstName}!`)).toBeVisible();
    await expect(page.getByText('Jadwal Mengajar Kamu')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('tutor@example.com').fill('wrong@email.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /masuk/i }).click();
    await expect(page.getByRole('alert').or(page.locator('text=/gagal|invalid|salah/i'))).toBeVisible({ timeout: 10000 });
  });

  test('should logout and return to login page', async ({ page }) => {
    await login(page);
    await page.getByText('Profil').click();
    await expect(page.getByText(TEST_USER.name)).toBeVisible();
    await page.getByText('Keluar Platform').click();
    await expect(page.getByText('Portal Tutor')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('tutor@example.com')).toBeVisible();
  });
});
