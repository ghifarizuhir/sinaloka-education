import { type Page, expect } from '@playwright/test';

/**
 * Interact with the ConfirmChangesModal in Settings pages.
 * Distinguished from ConfirmDialog by aria-labelledby="confirm-changes-title".
 */
export async function confirmChangesModal(page: Page) {
  const modal = page.locator('[aria-labelledby="confirm-changes-title"]');
  await expect(modal).toBeVisible();

  const confirmBtn = modal.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
  await confirmBtn.click();
  await expect(modal).toBeHidden();
}
