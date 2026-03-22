import { test, expect } from '../../e2e/fixtures/mock-api.fixture';
import { setupAuthMocks, setupStudentMocks } from '../helpers/api-mocker';
import { StudentsPage } from '../pages/students.page';

test.describe('Students', () => {
  let students: StudentsPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupStudentMocks(mockApi);
    await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
      overdue_count: 0,
      flagged_students: [],
    });
    students = new StudentsPage(authedPage);
  });

  // ── Smoke ──

  test('table loads with students', async () => {
    await students.goto();
    await expect(students.table).toBeVisible();
    await expect(students.rows).toHaveCount(3);
  });

  test('search filters by name', async () => {
    await students.goto();
    await students.search('Rizki');
    await expect(students.searchInput).toHaveValue('Rizki');
    // With mocked API the response stays the same, but we verify the input works
    await expect(students.getRowByName('Rizki Pratama')).toBeVisible();
  });

  test('search no match shows empty state', async ({ mockApi, authedPage }) => {
    await students.goto();
    // Override the GET to return empty when searching
    await mockApi.onGet('**/api/admin/students**').respondWith(200, {
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, active_count: 0, inactive_count: 0 },
    });
    await students.search('NonExistent');
    // Table shows empty state message
    await expect(authedPage.getByText(/no students found/i)).toBeVisible();
  });

  // ── CRUD ──

  test('create student with required fields', async () => {
    await students.goto();
    await students.createStudent({
      name: 'New Student',
      grade: '10',
      parentName: 'Parent',
      parentPhone: '081111111111',
    });
    await expect(students.getToast()).toBeVisible();
  });

  test('create student with optional fields', async () => {
    await students.goto();
    await students.createStudent({
      name: 'New Student',
      grade: '10',
      parentName: 'Parent',
      parentPhone: '081111111111',
      email: 'new@example.com',
      phone: '082222222222',
      parentEmail: 'parent@example.com',
    });
    await expect(students.getToast()).toBeVisible();
  });

  test('edit student', async () => {
    await students.goto();
    await students.editStudent('Rizki Pratama', { name: 'Rizki Updated' });
    await expect(students.getToast()).toBeVisible();
  });

  test('delete student', async () => {
    await students.goto();
    await students.deleteStudent('Fajar Hidayat');
    await expect(students.getToast()).toBeVisible();
  });

  // ── Negative ──

  test('server 422 shows error toast', async ({ mockApi }) => {
    // Override POST to return validation error
    await mockApi.onPost('**/api/admin/students').respondWith(422, {
      message: 'Validation failed',
      errors: [{ field: 'name', message: 'Name is required' }],
    });
    await students.goto();
    await students.createStudent({
      name: 'New Student',
      grade: '10',
      parentName: 'Parent',
      parentPhone: '081111111111',
    });
    await expect(students.getToast()).toBeVisible();
  });
});
