import { test, expect } from '../../e2e/fixtures/mock-api.fixture';
import {
  setupAuthMocks,
  setupSessionMocks,
  setupClassMocks,
} from '../helpers/api-mocker';
import { SchedulesPage } from '../pages/schedules.page';

test.describe('Schedules', () => {
  let schedules: SchedulesPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupSessionMocks(mockApi);
    await setupClassMocks(mockApi);
    await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
      overdue_count: 0,
      flagged_students: [],
    });
    schedules = new SchedulesPage(authedPage);
  });

  // ── Smoke ──

  test('loads in calendar view by default', async () => {
    await schedules.goto();
    // Calendar view is default — table should NOT be visible
    await expect(schedules.table).not.toBeVisible();
  });

  test('switch to list shows table', async () => {
    await schedules.goto();
    await schedules.switchToListView();
    await expect(schedules.table).toBeVisible();
  });

  test('switch back to calendar hides table', async () => {
    await schedules.goto();
    await schedules.switchToListView();
    await expect(schedules.table).toBeVisible();
    await schedules.switchToCalendarView();
    await expect(schedules.table).not.toBeVisible();
  });

  // ── CRUD ──

  test('create session', async () => {
    await schedules.goto();
    await schedules.switchToListView();
    await schedules.createSession({
      className: 'Math Advanced',
      date: '2026-04-01',
      startTime: '09:00',
      endTime: '10:30',
    });
    await expect(schedules.getToast()).toBeVisible();
  });

  test('auto-generate sessions', async () => {
    await schedules.goto();
    await schedules.generateSessions({
      className: 'Math Advanced',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });
    await expect(schedules.getToast()).toBeVisible();
  });

  test('cancel session', async ({ mockApi, authedPage }) => {
    await schedules.goto();
    await schedules.switchToListView();
    // Find a scheduled row and open its menu
    const row = schedules.getRowByClass('Math Advanced');
    await row.first().locator('button').last().click();
    // Click cancel in dropdown
    await authedPage.getByText(/cancel session/i).click();
    // Confirm the cancellation if a dialog appears
    const dialog = authedPage.getByRole('alertdialog');
    if (await dialog.isVisible()) {
      const confirmBtn = dialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }
    await expect(schedules.getToast()).toBeVisible();
  });

  // ── Negative ──

  test('create without class disabled', async ({ mockApi, authedPage }) => {
    // Override classes to return empty list so no auto-selection happens
    await mockApi.onGet('**/api/admin/classes**').respondWith(200, { data: [], meta: { total: 0 } });
    await schedules.goto();
    await schedules.scheduleSessionButton.click();
    const modal = authedPage.getByRole('dialog');
    // Submit button should be disabled when no class is available
    const submitBtn = modal.getByRole('button', { name: /schedule session/i });
    await expect(submitBtn).toBeDisabled();
  });
});
