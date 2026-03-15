import { test, expect } from '../../fixtures/auth.fixture';
import { setupStudentMocks } from '../../helpers/api-mocker';
import { StudentsPage } from '../../pages/students.page';

test.describe('Student Management', () => {
  test('create student via modal shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.createStudent({
      name: 'New Test Student',
      email: 'newstudent@example.com',
      grade: '10th Grade',
      parent_name: 'Test Parent',
      parent_phone: '+62812000000',
    });

    await expect(studentsPage.getToast()).toContainText(/student created/i);
  });

  test('edit student shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.editStudent('Aisyah Putri', { name: 'Aisyah Updated' });

    await expect(studentsPage.getToast()).toContainText(/student updated/i);
  });

  test('search filters table rows', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    // Wait for table to load
    await expect(studentsPage.tableRows.first()).toBeVisible();

    await studentsPage.search('Aisyah');

    // After filtering, only matching row should be visible
    await expect(studentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(studentsPage.tableRows).toHaveCount(1);
  });

  test('delete student with confirm dialog shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    // Wait for table to load
    await expect(studentsPage.tableRows.first()).toBeVisible();

    // deleteStudent already handles dialog acceptance
    await studentsPage.deleteStudent('Aisyah Putri');

    await expect(studentsPage.getToast()).toContainText(/student deleted/i);
  });

  test('CSV export shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    await studentsPage.exportButton.click();

    await expect(studentsPage.getToast()).toContainText(/students exported/i);
  });
});
