import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';
import { ClassesPage } from '../pages/classes.page.js';
import { ApiClient } from '../helpers/api-client.js';
import { ACCOUNTS } from '../helpers/test-accounts.js';

// ─────────────────────────────────────────────────────────
// Classes Integration Tests (34 tests)
// ─────────────────────────────────────────────────────────

// Unique names for created classes — delete tests target these
const CREATED_MIN = 'Test Class Minimum';
const CREATED_ALL = 'Test Class AllFields';
const CREATED_MULTI = 'Test Class MultiSchedule';
const CREATED_DELETE = 'Test Class ForDelete';

// Seed data references
const SEED_CLASS_1 = 'Matematika SMP';
const SEED_CLASS_2 = 'English SMP';

// ─── Smoke (3) ──────────────────────────────────────────

test.describe('Classes - Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 1. Table loads with seed data
  test('table loads with seed data', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();

    await expect(classes.table).toBeVisible();
    const rowCount = await classes.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  // 2. Search by class name
  test('search by class name', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.search('Matematika');
    await authedPage.waitForTimeout(500);

    await expect(classes.getRowByName(SEED_CLASS_1)).toBeVisible();
  });

  // 3. Search by tutor name
  test('search by tutor name', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.search('Budi');
    await authedPage.waitForTimeout(500);

    await expect(classes.getRowByName(SEED_CLASS_1)).toBeVisible();
  });
});

// ─── Create Happy (3) ───────────────────────────────────

test.describe('Classes - Create Happy', () => {
  // 4. Create with minimum fields
  test('create with minimum fields', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.createClass({
      name: CREATED_MIN,
      subject: 'Matematika',
      tutor: 'Budi Santoso',
      scheduleDays: ['Friday'],
      capacity: '20',
      fee: '300000',
      tutorFee: '100000',
    });

    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getRowByName(CREATED_MIN)).toBeVisible();
  });

  // 5. Create with all optional fields
  test('create with all optional fields', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.createClass({
      name: CREATED_ALL,
      subject: 'Bahasa Inggris',
      tutor: 'Siti Rahayu',
      scheduleDays: ['Saturday'],
      startTime: '09:00',
      endTime: '10:30',
      capacity: '15',
      fee: '400000',
      tutorFeeMode: 'PER_STUDENT_ATTENDANCE',
      perStudentFee: '35000',
      status: 'ARCHIVED',
    });

    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getRowByName(CREATED_ALL)).toBeVisible();
  });

  // 6. Create with multiple schedule days
  test('create with multiple schedule days', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.createClass({
      name: CREATED_MULTI,
      subject: 'Fisika',
      tutor: 'Budi Santoso',
      scheduleDays: ['Saturday', 'Sunday'],
      startTime: '10:00',
      endTime: '11:30',
      capacity: '25',
      fee: '500000',
      tutorFee: '150000',
    });

    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getRowByName(CREATED_MULTI)).toBeVisible();
  });
});

// ─── Create Negative (11) ───────────────────────────────

test.describe('Classes - Create Negative', () => {
  // 7. Empty name
  test('empty name shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    // Fill everything except name
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    // Toggle Friday
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    await expect(classes.getValidationError('name')).toContainText(/class name is required/i);
    await expect(modal).toBeVisible();
  });

  // 8. No subject
  test('no subject shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('No Subject Class');
    // Skip subject selection
    // Toggle Friday
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    // Expect subject validation error
    const errorText = modal.locator('p.text-red-500');
    await expect(errorText.first()).toBeVisible();
    await expect(modal).toBeVisible();
  });

  // 9. No tutor (disabled until subject chosen)
  test('no tutor shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('No Tutor Class');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    // Don't select a tutor
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    const errorText = modal.locator('p.text-red-500');
    await expect(errorText.first()).toBeVisible();
    await expect(modal).toBeVisible();
  });

  // 10. No schedule days
  test('no schedule days shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('No Schedule Class');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    // Don't select any schedule day
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    const errorText = modal.locator('p.text-red-500');
    await expect(errorText.first()).toBeVisible();
    await expect(modal).toBeVisible();
  });

  // 11. Capacity = 0
  test('capacity zero shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Zero Capacity');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('0');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    await expect(classes.getValidationError('capacity')).toContainText(/capacity/i);
    await expect(modal).toBeVisible();
  });

  // 12. Capacity negative
  test('capacity negative shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Negative Capacity');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('-1');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    await expect(classes.getValidationError('capacity')).toContainText(/capacity/i);
    await expect(modal).toBeVisible();
  });

  // 13. Fee negative
  test('fee negative shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Negative Fee');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('-1');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    await expect(classes.getValidationError('fee')).toContainText(/fee/i);
    await expect(modal).toBeVisible();
  });

  // 14. FIXED mode empty tutor_fee
  test('FIXED mode empty tutor_fee shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Empty Tutor Fee');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    // Default mode is FIXED_PER_SESSION — leave tutor_fee empty

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    const errorText = modal.locator('p.text-red-500');
    await expect(errorText.first()).toBeVisible();
    await expect(modal).toBeVisible();
  });

  // 15. PER_STUDENT mode empty per_student_fee
  test('PER_STUDENT mode empty per_student_fee shows validation error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Empty PerStudent Fee');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    // Switch to PER_STUDENT_ATTENDANCE mode
    await modal.locator('select').nth(3).selectOption('PER_STUDENT_ATTENDANCE');
    // Leave per_student_fee empty

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    const errorText = modal.locator('p.text-red-500');
    await expect(errorText.first()).toBeVisible();
    await expect(modal).toBeVisible();
  });

  // 16. Tutor doesn't teach subject — Siti doesn't teach Fisika
  test('tutor does not teach subject shows error toast', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Wrong Subject Tutor');
    await modal.locator('select').first().selectOption({ label: 'Fisika' });
    // Siti teaches English+Indonesian, not Physics
    // The tutor select filters by subject, so Siti may not appear.
    // If not available, we use the API client approach.
    const tutorSelect = modal.locator('select').nth(1);
    await tutorSelect.waitFor({ state: 'attached' });

    // Check if Siti is available in the tutor dropdown for Fisika
    const options = await tutorSelect.locator('option').allTextContents();
    const hasSiti = options.some(o => o.includes('Siti'));

    if (hasSiti) {
      await tutorSelect.selectOption({ label: 'Siti Rahayu' });
      await modal.getByRole('button', { name: 'Fri', exact: true }).click();
      await modal.locator('#capacity').fill('20');
      await modal.locator('#fee').fill('300000');
      await modal.locator('input[placeholder="200000"]').fill('100000');

      const submitButton = modal.getByRole('button', { name: /add class|create class/i });
      await Promise.all([
        authedPage.waitForResponse(resp =>
          resp.url().includes('/api/admin/classes') && resp.request().method() === 'POST'
        ),
        submitButton.click(),
      ]);

      // Expect error toast from backend
      await expect(classes.getToast()).toContainText(/does not teach|error/i);
    } else {
      // Tutor dropdown is filtered by subject — Siti won't appear for Fisika.
      // Use API client to test this backend validation directly.
      const api = new ApiClient();
      await api.loginAs(ACCOUNTS.ADMIN_CERDAS);

      // Get tutors and subjects to find IDs
      const tutorsRes = await api.get('/admin/tutors?limit=100');
      const siti = tutorsRes.data.data.find((t: any) => t.name === 'Siti Rahayu');

      const subjectsRes = await api.get('/admin/subjects');
      const fisika = subjectsRes.data.data.find((s: any) => s.name === 'Fisika');

      try {
        await api.post('/admin/classes', {
          name: 'Wrong Subject Tutor API',
          subject_id: fisika.id,
          tutor_id: siti.id,
          capacity: 20,
          fee: 300000,
          tutor_fee: 100000,
          schedules: [{ day: 'Friday', start_time: '16:00', end_time: '17:00' }],
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.message).toContain('does not teach');
      }

      // Close the modal
      await modal.getByRole('button', { name: /cancel|close/i }).first().click();
    }
  });

  // 17. Unverified tutor — skip, requires creating unverified tutor via invite flow
  test.skip('unverified tutor shows error', async () => {
    // This test requires inviting a tutor (who remains unverified) and then
    // trying to assign them to a class. The invite flow creates a PENDING tutor
    // which is not the same as unverified. Skipping as too complex for integration test.
  });
});

// ─── Schedule Management (6) ────────────────────────────

test.describe('Classes - Schedule Management', () => {
  // 18. Toggle day on/off
  test('toggle day on and off', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    // Click Mon to add
    const monButton = modal.getByRole('button', { name: 'Mon', exact: true });
    await monButton.click();

    // Verify schedule row appears — a time input should appear
    const timeInputs = modal.locator('input[type="time"]');
    await expect(timeInputs.first()).toBeVisible();

    // Click Mon again to remove
    await monButton.click();

    // Time inputs should disappear (no schedule rows)
    await expect(timeInputs).toHaveCount(0);
  });

  // 19. Default times on toggle
  test('default times on toggle are 14:00 and 15:30', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    // Toggle Tuesday
    await modal.getByRole('button', { name: 'Tue', exact: true }).click();

    // Verify default times
    const timeInputs = modal.locator('input[type="time"]');
    await expect(timeInputs.nth(0)).toHaveValue('14:00');
    await expect(timeInputs.nth(1)).toHaveValue('15:30');
  });

  // 20. Edit schedule times
  test('edit schedule times', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    // Toggle Wednesday
    await modal.getByRole('button', { name: 'Wed', exact: true }).click();

    const timeInputs = modal.locator('input[type="time"]');

    // Change start time
    await timeInputs.nth(0).fill('09:00');
    await expect(timeInputs.nth(0)).toHaveValue('09:00');

    // Change end time
    await timeInputs.nth(1).fill('10:30');
    await expect(timeInputs.nth(1)).toHaveValue('10:30');
  });

  // 21. Remove via trash icon
  test('remove schedule via trash icon', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    // Toggle Thursday
    await modal.getByRole('button', { name: 'Thu', exact: true }).click();

    // Verify time inputs appeared
    const timeInputs = modal.locator('input[type="time"]');
    await expect(timeInputs.first()).toBeVisible();

    // Remove via trash icon
    await classes.removeScheduleDay('Thu');

    // Time inputs should disappear
    await expect(timeInputs).toHaveCount(0);
  });

  // 22. Schedule conflict — same tutor, same day/time as existing class
  test('schedule conflict shows error toast', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    // Seed class 1: Budi teaches Matematika SMP on Mon+Wed 14:00-15:30
    // Try to create a class with Budi on Monday 14:00-15:30 → conflict
    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Conflict Class');
    await modal.locator('select').first().selectOption({ label: 'Fisika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });

    // Wait for tutor classes to load (the conflict check fetches tutor's existing classes)
    await authedPage.waitForTimeout(500);

    // Toggle Monday (same day as seed class 1)
    await modal.getByRole('button', { name: 'Mon', exact: true }).click();
    // Default times are 14:00-15:30, same as seed class 1

    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await submitButton.click();

    // Expect schedule conflict toast (client-side check)
    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getToast().first()).toContainText(/conflict/i);
  });

  // 23. Start >= end time — backend validation error
  test('start time after end time shows error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.addButton.click();
    const modal = authedPage.getByRole('dialog');

    await modal.locator('#class-name').fill('Bad Time Class');
    await modal.locator('select').first().selectOption({ label: 'Matematika' });
    await modal.locator('select').nth(1).selectOption({ label: 'Budi Santoso' });

    // Wait for tutor classes query
    await authedPage.waitForTimeout(500);

    // Toggle Saturday (no conflict with seed data)
    await modal.getByRole('button', { name: 'Sat', exact: true }).click();

    // Set end_time before start_time
    const timeInputs = modal.locator('input[type="time"]');
    await timeInputs.nth(0).fill('15:00');
    await timeInputs.nth(1).fill('14:00');

    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('300000');
    await modal.locator('input[placeholder="200000"]').fill('100000');

    const submitButton = modal.getByRole('button', { name: /add class|create class/i });
    await Promise.all([
      authedPage.waitForResponse(resp =>
        resp.url().includes('/api/admin/classes') && resp.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);

    // Expect backend validation error toast
    await expect(classes.getToast()).toBeVisible();
  });
});

// ─── Update (6) ─────────────────────────────────────────

test.describe('Classes - Update', () => {
  // 24. Update name
  test('update class name', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.editClass(SEED_CLASS_1, { name: 'Matematika SMP Updated' });

    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getRowByName('Matematika SMP Updated')).toBeVisible();
  });

  // 25. Update capacity
  test('update capacity', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.editClass(SEED_CLASS_2, { capacity: '30' });

    await expect(classes.getToast()).toBeVisible();
  });

  // 26. Change subject and tutor
  test('change subject and tutor', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    // Change English SMP to use Matematika subject with Budi
    // Note: need to wait for tutor select to re-populate after subject change
    await classes.editClass(SEED_CLASS_2, {
      subject: 'Matematika',
      tutor: 'Budi Santoso',
    });

    await expect(classes.getToast()).toBeVisible();
  });

  // 27. Update schedules — add a new day
  test('update schedules by adding a new day', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    // Edit seed class 1 (Mon+Wed) — add Friday
    await classes.openRowMenu(SEED_CLASS_1);
    await authedPage.getByText(/edit class details/i).click();

    const modal = authedPage.getByRole('dialog');

    // Wait for tutor classes query
    await authedPage.waitForTimeout(500);

    // Toggle Friday
    await modal.getByRole('button', { name: 'Fri', exact: true }).click();

    const submitButton = modal.getByRole('button', { name: /save changes|update class/i });
    await Promise.all([
      authedPage.waitForResponse(resp =>
        resp.url().includes('/api/admin/classes') && resp.request().method() === 'PATCH'
      ),
      submitButton.click(),
    ]);

    await expect(classes.getToast()).toBeVisible();
  });

  // 28. Change status to ARCHIVED
  test('change status to ARCHIVED', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.editClass(SEED_CLASS_1, { status: 'ARCHIVED' });

    await expect(classes.getToast()).toBeVisible();
  });

  // 29. Invalid tutor on update — PATCH with non-existent tutor via API
  test('invalid tutor on update returns error', async () => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);

    // Get existing classes to find a valid class ID
    const classesRes = await api.get('/admin/classes?limit=10');
    const firstClass = classesRes.data.data[0];
    expect(firstClass).toBeTruthy();

    try {
      await api.patch(`/admin/classes/${firstClass.id}`, {
        tutor_id: '00000000-0000-0000-0000-000000000000',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.response.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Delete (5) ─────────────────────────────────────────

test.describe('Classes - Delete', () => {
  // 30. Delete class with no enrollments
  test('delete class with no enrollments', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    // Create a fresh class with no enrollments
    await classes.createClass({
      name: CREATED_DELETE,
      subject: 'Fisika',
      tutor: 'Budi Santoso',
      scheduleDays: ['Sunday'],
      startTime: '08:00',
      endTime: '09:30',
      capacity: '10',
      fee: '200000',
      tutorFee: '80000',
    });
    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getRowByName(CREATED_DELETE)).toBeVisible();

    // Wait for toast to clear
    await authedPage.waitForTimeout(1000);

    // Delete the created class
    await classes.deleteClass(CREATED_DELETE);

    await expect(classes.getToast()).toBeVisible();
    await expect(classes.getRowByName(CREATED_DELETE)).not.toBeVisible();
  });

  // 31. Requires typing "delete"
  test('delete button disabled until "delete" is typed', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.openRowMenu(SEED_CLASS_1);
    await authedPage.getByText(/delete class/i).click();

    const modal = authedPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    const deleteConfirmInput = authedPage.locator('#delete-confirm');
    const deleteButton = modal.getByRole('button', { name: /delete class/i });

    // Button should be disabled initially
    await expect(deleteButton).toBeDisabled();

    // Type "delete" — button should become enabled
    await deleteConfirmInput.fill('delete');
    await expect(deleteButton).toBeEnabled();
  });

  // 32. Partial text keeps button disabled
  test('partial text keeps delete button disabled', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.openRowMenu(SEED_CLASS_2);
    await authedPage.getByText(/delete class/i).click();

    const modal = authedPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    const deleteConfirmInput = authedPage.locator('#delete-confirm');
    const deleteButton = modal.getByRole('button', { name: /delete class/i });

    // Type partial text — button should remain disabled
    await deleteConfirmInput.fill('delet');
    await expect(deleteButton).toBeDisabled();
  });

  // 33. Cancel delete
  test('cancel delete keeps class in table', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    await classes.openRowMenu(SEED_CLASS_1);
    await authedPage.getByText(/delete class/i).click();

    const modal = authedPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Click cancel
    const cancelButton = modal.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Class should still be in the table
    await expect(classes.getRowByName(SEED_CLASS_1)).toBeVisible();
  });

  // 34. Delete with enrollments fails
  test('delete class with enrollments shows error', async ({ authedPage }) => {
    const classes = new ClassesPage(authedPage);
    await classes.goto();
    await expect(classes.table).toBeVisible();

    // Seed classes have enrollments — try to delete one
    await classes.openRowMenu(SEED_CLASS_1);
    await authedPage.getByText(/delete class/i).click();

    const modal = authedPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Type "delete" and confirm
    await authedPage.locator('#delete-confirm').fill('delete');
    const deleteButton = modal.getByRole('button', { name: /delete class/i });
    await Promise.all([
      authedPage.waitForResponse(resp =>
        resp.url().includes('/api/admin/classes') && resp.request().method() === 'DELETE'
      ),
      deleteButton.click(),
    ]);

    // Expect error toast (FK constraint)
    await expect(classes.getToast()).toBeVisible();
    // Class should still exist in the table
    await classes.goto();
    await expect(classes.getRowByName(SEED_CLASS_1)).toBeVisible();
  });
});
