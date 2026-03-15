import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Attendance', () => {
  test('should mark attendance and complete session', async ({ page }) => {
    await login(page);
    await page.getByText('Jadwal').click();
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible();
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await page.getByText('Absen Murid').first().click({ timeout: 10000 });
    await expect(page.getByText('Student List')).toBeVisible({ timeout: 10000 });
    await page.getByText('Mark All Present').click();
    await page.getByPlaceholder('e.g., Algebraic Fractions').fill('Persamaan Linear');
    await page.getByText('Finalize & Close').click();
    await expect(page.getByText('Absensi kelas berhasil disimpan!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Jadwal Mengajar')).toBeVisible({ timeout: 10000 });
  });
});
