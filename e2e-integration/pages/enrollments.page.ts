import { type Page, type Locator } from '@playwright/test';

export class EnrollmentsPage {
  /* -- Top-level actions -- */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* -- Table -- */
  readonly table: Locator;
  readonly rows: Locator;

  /* -- Filters -- */
  /** Status filter — the Select component in EnrollmentTable filters */
  readonly statusFilter: Locator;

  /* -- Bulk selection -- */
  /** Header checkbox for select-all (Checkbox component renders a <button>) */
  readonly selectAllCheckbox: Locator;

  /** Floating bulk action bar at the bottom */
  readonly bulkActionBar: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  constructor(private page: Page) {
    // Button text from t('enrollments.newEnrollment')
    this.addButton = page.getByRole('button', { name: /new enrollment|add enrollment/i });
    // SearchInput component renders an <input> with the placeholder
    this.searchInput = page.getByPlaceholder(/search/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toast]');

    // Status filter — the Select (native <select>) in the filter bar
    // It's inside a flex container with the search input
    const filterBar = page.locator('.flex.flex-col.sm\\:flex-row.items-center.gap-4');
    this.statusFilter = filterBar.locator('select').first();

    // Select-all checkbox in table header — the Checkbox component renders a <button>
    // It's the first button inside the <th> that contains the header checkbox
    this.selectAllCheckbox = page.locator('thead th').first().locator('button').first();

    // Bulk action bar — floating bar that appears when items are selected
    this.bulkActionBar = page.locator('.fixed.bottom-8');
  }

  async goto() {
    await this.page.goto('/enrollments');
  }

  /* -- Modal helpers -- */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Open the "New Enrollment" modal, select student(s) and class, then enroll.
   * The new-enrollment modal uses a click-to-select list (not form inputs).
   */
  async enrollStudent(
    studentName: string,
    className: string,
    enrollmentType?: 'ACTIVE' | 'TRIAL',
  ) {
    await this.addButton.click();
    const modal = this.modal;

    // Search and select student
    await modal.getByPlaceholder(/search students/i).fill(studentName);
    await modal.getByText(studentName, { exact: true }).click();

    // Select class by clicking on the class card
    await modal.getByText(className, { exact: true }).click();

    // Select enrollment type if specified (ACTIVE/TRIAL toggle buttons)
    if (enrollmentType === 'TRIAL') {
      // The TRIAL button is inside a flex toggle
      await modal.getByRole('button', { name: /trial/i }).click();
    }

    // Click the enroll button (text: "Enroll N Students")
    const enrollButton = modal.getByRole('button', { name: /enroll/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'POST'
      ),
      enrollButton.click(),
    ]);
  }

  /**
   * Enroll multiple students into a class.
   */
  async enrollMultipleStudents(
    studentNames: string[],
    className: string,
    enrollmentType?: 'ACTIVE' | 'TRIAL',
  ) {
    await this.addButton.click();
    const modal = this.modal;

    // Select each student
    for (const name of studentNames) {
      await modal.getByPlaceholder(/search students/i).fill(name);
      await modal.getByText(name, { exact: true }).click();
      // Clear search for next student
      await modal.getByPlaceholder(/search students/i).fill('');
    }

    // Select class
    await modal.getByText(className, { exact: true }).click();

    // Select enrollment type if specified
    if (enrollmentType === 'TRIAL') {
      await modal.getByRole('button', { name: /trial/i }).click();
    }

    // Click the enroll button
    const enrollButton = modal.getByRole('button', { name: /enroll/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'POST'
      ),
      enrollButton.click(),
    ]);
  }

  /**
   * Open the edit modal for an enrollment row, change status, and save.
   * Uses the DropdownMenu (not native action menu like classes).
   */
  async changeStatus(studentName: string, newStatus: string) {
    await this.openRowMenu(studentName);
    // Click "Edit Enrollment" — text from t('enrollments.menu.editEnrollment')
    await this.page.getByText(/edit enrollment/i).click();

    const modal = this.modal;
    // Status select — the Select component renders a native <select>
    await modal.locator('select').selectOption(newStatus);
    // Submit — text from t('common.saveChanges')
    const submitButton = modal.getByRole('button', { name: /save changes/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'PATCH'
      ),
      submitButton.click(),
    ]);
  }

  /**
   * Quick status change via row dropdown menu shortcuts (Set Active, Drop, etc.).
   */
  async quickStatusChange(studentName: string, status: string) {
    await this.openRowMenu(studentName);

    // Map status to menu item text
    const menuItemMap: Record<string, RegExp> = {
      ACTIVE: /set active/i,
      DROPPED: /drop/i,
    };

    const menuText = menuItemMap[status];
    if (menuText) {
      await Promise.all([
        this.page.waitForResponse(resp =>
          resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'PATCH'
        ),
        this.page.getByText(menuText).click(),
      ]);
    }
  }

  /**
   * Delete an enrollment via the row dropdown menu.
   * Uses ConfirmDialog (role="alertdialog").
   */
  async deleteEnrollment(studentName: string) {
    await this.openRowMenu(studentName);
    // Click "Delete Record" — text from t('enrollments.menu.deleteRecord')
    await this.page.getByText(/delete record/i).click();

    // ConfirmDialog uses role="alertdialog" — click the confirm button
    const confirmDialog = this.page.locator('[role="alertdialog"]');
    const confirmButton = confirmDialog.getByRole('button', { name: /delete/i });
    const responsePromise = this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'DELETE'
    );
    await confirmButton.click();
    await responsePromise;
  }

  /**
   * Bulk change status using the bulk action bar.
   * The bar contains a native <select> for status change.
   */
  async bulkChangeStatus(status: string) {
    const bar = this.bulkActionBar;
    await bar.locator('select').selectOption(status);
  }

  /**
   * Bulk delete using the bulk action bar.
   */
  async bulkDelete() {
    const bar = this.bulkActionBar;
    // Click the delete button in the bulk action bar
    await bar.getByRole('button', { name: /delete/i }).click();

    // BulkDeleteModal or ConfirmDialog appears — confirm the deletion
    const confirmButton = this.page.getByRole('button', { name: /confirm|delete/i }).last();
    const responsePromise = this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'DELETE'
    );
    await confirmButton.click();
    await responsePromise;
  }

  /**
   * Select an enrollment row by clicking its checkbox.
   * The Checkbox component renders a <button> in each row's first <td>.
   */
  async selectEnrollment(name: string) {
    const row = this.getRowByName(name);
    await row.locator('td').first().locator('button').first().click();
  }

  /**
   * Click the select-all checkbox in the table header.
   */
  async selectAll() {
    await this.selectAllCheckbox.click();
  }

  /**
   * Filter enrollments by status using the status filter dropdown.
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getRowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    // The DropdownMenu trigger (MoreHorizontal icon) is the last button in each row
    await row.locator('button').last().click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
