import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './helpers';

test.describe('Payouts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display payouts page with totals', async ({ page }) => {
    await page.getByRole('button', { name: 'Payout' }).click();
    await expect(page.getByText('Payouts').first()).toBeVisible();
    await expect(page.getByText('Total Pendapatan')).toBeVisible();
    await expect(page.getByText(/Rp\s/).first()).toBeVisible();
    await expect(page.getByText('Transaksi Terakhir')).toBeVisible();
  });
});

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display tutor profile information', async ({ page }) => {
    await page.getByText('Profil').click();
    await expect(page.getByText(TEST_USER.name)).toBeVisible();
    await expect(page.getByText(/Matematika/)).toBeVisible();
    await expect(page.getByText(/\d\.\d/)).toBeVisible();
  });
});
