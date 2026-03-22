import { type Page, type Locator } from '@playwright/test';

export class ClassesPage {
  /* -- Top-level actions -- */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* -- Table -- */
  readonly table: Locator;
  readonly rows: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add class/i });
    this.searchInput = page.getByPlaceholder(/search class or tutor/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/classes');
  }

  /* -- Modal helpers -- */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Fill the class form fields that are present in `data`.
   * Assumes the modal is already open.
   */
  private async fillForm(data: {
    name?: string;
    subject?: string;
    tutor?: string;
    capacity?: string;
    fee?: string;
    tutorFee?: string;
    scheduleDays?: string[];
    startTime?: string;
    endTime?: string;
  }) {
    const modal = this.modal;

    if (data.name !== undefined) {
      await modal.locator('#class-name').fill(data.name);
    }

    if (data.subject !== undefined) {
      // Native <select> — use selectOption
      await modal.locator('select').first().selectOption({ label: data.subject });
    }

    if (data.tutor !== undefined) {
      // Tutor is the second native <select> (subject is first, tutor is second in DOM order)
      // Wait for select to be enabled (tutor select is disabled until subject is chosen)
      const tutorSelect = modal.locator('select').nth(1);
      await tutorSelect.waitFor({ state: 'attached' });
      await tutorSelect.selectOption({ label: data.tutor });
    }

    if (data.scheduleDays) {
      for (const day of data.scheduleDays) {
        // Day buttons show 3-letter abbreviations (Mon, Tue, Wed, etc.)
        const abbr = day.slice(0, 3);
        const dayButton = modal.getByRole('button', { name: abbr, exact: true });
        // Only click if not already selected — check by class attribute
        const isSelected = await dayButton.evaluate(
          (el) => el.classList.contains('bg-zinc-900') || el.classList.contains('dark:bg-zinc-100'),
        );
        if (!isSelected) {
          await dayButton.click();
        }
      }
    }

    if (data.startTime !== undefined) {
      // Time inputs are native <input type="time"> elements
      const startInputs = modal.locator('input[type="time"]');
      const count = await startInputs.count();
      // Each schedule day has a pair: start_time then end_time
      for (let i = 0; i < count; i += 2) {
        await startInputs.nth(i).fill(data.startTime);
      }
    }

    if (data.endTime !== undefined) {
      const timeInputs = modal.locator('input[type="time"]');
      const count = await timeInputs.count();
      for (let i = 1; i < count; i += 2) {
        await timeInputs.nth(i).fill(data.endTime);
      }
    }

    if (data.capacity !== undefined) {
      await modal.locator('#capacity').fill(data.capacity);
    }

    if (data.fee !== undefined) {
      await modal.locator('#fee').fill(data.fee);
    }

    if (data.tutorFee !== undefined) {
      // Tutor fee input has placeholder "200000" and no id
      await modal.locator('input[type="number"][placeholder="200000"]').fill(data.tutorFee);
    }
  }

  async createClass(data: {
    name: string;
    subject?: string;
    tutor?: string;
    capacity?: string;
    fee?: string;
    tutorFee?: string;
    scheduleDays?: string[];
    startTime?: string;
    endTime?: string;
  }) {
    await this.addButton.click();
    await this.fillForm(data);
    // Submit button text: "Add Class" (classes.modal.createClass)
    const submitBtn = this.modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
  }

  async editClass(
    name: string,
    data: {
      name?: string;
      subject?: string;
      tutor?: string;
      capacity?: string;
      fee?: string;
      tutorFee?: string;
      scheduleDays?: string[];
      startTime?: string;
      endTime?: string;
    },
  ) {
    await this.openRowMenu(name);
    // Click "Edit Class Details" in the action menu
    await this.page.getByText(/edit class details/i).click();

    await this.fillForm(data);
    // Submit button text: "Save Changes" (classes.modal.updateClass)
    const saveBtn = this.modal.getByRole('button', { name: /save changes/i });
    // Modal content may overflow viewport — use JS click
    await saveBtn.evaluate((el: HTMLElement) => el.click());
  }

  async deleteClass(name: string) {
    await this.openRowMenu(name);
    // Click "Delete Class" in the action menu
    await this.page.getByText(/delete class/i).click();

    // Type "delete" into #delete-confirm input
    await this.page.locator('#delete-confirm').fill('delete');
    // Click the delete confirmation button
    await this.modal
      .getByRole('button', { name: /delete class/i })
      .click();
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
