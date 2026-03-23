import { type Page, type Locator } from '@playwright/test';

export class SuperAdminUsersPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
    this.addButton = page.getByRole('button', { name: /add admin/i });
    this.table = page.getByRole('table');
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/users');
    await this.table.waitFor({ state: 'visible', timeout: 10_000 });
  }

  getRowByEmail(email: string): Locator {
    return this.table.getByRole('row').filter({ hasText: email });
  }

  async filterByRole(role: string) {
    await this.page.getByRole('combobox').first().selectOption(role);
  }

  async filterByInstitution(name: string) {
    await this.page.getByRole('combobox').nth(1).selectOption({ label: name });
  }

  async filterByStatus(status: 'Active' | 'Inactive') {
    await this.page.getByRole('combobox').nth(2).selectOption(status);
  }

  async openCreateModal() {
    await this.addButton.click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async fillCreateForm(data: {
    name: string;
    email: string;
    password: string;
    institution?: string;
  }) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder(/john doe/i).fill(data.name);
    await dialog.getByPlaceholder(/admin@institution/i).fill(data.email);
    await dialog.getByPlaceholder(/password/i).fill(data.password);
    if (data.institution) {
      await dialog.getByRole('combobox').selectOption({ label: data.institution });
    }
  }

  async submitCreate() {
    await this.page.getByRole('dialog').getByRole('button', { name: /save/i }).click();
  }

  async openEditModal(email: string) {
    await this.getRowByEmail(email).getByRole('button', { name: /edit/i }).click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async toggleActive() {
    await this.page.getByRole('dialog').getByRole('switch').click();
  }

  async submitEdit() {
    await this.page.getByRole('dialog').getByRole('button', { name: /save/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
