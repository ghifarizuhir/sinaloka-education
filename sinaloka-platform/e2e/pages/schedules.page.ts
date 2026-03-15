import { type Locator, type Page } from '@playwright/test';

export class SchedulesPage {
  readonly scheduleSessionButton: Locator;
  readonly autoGenerateButton: Locator;
  readonly modal: Locator;
  readonly generateModal: Locator;
  readonly listViewButton: Locator;
  readonly calendarViewButton: Locator;
  readonly todayButton: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly classFilter: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;

  constructor(private page: Page) {
    this.scheduleSessionButton = page.getByRole('button', { name: /schedule session/i });
    this.autoGenerateButton = page.getByRole('button', { name: /auto-generate/i });
    this.modal = page.locator('[role="dialog"]');
    // Auto-generate modal identified by its title text
    this.generateModal = page.locator('[role="dialog"]').filter({ hasText: /auto-generate sessions/i });
    // View toggle buttons (List / Calendar icons)
    this.listViewButton = page.locator('.flex.bg-zinc-100 button').first();
    this.calendarViewButton = page.locator('.flex.bg-zinc-100 button').nth(1);
    this.todayButton = page.getByRole('button', { name: /today/i });
    this.dateFromInput = page.locator('input[type="date"]').first();
    this.dateToInput = page.locator('input[type="date"]').nth(1);
    this.classFilter = page.locator('select').nth(0);
    this.statusFilter = page.locator('select').nth(1);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
  }

  async goto() { await this.page.goto('/schedules'); }

  async scheduleSession(className: string, date: string, startTime: string, endTime: string) {
    await this.scheduleSessionButton.click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.locator('select').first().selectOption({ label: className });
    await this.modal.locator('input[type="date"]').fill(date);
    await this.modal.locator('select').nth(1).selectOption(startTime);
    await this.modal.locator('select').nth(2).selectOption(endTime);
    await this.modal.getByRole('button', { name: /schedule session/i }).click();
  }

  async autoGenerate(className: string, dateFrom: string, dateTo: string) {
    await this.autoGenerateButton.click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.locator('select').first().selectOption({ label: className });
    await this.modal.locator('input[type="date"]').first().fill(dateFrom);
    await this.modal.locator('input[type="date"]').nth(1).fill(dateTo);
    await this.modal.getByRole('button', { name: /generate sessions/i }).click();
  }

  async toggleView(view: 'list' | 'calendar') {
    if (view === 'list') {
      await this.listViewButton.click();
    } else {
      await this.calendarViewButton.click();
    }
  }

  async filterByDateRange(from: string, to: string) {
    await this.dateFromInput.fill(from);
    await this.dateToInput.fill(to);
  }

  getRowByClass(className: string): Locator { return this.tableRows.filter({ hasText: className }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
