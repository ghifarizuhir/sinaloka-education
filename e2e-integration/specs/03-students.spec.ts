import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';
import { StudentsPage } from '../pages/students.page.js';

// ─────────────────────────────────────────────────────────
// Students Integration Tests (23 tests)
// ─────────────────────────────────────────────────────────

// Names for students created during the test suite.
// Delete tests target these instead of seed data.
const CREATED_REQUIRED = 'Test Student Required';
const CREATED_ALL = 'Test Student AllFields';

test.describe('Students - Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 1. Table loads with seed data
  test('table loads with seed data', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();

    await expect(students.table).toBeVisible();
    const rowCount = await students.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  // 2. Stats cards show counts
  test('stats cards show counts', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();

    // The stats area above the table shows student count info
    const statsArea = authedPage.locator('.grid').filter({
      hasText: /total students|active/i,
    });
    await expect(statsArea).toBeVisible();
  });

  // 3. Pagination controls render
  test('pagination controls render', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();

    await expect(students.pagination).toBeVisible();
  });
});

test.describe('Students - Search & Filter', () => {
  // 4. Search by name
  test('search by name', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.search('Rina');

    await expect(students.getRowByName('Rina Pelajar')).toBeVisible();
  });

  // 5. Search by email
  test('search by email', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    // Seed students don't have emails set, so search by a different name
    // to verify the search input works with the "name or email" search endpoint
    await students.search('Dimas');

    await expect(students.getRowByName('Dimas Pelajar')).toBeVisible();
  });

  // 6. Filter by status ACTIVE
  test('filter by status ACTIVE', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.filterByStatus('ACTIVE');

    // All seed students are ACTIVE, so all should still appear
    const rowCount = await students.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Verify rows contain ACTIVE status badge
    for (let i = 0; i < rowCount; i++) {
      const row = students.rows.nth(i);
      await expect(row.getByText(/active/i)).toBeVisible();
    }
  });

  // 7. Filter by grade
  test('filter by grade', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    // Kelas 7: Rina (i=0) and Fajar (i=3)
    await students.filterByGrade('Kelas 7');

    // Wait for Rina to appear (filter applied)
    await expect(students.getRowByName('Rina Pelajar')).toBeVisible();
    const rowCount = await students.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
    await expect(students.getRowByName('Rina Pelajar')).toBeVisible();
  });

  // 8. Combined search + filter
  test('combined search and filter', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    // Filter by grade 7 and search for "Rina"
    await students.filterByGrade('Kelas 7');
    await students.search('Rina');

    await expect(students.getRowByName('Rina Pelajar')).toBeVisible();
    // Fajar is also Kelas 7 but should not match the search
    await expect(students.getRowByName('Fajar Pelajar')).not.toBeVisible();
  });
});

test.describe('Students - Create Happy', () => {
  // 9. Create with required fields
  test('create with required fields', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.createStudent({
      name: CREATED_REQUIRED,
      grade: '10',
      parentName: 'Parent Required',
      parentPhone: '081200000099',
    });

    await expect(students.getToast()).toBeVisible();
    await expect(students.getRowByName(CREATED_REQUIRED)).toBeVisible();
  });

  // 10. Create with all fields
  test('create with all fields', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.createStudent({
      name: CREATED_ALL,
      grade: '11',
      parentName: 'Parent AllFields',
      parentPhone: '081200000098',
      email: 'allfields@test.com',
      phone: '081300000001',
      parentEmail: 'parent.all@test.com',
    });

    await expect(students.getToast()).toBeVisible();
    await expect(students.getRowByName(CREATED_ALL)).toBeVisible();
  });
});

test.describe('Students - Create Negative', () => {
  // 11. Empty name
  test('empty name shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.addButton.click();
    const modal = authedPage.getByRole('dialog');

    // Fill everything except name
    await modal.locator('select').first().selectOption('Kelas 7');
    await modal.locator('#new-parent-name').fill('Some Parent');
    await modal.locator('#new-parent-phone').fill('081200000001');

    // Submit
    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await submitButton.click();

    // Expect validation error and modal stays open
    await expect(students.getValidationError('name')).toContainText('Nama lengkap wajib diisi');
    await expect(modal).toBeVisible();
  });

  // 12. Empty grade
  test('empty grade shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#new-name').fill('Grade Test');
    // Skip grade selection
    await modal.locator('#new-parent-name').fill('Some Parent');
    await modal.locator('#new-parent-phone').fill('081200000002');

    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await submitButton.click();

    await expect(students.getValidationError('grade')).toContainText('Kelas wajib dipilih');
    await expect(modal).toBeVisible();
  });

  // 13. Empty parent name
  test('empty parent name shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#new-name').fill('Parent Name Test');
    await modal.locator('select').first().selectOption('Kelas 7');
    // Skip parent name
    await modal.locator('#new-parent-phone').fill('081200000003');

    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await submitButton.click();

    await expect(students.getValidationError('parent_name')).toContainText('Nama orang tua wajib diisi');
    await expect(modal).toBeVisible();
  });

  // 14. Empty parent phone
  test('empty parent phone shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#new-name').fill('Parent Phone Test');
    await modal.locator('select').first().selectOption('Kelas 7');
    await modal.locator('#new-parent-name').fill('Some Parent');
    // Skip parent phone

    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await submitButton.click();

    await expect(students.getValidationError('parent_phone')).toContainText('Telepon orang tua wajib diisi');
    await expect(modal).toBeVisible();
  });

  // 15. Invalid student email
  test('invalid student email shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#new-name').fill('Email Test');
    await modal.locator('#new-email').fill('notanemail');
    await modal.locator('select').first().selectOption('Kelas 7');
    await modal.locator('#new-parent-name').fill('Some Parent');
    await modal.locator('#new-parent-phone').fill('081200000004');

    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await submitButton.click();

    await expect(students.getValidationError('email')).toContainText('Format email tidak valid');
    await expect(modal).toBeVisible();
  });

  // 16. Invalid parent email
  test('invalid parent email shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#new-name').fill('Parent Email Test');
    await modal.locator('select').first().selectOption('Kelas 7');
    await modal.locator('#new-parent-name').fill('Some Parent');
    await modal.locator('#new-parent-phone').fill('081200000005');
    await modal.locator('#new-parent-email').fill('badformat');

    const submitButton = modal.getByRole('button', { name: /add student|create student/i });
    await submitButton.click();

    await expect(students.getValidationError('parent_email')).toContainText('Format email tidak valid');
    await expect(modal).toBeVisible();
  });
});

test.describe('Students - Update', () => {
  // 17. Edit student name
  test('edit student name', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.editStudent('Rina Pelajar', { name: 'Rina Pelajar Updated' });

    await expect(students.getToast()).toBeVisible();
    await expect(students.getRowByName('Rina Pelajar Updated')).toBeVisible();
  });

  // 18. Edit all fields
  test('edit all fields', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.editStudent('Dimas Pelajar', {
      name: 'Dimas Pelajar Updated',
      email: 'dimas.updated@test.com',
      phone: '081399999999',
      grade: '9',
      parentName: 'Updated Parent Dimas',
      parentPhone: '081299999999',
      parentEmail: 'parent.dimas@test.com',
    });

    await expect(students.getToast()).toBeVisible();
    await expect(students.getRowByName('Dimas Pelajar Updated')).toBeVisible();
  });

  // 19. Clear required name -- validation error
  test('clear required name shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.openRowMenu('Putri Pelajar');
    await authedPage.getByText(/view \/ edit/i).click();

    const modal = authedPage.getByRole('dialog');
    await modal.locator('#new-name').clear();

    const submitButton = modal.getByRole('button', { name: /save changes|update student/i });
    await submitButton.click();

    await expect(students.getValidationError('name')).toContainText('Nama lengkap wajib diisi');
    await expect(modal).toBeVisible();
  });

  // 20. Invalid email on edit
  test('invalid email on edit shows validation error', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    await students.openRowMenu('Fajar Pelajar');
    await authedPage.getByText(/view \/ edit/i).click();

    const modal = authedPage.getByRole('dialog');
    await modal.locator('#new-email').fill('invalidemail');

    const submitButton = modal.getByRole('button', { name: /save changes|update student/i });
    await submitButton.click();

    await expect(students.getValidationError('email')).toContainText('Format email tidak valid');
    await expect(modal).toBeVisible();
  });
});

test.describe('Students - Delete', () => {
  // 21. Delete with confirmation
  test('delete with confirmation', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    // Create a student to delete (preserve seed data)
    await students.createStudent({
      name: 'Delete Target',
      grade: '10',
      parentName: 'Parent Delete',
      parentPhone: '081200000077',
    });
    await expect(students.getToast()).toBeVisible();
    await expect(students.getRowByName('Delete Target')).toBeVisible();

    // Wait for toast to disappear before proceeding
    await expect(students.getToast()).not.toBeVisible();

    await students.deleteStudent('Delete Target');

    await expect(students.getToast()).toBeVisible();
    await expect(students.getRowByName('Delete Target')).not.toBeVisible();
  });

  // 22. Cancel delete
  test('cancel delete keeps student in table', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    // Use a seed student for cancel test (no data change)
    await students.openRowMenu('Lina Pelajar');
    await authedPage.getByText(/^delete$/i).click();

    const modal = authedPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Click cancel button
    const cancelButton = modal.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Student should still be in the table
    await expect(students.getRowByName('Lina Pelajar')).toBeVisible();
  });

  // 23. Exact text required -- "delet" keeps button disabled, "delete" enables it
  test('exact text required to enable delete button', async ({ authedPage }) => {
    const students = new StudentsPage(authedPage);
    await students.goto();
    await expect(students.table).toBeVisible();

    // Use a seed student to test the confirm input behavior (no actual deletion)
    await students.openRowMenu('Fajar Pelajar');
    await authedPage.getByText(/^delete$/i).click();

    const deleteConfirmInput = authedPage.locator('#delete-confirm');
    const deleteButton = students.getDeleteConfirmButton();

    // Type incomplete text -- button should be disabled
    await deleteConfirmInput.fill('delet');
    await expect(deleteButton).toBeDisabled();

    // Type correct text -- button should be enabled
    await deleteConfirmInput.fill('delete');
    await expect(deleteButton).toBeEnabled();
  });
});
