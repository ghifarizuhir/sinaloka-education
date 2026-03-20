import { type Locator, type Page } from '@playwright/test';

export interface StudentFormData {
  name: string;
  email: string;
  phone?: string;
  grade: string;
  status?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
}

export class StudentsPage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly modal: Locator;
  readonly importButton: Locator;
  readonly exportButton: Locator;
  readonly gradeFilter: Locator;
  readonly statusFilter: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add student/i });
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.modal = page.locator('[role="dialog"]');
    this.importButton = page.getByRole('button', { name: /import/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.gradeFilter = page.locator('select').nth(0);
    this.statusFilter = page.locator('select').nth(1);
  }

  async goto() { await this.page.goto('/students'); }

  async createStudent(data: StudentFormData) {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.getByLabel(/full name/i).fill(data.name);
    await this.modal.getByLabel(/email address/i).fill(data.email);
    await this.modal.locator('select').first().selectOption(data.grade);
    if (data.parent_name) await this.modal.getByLabel(/parent\/guardian name/i).fill(data.parent_name);
    if (data.parent_phone) await this.modal.getByLabel(/parent\/guardian phone/i).fill(data.parent_phone);
    await this.modal.getByRole('button', { name: /add student/i }).click();
  }

  async editStudent(name: string, data: Partial<StudentFormData>) {
    await this.openRowMenu(name);
    await this.page.getByText(/view \/ edit/i).click();
    await this.modal.waitFor({ state: 'visible' });
    if (data.name) await this.modal.getByLabel(/full name/i).fill(data.name);
    if (data.email) await this.modal.getByLabel(/email address/i).fill(data.email);
    if (data.grade) await this.modal.locator('select').first().selectOption(data.grade);
    await this.modal.getByRole('button', { name: /save changes/i }).click();
  }

  async deleteStudent(name: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.openRowMenu(name);
    await this.page.getByRole('button', { name: /delete/i }).click();
  }

  async search(query: string) { await this.searchInput.fill(query); }

  async importCSV(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  private async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    await row.locator('button').last().click();
  }

  getRowByName(name: string): Locator { return this.tableRows.filter({ hasText: name }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
