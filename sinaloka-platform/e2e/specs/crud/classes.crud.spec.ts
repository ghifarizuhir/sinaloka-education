import { createRequire } from 'module';
import { test, expect } from '../../fixtures/auth.fixture';
import { setupClassMocks, setupTutorMocks } from '../../helpers/api-mocker';
import { ClassesPage } from '../../pages/classes.page';

const require = createRequire(import.meta.url);
const classesData = require('../../mocks/classes.json');

test.describe('Classes CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupTutorMocks(mockApi);
    await setupClassMocks(mockApi);
  });

  // ── Create ──────────────────────────────────────────────────────────────

  test('create class with schedule, capacity, fee shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await classesPage.createClass({
      name: 'Biology Advanced',
      subject: 'Biology',
      capacity: '20',
      fee: '400000',
      scheduleDays: ['Monday', 'Friday'],
      startTime: '08:00',
      endTime: '09:30',
      room: 'Room C',
    });

    await expect(classesPage.getToast()).toContainText(/class (created|registered)/i);
  });

  test('create class with tutor assignment shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await classesPage.createClass({
      name: 'Chemistry Basics',
      tutorName: 'Dewi Lestari',
      capacity: '15',
      fee: '350000',
    });

    await expect(classesPage.getToast()).toContainText(/class (created|registered)/i);
  });

  test('create class with minimal required fields shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await classesPage.createClass({ name: 'English Intermediate' });

    await expect(classesPage.getToast()).toContainText(/class (created|registered)/i);
  });

  // ── Read / List ──────────────────────────────────────────────────────────

  test('table loads with class data from API', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.table).toBeVisible();
    await expect(classesPage.tableRows.first()).toBeVisible();

    await expect(classesPage.getRowByName('Math Advanced')).toBeVisible();
    await expect(classesPage.getRowByName('Physics Basic')).toBeVisible();
  });

  test('class list shows total count', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows).toHaveCount(classesData.data.length);
  });

  test('class rows display subject and tutor', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    const mathRow = classesPage.getRowByName('Math Advanced');
    await expect(mathRow).toBeVisible();
    await expect(mathRow.getByText(/mathematics/i)).toBeVisible();
    await expect(mathRow.getByText(/dewi lestari/i)).toBeVisible();
  });

  // ── Search ───────────────────────────────────────────────────────────────

  test('search by class name filters results', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.search('Math');

    await expect(classesPage.getRowByName('Math Advanced')).toBeVisible();
    await expect(classesPage.tableRows).toHaveCount(1);
  });

  test('search by tutor name filters results', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.search('Dewi');

    // Both classes have Dewi Lestari as tutor
    await expect(classesPage.getRowByName('Math Advanced')).toBeVisible();
    await expect(classesPage.getRowByName('Physics Basic')).toBeVisible();
  });

  // ── Edit ─────────────────────────────────────────────────────────────────

  test('edit class name shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.editClass('Math Advanced', { name: 'Math Advanced Plus' });

    await expect(classesPage.getToast()).toContainText(/class updated/i);
  });

  test('edit class capacity shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.editClass('Math Advanced', { capacity: '25' });

    await expect(classesPage.getToast()).toContainText(/class updated/i);
  });

  test('edit class fee shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.editClass('Physics Basic', { fee: '500000' });

    await expect(classesPage.getToast()).toContainText(/class updated/i);
  });

  test('edit class room shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.editClass('Physics Basic', { room: 'Room D' });

    await expect(classesPage.getToast()).toContainText(/class updated/i);
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test('delete class with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const classesPage = new ClassesPage(page);
    await classesPage.goto();

    await expect(classesPage.tableRows.first()).toBeVisible();

    await classesPage.deleteClass('Math Advanced');

    await expect(classesPage.getToast()).toContainText(/class deleted/i);
  });
});
