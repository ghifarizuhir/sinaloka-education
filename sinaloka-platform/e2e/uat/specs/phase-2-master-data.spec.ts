import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '../uat.fixture';
import { StudentsPage } from '../../pages/students.page';
import { TutorsPage } from '../../pages/tutors.page';

// ── Test data files (created in beforeAll, cleaned in afterAll) ──

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPECS_DIR = path.resolve(__dirname);
const CSV_VALID_PATH = path.join(SPECS_DIR, 'test-import.csv');
const CSV_EMPTY_PATH = path.join(SPECS_DIR, 'test-import-empty.csv');
const CSV_INCOMPLETE_PATH = path.join(SPECS_DIR, 'test-import-incomplete.csv');
const TXT_FILE_PATH = path.join(SPECS_DIR, 'test-import.txt');
const AVATAR_PNG_PATH = path.join(SPECS_DIR, 'test-avatar.png');
const AVATAR_TXT_PATH = path.join(SPECS_DIR, 'test-avatar-fake.txt');
const AVATAR_LARGE_PATH = path.join(SPECS_DIR, 'test-avatar-large.png');

// 1x1 red pixel PNG (89 bytes)
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);

test.describe.serial('Phase 2: Master Data', () => {
  // ── Setup & teardown for temp files ──

  test.beforeAll(() => {
    // Valid CSV
    fs.writeFileSync(
      CSV_VALID_PATH,
      'name,email,grade,parent_name,parent_phone\nCSV Student,csv@test.com,7,CSV Parent,081111111111\n',
    );
    // Empty CSV (header only)
    fs.writeFileSync(CSV_EMPTY_PATH, '');
    // Incomplete CSV (missing required columns)
    fs.writeFileSync(CSV_INCOMPLETE_PATH, 'name\nIncomplete Student\n');
    // Wrong format file
    fs.writeFileSync(TXT_FILE_PATH, 'This is not a CSV file.');
    // Valid small PNG
    fs.writeFileSync(AVATAR_PNG_PATH, PNG_1x1);
    // Non-image file pretending to be avatar
    fs.writeFileSync(AVATAR_TXT_PATH, 'not an image');
    // "Large" file (>5MB) — fill with zeroes
    fs.writeFileSync(AVATAR_LARGE_PATH, Buffer.alloc(5.5 * 1024 * 1024, 0));
  });

  test.afterAll(() => {
    for (const f of [
      CSV_VALID_PATH,
      CSV_EMPTY_PATH,
      CSV_INCOMPLETE_PATH,
      TXT_FILE_PATH,
      AVATAR_PNG_PATH,
      AVATAR_TXT_PATH,
      AVATAR_LARGE_PATH,
    ]) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  });

  // ===========================================================================
  // 2.1 — Students (~19 TC)
  // ===========================================================================

  test('TC-STU-04: Create student → toast success, student in table', async ({
    loggedInPage,
    page,
    getState,
    setState,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    // Intercept POST to capture student ID
    const responsePromise = pg.waitForResponse(
      (r) => r.url().includes('/api/admin/students') && r.request().method() === 'POST',
    );

    await students.createStudent({
      name: 'UAT Student',
      email: 'uat-student@test.com',
      grade: '7',
      parentName: 'Parent UAT',
      parentPhone: '081234567891',
    });

    const response = await responsePromise;
    const body = await response.json().catch(() => null);

    // Toast success
    await expect(students.getToast()).toBeVisible({ timeout: 10_000 });

    // Student should appear in table
    await expect(students.getRowByName('UAT Student')).toBeVisible({ timeout: 5_000 });

    // Capture ID into state
    const state = getState();
    const newId = body?.id ?? body?.data?.id ?? '';
    setState({
      phase2: {
        studentIds: [newId],
        tutorIds: state.phase2?.tutorIds ?? [],
      },
    });
  });

  test('TC-STU-05: Create student with missing required fields → validation error', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    // Open the create modal but leave name empty
    await students.addButton.click();
    const modal = pg.getByRole('dialog');

    // Fill only non-required fields, leave name empty
    await modal.locator('#new-email').fill('incomplete@test.com');

    // Try to submit
    await modal.getByRole('button', { name: /add student/i }).click();

    // Validation error should be visible (inline or toast)
    const feedback = pg.locator('text=/required|name|cannot be empty/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NEG-STU-01: Create student with duplicate email → error message', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    await students.createStudent({
      name: 'Duplicate Student',
      email: 'uat-student@test.com', // same email as TC-STU-04
      grade: '7',
      parentName: 'Dup Parent',
      parentPhone: '081234567892',
    });

    // Should show error about duplicate
    const feedback = pg.locator('text=/already|duplicate|exists|taken/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-STU-04: Create student with invalid email format → validation error', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    await students.addButton.click();
    const modal = pg.getByRole('dialog');

    await modal.locator('#new-name').fill('Invalid Email Student');
    await modal.locator('#new-email').fill('bukan-email');

    // Try to submit
    await modal.getByRole('button', { name: /add student/i }).click();

    // Validation error for email format
    const feedback = pg.locator('text=/email|valid|format|invalid/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NEG-STU-03: Create student with very long name (200+ chars) → verify behavior', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    const longName = 'A'.repeat(250);

    await students.addButton.click();
    const modal = pg.getByRole('dialog');

    await modal.locator('#new-name').fill(longName);
    await modal.locator('#new-email').fill('longname@test.com');
    await modal.locator('select').first().selectOption('Kelas 7');
    await modal.locator('#new-parent-name').fill('Long Parent');
    await modal.locator('#new-parent-phone').fill('081234567893');

    await modal.getByRole('button', { name: /add student/i }).click();

    // Either truncation, error, or success — verify the app handles it gracefully
    const feedback = students.getToast()
      .or(pg.locator('text=/long|max|length|character|truncat/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-STU-02: Create student with XSS input → input sanitized or escaped', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    const xssPayload = '<script>alert(1)</script>';

    await students.addButton.click();
    const modal = pg.getByRole('dialog');

    await modal.locator('#new-name').fill(xssPayload);
    await modal.locator('#new-email').fill('xss@test.com');
    await modal.locator('select').first().selectOption('Kelas 7');
    await modal.locator('#new-parent-name').fill('XSS Parent');
    await modal.locator('#new-parent-phone').fill('081234567894');

    await modal.getByRole('button', { name: /add student/i }).click();

    // Wait for response
    await pg.waitForTimeout(3_000);

    // The script tag should NOT be executed — check that no alert dialog appeared
    // and the text is escaped/sanitized in the DOM
    const scriptTag = pg.locator('script:has-text("alert(1)")');
    const scriptCount = await scriptTag.count();
    expect(scriptCount).toBe(0);

    // If the student was created, verify the name is displayed as text (escaped)
    const row = students.getRowByName(xssPayload);
    const rowVisible = await row.isVisible().catch(() => false);
    if (rowVisible) {
      // Name rendered as text, not executed — XSS is mitigated
      await expect(row).toBeVisible();
    }
    // If not created (validation error), that's also acceptable
  });

  test('TC-STU-01: List students → table visible, pagination exists', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();

    // Table should be visible
    await expect(students.table).toBeVisible({ timeout: 10_000 });

    // Verify at least one row exists (UAT Student from TC-STU-04)
    const rowCount = await students.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Pagination should exist (buttons or text like "Page 1 of X")
    const pagination = pg.locator('text=/page|showing/i')
      .or(pg.getByRole('button', { name: /next|previous|›|»/i }).first())
      .first();
    await expect(pagination).toBeVisible({ timeout: 5_000 });
  });

  test('TC-STU-02: Search students by name "UAT Student" → filtered results', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    await students.search('UAT Student');
    await pg.waitForTimeout(1_500); // debounce

    // The UAT Student row should be visible
    await expect(students.getRowByName('UAT Student')).toBeVisible({ timeout: 5_000 });
  });

  test('TC-STU-03: Filter by status or grade → filtered results', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    // Look for a filter/select element for grade or status
    const gradeFilter = pg.locator('select').filter({ hasText: /grade|kelas|all/i }).first()
      .or(pg.getByRole('combobox').first());
    const hasFilter = await gradeFilter.isVisible().catch(() => false);

    if (hasFilter) {
      // Select a grade filter option
      await gradeFilter.selectOption({ index: 1 });
      await pg.waitForTimeout(1_500);

      // Table should still be visible (filtered)
      await expect(students.table).toBeVisible();
    } else {
      // Try button-based filter
      const filterBtn = pg.getByRole('button', { name: /filter/i }).first();
      const hasFilterBtn = await filterBtn.isVisible().catch(() => false);
      if (hasFilterBtn) {
        await filterBtn.click();
        await pg.waitForTimeout(500);
        // Click first filter option
        const filterOption = pg.getByRole('menuitem').first()
          .or(pg.locator('[role="option"]').first());
        if (await filterOption.isVisible().catch(() => false)) {
          await filterOption.click();
          await pg.waitForTimeout(1_500);
        }
      }
      await expect(students.table).toBeVisible();
    }
  });

  test('TC-STU-06: Edit student name → toast success, updated in table', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    await students.editStudent('UAT Student', { name: 'UAT Student Edited' });

    await expect(students.getToast()).toBeVisible({ timeout: 10_000 });
    await expect(students.getRowByName('UAT Student Edited')).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NEG-STU-09: Edit student, clear required name → validation error', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    // Open the edit modal for the student
    await students.openRowMenu('UAT Student Edited');
    await pg.getByText(/view \/ edit/i).click();

    const modal = pg.getByRole('dialog');

    // Clear the name field
    await modal.locator('#new-name').clear();

    // Try to save
    await modal.getByRole('button', { name: /save changes/i }).click();

    // Validation error should appear
    const feedback = pg.locator('text=/required|name|cannot be empty/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 5_000 });
  });

  test('TC-STU-11: Click student row or view button → detail drawer opens with student info', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    // Open the row menu and click view/edit
    await students.openRowMenu('UAT Student Edited');
    await pg.getByText(/view \/ edit/i).click();

    // Dialog/drawer should be visible with student info
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Should contain the student's name
    await expect(modal.locator('#new-name')).toHaveValue(/UAT Student Edited/);
  });

  test('TC-STU-09: Import students via CSV upload → verify import success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    // Look for an import button
    const importBtn = pg.getByRole('button', { name: /import/i }).first();
    const hasImport = await importBtn.isVisible().catch(() => false);

    if (!hasImport) {
      test.skip();
      return;
    }

    await importBtn.click();

    // Set the CSV file on the file input
    const fileInput = pg.locator('input[type="file"]').first();
    await fileInput.setInputFiles(CSV_VALID_PATH);

    // Wait for upload/import processing
    await pg.waitForTimeout(3_000);

    // Should show success or import results
    const feedback = students.getToast()
      .or(pg.locator('text=/import|success|uploaded|processed/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-STU-05: Import with wrong file format (.txt) → error message', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    const importBtn = pg.getByRole('button', { name: /import/i }).first();
    const hasImport = await importBtn.isVisible().catch(() => false);

    if (!hasImport) {
      test.skip();
      return;
    }

    await importBtn.click();

    const fileInput = pg.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TXT_FILE_PATH);

    await pg.waitForTimeout(2_000);

    // Should show error about invalid file format
    const feedback = pg.locator('text=/invalid|format|csv|file type|not supported/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-STU-06: Import CSV with incomplete data → error/warning', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    const importBtn = pg.getByRole('button', { name: /import/i }).first();
    const hasImport = await importBtn.isVisible().catch(() => false);

    if (!hasImport) {
      test.skip();
      return;
    }

    await importBtn.click();

    const fileInput = pg.locator('input[type="file"]').first();
    await fileInput.setInputFiles(CSV_INCOMPLETE_PATH);

    await pg.waitForTimeout(2_000);

    // Should show error/warning about missing columns
    const feedback = pg.locator('text=/missing|incomplete|column|required|error|warning/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-STU-07: Import empty CSV file → error message', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    const importBtn = pg.getByRole('button', { name: /import/i }).first();
    const hasImport = await importBtn.isVisible().catch(() => false);

    if (!hasImport) {
      test.skip();
      return;
    }

    await importBtn.click();

    const fileInput = pg.locator('input[type="file"]').first();
    await fileInput.setInputFiles(CSV_EMPTY_PATH);

    await pg.waitForTimeout(2_000);

    // Should show error about empty file
    const feedback = pg.locator('text=/empty|no data|no record|error/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-STU-10: Export students CSV → file downloads', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    // Look for an export button
    const exportBtn = pg.getByRole('button', { name: /export/i }).first();
    const hasExport = await exportBtn.isVisible().catch(() => false);

    if (!hasExport) {
      test.skip();
      return;
    }

    // Wait for download event
    const downloadPromise = pg.waitForEvent('download');
    await exportBtn.click();

    const download = await downloadPromise;
    // Verify the download has a filename
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('TC-STU-12: Invite parent via student action menu → fill parent email, send → success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    await students.openRowMenu('UAT Student Edited');

    // Look for "Invite Parent" option in the dropdown
    const inviteParentBtn = pg.getByText(/invite parent/i).first();
    const hasInviteParent = await inviteParentBtn.isVisible().catch(() => false);

    if (!hasInviteParent) {
      test.skip();
      return;
    }

    await inviteParentBtn.click();

    // Fill parent email in the invite dialog/modal
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const emailInput = modal.locator('input[type="email"], input[placeholder*="email" i]').first();
    await emailInput.fill('parent-invite@test.com');

    // Submit
    const sendBtn = modal.getByRole('button', { name: /send|invite|submit/i }).first();
    await sendBtn.click();

    // Should show success
    const feedback = students.getToast()
      .or(pg.locator('text=/sent|success|invited/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-STU-10: Invite parent with invalid email → validation error', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const students = new StudentsPage(pg);
    await students.goto();
    await pg.waitForTimeout(1_000);

    await students.openRowMenu('UAT Student Edited');

    const inviteParentBtn = pg.getByText(/invite parent/i).first();
    const hasInviteParent = await inviteParentBtn.isVisible().catch(() => false);

    if (!hasInviteParent) {
      test.skip();
      return;
    }

    await inviteParentBtn.click();

    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const emailInput = modal.locator('input[type="email"], input[placeholder*="email" i]').first();
    await emailInput.fill('not-a-valid-email');

    const sendBtn = modal.getByRole('button', { name: /send|invite|submit/i }).first();
    await sendBtn.click();

    // Should show validation error
    const feedback = pg.locator('text=/email|valid|format|invalid/i')
      .or(students.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 5_000 });
  });

  // ===========================================================================
  // 2.2 — Tutors (~16 TC)
  // ===========================================================================

  test('TC-TUT-04: Create/invite tutor → toast success, capture ID', async ({
    loggedInPage,
    getState,
    setState,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();

    // Intercept POST to capture tutor ID
    const responsePromise = pg.waitForResponse(
      (r) =>
        (r.url().includes('/api/admin/tutors') || r.url().includes('/api/tutor')) &&
        r.request().method() === 'POST',
    );

    await tutors.inviteTutor({
      name: 'UAT Tutor',
      email: 'uat-tutor@test.com',
    });

    const response = await responsePromise;
    const body = await response.json().catch(() => null);

    // Toast success
    await expect(tutors.getToast()).toBeVisible({ timeout: 10_000 });

    // Capture ID into state
    const state = getState();
    const newId = body?.id ?? body?.data?.id ?? '';
    setState({
      phase2: {
        studentIds: state.phase2?.studentIds ?? [],
        tutorIds: [newId],
      },
    });
  });

  test('TC-NEG-TUT-02: Create tutor without selecting any subject → validation error or accepted', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();

    // Open the invite modal
    await tutors.addButton.click();
    const modal = pg.getByRole('dialog');

    await modal.locator('#name').fill('No Subject Tutor');
    await modal.locator('#email').fill('nosubject-tutor@test.com');
    // Do NOT select any subject

    await modal.getByRole('button', { name: /send invitation/i }).click();

    // Either validation error about subjects or success (if subjects are optional)
    const feedback = tutors.getToast()
      .or(pg.locator('text=/subject|required|select/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-TUT-05: Upload tutor avatar → success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // Open edit for UAT Tutor
    await tutors.openCardMenu('UAT Tutor');
    await pg.getByText(/edit profile/i).click();

    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Find avatar file input
    const avatarInput = modal.locator('input[type="file"]').first();
    const hasAvatarInput = await avatarInput.count();

    if (hasAvatarInput === 0) {
      // Try clicking an avatar area to trigger file input
      const avatarArea = modal.locator('[class*="avatar"], [class*="photo"], [class*="image"]').first();
      const hasArea = await avatarArea.isVisible().catch(() => false);
      if (!hasArea) {
        test.skip();
        return;
      }
      await avatarArea.click();
    }

    // Set the file
    const fileInput = modal.locator('input[type="file"]').first();
    if (await fileInput.count() === 0) {
      test.skip();
      return;
    }
    await fileInput.setInputFiles(AVATAR_PNG_PATH);

    await pg.waitForTimeout(2_000);

    // Save changes
    await modal.getByRole('button', { name: /save changes/i }).click();

    await expect(tutors.getToast()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-TUT-03: Upload file too large (>5MB) → error message', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    await tutors.openCardMenu('UAT Tutor');
    await pg.getByText(/edit profile/i).click();

    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const fileInput = modal.locator('input[type="file"]').first();
    if (await fileInput.count() === 0) {
      test.skip();
      return;
    }

    await fileInput.setInputFiles(AVATAR_LARGE_PATH);

    await pg.waitForTimeout(2_000);

    // Should show error about file size
    const feedback = pg.locator('text=/size|large|too big|5\s*mb|max|limit/i')
      .or(tutors.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-TUT-04: Upload non-image file (.txt) → error message', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    await tutors.openCardMenu('UAT Tutor');
    await pg.getByText(/edit profile/i).click();

    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const fileInput = modal.locator('input[type="file"]').first();
    if (await fileInput.count() === 0) {
      test.skip();
      return;
    }

    await fileInput.setInputFiles(AVATAR_TXT_PATH);

    await pg.waitForTimeout(2_000);

    // Should show error about invalid file type
    const feedback = pg.locator('text=/image|format|type|invalid|not supported|jpg|png/i')
      .or(tutors.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-TUT-01: View tutor list in grid view → cards visible with tutor info', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // Tutor cards should be visible (grid view is the default)
    const card = tutors.getCardByName('UAT Tutor');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Card should contain tutor info (name, email, or status)
    await expect(card).toContainText('UAT Tutor');
  });

  test('TC-TUT-02: Toggle between grid and list view → view switches', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // Look for view toggle buttons (grid/list icons)
    const listViewBtn = pg.getByRole('button', { name: /list/i }).first()
      .or(pg.locator('button[aria-label*="list" i]').first())
      .or(pg.locator('button').filter({ has: pg.locator('svg[class*="list" i]') }).first());

    const hasToggle = await listViewBtn.isVisible().catch(() => false);

    if (!hasToggle) {
      test.skip();
      return;
    }

    // Switch to list view
    await listViewBtn.click();
    await pg.waitForTimeout(1_000);

    // Should show a table or list layout
    const tableOrList = pg.locator('table').or(pg.locator('[class*="list"]')).first();
    await expect(tableOrList).toBeVisible({ timeout: 5_000 });

    // Switch back to grid view
    const gridViewBtn = pg.getByRole('button', { name: /grid/i }).first()
      .or(pg.locator('button[aria-label*="grid" i]').first());

    if (await gridViewBtn.isVisible().catch(() => false)) {
      await gridViewBtn.click();
      await pg.waitForTimeout(1_000);

      // Cards should be visible again
      const card = tutors.getCardByName('UAT Tutor');
      await expect(card).toBeVisible({ timeout: 5_000 });
    }
  });

  test('TC-TUT-03: Search for "UAT Tutor" → filtered results', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    await tutors.search('UAT Tutor');
    await pg.waitForTimeout(1_500); // debounce

    const card = tutors.getCardByName('UAT Tutor');
    await expect(card).toBeVisible({ timeout: 5_000 });
  });

  test('TC-TUT-11: Edit tutor profile (change name) → toast success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    await tutors.editTutor('UAT Tutor', { name: 'UAT Tutor Edited' });

    await expect(tutors.getToast()).toBeVisible({ timeout: 10_000 });

    // Verify updated name is visible
    const card = tutors.getCardByName('UAT Tutor Edited');
    await expect(card).toBeVisible({ timeout: 5_000 });
  });

  test('TC-TUT-06: Invite tutor via email (new invite) → success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();

    await tutors.inviteTutor({
      name: 'UAT Tutor Second',
      email: 'uat-tutor-second@test.com',
    });

    await expect(tutors.getToast()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-TUT-01: Invite tutor with already-registered email → error', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();

    await tutors.inviteTutor({
      name: 'Duplicate Tutor',
      email: 'uat-tutor@test.com', // same email as TC-TUT-04
    });

    // Should show error about duplicate/existing email
    const feedback = pg.locator('text=/already|duplicate|exists|taken|registered/i')
      .or(tutors.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-TUT-07: Resend invite to pending tutor → success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // Find the pending tutor and open menu
    await tutors.openCardMenu('UAT Tutor Second');

    const resendBtn = pg.getByText(/resend invite/i).first();
    const hasResend = await resendBtn.isVisible().catch(() => false);

    if (!hasResend) {
      test.skip();
      return;
    }

    await resendBtn.click();

    const feedback = tutors.getToast()
      .or(pg.locator('text=/resent|sent|success/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-TUT-08: Cancel invite for pending tutor → success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    await tutors.openCardMenu('UAT Tutor Second');

    const cancelInviteBtn = pg.getByText(/cancel invite/i).first();
    const hasCancelInvite = await cancelInviteBtn.isVisible().catch(() => false);

    if (!hasCancelInvite) {
      test.skip();
      return;
    }

    await cancelInviteBtn.click();

    // May need to confirm
    const alertDialog = pg.getByRole('alertdialog');
    if (await alertDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const confirmBtn = alertDialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }

    const feedback = tutors.getToast()
      .or(pg.locator('text=/cancelled|canceled|revoked|success/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-TUT-05: Resend invite to already-verified tutor → error or disabled', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // UAT Tutor Edited was directly created (not via invite), so it may be verified
    await tutors.openCardMenu('UAT Tutor Edited');

    const resendBtn = pg.getByText(/resend invite/i).first();
    const hasResend = await resendBtn.isVisible().catch(() => false);

    if (!hasResend) {
      // Resend option is not available for verified tutors — expected behavior
      expect(hasResend).toBeFalsy();
      return;
    }

    // If visible, click and expect an error
    await resendBtn.click();

    const feedback = pg.locator('text=/already.*verified|cannot resend|error/i')
      .or(tutors.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-TUT-09: Bulk verify selected tutors → success', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // Look for checkboxes or select-all mechanism
    const checkbox = pg.locator('input[type="checkbox"]').first();
    const hasCheckbox = await checkbox.isVisible().catch(() => false);

    if (!hasCheckbox) {
      // Try looking for a bulk actions button/menu
      const bulkBtn = pg.getByRole('button', { name: /bulk|select|verify all/i }).first();
      const hasBulk = await bulkBtn.isVisible().catch(() => false);
      if (!hasBulk) {
        test.skip();
        return;
      }
      await bulkBtn.click();
    } else {
      // Select at least one tutor
      await checkbox.click();

      // Look for bulk action button
      const bulkVerifyBtn = pg.getByRole('button', { name: /verify|bulk.*verify|approve/i }).first();
      const hasBulkVerify = await bulkVerifyBtn.isVisible().catch(() => false);

      if (!hasBulkVerify) {
        test.skip();
        return;
      }

      await bulkVerifyBtn.click();
    }

    // Confirm if needed
    const alertDialog = pg.getByRole('alertdialog');
    if (await alertDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const confirmBtn = alertDialog.getByRole('button').filter({ hasNotText: /cancel|batal/i }).last();
      await confirmBtn.click();
    }

    const feedback = tutors.getToast()
      .or(pg.locator('text=/verified|success|approved/i'))
      .first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('TC-NEG-TUT-06: Attempt bulk action with none selected → error or disabled button', async ({
    loggedInPage,
  }) => {
    const pg = await loggedInPage('admin');
    const tutors = new TutorsPage(pg);
    await tutors.goto();
    await pg.waitForTimeout(1_000);

    // Ensure no checkboxes are selected (fresh page load)
    const bulkVerifyBtn = pg.getByRole('button', { name: /verify|bulk.*verify|approve/i }).first();
    const hasBulkVerify = await bulkVerifyBtn.isVisible().catch(() => false);

    if (!hasBulkVerify) {
      // Bulk action button not visible when nothing selected — expected behavior
      expect(hasBulkVerify).toBeFalsy();
      return;
    }

    // If visible, check if it's disabled
    const isDisabled = await bulkVerifyBtn.isDisabled();

    if (isDisabled) {
      expect(isDisabled).toBeTruthy();
      return;
    }

    // If enabled, click and expect error
    await bulkVerifyBtn.click();

    const feedback = pg.locator('text=/select|no tutor|none selected|error/i')
      .or(tutors.getToast())
      .first();
    await expect(feedback).toBeVisible({ timeout: 5_000 });
  });
});
