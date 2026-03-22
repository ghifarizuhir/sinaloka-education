import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog';

export class TutorsPage {
  /* ── Top-level actions ── */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add tutor/i });
    this.searchInput = page.getByPlaceholder(/search tutors/i);
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/tutors');
  }

  /* ── Modal helpers ── */

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
    await modal.getByRole('button', { name: /send invitation/i }).click();
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
    await modal.getByRole('button', { name: /save changes/i }).click();
  }

  async deleteTutor(name: string) {
    await this.openCardMenu(name);
    // Click "Delete Tutor" in the dropdown menu
    await this.page.getByText(/delete tutor/i).click();

    // Tutors uses ConfirmDialog (role="alertdialog")
    await confirmDialog(this.page);
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

  getToast(): Locator {
    return this.toast;
  }
}
