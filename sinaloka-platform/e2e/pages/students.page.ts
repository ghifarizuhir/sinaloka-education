import { type Page, type Locator } from '@playwright/test';

export class StudentsPage {
  /* ── Top-level actions ── */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add student/i });
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/students');
  }

  /* ── Modal helpers ── */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  async createStudent(data: {
    name: string;
    grade: string;
    parentName: string;
    parentPhone: string;
    email?: string;
    phone?: string;
    parentEmail?: string;
  }) {
    await this.addButton.click();
    const modal = this.modal;

    await modal.locator('#new-name').fill(data.name);
    if (data.email) await modal.locator('#new-email').fill(data.email);
    if (data.phone) await modal.locator('#new-phone').fill(data.phone);

    // Grade uses the custom Select component — click it and pick the option
    await modal.locator('#new-parent-name').fill(data.parentName);
    await modal.locator('#new-parent-phone').fill(data.parentPhone);
    if (data.parentEmail) await modal.locator('#new-parent-email').fill(data.parentEmail);

    // Submit (create)
    await modal.getByRole('button', { name: /add student/i }).click();
  }

  async editStudent(
    name: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      grade?: string;
      parentName?: string;
      parentPhone?: string;
      parentEmail?: string;
    },
  ) {
    await this.openRowMenu(name);
    // Click "View / Edit" in the action menu
    await this.page.getByText(/view \/ edit/i).click();

    const modal = this.modal;

    if (data.name) await modal.locator('#new-name').fill(data.name);
    if (data.email) await modal.locator('#new-email').fill(data.email);
    if (data.phone) await modal.locator('#new-phone').fill(data.phone);
    if (data.parentName) await modal.locator('#new-parent-name').fill(data.parentName);
    if (data.parentPhone) await modal.locator('#new-parent-phone').fill(data.parentPhone);
    if (data.parentEmail) await modal.locator('#new-parent-email').fill(data.parentEmail);

    // Submit (save changes)
    await modal.getByRole('button', { name: /save changes/i }).click();
  }

  async deleteStudent(name: string) {
    await this.openRowMenu(name);
    // Click "Delete" in the action menu
    await this.page.getByText(/^delete$/i).click();

    // Students uses a custom Modal with #delete-confirm input
    await this.page.locator('#delete-confirm').fill('delete');
    // Click the delete confirmation button
    await this.modal.getByRole('button', { name: /delete student/i }).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getRowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    // The MoreHorizontal icon is in the last button of the row
    await row.locator('button').last().click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
