import { type Page, type Locator } from '@playwright/test';

export class SchedulesPage {
  /* -- Top-level actions -- */
  readonly scheduleSessionButton: Locator;
  readonly autoGenerateButton: Locator;

  /* -- View toggle -- */
  readonly listViewButton: Locator;
  readonly calendarViewButton: Locator;

  /* -- Calendar sub-mode tabs (Month / Week / Day) -- */
  /** The Tabs component renders buttons inside a .bg-muted container */
  readonly monthViewButton: Locator;
  readonly weekViewButton: Locator;
  readonly dayViewButton: Locator;

  /* -- Filters -- */
  /** Class filter is the 1st <select> in the filter bar (ScheduleFilters) */
  readonly classFilter: Locator;
  /** Status filter is the 2nd <select> in the filter bar */
  readonly statusFilter: Locator;
  /** Date from input — first date input in ScheduleFilters */
  readonly dateRangeFrom: Locator;
  /** Date to input — second date input in ScheduleFilters */
  readonly dateRangeTo: Locator;

  /* -- Table (list view) -- */
  readonly table: Locator;
  readonly rows: Locator;

  /* -- Empty state -- */
  readonly emptyState: Locator;

  /* -- Session detail drawer -- */
  readonly sessionDrawer: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  constructor(private page: Page) {
    // Button text from t('schedules.scheduleSession')
    this.scheduleSessionButton = page.getByRole('button', { name: /schedule session/i });
    // Button text from t('schedules.autoGenerate')
    this.autoGenerateButton = page.getByRole('button', { name: /auto-generate/i });

    // View toggle — two icon buttons inside a muted container
    const viewToggle = page.locator('.bg-muted.p-1.rounded-lg').first();
    this.listViewButton = viewToggle.locator('button').first();
    this.calendarViewButton = viewToggle.locator('button').last();

    // Calendar sub-mode tabs (text from t('schedules.calendar.month/week/day'))
    this.monthViewButton = page.getByRole('button', { name: /^month$/i });
    this.weekViewButton = page.getByRole('button', { name: /^week$/i });
    this.dayViewButton = page.getByRole('button', { name: /^day$/i });

    // Filters — ScheduleFilters renders date inputs and selects in a flex-wrap container
    const filterBar = page.locator('.flex.flex-wrap.items-center.gap-3');
    this.dateRangeFrom = filterBar.locator('input[type="date"]').first();
    this.dateRangeTo = filterBar.locator('input[type="date"]').last();
    this.classFilter = filterBar.locator('select').first();
    this.statusFilter = filterBar.locator('select').last();

    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');

    // Empty state appears when session list is empty
    this.emptyState = page.locator('table').locator('td[colspan]');

    // Session detail drawer — uses the Drawer component
    this.sessionDrawer = page.locator('[role="dialog"]');

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/schedules');
  }

  /* -- View helpers -- */

  async switchToListView() {
    await this.listViewButton.click();
  }

  async switchToCalendarView() {
    await this.calendarViewButton.click();
  }

  /* -- Modal helpers -- */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  async createSession(data: {
    className: string;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    await this.scheduleSessionButton.click();
    const modal = this.modal;

    // Class select — first <select> in modal
    await modal.locator('select').first().selectOption({ label: data.className });

    // Date input
    await modal.locator('input[type="date"]').fill(data.date);

    // Start time — second <select>, end time — third <select>
    await modal.locator('select').nth(1).selectOption(data.startTime);
    await modal.locator('select').nth(2).selectOption(data.endTime);

    // Submit — button text from t('schedules.scheduleSession')
    const submitButton = modal.getByRole('button', { name: /schedule session/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions') && resp.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);
  }

  async generateSessions(data: {
    className: string;
    dateFrom: string;
    dateTo: string;
  }) {
    await this.autoGenerateButton.click();
    const modal = this.modal;

    // Class select — first <select> in modal
    await modal.locator('select').first().selectOption({ label: data.className });

    // Date from — first date input, date to — second date input
    await modal.locator('input[type="date"]').first().fill(data.dateFrom);
    await modal.locator('input[type="date"]').last().fill(data.dateTo);

    // Submit — button text from t('schedules.modal.generateSessions')
    const submitButton = modal.getByRole('button', { name: /generate sessions/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions/generate') && resp.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);
  }

  /**
   * Edit a session: opens the drawer by clicking a row, then clicks edit, fills form, saves.
   */
  async editSession(className: string, data: {
    date?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
  }) {
    await this.openSessionDrawer(className);

    // Click "Edit Session" button in the drawer
    const drawer = this.sessionDrawer;
    await drawer.getByRole('button', { name: /edit session/i }).click();

    // EditSessionModal opens as a second dialog
    const editModal = this.page.getByRole('dialog').last();

    if (data.date !== undefined) {
      await editModal.locator('input[type="date"]').fill(data.date);
    }
    if (data.startTime !== undefined) {
      // Start time is the first select in the edit modal (after it opens)
      await editModal.locator('select').first().selectOption(data.startTime);
    }
    if (data.endTime !== undefined) {
      await editModal.locator('select').nth(1).selectOption(data.endTime);
    }
    if (data.status !== undefined) {
      // Status is the last select
      await editModal.locator('select').last().selectOption(data.status);
    }

    // Submit — button text from t('common.saveChanges')
    const submitButton = editModal.getByRole('button', { name: /save changes/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions') && resp.request().method() === 'PATCH'
      ),
      submitButton.click(),
    ]);
  }

  /**
   * Cancel a session from the drawer.
   */
  async cancelSession(className: string) {
    await this.openSessionDrawer(className);

    // Click "Cancel Session" button in the drawer — text from t('schedules.drawer.cancelSession')
    const drawer = this.sessionDrawer;
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions') &&
        (resp.request().method() === 'PATCH' || resp.request().method() === 'DELETE')
      ),
      drawer.getByRole('button', { name: /cancel session/i }).click(),
    ]);
  }

  /**
   * Open the session detail drawer by clicking a row in the list view.
   */
  async openSessionDrawer(className: string) {
    await this.getRowByClass(className).first().click();
    // Wait for the drawer to appear
    await this.sessionDrawer.waitFor({ state: 'visible' });
  }

  /**
   * Approve a reschedule request from the drawer.
   */
  async approveReschedule() {
    const drawer = this.sessionDrawer;
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions') && resp.request().method() === 'PATCH'
      ),
      drawer.getByRole('button', { name: /approve/i }).click(),
    ]);
  }

  /**
   * Reject a reschedule request from the drawer.
   */
  async rejectReschedule() {
    const drawer = this.sessionDrawer;
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions') && resp.request().method() === 'PATCH'
      ),
      drawer.getByRole('button', { name: /reject/i }).click(),
    ]);
  }

  /**
   * Filter by class using the class filter dropdown.
   */
  async filterByClass(name: string) {
    await this.classFilter.selectOption({ label: name });
  }

  /**
   * Filter by status using the status filter dropdown.
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
  }

  /**
   * Filter by date range.
   */
  async filterByDateRange(from: string, to: string) {
    await this.dateRangeFrom.fill(from);
    await this.dateRangeTo.fill(to);
  }

  /* -- Row helpers (list view) -- */

  getRowByClass(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  getToast(): Locator {
    return this.toast;
  }
}
