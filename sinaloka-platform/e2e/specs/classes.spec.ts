import { test, expect } from '../../e2e/fixtures/mock-api.fixture';
import {
  setupAuthMocks,
  setupClassMocks,
  setupSubjectMocks,
  setupSettingsMocks,
} from '../helpers/api-mocker';
import { ClassesPage } from '../pages/classes.page';

test.describe('Classes', () => {
  let classes: ClassesPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupSubjectMocks(mockApi);
    await setupSettingsMocks(mockApi);
    await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
      overdue_count: 0,
      flagged_students: [],
    });
    classes = new ClassesPage(authedPage);
  });

  // ── Smoke ──

  test('table loads with classes', async () => {
    await classes.goto();
    await expect(classes.table).toBeVisible();
    await expect(classes.getRowByName('Math Advanced')).toBeVisible();
    await expect(classes.getRowByName('Physics Basic')).toBeVisible();
  });

  test('search filters results', async () => {
    await classes.goto();
    await classes.search('Math');
    await expect(classes.searchInput).toHaveValue('Math');
    await expect(classes.getRowByName('Math Advanced')).toBeVisible();
  });

  test('shows subject and tutor', async () => {
    await classes.goto();
    const row = classes.getRowByName('Math Advanced');
    await expect(row).toContainText('MATHEMATICS');
    await expect(row).toContainText('Dewi Lestari');
  });

  // ── CRUD ──

  test('create class', async () => {
    await classes.goto();
    await classes.createClass({
      name: 'English Intro',
      subject: 'Mathematics',
      tutor: 'Dewi Lestari',
      capacity: '15',
      fee: '100000',
      tutorFee: '50000',
      scheduleDays: ['Monday'],
      startTime: '10:00',
      endTime: '11:30',
    });
    await expect(classes.getToast()).toBeVisible();
  });

  test('edit class name and capacity', async () => {
    await classes.goto();
    await classes.editClass('Math Advanced', {
      name: 'Math Advanced II',
      capacity: '25',
    });
    await expect(classes.getToast()).toBeVisible();
  });

  test('delete class', async () => {
    await classes.goto();
    await classes.deleteClass('Physics Basic');
    await expect(classes.getToast()).toBeVisible();
  });

  // ── Negative ──

  test('empty name shows validation error', async ({ authedPage }) => {
    await classes.goto();
    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');
    // Submit button should be disabled when required fields are empty
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('capacity zero shows validation error', async ({ authedPage }) => {
    await classes.goto();
    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');
    await modal.locator('#class-name').fill('Test Class');
    await modal.locator('#capacity').fill('0');
    await modal.getByRole('button', { name: /add class/i }).click();
    // Modal should remain open (validation failed)
    await expect(modal).toBeVisible();
  });
});
