import { type Locator, type Page } from '@playwright/test';

export interface ClassFormData {
  name: string;
  subject?: string;
  tutorName?: string;
  capacity?: string;
  fee?: string;
  scheduleDays?: string[];
  startTime?: string;
  endTime?: string;
  room?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export class ClassesPage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly modal: Locator;
  readonly subjectFilter: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /register new class/i });
    this.searchInput = page.getByPlaceholder(/search class or tutor/i);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.modal = page.locator('[role="dialog"]');
    this.subjectFilter = page.locator('select').first();
  }

  async goto() { await this.page.goto('/classes'); }

  async createClass(data: ClassFormData) {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.getByLabel(/class name/i).fill(data.name);
    if (data.subject) await this.modal.locator('#subject').selectOption(data.subject);
    if (data.tutorName) await this.modal.locator('#tutor').selectOption({ label: data.tutorName });
    if (data.capacity) await this.modal.getByLabel(/capacity/i).fill(data.capacity);
    if (data.fee) await this.modal.getByLabel(/fee per session/i).fill(data.fee);
    if (data.scheduleDays) {
      for (const day of data.scheduleDays) {
        await this.modal.getByRole('button', { name: day.slice(0, 3) }).click();
      }
    }
    if (data.startTime) await this.modal.getByLabel(/start time/i).fill(data.startTime);
    if (data.endTime) await this.modal.getByLabel(/end time/i).fill(data.endTime);
    if (data.room) await this.modal.getByLabel(/room/i).fill(data.room);
    await this.modal.getByRole('button', { name: /create class/i }).click();
  }

  async editClass(name: string, data: Partial<ClassFormData>) {
    await this.openRowMenu(name);
    await this.page.getByText(/edit class details/i).click();
    await this.modal.waitFor({ state: 'visible' });
    if (data.name) await this.modal.getByLabel(/class name/i).fill(data.name);
    if (data.subject) await this.modal.locator('#subject').selectOption(data.subject);
    if (data.capacity) await this.modal.getByLabel(/capacity/i).fill(data.capacity);
    if (data.fee) await this.modal.getByLabel(/fee per session/i).fill(data.fee);
    if (data.room) await this.modal.getByLabel(/room/i).fill(data.room);
    await this.modal.getByRole('button', { name: /update class/i }).click();
  }

  async deleteClass(name: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.openRowMenu(name);
    await this.page.getByText(/delete class/i).click();
  }

  async search(query: string) { await this.searchInput.fill(query); }

  private async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    await row.locator('button').last().click();
  }

  getRowByName(name: string): Locator { return this.tableRows.filter({ hasText: name }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
