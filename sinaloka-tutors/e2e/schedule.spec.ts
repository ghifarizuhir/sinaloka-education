import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display schedule page with sessions', async ({ page }) => {
    await page.getByRole('button', { name: 'Jadwal' }).click();
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible();
    await expect(page.getByText('Manajemen sesi dan absensi')).toBeVisible();
    // Click Completed to verify sessions that won't be consumed by attendance test
    await page.getByRole('button', { name: 'Completed' }).click();
    await expect(page.getByText('Matematika').first()).toBeVisible({ timeout: 15000 });
  });

  test('should filter schedule by status', async ({ page }) => {
    await page.getByRole('button', { name: 'Jadwal' }).click();
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible();
    await page.getByRole('button', { name: 'Completed' }).click();
    await expect(page.getByRole('button', { name: 'Completed' })).toHaveClass(/bg-lime-400/);
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await expect(page.getByRole('button', { name: 'Upcoming' })).toHaveClass(/bg-lime-400/);
  });
});
