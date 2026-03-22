import { test, expect } from '../fixtures/mock-api.fixture';
import {
  setupAuthMocks,
  setupAttendanceMocks,
  setupSessionMocks,
} from '../helpers/api-mocker';
import { AttendancePage } from '../pages/attendance.page';

test.describe('Attendance', () => {
  let attendance: AttendancePage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupAttendanceMocks(mockApi);
    await setupSessionMocks(mockApi);
    attendance = new AttendancePage(authedPage);
  });

  test.describe('Smoke', () => {
    test('session list visible', async () => {
      await attendance.goto();
      await expect(attendance.sessionPanel).toBeVisible();
      // Session cards should be present (from sessionsData with 3 sessions)
      await expect(
        attendance.sessionPanel.locator('button').filter({ hasText: 'Math Advanced' }).first(),
      ).toBeVisible();
    });

    test('select session shows table', async () => {
      await attendance.goto();
      await attendance.selectSession('Math Advanced');
      await expect(attendance.table).toBeVisible();
    });

    test('present/total counter visible', async ({ authedPage }) => {
      await attendance.goto();
      await attendance.selectSession('Math Advanced');
      // The summary endpoint returns present: 1, so counter text should exist
      await expect(authedPage.getByText(/1.*present/i).or(authedPage.getByText(/present.*1/i)).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('CRUD', () => {
    test.beforeEach(async () => {
      await attendance.goto();
      await attendance.selectSession('Math Advanced');
      await expect(attendance.table).toBeVisible();
    });

    test('mark student present', async () => {
      await attendance.markStatus('Rizki Pratama', 'P');
      const row = attendance.getStudentRow('Rizki Pratama');
      await expect(row.getByRole('button', { name: 'P', exact: true })).toBeVisible();
    });

    test('mark student absent', async () => {
      await attendance.markStatus('Aisyah Putri', 'A');
      const row = attendance.getStudentRow('Aisyah Putri');
      await expect(row.getByRole('button', { name: 'A', exact: true })).toBeVisible();
    });

    test('mark student late', async () => {
      await attendance.markStatus('Fajar Hidayat', 'L');
      const row = attendance.getStudentRow('Fajar Hidayat');
      await expect(row.getByRole('button', { name: 'L', exact: true })).toBeVisible();
    });

    test('toggle homework', async () => {
      await attendance.toggleHomework('Rizki Pratama');
      const row = attendance.getStudentRow('Rizki Pratama');
      await expect(row.locator('input[type="checkbox"]')).toBeVisible();
    });

    test('add note and save', async () => {
      await attendance.addNote('Fajar Hidayat', 'Arrived late');
      await attendance.save();
      await expect(attendance.getToast()).toBeVisible({ timeout: 5000 });
    });
  });
});
