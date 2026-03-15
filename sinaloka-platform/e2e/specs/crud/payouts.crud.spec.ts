import { createRequire } from 'module';
import { test, expect } from '../../fixtures/auth.fixture';
import { setupPayoutMocks, setupTutorMocks } from '../../helpers/api-mocker';
import { TutorPayoutsPage } from '../../pages/tutor-payouts.page';

const require = createRequire(import.meta.url);
const payoutsData = require('../../mocks/payouts.json');

test.describe('Tutor Payouts CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupTutorMocks(mockApi);
    await setupPayoutMocks(mockApi);
  });

  // ── Create ──────────────────────────────────────────────────────────────

  test('create payout with all fields shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await payoutsPage.createPayout({
      tutorName: 'Dewi Lestari',
      amount: 2000000,
      date: '2026-03-15',
      description: 'March 2026 salary',
    });

    await expect(payoutsPage.getToast()).toContainText(/payout (created|recorded)/i);
  });

  test('create payout without description shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await payoutsPage.createPayout({
      tutorName: 'Rina Wijaya',
      amount: 1500000,
      date: '2026-03-15',
    });

    await expect(payoutsPage.getToast()).toContainText(/payout (created|recorded)/i);
  });

  // ── Read / List ──────────────────────────────────────────────────────────

  test('payout table loads with data from API', async ({ authenticatedPage: page, mockApi }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await expect(payoutsPage.table).toBeVisible();
    await expect(payoutsPage.tableRows.first()).toBeVisible();

    await expect(payoutsPage.getRowByTutorName('Dewi Lestari')).toBeVisible();
    await expect(payoutsPage.getRowByTutorName('Rina Wijaya')).toBeVisible();
  });

  test('payout rows display status', async ({ authenticatedPage: page, mockApi }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await expect(payoutsPage.tableRows.first()).toBeVisible();

    // Dewi = PENDING, Rina = APPROVED
    const dewiRow = payoutsPage.getRowByTutorName('Dewi Lestari');
    await expect(dewiRow.getByText(/pending/i)).toBeVisible();

    const rinaRow = payoutsPage.getRowByTutorName('Rina Wijaya');
    await expect(rinaRow.getByText(/approved/i)).toBeVisible();
  });

  test('payout table shows correct amount values', async ({ authenticatedPage: page, mockApi }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await expect(payoutsPage.tableRows.first()).toBeVisible();

    // Amounts from mock data: 2,000,000 and 1,500,000
    await expect(payoutsPage.getRowByTutorName('Dewi Lestari')).toContainText(/2[,.]?000[,.]?000/);
  });

  // ── Search ───────────────────────────────────────────────────────────────

  test('search tutors filters payout list', async ({ authenticatedPage: page, mockApi }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await expect(payoutsPage.tableRows.first()).toBeVisible();

    await payoutsPage.search('Dewi');

    await expect(payoutsPage.getRowByTutorName('Dewi Lestari')).toBeVisible();
    await expect(payoutsPage.tableRows).toHaveCount(1);
  });

  // ── Payout Lifecycle ──────────────────────────────────────────────────────

  test('pending payout can be reconciled', async ({ authenticatedPage: page, mockApi }) => {
    // reconcile endpoint
    await mockApi.onPatch('**/api/admin/payouts/*').respondWith(200, {
      ...payoutsData.data[0],
      status: 'APPROVED',
    });

    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await expect(payoutsPage.tableRows.first()).toBeVisible();

    await payoutsPage.reconcilePayout('Dewi Lestari');

    // After reconcile the confirm/generate slip button should appear
    const confirmButton = page.getByRole('button', { name: /confirm.*generate slip/i });
    await expect(confirmButton).toBeVisible();
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test('delete payout with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const payoutsPage = new TutorPayoutsPage(page);
    await payoutsPage.goto();

    await expect(payoutsPage.tableRows.first()).toBeVisible();

    await payoutsPage.deletePayout('Dewi Lestari');

    await expect(payoutsPage.getToast()).toBeVisible();
  });
});
