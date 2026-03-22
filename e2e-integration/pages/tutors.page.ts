import { type Page, type Locator, expect } from '@playwright/test';

export class TutorsPage {
  /* -- Top-level actions -- */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  /* -- View toggles -- */
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;

  /* -- Filters -- */
  readonly subjectFilter: Locator;

  /* -- Select all checkbox -- */
  readonly selectAllCheckbox: Locator;

  /* -- Bulk action bar -- */
  readonly bulkActionBar: Locator;

  /* -- Pagination -- */
  readonly pagination: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add tutor/i });
    // SearchInput component renders an <input> with placeholder
    this.searchInput = page.getByPlaceholder(/search tutors/i);
    this.toast = page.locator('[data-sonner-toast]');

    // View toggle buttons are inside a flex container with bg-zinc-100 p-1 rounded-lg
    // Grid button has the Grid icon, List button has the List icon
    const viewToggleContainer = page.locator('.flex.bg-zinc-100, .dark\\:bg-zinc-800').filter({
      has: page.locator('svg'),
    });
    this.gridViewButton = viewToggleContainer.locator('button').first();
    this.listViewButton = viewToggleContainer.locator('button').last();

    // Subject filter is a native <select> in the filter bar
    // The filter bar has: selectAll checkbox, subject Select, sort Select, view toggles
    // Subject filter is the first <select> in the filter row
    this.subjectFilter = page.locator('.flex.items-center.gap-2').locator('select').first();

    // Select all checkbox is a labeled checkbox with "Select all" text
    this.selectAllCheckbox = page.locator('label').filter({ hasText: /select all/i }).locator('input[type="checkbox"]');

    // Bulk action bar is the fixed floating bottom bar
    this.bulkActionBar = page.locator('.fixed.bottom-8');

    // Pagination controls
    this.pagination = page.locator('.flex.items-center.justify-between.mt-6');
  }

  async goto() {
    await this.page.goto('/tutors');
  }

  /* -- Modal helpers -- */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  async inviteTutor(data: {
    name: string;
    email: string;
    subjects?: string[];
  }) {
    await this.addButton.click();
    const modal = this.modal;

    await modal.locator('#name').fill(data.name);
    await modal.locator('#email').fill(data.email);

    // Select subjects via MultiSelect
    if (data.subjects?.length) {
      for (const subject of data.subjects) {
        await modal.getByPlaceholder(/search/i).fill(subject);
        await this.page.getByText(subject, { exact: true }).click();
      }
    }

    // Submit (send invitation)
    const submitButton = modal.getByRole('button', { name: /send invitation/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/tutors') && resp.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);
  }

  async editTutor(
    name: string,
    data: {
      name?: string;
      email?: string;
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      monthlySalary?: string;
    },
  ) {
    await this.openCardMenu(name);
    // Click "Edit Profile" in the dropdown menu
    await this.page.getByText(/edit profile/i).click();

    const modal = this.modal;

    if (data.name) await modal.locator('#name').fill(data.name);
    if (data.email) await modal.locator('#email').fill(data.email);
    if (data.bankName) await modal.locator('#bank_name').fill(data.bankName);
    if (data.accountNumber) await modal.locator('#bank_account_number').fill(data.accountNumber);
    if (data.accountHolder) await modal.locator('#bank_account_holder').fill(data.accountHolder);
    if (data.monthlySalary) await modal.locator('#monthly_salary').fill(data.monthlySalary);

    // Submit (save changes)
    const submitButton = modal.getByRole('button', { name: /save changes/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/tutors') && resp.request().method() === 'PATCH'
      ),
      submitButton.click(),
    ]);
  }

  async deleteTutor(name: string) {
    await this.openCardMenu(name);
    // Click "Delete Tutor" in the dropdown menu
    await this.page.getByText(/delete tutor/i).click();

    // Tutors uses ConfirmDialog (role="alertdialog")
    const dialog = this.page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    const confirmBtn = dialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
    const responsePromise = this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/tutors') && resp.request().method() === 'DELETE'
    );
    await confirmBtn.click();
    await responsePromise;
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getCardByName(name: string): Locator {
    // In grid view, each tutor is in a Card component containing their name
    return this.page.locator('[class*="group"]').filter({ hasText: name });
  }

  async openCardMenu(name: string) {
    const card = this.getCardByName(name);
    // The DropdownMenu trigger is the MoreHorizontal button inside the card
    await card.locator('button').first().click();
  }

  /**
   * Resend invite for a pending tutor via the card dropdown menu.
   */
  async resendInvite(name: string) {
    await this.openCardMenu(name);
    await this.page.getByText(/resend invite/i).click();
  }

  /**
   * Cancel invite for a pending tutor via the card dropdown menu.
   * Confirms the ConfirmDialog that appears.
   */
  async cancelInvite(name: string) {
    await this.openCardMenu(name);
    await this.page.getByText(/cancel invite/i).click();

    // ConfirmDialog appears (role="alertdialog")
    const dialog = this.page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    const confirmBtn = dialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
    const responsePromise = this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/tutors') && resp.request().method() === 'DELETE'
    );
    await confirmBtn.click();
    await responsePromise;
  }

  /**
   * Toggle between grid and list view.
   */
  async toggleView(mode: 'grid' | 'list') {
    if (mode === 'grid') {
      await this.gridViewButton.click();
    } else {
      await this.listViewButton.click();
    }
  }

  /**
   * Filter tutors by subject using the native <select> dropdown.
   * Pass the subject ID as value, or empty string to clear.
   */
  async filterBySubject(subject: string) {
    await this.subjectFilter.selectOption(subject);
  }

  /**
   * Select a single tutor by clicking their checkbox.
   * Works in both grid view (checkbox at top-left of card) and list view (checkbox in row).
   */
  async selectTutor(name: string) {
    const card = this.getCardByName(name);
    await card.locator('input[type="checkbox"]').check();
  }

  /**
   * Click the select all checkbox in the filter bar.
   */
  async selectAll() {
    await this.selectAllCheckbox.check();
  }

  /**
   * Click the Verify/Unverify button in the floating bulk action bar.
   */
  async bulkVerify() {
    const responsePromise = this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/tutors') && resp.request().method() === 'PATCH'
    );
    await this.bulkActionBar.getByRole('button', { name: /verify|unverify/i }).click();
    await responsePromise;
  }

  /**
   * Click the Delete button in the floating bulk action bar and confirm the dialog.
   */
  async bulkDelete() {
    await this.bulkActionBar.getByRole('button', { name: /delete/i }).click();

    // Bulk delete uses a custom modal (not ConfirmDialog), with a "Delete" confirm button
    const confirmBtn = this.page.locator('.fixed.inset-0').locator('button').filter({ hasText: /^delete$/i });
    const responsePromise = this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/tutors') && resp.request().method() === 'DELETE'
    );
    await confirmBtn.click();
    await responsePromise;
  }

  /**
   * Returns the status badge locator within a tutor card.
   * The badge shows "Verified", "Unverified", or "Pending Invite".
   */
  getStatusBadge(name: string): Locator {
    const card = this.getCardByName(name);
    return card.locator('[class*="badge"], [class*="Badge"]').first();
  }

  getToast(): Locator {
    return this.toast;
  }
}
