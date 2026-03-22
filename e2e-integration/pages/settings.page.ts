import { type Page, type Locator } from '@playwright/test';
import { confirmChangesModal } from '../helpers/confirm-changes-modal.js';
import { confirmDialog } from '../helpers/confirm-dialog.js';

export class SettingsPage {
  /* ── Tab buttons ── */
  readonly generalTab: Locator;
  readonly billingTab: Locator;
  readonly academicTab: Locator;
  readonly registrationTab: Locator;
  readonly plansTab: Locator;
  readonly securityTab: Locator;

  /* ── General form ── */
  readonly institutionNameInput: Locator;
  readonly supportEmailInput: Locator;
  readonly phoneInput: Locator;
  readonly addressInput: Locator;
  readonly timezoneSelect: Locator;
  readonly languageSelect: Locator;
  readonly saveChangesButton: Locator;

  /* ── Billing tab ── */
  readonly expenseCategoryList: Locator;
  readonly addCategoryInput: Locator;
  readonly addCategoryButton: Locator;
  readonly bankAccountCards: Locator;

  /* ── Academic tab ── */
  readonly roomsTable: Locator;
  readonly addRoomButton: Locator;
  readonly workingDayToggles: Locator;
  readonly gradeLevelList: Locator;
  readonly addGradeButton: Locator;

  /* ── Registration tab ── */
  readonly studentRegistrationToggle: Locator;
  readonly tutorRegistrationToggle: Locator;
  readonly registrationLinkCopyButton: Locator;

  /* ── Security tab ── */
  readonly passwordIndicators: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.generalTab = page.getByRole('button', { name: /general/i });
    this.billingTab = page.getByRole('button', { name: /billing/i });
    this.academicTab = page.getByRole('button', { name: /academic/i });
    this.registrationTab = page.getByRole('button', { name: /registration/i });
    this.plansTab = page.getByRole('button', { name: /plans/i });
    this.securityTab = page.getByRole('button', { name: /security/i });

    // General form — GeneralTab uses Label + Input pairs
    // Labels are rendered via <Label> component (likely <label>)
    this.institutionNameInput = page.locator('label').filter({ hasText: /institution name/i }).locator('..').locator('input').first();
    this.supportEmailInput = page.locator('label').filter({ hasText: /support email/i }).locator('..').locator('input').first();
    this.phoneInput = page.locator('label').filter({ hasText: /phone/i }).locator('..').locator('input').first();
    this.addressInput = page.locator('label').filter({ hasText: /address/i }).locator('..').locator('input').first();
    // Timezone and language are native <select> elements in GeneralTab
    this.timezoneSelect = page.locator('label').filter({ hasText: /timezone/i }).locator('..').locator('select').first();
    this.languageSelect = page.locator('label').filter({ hasText: /language/i }).locator('..').locator('select').first();
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });

    // Billing tab
    // Categories are rendered as Badge chips with X buttons
    this.expenseCategoryList = page.locator('.flex.flex-wrap.gap-2').first();
    this.addCategoryInput = page.getByPlaceholder(/add.*category|category/i);
    this.addCategoryButton = page.getByRole('button', { name: /add category/i });
    // Bank account cards are rendered as bordered divs
    this.bankAccountCards = page.locator('.rounded-xl.border').filter({ has: page.locator('button') });

    // Academic tab
    this.roomsTable = page.locator('table');
    this.addRoomButton = page.getByRole('button', { name: /add room/i });
    // Working day toggles are a group of buttons with aria-pressed
    this.workingDayToggles = page.locator('[role="group"][aria-label="Working days"]');
    // Grade levels are rendered as Badge chips
    this.gradeLevelList = page.locator('label').filter({ hasText: /grade level/i }).locator('..').locator('..').locator('.flex.flex-wrap.gap-2');
    this.addGradeButton = page.locator('button[aria-label]').filter({ hasText: '' }).locator('..').filter({ has: page.locator('label').filter({ hasText: /grade level/i }) }).locator('button').last();

    // Registration tab — uses native checkboxes with sr-only class
    this.studentRegistrationToggle = page.getByText(/student.*enabled|student.*registration/i).locator('..').locator('..').locator('input[type="checkbox"]');
    this.tutorRegistrationToggle = page.getByText(/tutor.*enabled|tutor.*registration/i).locator('..').locator('..').locator('input[type="checkbox"]');
    this.registrationLinkCopyButton = page.getByRole('button', { name: /salin|copy/i });

    // Security tab — validation indicators
    this.passwordIndicators = page.locator('.rounded-lg.bg-zinc-50, .dark\\:bg-zinc-800\\/50');

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/settings');
  }

  /* ── Tab navigation ── */

  async switchTab(tabName: 'General' | 'Billing' | 'Academic' | 'Registration' | 'Plans' | 'Security' | string) {
    await this.page.getByRole('button', { name: new RegExp(tabName, 'i') }).click();
  }

  /* ── General tab ── */

  async updateGeneral(data: { name?: string; email?: string; phone?: string; address?: string }) {
    if (data.name) {
      await this.institutionNameInput.clear();
      await this.institutionNameInput.fill(data.name);
    }
    if (data.email) {
      await this.supportEmailInput.clear();
      await this.supportEmailInput.fill(data.email);
    }
    if (data.phone) {
      await this.phoneInput.clear();
      await this.phoneInput.fill(data.phone);
    }
    if (data.address) {
      await this.addressInput.clear();
      await this.addressInput.fill(data.address);
    }
    await this.saveChangesButton.click();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') && resp.request().method() === 'PATCH',
      ),
      confirmChangesModal(this.page),
    ]);
  }

  /* ── Security tab ── */

  async changePassword(data: { current: string; newPassword: string; confirm: string }) {
    await this.switchTab('Security');

    const currentInput = this.page.locator('label').filter({ hasText: /current password/i }).locator('..').locator('input').first();
    const newInput = this.page.locator('label').filter({ hasText: /^new password$/i }).locator('..').locator('input').first();
    const confirmInput = this.page.locator('label').filter({ hasText: /confirm.*password/i }).locator('..').locator('input').first();

    await currentInput.fill(data.current);
    await newInput.fill(data.newPassword);
    await confirmInput.fill(data.confirm);

    // Click "Update Password" submit button
    const updateButton = this.page.locator('button[type="submit"]');
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/auth/change-password') &&
          resp.request().method() === 'POST',
      ),
      updateButton.click(),
    ]);
  }

  /* ── Billing tab ── */

  async addExpenseCategory(name: string) {
    await this.switchTab('Billing');
    await this.addCategoryInput.fill(name);
    await this.addCategoryButton.click();
  }

  async removeExpenseCategory(name: string) {
    await this.switchTab('Billing');
    // Category badges have the name text and an X button
    const badge = this.page.locator('span').filter({ hasText: name }).first();
    await badge.locator('svg.lucide-x, button').last().click();
  }

  async addBankAccount(data: { bankName: string; accountNumber: string; accountHolder: string }) {
    await this.switchTab('Billing');

    // Click "Add Account" to show the form
    await this.page.getByRole('button', { name: /add account/i }).click();

    // Fill the 3-column bank form
    const bankForm = this.page.locator('.grid.grid-cols-3');
    const inputs = bankForm.locator('input');
    await inputs.nth(0).fill(data.bankName);
    await inputs.nth(1).fill(data.accountNumber);
    await inputs.nth(2).fill(data.accountHolder);

    // Click "Add Bank Account"
    await this.page.getByRole('button', { name: /add bank account/i }).click();
  }

  async updateBilling(data?: {
    categories?: string[];
    bankAccounts?: { bankName: string; accountNumber: string; accountHolder: string }[];
  }) {
    await this.switchTab('Billing');

    if (data?.categories) {
      for (const cat of data.categories) {
        await this.addExpenseCategory(cat);
      }
    }

    if (data?.bankAccounts) {
      for (const acc of data.bankAccounts) {
        await this.addBankAccount(acc);
      }
    }

    // Click save changes
    const saveBillingButton = this.page.getByRole('button', { name: /save changes/i });
    await saveBillingButton.click();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') &&
          resp.url().includes('billing') &&
          resp.request().method() === 'PATCH',
      ),
      confirmChangesModal(this.page),
    ]);
  }

  /* ── Academic tab ── */

  async addRoom(data: {
    name: string;
    type?: 'Classroom' | 'Laboratory' | 'Studio' | 'Online';
    capacity?: string;
    status?: 'Available' | 'Maintenance' | 'Unavailable';
  }) {
    await this.switchTab('Academic');
    await this.addRoomButton.click();

    const modal = this.page.getByRole('dialog');
    await modal.locator('#roomName').fill(data.name);

    if (data.type) {
      await modal.locator('select').first().selectOption(data.type);
    }
    if (data.capacity) {
      await modal.locator('#roomCapacity').fill(data.capacity);
    }
    if (data.status) {
      await modal.locator('select').last().selectOption(data.status);
    }

    const saveButton = modal.getByRole('button', { name: /save room|add room/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') &&
          resp.url().includes('academic') &&
          resp.request().method() === 'PATCH',
      ),
      saveButton.click(),
    ]);
  }

  async editRoom(
    name: string,
    data: {
      name?: string;
      type?: 'Classroom' | 'Laboratory' | 'Studio' | 'Online';
      capacity?: string;
      status?: 'Available' | 'Maintenance' | 'Unavailable';
    },
  ) {
    await this.switchTab('Academic');
    // Find the row with the room name and click its edit button (Pencil icon)
    const row = this.page.locator('tr').filter({ hasText: name });
    await row.locator('button[aria-label*="Edit"]').click();

    const modal = this.page.getByRole('dialog');

    if (data.name) {
      await modal.locator('#roomName').clear();
      await modal.locator('#roomName').fill(data.name);
    }
    if (data.type) {
      await modal.locator('select').first().selectOption(data.type);
    }
    if (data.capacity) {
      await modal.locator('#roomCapacity').clear();
      await modal.locator('#roomCapacity').fill(data.capacity);
    }
    if (data.status) {
      await modal.locator('select').last().selectOption(data.status);
    }

    const updateButton = modal.getByRole('button', { name: /update room|save/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') &&
          resp.url().includes('academic') &&
          resp.request().method() === 'PATCH',
      ),
      updateButton.click(),
    ]);
  }

  async deleteRoom(name: string) {
    await this.switchTab('Academic');
    const row = this.page.locator('tr').filter({ hasText: name });
    await row.locator('button[aria-label*="Delete"]').click();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/settings') &&
          resp.url().includes('academic') &&
          resp.request().method() === 'PATCH',
      ),
      confirmDialog(this.page),
    ]);
  }

  async toggleWorkingDay(day: string) {
    await this.switchTab('Academic');
    const dayButton = this.workingDayToggles.getByRole('button', { name: day, exact: true });
    await dayButton.click();
  }

  async addGradeLevel(grade: string) {
    await this.switchTab('Academic');
    // Click the + button next to Grade Levels label
    const gradeLevelsSection = this.page.locator('label').filter({ hasText: /grade level/i }).locator('..');
    await gradeLevelsSection.locator('button').click();

    // Fill the inline input that appears
    const gradeInput = this.page.locator('input[placeholder="Grade level"]');
    await gradeInput.fill(grade);
    await gradeInput.press('Enter');
  }

  async removeGradeLevel(grade: string) {
    await this.switchTab('Academic');
    // Find the grade badge and click its X button
    const badge = this.page.locator('span').filter({ hasText: grade });
    await badge.locator('button[aria-label*="Remove"]').click();
  }

  /* ── Registration tab ── */

  async toggleRegistration(type: 'student' | 'tutor') {
    await this.switchTab('Registration');

    const toggle = type === 'student' ? this.studentRegistrationToggle : this.tutorRegistrationToggle;
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/registrations/settings') &&
          resp.request().method() === 'PATCH',
      ),
      toggle.click(),
    ]);
  }

  getToast(): Locator {
    return this.toast;
  }
}
