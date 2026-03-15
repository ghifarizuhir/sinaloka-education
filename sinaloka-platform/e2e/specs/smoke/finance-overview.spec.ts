import { test, expect } from '../../fixtures/auth.fixture';
import { setupDashboardMocks, setupPaymentMocks, setupPayoutMocks, setupExpenseMocks } from '../../helpers/api-mocker';
import { FinanceOverviewPage } from '../../pages/finance-overview.page';

test.describe('Finance Overview', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupDashboardMocks(mockApi);
    await setupPaymentMocks(mockApi);
    await setupPayoutMocks(mockApi);
    await setupExpenseMocks(mockApi);
  });

  test('summary stats cards load with data', async ({ authenticatedPage: page, mockApi }) => {
    const financeOverviewPage = new FinanceOverviewPage(page);
    await financeOverviewPage.goto();

    await expect(financeOverviewPage.statsGrid).toBeVisible();

    // Revenue This Month stat card should show a value from dashboard stats
    // total_revenue: 75000000 → rendered as "Rp 75.0M"
    await expect(page.getByText(/Rp 75\.0M/).first()).toBeVisible();

    // "Revenue This Month" label should be present
    await expect(financeOverviewPage.getStatCard('Revenue This Month')).toBeVisible();
  });

  test('navigation link to Student Payments works', async ({ authenticatedPage: page, mockApi }) => {
    await setupPaymentMocks(mockApi);

    const financeOverviewPage = new FinanceOverviewPage(page);
    await financeOverviewPage.goto();

    await financeOverviewPage.navigateToModule('Student Payments');

    await expect(page).toHaveURL(/\/finance\/payments/);
  });

  test('navigation link to Tutor Payouts works', async ({ authenticatedPage: page, mockApi }) => {
    await mockApi.onGet('**/api/admin/payouts').respondWith(200, { data: [], meta: { page: 1, limit: 10, total: 0, total_pages: 0 } });

    const financeOverviewPage = new FinanceOverviewPage(page);
    await financeOverviewPage.goto();

    await financeOverviewPage.navigateToModule('Tutor Payouts');

    await expect(page).toHaveURL(/\/finance\/payouts/);
  });

  test('navigation link to Operating Expenses works', async ({ authenticatedPage: page, mockApi }) => {
    await setupExpenseMocks(mockApi);

    const financeOverviewPage = new FinanceOverviewPage(page);
    await financeOverviewPage.goto();

    await financeOverviewPage.navigateToModule('Operating Expenses');

    await expect(page).toHaveURL(/\/finance\/expenses/);
  });
});
