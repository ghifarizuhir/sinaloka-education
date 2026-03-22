import { type Page, type Locator } from '@playwright/test';

export class SchedulesPage {
  /* ── Top-level actions ── */
  readonly scheduleSessionButton: Locator;
  readonly autoGenerateButton: Locator;

  /* ── View toggle ── */
  readonly listViewButton: Locator;
  readonly calendarViewButton: Locator;

  /* ── Table (list view) ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.scheduleSessionButton = page.getByRole('button', { name: /schedule session/i });
    this.autoGenerateButton = page.getByRole('button', { name: /auto-generate/i });

    // View toggle — two icon buttons inside a muted container
    // List icon button is the first, calendar icon button is the second
    const viewToggle = page.locator('.bg-muted.p-1.rounded-lg');
    this.listViewButton = viewToggle.locator('button').first();
    this.calendarViewButton = viewToggle.locator('button').last();

    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/schedules');
  }

  /* ── View helpers ── */

  async switchToListView() {
    await this.listViewButton.click();
  }

  async switchToCalendarView() {
    await this.calendarViewButton.click();
  }

  /* ── Modal helpers ── */

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

    // Submit
    await modal.getByRole('button', { name: /schedule session/i }).click();
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

    // Submit
    await modal.getByRole('button', { name: /generate sessions/i }).click();
  }

  /* ── Row helpers (list view) ── */

  getRowByClass(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  getToast(): Locator {
    return this.toast;
  }
}
