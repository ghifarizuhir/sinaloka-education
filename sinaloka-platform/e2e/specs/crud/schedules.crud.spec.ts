import { test, expect } from '../../fixtures/auth.fixture';
import { setupSessionMocks, setupClassMocks } from '../../helpers/api-mocker';
import { SchedulesPage } from '../../pages/schedules.page';
import sessionsData from '../../mocks/sessions.json';

test.describe('Schedules CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupClassMocks(mockApi);
    await setupSessionMocks(mockApi);
  });

  // ── List View ─────────────────────────────────────────────────────────────

  test('list view displays sessions from API', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.table).toBeVisible();
    await expect(schedulesPage.tableRows.first()).toBeVisible();

    await expect(schedulesPage.getRowByClass('Math Advanced')).toBeVisible();
    await expect(schedulesPage.getRowByClass('Physics Basic')).toBeVisible();
  });

  test('list view shows all mock sessions', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows).toHaveCount(sessionsData.data.length);
  });

  test('session rows display status badges', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    // SCHEDULED, COMPLETED, CANCELLED statuses appear in mock data
    await expect(page.getByText(/scheduled/i).first()).toBeVisible();
    await expect(page.getByText(/completed/i).first()).toBeVisible();
    await expect(page.getByText(/cancelled/i).first()).toBeVisible();
  });

  test('session rows display date and time', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    const mathRow = schedulesPage.getRowByClass('Math Advanced');
    await expect(mathRow).toBeVisible();
    // Check time appears: "09:00" is in mock data
    await expect(mathRow.getByText(/09:00/)).toBeVisible();
  });

  // ── Calendar View Toggle ──────────────────────────────────────────────────

  test('switch to calendar view hides table', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    // Start in list view — table is visible
    await expect(schedulesPage.table).toBeVisible();

    // Switch to calendar view
    await schedulesPage.toggleView('calendar');

    // Table should no longer be visible
    await expect(schedulesPage.table).not.toBeVisible();
  });

  test('switch back to list view shows table', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    // Switch to calendar
    await schedulesPage.toggleView('calendar');
    await expect(schedulesPage.table).not.toBeVisible();

    // Switch back to list
    await schedulesPage.toggleView('list');
    await expect(schedulesPage.table).toBeVisible();
  });

  // ── Date Filtering ────────────────────────────────────────────────────────

  test('date range filter updates visible sessions', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    // Filter to only include 2026-03-15
    await schedulesPage.filterByDateRange('2026-03-15', '2026-03-15');

    // Only the SCHEDULED session on 2026-03-15 for Math Advanced should remain
    await expect(schedulesPage.getRowByClass('Math Advanced')).toBeVisible();
    await expect(schedulesPage.tableRows).toHaveCount(1);
  });

  test('date range filter spanning multiple sessions shows multiple rows', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    // All mock sessions fall within 2026-03-13 to 2026-03-15
    await schedulesPage.filterByDateRange('2026-03-13', '2026-03-15');

    await expect(schedulesPage.tableRows).toHaveCount(sessionsData.data.length);
  });

  // ── Session Details ────────────────────────────────────────────────────────

  test('schedule new session shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await schedulesPage.scheduleSession('Math Advanced', '2026-03-20', '09:00', '10:30');

    await expect(schedulesPage.getToast()).toContainText(/(session scheduled|created)/i);
  });

  test('auto-generate sessions shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await schedulesPage.autoGenerate('Math Advanced', '2026-04-01', '2026-04-30');

    await expect(schedulesPage.getToast()).toContainText(/(sessions? generated|created)/i);
  });

  // ── Class Filter ───────────────────────────────────────────────────────────

  test('class filter shows only sessions for selected class', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    // Filter by class_id=2 (Physics Basic)
    await schedulesPage.classFilter.selectOption({ label: 'Physics Basic' });

    await expect(schedulesPage.getRowByClass('Physics Basic')).toBeVisible();
    await expect(schedulesPage.tableRows).toHaveCount(1);
  });

  // ── Status Filter ─────────────────────────────────────────────────────────

  test('status filter shows only SCHEDULED sessions', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    await schedulesPage.statusFilter.selectOption('SCHEDULED');

    // Only the first session is SCHEDULED
    await expect(schedulesPage.tableRows).toHaveCount(1);
    await expect(schedulesPage.getRowByClass('Math Advanced')).toBeVisible();
  });

  test('status filter shows only COMPLETED sessions', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const schedulesPage = new SchedulesPage(page);
    await schedulesPage.goto();

    await expect(schedulesPage.tableRows.first()).toBeVisible();

    await schedulesPage.statusFilter.selectOption('COMPLETED');

    await expect(schedulesPage.tableRows).toHaveCount(1);
  });
});
