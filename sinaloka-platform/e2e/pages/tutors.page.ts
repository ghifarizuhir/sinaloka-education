import { type Locator, type Page } from '@playwright/test';

export interface TutorFormData {
  name: string;
  email: string;
  password?: string;
  subjects: string[]; // subject names to select, e.g. ["Math", "Physics"]
  experience_years?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
}

export class TutorsPage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly modal: Locator;
  readonly subjectFilter: Locator;
  readonly sortSelect: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add tutor/i });
    this.searchInput = page.getByPlaceholder(/search tutors/i);
    this.modal = page.locator('[role="dialog"]');
    this.subjectFilter = page.locator('select').first();
    this.sortSelect = page.locator('select').nth(1);
  }

  async goto() { await this.page.goto('/tutors'); }

  async createTutor(data: TutorFormData) {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modal.getByLabel(/full name/i).fill(data.name);
    await this.modal.getByLabel(/email address/i).fill(data.email);
    if (data.password) await this.modal.getByLabel(/password/i).fill(data.password);
    // Select subjects via MultiSelect
    for (const subject of data.subjects) {
      const input = this.modal.locator('input[placeholder*="Search"], input[placeholder*="Cari"]');
      await input.fill(subject);
      await this.modal.locator('button').filter({ hasText: subject }).click();
    }
    if (data.bank_name) await this.modal.getByLabel(/bank name/i).fill(data.bank_name);
    if (data.bank_account_number) await this.modal.getByLabel(/account number/i).fill(data.bank_account_number);
    if (data.bank_account_holder) await this.modal.getByLabel(/account holder/i).fill(data.bank_account_holder);
    await this.modal.getByRole('button', { name: /send invitation/i }).click();
  }

  async editTutor(name: string, data: Partial<TutorFormData>) {
    await this.openCardMenu(name);
    await this.page.getByText(/edit profile/i).click();
    await this.modal.waitFor({ state: 'visible' });
    if (data.name) await this.modal.getByLabel(/full name/i).fill(data.name);
    if (data.email) await this.modal.getByLabel(/email address/i).fill(data.email);
    if (data.subjects) {
      for (const subject of data.subjects) {
        const input = this.modal.locator('input[placeholder*="Search"], input[placeholder*="Cari"]');
        await input.fill(subject);
        await this.modal.locator('button').filter({ hasText: subject }).click();
      }
    }
    await this.modal.getByRole('button', { name: /save changes/i }).click();
  }

  async deleteTutor(name: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.openCardMenu(name);
    await this.page.getByText(/delete tutor/i).click();
  }

  async search(query: string) { await this.searchInput.fill(query); }

  private async openCardMenu(name: string) {
    // In grid view, hover the card to reveal the MoreHorizontal menu button
    const card = this.page.locator('[class*="Card"], .group').filter({ hasText: name }).first();
    await card.hover();
    await card.locator('button').filter({ hasText: '' }).last().click();
  }

  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
