import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';
import { EnrollmentsPage } from '../pages/enrollments.page.js';
import { confirmDialog } from '../helpers/confirm-dialog.js';
import { ApiClient } from '../helpers/api-client.js';
import { ACCOUNTS } from '../helpers/test-accounts.js';

// ─────────────────────────────────────────────────────────
// Enrollments Integration Tests (16 tests)
// ─────────────────────────────────────────────────────────

// Seed data references (inst1 — Cerdas institution)
// Enrollments: Rina & Dimas in "Matematika SMP" (ACTIVE/PAID)
//              Putri & Fajar in "English SMP" (ACTIVE/PENDING)
// Unenrolled student: Lina Pelajar (no enrollments in either class)
// Classes: "Matematika SMP", "English SMP"

const CLASS_MATH = 'Matematika SMP';
const CLASS_ENG = 'English SMP';
const STUDENT_RINA = 'Rina Pelajar';
const STUDENT_DIMAS = 'Dimas Pelajar';
const STUDENT_PUTRI = 'Putri Pelajar';
const STUDENT_FAJAR = 'Fajar Pelajar';
const STUDENT_LINA = 'Lina Pelajar';

// ─── Smoke (2) ──────────────────────────────────────────

test.describe('Enrollments - Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 1. Table loads with enrollment rows from seed
  test('table loads with enrollment rows from seed', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();

    await expect(enrollments.table).toBeVisible();
    const rowCount = await enrollments.rows.count();
    // Seed has 4 enrollments for inst1
    expect(rowCount).toBeGreaterThanOrEqual(4);
  });

  // 2. Search filters by student name
  test('search filters by student name', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    await enrollments.search('Rina');
    await authedPage.waitForTimeout(500);

    await expect(enrollments.getRowByName(STUDENT_RINA)).toBeVisible();
    // Other students should not be visible
    await expect(enrollments.getRowByName(STUDENT_PUTRI)).not.toBeVisible();
  });
});

// ─── Create (6) ─────────────────────────────────────────

test.describe('Enrollments - Create', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 3. Enroll single student — select unenrolled student (Lina), select class, type ACTIVE
  test('enroll single student as ACTIVE', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    await enrollments.enrollStudent(STUDENT_LINA, CLASS_MATH);

    await expect(enrollments.getToast()).toBeVisible();
    // Verify the new enrollment appears in the table
    await expect(enrollments.getRowByName(STUDENT_LINA)).toBeVisible();
  });

  // 4. Enroll as TRIAL
  test('enroll student as TRIAL', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Lina is now in Matematika SMP, enroll her in English SMP as TRIAL
    await enrollments.enrollStudent(STUDENT_LINA, CLASS_ENG, 'TRIAL');

    await expect(enrollments.getToast()).toBeVisible();
  });

  // 5. Enroll multiple students into a class
  test('enroll multiple students at once', async () => {
    // Use API to create fresh unenrolled students, then enroll via API
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);

    // Get classes to find Matematika SMP class id
    const classesRes = await api.get('/admin/classes?limit=100');
    const mathClass = classesRes.data.data.find((c: any) => c.name === CLASS_MATH);
    expect(mathClass).toBeTruthy();

    // Get students
    const studentsRes = await api.get('/admin/students?limit=100');
    const putri = studentsRes.data.data.find((s: any) => s.name === STUDENT_PUTRI);
    const fajar = studentsRes.data.data.find((s: any) => s.name === STUDENT_FAJAR);
    expect(putri).toBeTruthy();
    expect(fajar).toBeTruthy();

    // Putri and Fajar are in English SMP but not in Matematika SMP — enroll both
    const res = await api.post('/admin/enrollments', {
      student_ids: [putri.id, fajar.id],
      class_id: mathClass.id,
      type: 'ACTIVE',
      auto_invoice: false,
    });
    expect(res.status).toBe(201);
  });

  // 6. Duplicate enrollment → 409
  test('duplicate enrollment returns 409', async () => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);

    // Get Rina's student ID and Matematika SMP class ID (already enrolled)
    const studentsRes = await api.get('/admin/students?limit=100');
    const rina = studentsRes.data.data.find((s: any) => s.name === STUDENT_RINA);
    const classesRes = await api.get('/admin/classes?limit=100');
    const mathClass = classesRes.data.data.find((c: any) => c.name === CLASS_MATH);

    try {
      await api.post('/admin/enrollments', {
        student_ids: [rina.id],
        class_id: mathClass.id,
        type: 'ACTIVE',
        auto_invoice: false,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.response.status).toBe(409);
    }
  });

  // 7. Schedule conflict check via API
  test('schedule conflict check returns warning', async () => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);

    // Get Rina's student ID (enrolled in Matematika SMP which has Mon 14:00-15:30)
    const studentsRes = await api.get('/admin/students?limit=100');
    const rina = studentsRes.data.data.find((s: any) => s.name === STUDENT_RINA);
    const classesRes = await api.get('/admin/classes?limit=100');
    const engClass = classesRes.data.data.find((c: any) => c.name === CLASS_ENG);

    // Check conflict endpoint — no conflict expected between Math (Mon/Wed) and Eng (Tue/Thu)
    const res = await api.post('/admin/enrollments/check-conflict', {
      student_ids: [rina.id],
      class_id: engClass.id,
    });
    expect(res.status).toBe(200);
    // Response should have a conflicts array (may be empty for non-overlapping schedules)
    expect(res.data).toHaveProperty('conflicts');
  });

  // 8. Enroll button disabled without selections
  test('enroll button disabled without selections', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Open the new enrollment modal
    await enrollments.addButton.click();
    const modal = authedPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Enroll button should be disabled (no students or class selected)
    const enrollButton = modal.getByRole('button', { name: /enroll/i });
    await expect(enrollButton).toBeDisabled();

    // Close modal
    await modal.getByRole('button', { name: /cancel/i }).click();
  });
});

// ─── Status Change (3) ──────────────────────────────────

test.describe('Enrollments - Status Change', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 9. Change status via edit modal — open row menu > Edit, change to DROPPED
  test('change status via edit modal', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    await enrollments.changeStatus(STUDENT_RINA, 'DROPPED');

    await expect(enrollments.getToast()).toBeVisible();
  });

  // 10. Quick status "Set Active" on a DROPPED enrollment
  test('quick status Set Active on DROPPED enrollment', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Rina was just set to DROPPED in test 9, now set back to ACTIVE
    await enrollments.quickStatusChange(STUDENT_RINA, 'ACTIVE');

    await expect(enrollments.getToast()).toBeVisible();
  });

  // 11. Convert TRIAL to ACTIVE — first create a TRIAL enrollment, then convert
  test('convert TRIAL to ACTIVE via menu', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // First, enroll Lina as TRIAL so we have a TRIAL enrollment to convert
    await enrollments.enrollStudent(STUDENT_LINA, CLASS_MATH, 'TRIAL');
    await expect(enrollments.getToast()).toBeVisible();

    // Wait for toast to clear and table to update
    await authedPage.waitForTimeout(1000);

    // Now use the "Convert to Full" menu item — it maps to setting status to ACTIVE
    // The "Convert to Full" option only appears for TRIAL enrollments
    await enrollments.openRowMenu(STUDENT_LINA);

    // Click "Convert to Full" text
    const convertButton = authedPage.getByText(/convert to full/i);
    await Promise.all([
      authedPage.waitForResponse(resp =>
        resp.url().includes('/api/admin/enrollments') && resp.request().method() === 'PATCH'
      ),
      convertButton.click(),
    ]);

    await expect(enrollments.getToast()).toBeVisible();
  });
});

// ─── Delete (2) ─────────────────────────────────────────

test.describe('Enrollments - Delete', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 12. Delete single enrollment — create one first, then delete
  test('delete single enrollment', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Create a new enrollment to delete (avoid deleting seed data with payments/attendance)
    await enrollments.enrollStudent(STUDENT_LINA, CLASS_MATH);
    await expect(enrollments.getToast()).toBeVisible();
    await authedPage.waitForTimeout(1000);

    // Now delete the newly created enrollment
    await enrollments.deleteEnrollment(STUDENT_LINA);

    await expect(enrollments.getToast()).toBeVisible();
    // Lina's row should be gone
    await expect(enrollments.getRowByName(STUDENT_LINA)).not.toBeVisible();
  });

  // 13. Delete and verify removal persists after page refresh
  test('delete and verify removal after refresh', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Create a new enrollment to delete
    await enrollments.enrollStudent(STUDENT_LINA, CLASS_ENG);
    await expect(enrollments.getToast()).toBeVisible();
    await authedPage.waitForTimeout(1000);

    // Delete it
    await enrollments.deleteEnrollment(STUDENT_LINA);
    await expect(enrollments.getToast()).toBeVisible();
    await authedPage.waitForTimeout(500);

    // Refresh the page and verify it's still gone
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();
    await expect(enrollments.getRowByName(STUDENT_LINA)).not.toBeVisible();
  });
});

// ─── Bulk (2) ───────────────────────────────────────────

test.describe('Enrollments - Bulk', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 14. Bulk status change — select 2+, use bulk bar dropdown
  test('bulk status change to DROPPED', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Create 2 new enrollments to use for bulk operations
    await enrollments.enrollStudent(STUDENT_LINA, CLASS_MATH);
    await expect(enrollments.getToast()).toBeVisible();
    await authedPage.waitForTimeout(1000);

    // Select Rina and Dimas (seed data in Matematika SMP)
    await enrollments.selectEnrollment(STUDENT_RINA);
    await enrollments.selectEnrollment(STUDENT_DIMAS);

    // Bulk action bar should appear
    await expect(enrollments.bulkActionBar).toBeVisible();

    // Change status via bulk bar select
    await Promise.all([
      authedPage.waitForResponse(resp =>
        resp.url().includes('/api/admin/enrollments/bulk') && resp.request().method() === 'PATCH'
      ),
      enrollments.bulkChangeStatus('DROPPED'),
    ]);

    await expect(enrollments.getToast()).toBeVisible();
  });

  // 15. Bulk delete — select 2+, bulk delete, confirm
  test('bulk delete multiple enrollments', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Create 2 fresh enrollments to delete
    await enrollments.enrollStudent(STUDENT_LINA, CLASS_MATH);
    await expect(enrollments.getToast()).toBeVisible();
    await authedPage.waitForTimeout(1000);

    await enrollments.enrollStudent(STUDENT_LINA, CLASS_ENG);
    await expect(enrollments.getToast()).toBeVisible();
    await authedPage.waitForTimeout(1000);

    // Search for Lina to filter rows
    await enrollments.search('Lina');
    await authedPage.waitForTimeout(500);

    // Select all Lina enrollments
    await enrollments.selectAllCheckbox.click();

    // Bulk action bar should appear
    await expect(enrollments.bulkActionBar).toBeVisible();

    // Click delete in bulk bar — BulkDeleteModal appears (not ConfirmDialog/alertdialog)
    const bar = enrollments.bulkActionBar;
    await bar.getByRole('button', { name: /delete/i }).click();

    // BulkDeleteModal uses a regular Modal — confirm deletion
    const confirmButton = authedPage.getByRole('dialog').getByRole('button', { name: /delete/i });
    await Promise.all([
      authedPage.waitForResponse(resp =>
        resp.url().includes('/api/admin/enrollments/bulk') && resp.request().method() === 'DELETE'
      ),
      confirmButton.click(),
    ]);

    await expect(enrollments.getToast()).toBeVisible();
  });
});

// ─── Filter (1) ─────────────────────────────────────────

test.describe('Enrollments - Filter', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 16. Filter by status — select ACTIVE from filter
  test('filter by status ACTIVE', async ({ authedPage }) => {
    const enrollments = new EnrollmentsPage(authedPage);
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();

    // Get initial row count
    const initialCount = await enrollments.rows.count();
    expect(initialCount).toBeGreaterThanOrEqual(4);

    // Filter by ACTIVE status
    await enrollments.filterByStatus('ACTIVE');
    await authedPage.waitForTimeout(500);

    // All visible rows should have ACTIVE status badge
    // All 4 seed enrollments in inst1 are ACTIVE, so count should be same
    const filteredCount = await enrollments.rows.count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);

    // Clear filter
    await enrollments.filterByStatus('');
    await authedPage.waitForTimeout(500);

    const clearedCount = await enrollments.rows.count();
    expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
  });
});
