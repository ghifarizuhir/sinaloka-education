import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { StudentsPage } from '../../pages/students.page';

test.describe('@integration Student CRUD', () => {
  const testStudent = {
    name: `Test Student ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    grade: '10th Grade',
  };

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@sinaloka.com', 'password123');
    await expect(page).toHaveURL('/');
  });

  test('create, edit, and delete a student', async ({ page }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.createStudent(testStudent);
    await expect(studentsPage.getToast()).toContainText(/success|created/i);
    await studentsPage.editStudent(testStudent.name, { name: testStudent.name + ' Updated' });
    await expect(studentsPage.getToast()).toContainText(/success|updated/i);
    await studentsPage.deleteStudent(testStudent.name + ' Updated');
    await expect(studentsPage.getToast()).toContainText(/success|deleted/i);
  });
});
