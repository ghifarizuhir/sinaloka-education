import { test, expect } from '../../fixtures/auth.fixture';
import { setupStudentMocks } from '../../helpers/api-mocker';
import { StudentsPage } from '../../pages/students.page';
import studentsData from '../../mocks/students.json';

test.describe('Students CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
  });

  // ── Create ──────────────────────────────────────────────────────────────

  test('create student with all required fields shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.createStudent({
      name: 'Budi Hartono',
      email: 'budi.hartono@example.com',
      grade: '10th Grade',
      parent_name: 'Hartono Senior',
      parent_phone: '+62811223344',
    });

    await expect(studentsPage.getToast()).toContainText(/student created/i);
  });

  test('create student with all optional fields shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.createStudent({
      name: 'Sari Dewi',
      email: 'sari.dewi@example.com',
      grade: '12th Grade',
      parent_name: 'Dewi Ibu',
      parent_phone: '+62899887766',
    });

    await expect(studentsPage.getToast()).toContainText(/student created/i);
  });

  test('create student with 422 validation error shows error message', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    // Override POST to return 422
    await mockApi
      .onPost('**/api/admin/students')
      .respondWith(422, { message: 'Email already exists', errors: { email: ['Email already exists'] } });

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.addButton.click();
    await studentsPage.modal.waitFor({ state: 'visible' });
    await studentsPage.modal.getByLabel(/full name/i).fill('Duplicate Student');
    await studentsPage.modal.getByLabel(/email address/i).fill('aisyah@example.com');
    await studentsPage.modal.locator('select').first().selectOption('10th Grade');
    await studentsPage.modal.getByRole('button', { name: /create student/i }).click();

    // Error toast or inline message
    const toast = studentsPage.getToast();
    await expect(toast).toBeVisible();
  });

  // ── Read / List ──────────────────────────────────────────────────────────

  test('table loads with paginated data', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.table).toBeVisible();
    await expect(studentsPage.tableRows.first()).toBeVisible();

    // All 3 mock students are visible
    await expect(studentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(studentsPage.getRowByName('Rizki Pratama')).toBeVisible();
    await expect(studentsPage.getRowByName('Fajar Hidayat')).toBeVisible();
  });

  test('meta information is reflected in UI (total count)', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows).toHaveCount(studentsData.data.length);
  });

  // ── Search ───────────────────────────────────────────────────────────────

  test('search by name filters results', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.search('Aisyah');

    await expect(studentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(studentsPage.tableRows).toHaveCount(1);
  });

  test('search by email filters results', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.search('rizki@example.com');

    await expect(studentsPage.getRowByName('Rizki Pratama')).toBeVisible();
    await expect(studentsPage.tableRows).toHaveCount(1);
  });

  test('search with no match shows empty state', async ({ authenticatedPage: page, mockApi }) => {
    // Override GET to return empty list matching the search query behaviour
    await mockApi.onGet('**/api/admin/students').respondWith(200, { data: [], meta: { page: 1, limit: 10, total: 0, total_pages: 0 } });

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.search('zzznomatch');

    await expect(studentsPage.tableRows).toHaveCount(0);
  });

  // ── Filters ──────────────────────────────────────────────────────────────

  test('grade filter shows only selected grade', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    // Select 10th Grade filter
    await studentsPage.gradeFilter.selectOption('10th Grade');

    // Only Aisyah is in 10th Grade
    await expect(studentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(studentsPage.tableRows).toHaveCount(1);
  });

  test('status filter shows only active students', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.statusFilter.selectOption('ACTIVE');

    // Only ACTIVE students: Aisyah, Rizki
    await expect(studentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(studentsPage.getRowByName('Rizki Pratama')).toBeVisible();
    await expect(studentsPage.tableRows).toHaveCount(2);
  });

  test('status filter shows only inactive students', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.statusFilter.selectOption('INACTIVE');

    // Only Fajar is INACTIVE
    await expect(studentsPage.getRowByName('Fajar Hidayat')).toBeVisible();
    await expect(studentsPage.tableRows).toHaveCount(1);
  });

  // ── Edit ─────────────────────────────────────────────────────────────────

  test('edit student name shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.editStudent('Aisyah Putri', { name: 'Aisyah Putri Updated' });

    await expect(studentsPage.getToast()).toContainText(/student updated/i);
  });

  test('edit student email shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.editStudent('Rizki Pratama', { email: 'rizki.new@example.com' });

    await expect(studentsPage.getToast()).toContainText(/student updated/i);
  });

  test('edit student grade shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.editStudent('Aisyah Putri', { grade: '11th Grade' });

    await expect(studentsPage.getToast()).toContainText(/student updated/i);
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test('delete student with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.deleteStudent('Aisyah Putri');

    await expect(studentsPage.getToast()).toContainText(/student deleted/i);
  });

  // ── Pagination ───────────────────────────────────────────────────────────

  test('pagination controls are rendered for multi-page data', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    // Override with multi-page data
    await mockApi.onGet('**/api/admin/students').respondWith(200, {
      ...studentsData,
      meta: { page: 1, limit: 2, total: 5, total_pages: 3 },
    });

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await expect(studentsPage.table).toBeVisible();
    // Pagination controls should be present
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
  });
});
