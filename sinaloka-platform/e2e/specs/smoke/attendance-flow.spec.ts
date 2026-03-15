import { test, expect } from '../../fixtures/auth.fixture';
import { setupAttendanceMocks, setupSessionMocks } from '../../helpers/api-mocker';
import { AttendancePage } from '../../pages/attendance.page';

test.describe('Attendance Flow', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupSessionMocks(mockApi);
    await setupAttendanceMocks(mockApi);
  });

  test('mark student present', async ({ authenticatedPage: page, mockApi }) => {
    const attendancePage = new AttendancePage(page);
    await attendancePage.goto();

    // Select a session from the list
    await attendancePage.selectSession('Math Advanced');

    // Wait for attendance table to load
    await expect(attendancePage.attendanceTable).toBeVisible();

    await attendancePage.markStatus('Rizki Pratama', 'P');

    // The P button for this student should reflect active/selected state
    const row = attendancePage.getStudentRow('Rizki Pratama');
    await expect(row.getByRole('button', { name: 'P' })).toBeVisible();
  });

  test('mark student absent', async ({ authenticatedPage: page, mockApi }) => {
    const attendancePage = new AttendancePage(page);
    await attendancePage.goto();

    await attendancePage.selectSession('Math Advanced');
    await expect(attendancePage.attendanceTable).toBeVisible();

    await attendancePage.markStatus('Aisyah Putri', 'A');

    const row = attendancePage.getStudentRow('Aisyah Putri');
    await expect(row.getByRole('button', { name: 'A' })).toBeVisible();
  });

  test('keyboard shortcut marks attendance', async ({ authenticatedPage: page, mockApi }) => {
    const attendancePage = new AttendancePage(page);
    await attendancePage.goto();

    await attendancePage.selectSession('Math Advanced');
    await expect(attendancePage.attendanceTable).toBeVisible();

    // markStatusWithKeyboard clicks the row first, then presses the key
    await attendancePage.markStatusWithKeyboard('Fajar Hidayat', 'p');

    const row = attendancePage.getStudentRow('Fajar Hidayat');
    await expect(row.getByRole('button', { name: 'P' })).toBeVisible();
  });

  test('toggle homework done', async ({ authenticatedPage: page, mockApi }) => {
    const attendancePage = new AttendancePage(page);
    await attendancePage.goto();

    await attendancePage.selectSession('Math Advanced');
    await expect(attendancePage.attendanceTable).toBeVisible();

    const row = attendancePage.getStudentRow('Rizki Pratama');
    const checkbox = row.locator('input[type="checkbox"]');

    const initialState = await checkbox.isChecked();
    await attendancePage.toggleHomework('Rizki Pratama');
    await expect(checkbox).not.toBeChecked();
    // If it was unchecked, it should now be checked; if checked, now unchecked
    if (initialState) {
      await expect(checkbox).not.toBeChecked();
    } else {
      await expect(checkbox).toBeChecked();
    }
  });

  test('add attendance note', async ({ authenticatedPage: page, mockApi }) => {
    const attendancePage = new AttendancePage(page);
    await attendancePage.goto();

    await attendancePage.selectSession('Math Advanced');
    await expect(attendancePage.attendanceTable).toBeVisible();

    await attendancePage.addNote('Fajar Hidayat', 'Left early today');

    const row = attendancePage.getStudentRow('Fajar Hidayat');
    await expect(row.getByPlaceholder(/note\.\.\./i)).toHaveValue('Left early today');
  });
});
