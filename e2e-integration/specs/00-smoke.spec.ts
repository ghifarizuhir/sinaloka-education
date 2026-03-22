import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';

test.describe('Infrastructure Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test('login and see dashboard', async ({ authedPage }) => {
    await expect(authedPage).toHaveURL('/');
    await expect(authedPage.getByText('Total Students')).toBeVisible();
  });
});
