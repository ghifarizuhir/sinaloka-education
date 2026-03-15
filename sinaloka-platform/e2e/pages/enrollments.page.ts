import { type Locator, type Page } from '@playwright/test';

export class EnrollmentsPage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly modal: Locator;
  readonly statusFilter: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /new enrollment/i });
    this.searchInput = page.getByPlaceholder(/search student or class/i);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.modal = page.locator('[role="dialog"]');
    this.statusFilter = page.locator('select').first();
  }

  async goto() { await this.page.goto('/enrollments'); }

  async createEnrollment(studentName: string, className: string) {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
    // Search and select student in the student list panel
    await this.modal.locator('input[placeholder="Search students..."]').fill(studentName);
    await this.modal.getByText(studentName).first().click();
    // Select class from the class list panel
    await this.modal.getByText(className).click();
    await this.modal.getByRole('button', { name: /enroll.*students?/i }).click();
  }

  async changeStatus(studentName: string, newStatus: string) {
    await this.openRowMenu(studentName);
    await this.page.getByText(/edit enrollment/i).click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.locator('select').selectOption(newStatus);
    await this.modal.getByRole('button', { name: /save changes/i }).click();
  }

  async deleteEnrollment(studentName: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.openRowMenu(studentName);
    await this.page.getByText(/delete record/i).click();
  }

  async search(query: string) { await this.searchInput.fill(query); }

  private async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    await row.locator('button').last().click();
  }

  getRowByName(name: string): Locator { return this.tableRows.filter({ hasText: name }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
