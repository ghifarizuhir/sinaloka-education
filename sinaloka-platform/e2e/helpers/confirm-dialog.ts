import { type Page, expect } from '@playwright/test';

/**
 * Interact with the custom ConfirmDialog component (role="alertdialog").
 * Used by: Tutors, Enrollments, Payments, Payouts, Expenses, Settings (room/subject delete).
 * NOT used by: Students delete or Classes delete (they use Modal + #delete-confirm input).
 */
export async function confirmDialog(page: Page, options?: { typedText?: string }) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();

  if (options?.typedText) {
    await dialog.getByRole('textbox').fill(options.typedText);
  }

  const confirmBtn = dialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
  await confirmBtn.click();
  await expect(dialog).toBeHidden();
}
