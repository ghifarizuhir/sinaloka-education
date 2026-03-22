import { type Page, type Locator } from '@playwright/test';

export class StudentsPage {
  /* -- Top-level actions -- */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* -- Table -- */
  readonly table: Locator;
  readonly rows: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  /* -- Filters -- */
  readonly statusFilter: Locator;
  readonly gradeFilter: Locator;

  /* -- Pagination -- */
  readonly pagination: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add student/i });
    // SearchInput component renders an <input> with the placeholder
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toast]');

    // StudentFilters uses native <select> elements for grade and status.
    // Grade filter is the first Select, status is the second.
    // We locate them within the filters bar.
    const filterBar = page.locator('.flex.flex-col.sm\\:flex-row.items-center.gap-4');
    this.gradeFilter = filterBar.locator('select').first();
    this.statusFilter = filterBar.locator('select').nth(1);

    // Pagination container is at the bottom of the table card
    this.pagination = page.locator('.border-t').filter({
      has: page.getByRole('button', { name: /prev|next/i }),
    });
  }

  async goto() {
    await this.page.goto('/students');
  }

  /* -- Modal helpers -- */

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

    // Grade uses the custom Select component (native <select>)
    const gradeValue = `Kelas ${data.grade}`;
    await modal.locator('select').first().selectOption(gradeValue);

    await modal.locator('#new-parent-name').fill(data.parentName);
    await modal.locator('#new-parent-phone').fill(data.parentPhone);
    if (data.parentEmail) await modal.locator('#new-parent-email').fill(data.parentEmail);

    // Submit (create) - button text comes from t('students.modal.createStudent')
    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/students') && resp.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);
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
    if (data.grade) {
      const gradeValue = `Kelas ${data.grade}`;
      await modal.locator('select').first().selectOption(gradeValue);
    }
    if (data.parentName) await modal.locator('#new-parent-name').fill(data.parentName);
    if (data.parentPhone) await modal.locator('#new-parent-phone').fill(data.parentPhone);
    if (data.parentEmail) await modal.locator('#new-parent-email').fill(data.parentEmail);

    // Submit (save changes) - button text comes from t('students.modal.updateStudent')
    const submitButton = modal.getByRole('button', { name: /save changes|update student/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/students') && resp.request().method() === 'PATCH'
      ),
      submitButton.click(),
    ]);
  }

  async deleteStudent(name: string) {
    await this.openRowMenu(name);
    // Click "Delete" in the action menu
    await this.page.getByText(/^delete$/i).click();

    // Students uses a custom Modal with #delete-confirm input
    await this.page.locator('#delete-confirm').fill('delete');
    // Click the delete confirmation button
    const deleteButton = this.modal.getByRole('button', { name: /delete student/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/students') && resp.request().method() === 'DELETE'
      ),
      deleteButton.click(),
    ]);
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

  /**
   * Filter students by status using the native <select> dropdown.
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
  }

  /**
   * Filter students by grade using the native <select> dropdown.
   */
  async filterByGrade(grade: string) {
    await this.gradeFilter.selectOption(grade);
  }

  /**
   * Gets inline validation error text for a given field.
   * Validation errors are rendered as <p class="text-red-500 text-sm mt-1"> near form fields.
   */
  getValidationError(fieldName: string): Locator {
    const modal = this.modal;
    // Map field names to their input IDs to find the nearest error
    const fieldIdMap: Record<string, string> = {
      name: '#new-name',
      email: '#new-email',
      grade: '', // grade doesn't have an ID, uses select
      parent_name: '#new-parent-name',
      parent_phone: '#new-parent-phone',
      parent_email: '#new-parent-email',
    };

    const fieldId = fieldIdMap[fieldName];
    if (fieldId) {
      // Find the parent space-y-1.5 container that holds both input and error
      return modal.locator(fieldId).locator('..').locator('p.text-red-500');
    }
    // Fallback: find any red error text
    return modal.locator('p.text-red-500');
  }

  /**
   * Returns the delete confirmation button in the delete modal.
   * Useful for checking the disabled state (disabled when confirmText !== 'delete').
   */
  getDeleteConfirmButton(): Locator {
    return this.modal.getByRole('button', { name: /delete student/i });
  }

  getToast(): Locator {
    return this.toast;
  }
}
