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
    // The button text comes from t('classes.registerNewClass')
    this.addButton = page.getByRole('button', { name: /register new class|add class/i });
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
   *
   * The Select component renders native <select> elements.
   * Subject is the 1st select, Tutor the 2nd, Status the 3rd, TutorFeeMode the 4th, Room the 5th.
   */
  private async fillForm(data: {
    name?: string;
    subject?: string;
    tutor?: string;
    capacity?: string;
    fee?: string;
    scheduleDays?: string[];
    startTime?: string;
    endTime?: string;
    tutorFeeMode?: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
    tutorFee?: string;
    perStudentFee?: string;
    status?: string;
    room?: string;
  }) {
    const modal = this.modal;

    if (data.name !== undefined) {
      await modal.locator('#class-name').fill(data.name);
    }

    if (data.subject !== undefined) {
      // Subject is the first native <select> in the modal
      await modal.locator('select').first().selectOption({ label: data.subject });
    }

    if (data.tutor !== undefined) {
      // Tutor is the second native <select> (after subject)
      const tutorSelect = modal.locator('select').nth(1);
      await tutorSelect.waitFor({ state: 'attached' });
      await tutorSelect.selectOption({ label: data.tutor });
    }

    if (data.status !== undefined) {
      // Status is the third native <select> (subject, tutor, status)
      await modal.locator('select').nth(2).selectOption(data.status);
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
      const startInputs = modal.locator('input[type="time"]');
      const count = await startInputs.count();
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

    if (data.tutorFeeMode !== undefined) {
      // TutorFeeMode select comes after subject, tutor, status
      // It's rendered as: subject(0), tutor(1), status(2), tutorFeeMode(3)
      await modal.locator('select').nth(3).selectOption(data.tutorFeeMode);
    }

    if (data.tutorFee !== undefined) {
      // Tutor fee input appears when mode is FIXED_PER_SESSION
      // It's a number input with placeholder "200000" — not #fee
      const tutorFeeInput = modal.locator('input[placeholder="200000"]');
      await tutorFeeInput.fill(data.tutorFee);
    }

    if (data.perStudentFee !== undefined) {
      // Per-student fee input appears when mode is PER_STUDENT_ATTENDANCE
      // It's a number input with placeholder "30000"
      const perStudentInput = modal.locator('input[placeholder="30000"]');
      await perStudentInput.fill(data.perStudentFee);
    }

    if (data.room !== undefined) {
      // Room select is the last select in the modal
      await modal.locator('select').last().selectOption({ label: data.room });
    }
  }

  async createClass(data: {
    name: string;
    subject?: string;
    tutor?: string;
    capacity?: string;
    fee?: string;
    scheduleDays?: string[];
    startTime?: string;
    endTime?: string;
    tutorFeeMode?: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
    tutorFee?: string;
    perStudentFee?: string;
    status?: string;
    room?: string;
  }) {
    await this.addButton.click();
    await this.fillForm(data);

    // Submit — button text from t('classes.modal.createClass')
    const submitButton = this.modal
      .getByRole('button', { name: /add class|create class/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/classes') && resp.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);
  }

  async editClass(
    name: string,
    data: {
      name?: string;
      subject?: string;
      tutor?: string;
      capacity?: string;
      fee?: string;
      scheduleDays?: string[];
      startTime?: string;
      endTime?: string;
      tutorFeeMode?: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
      tutorFee?: string;
      perStudentFee?: string;
      status?: string;
      room?: string;
    },
  ) {
    await this.openRowMenu(name);
    // Click "Edit Class Details" in the action menu — text from t('classes.menu.editClassDetails')
    await this.page.getByText(/edit class details/i).click();

    await this.fillForm(data);
    // Submit — button text from t('classes.modal.updateClass')
    const submitButton = this.modal
      .getByRole('button', { name: /save changes|update class/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/classes') && resp.request().method() === 'PATCH'
      ),
      submitButton.click(),
    ]);
  }

  async deleteClass(name: string) {
    await this.openRowMenu(name);
    // Click "Delete Class" in the action menu — text from t('classes.menu.deleteClass')
    await this.page.getByText(/delete class/i).click();

    // Type "delete" into #delete-confirm input
    await this.page.locator('#delete-confirm').fill('delete');
    // Click the delete confirmation button — text from t('classes.modal.deleteClass')
    const deleteButton = this.modal
      .getByRole('button', { name: /delete class/i });
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/classes') && resp.request().method() === 'DELETE'
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
   * Remove a schedule day row by clicking the Trash2 icon button.
   * Each schedule day row has a trash button at the end.
   */
  async removeScheduleDay(dayAbbr: string) {
    const modal = this.modal;
    // Each schedule day row has a span with the 3-letter abbreviation and a trash button
    const dayRow = modal.locator('.flex.items-center.gap-2').filter({ hasText: dayAbbr });
    await dayRow.locator('button').click();
  }

  /**
   * Gets inline validation error text for a given field.
   * Rendered as <p class="text-red-500 text-sm mt-1"> by FieldError component.
   */
  getValidationError(fieldName: string): Locator {
    const modal = this.modal;
    const fieldIdMap: Record<string, string> = {
      name: '#class-name',
      capacity: '#capacity',
      fee: '#fee',
    };

    const fieldId = fieldIdMap[fieldName];
    if (fieldId) {
      return modal.locator(fieldId).locator('..').locator('p.text-red-500');
    }
    // Fallback: find any red error text in the modal
    return modal.locator('p.text-red-500');
  }

  getToast(): Locator {
    return this.toast;
  }
}
