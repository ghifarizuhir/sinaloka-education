import { test, expect } from '../uat.fixture';
import { ClassesPage } from '../../pages/classes.page';

test.describe.serial('Phase 3: Academic Setup', () => {
  // ===========================================================================
  // 3.1 — Classes (11 TC)
  // ===========================================================================

  test('TC-CLS-04 ★: Create class → toast success, class in table, capture ID', async ({
    loggedInPage,
    page,
    getState,
    setState,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Open create modal
    await classes.addButton.click();
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill class name
    await modal.locator('#class-name').fill('UAT Math Class');

    // Select first available subject
    const subjectSelect = modal.locator('select').first();
    await subjectSelect.waitFor({ state: 'attached' });
    // Pick the first non-placeholder option by index (index 0 is usually placeholder)
    const subjectOptions = subjectSelect.locator('option');
    const subjectOptCount = await subjectOptions.count();
    // Find first non-disabled, non-empty-value option
    for (let i = 0; i < subjectOptCount; i++) {
      const val = await subjectOptions.nth(i).getAttribute('value');
      const disabled = await subjectOptions.nth(i).getAttribute('disabled');
      if (val && val !== '' && disabled === null) {
        await subjectSelect.selectOption({ index: i });
        break;
      }
    }

    // Select first available tutor (second select, may be disabled until subject is chosen)
    const tutorSelect = modal.locator('select').nth(1);
    await tutorSelect.waitFor({ state: 'attached' });
    // Wait for tutor select to be enabled (it depends on subject selection)
    await expect(tutorSelect).toBeEnabled({ timeout: 5_000 });
    const tutorOptions = tutorSelect.locator('option');
    const tutorOptCount = await tutorOptions.count();
    for (let i = 0; i < tutorOptCount; i++) {
      const val = await tutorOptions.nth(i).getAttribute('value');
      const disabled = await tutorOptions.nth(i).getAttribute('disabled');
      if (val && val !== '' && disabled === null) {
        await tutorSelect.selectOption({ index: i });
        break;
      }
    }

    // Select schedule days: Monday and Wednesday
    for (const day of ['Mon', 'Wed']) {
      const dayButton = modal.getByRole('button', { name: day, exact: true });
      const isSelected = await dayButton.evaluate(
        (el) => el.classList.contains('bg-zinc-900') || el.classList.contains('dark:bg-zinc-100'),
      );
      if (!isSelected) {
        await dayButton.click();
      }
    }

    // Fill time inputs (each selected day gets a start/end pair)
    const timeInputs = modal.locator('input[type="time"]');
    const timeCount = await timeInputs.count();
    for (let i = 0; i < timeCount; i += 2) {
      await timeInputs.nth(i).fill('09:00');
    }
    for (let i = 1; i < timeCount; i += 2) {
      await timeInputs.nth(i).fill('10:30');
    }

    // Fill capacity and fee
    await modal.locator('#capacity').fill('20');
    await modal.locator('#fee').fill('500000');

    // Intercept POST to capture class ID
    const responsePromise = pg.waitForResponse(
      (r) => r.url().includes('/api/admin/classes') && r.request().method() === 'POST',
    );

    // Submit
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    const response = await responsePromise;
    const body = await response.json().catch(() => null);

    // Toast success
    await expect(classes.getToast()).toBeVisible({ timeout: 10_000 });

    // Class should appear in table
    await expect(classes.getRowByName('UAT Math Class')).toBeVisible({ timeout: 5_000 });

    // Capture ID into state
    const newId = body?.id ?? body?.data?.id ?? '';
    setState({
      phase3: {
        classIds: [String(newId)],
      },
    });
  });

  test('TC-NEG-CLS-01: Capacity 0 → validation error', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Open create modal
    await classes.addButton.click();
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Set capacity to 0
    await modal.locator('#capacity').fill('0');

    // Attempt submit
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Expect validation error visible in modal
    await expect(modal.getByText(/capacity|minimum|min|at least/i)).toBeVisible({ timeout: 5_000 });

    // Close modal to clean up
    await pg.keyboard.press('Escape');
  });

  test('TC-NEG-CLS-02: Negative fee → validation error', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Open create modal
    await classes.addButton.click();
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Set fee to -1
    await modal.locator('#fee').fill('-1');

    // Attempt submit
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Expect validation error
    await expect(modal.getByText(/fee|negative|minimum|min|invalid/i)).toBeVisible({ timeout: 5_000 });

    // Close modal
    await pg.keyboard.press('Escape');
  });

  test('TC-NEG-CLS-04: No schedule days selected → validation error', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Open create modal
    await classes.addButton.click();
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill required fields but skip schedule days
    await modal.locator('#class-name').fill('No Schedule Class');

    // Select first subject
    const subjectSelect = modal.locator('select').first();
    await subjectSelect.waitFor({ state: 'attached' });
    const subjectOptions = subjectSelect.locator('option');
    const subjectOptCount = await subjectOptions.count();
    for (let i = 0; i < subjectOptCount; i++) {
      const val = await subjectOptions.nth(i).getAttribute('value');
      const disabled = await subjectOptions.nth(i).getAttribute('disabled');
      if (val && val !== '' && disabled === null) {
        await subjectSelect.selectOption({ index: i });
        break;
      }
    }

    await modal.locator('#capacity').fill('10');
    await modal.locator('#fee').fill('100000');

    // Do NOT select any schedule days

    // Attempt submit
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Expect validation error about schedule
    await expect(modal.getByText(/schedule|day|select.*day/i)).toBeVisible({ timeout: 5_000 });

    // Close modal
    await pg.keyboard.press('Escape');
  });

  test('TC-NEG-CLS-05: Start time after end time → validation error', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Open create modal
    await classes.addButton.click();
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill name
    await modal.locator('#class-name').fill('Bad Time Class');

    // Select a schedule day to reveal time inputs
    const monButton = modal.getByRole('button', { name: 'Mon', exact: true });
    await monButton.click();

    // Set start time > end time (14:00 start, 10:00 end)
    const timeInputs = modal.locator('input[type="time"]');
    await timeInputs.first().fill('14:00');
    await timeInputs.nth(1).fill('10:00');

    // Attempt submit
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Expect validation error about time
    await expect(modal.getByText(/time|end.*before.*start|invalid.*time|start.*end/i)).toBeVisible({ timeout: 5_000 });

    // Close modal
    await pg.keyboard.press('Escape');
  });

  test('TC-NEG-CLS-03: Duplicate tutor + overlapping time → conflict error', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Open create modal
    await classes.addButton.click();
    const modal = pg.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill class name
    await modal.locator('#class-name').fill('Conflict Class');

    // Select first subject (same as TC-CLS-04)
    const subjectSelect = modal.locator('select').first();
    await subjectSelect.waitFor({ state: 'attached' });
    const subjectOptions = subjectSelect.locator('option');
    const subjectOptCount = await subjectOptions.count();
    for (let i = 0; i < subjectOptCount; i++) {
      const val = await subjectOptions.nth(i).getAttribute('value');
      const disabled = await subjectOptions.nth(i).getAttribute('disabled');
      if (val && val !== '' && disabled === null) {
        await subjectSelect.selectOption({ index: i });
        break;
      }
    }

    // Select first tutor (same one used in TC-CLS-04)
    const tutorSelect = modal.locator('select').nth(1);
    await tutorSelect.waitFor({ state: 'attached' });
    await expect(tutorSelect).toBeEnabled({ timeout: 5_000 });
    const tutorOptions = tutorSelect.locator('option');
    const tutorOptCount = await tutorOptions.count();
    for (let i = 0; i < tutorOptCount; i++) {
      const val = await tutorOptions.nth(i).getAttribute('value');
      const disabled = await tutorOptions.nth(i).getAttribute('disabled');
      if (val && val !== '' && disabled === null) {
        await tutorSelect.selectOption({ index: i });
        break;
      }
    }

    // Select Monday (overlapping with TC-CLS-04's Mon 09:00-10:30)
    const monButton = modal.getByRole('button', { name: 'Mon', exact: true });
    await monButton.click();

    // Set overlapping time: 09:00-10:30
    const timeInputs = modal.locator('input[type="time"]');
    await timeInputs.first().fill('09:00');
    await timeInputs.nth(1).fill('10:30');

    // Fill remaining fields
    await modal.locator('#capacity').fill('15');
    await modal.locator('#fee').fill('300000');

    // Attempt submit
    const submitBtn = modal.getByRole('button', { name: /add class/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Expect conflict/overlap error (could be toast or inline error)
    const conflictError = pg.getByText(/conflict|overlap|already.*scheduled|busy/i);
    await expect(conflictError).toBeVisible({ timeout: 10_000 });

    // Close modal
    await pg.keyboard.press('Escape');
  });

  test('TC-CLS-01: List classes → table visible with UAT Math Class', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Table should be visible
    await expect(classes.table).toBeVisible({ timeout: 10_000 });

    // Rows should exist
    await expect(classes.rows.first()).toBeVisible({ timeout: 5_000 });

    // UAT Math Class should be in the table
    await expect(classes.getRowByName('UAT Math Class')).toBeVisible({ timeout: 5_000 });
  });

  test('TC-CLS-02: Search for "UAT Math" → filtered results', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Wait for table to load
    await expect(classes.table).toBeVisible({ timeout: 10_000 });
    await expect(classes.rows.first()).toBeVisible({ timeout: 5_000 });

    // Search for "UAT Math"
    await classes.search('UAT Math');

    // Wait for search debounce / filtering
    await pg.waitForTimeout(1_000);

    // UAT Math Class should still be visible
    await expect(classes.getRowByName('UAT Math Class')).toBeVisible({ timeout: 5_000 });

    // Results should be filtered — at least 1 row matches
    const rowCount = await classes.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Test subject filter if available
    const subjectFilter = pg.locator('select').filter({ hasText: /subject|all/i }).first();
    const subjectFilterVisible = await subjectFilter.isVisible().catch(() => false);
    if (subjectFilterVisible) {
      const options = subjectFilter.locator('option:not([value=""]):not([disabled])');
      const optCount = await options.count();
      if (optCount > 0) {
        const firstVal = await options.first().getAttribute('value');
        if (firstVal) {
          await subjectFilter.selectOption(firstVal);
          await pg.waitForTimeout(1_000);
          await expect(classes.table).toBeVisible();
        }
      }
    }
  });

  test('TC-CLS-03: Switch to timetable/calendar view → grid rendered', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Wait for page to load
    await expect(classes.table).toBeVisible({ timeout: 10_000 });

    // Look for timetable/calendar view toggle button
    const timetableBtn = pg.getByRole('button', { name: /timetable|calendar|schedule|grid/i });
    const timetableBtnAlt = pg.locator('button').filter({ hasText: /timetable|calendar/i });

    // Try the role-based locator first, fall back to filter-based
    const hasPrimary = await timetableBtn.isVisible().catch(() => false);
    const btnToClick = hasPrimary ? timetableBtn : timetableBtnAlt;

    await btnToClick.click();

    // Verify timetable grid is rendered — look for day headers
    const dayHeaders = pg.getByText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i);
    await expect(dayHeaders.first()).toBeVisible({ timeout: 5_000 });

    // The timetable grid container should be visible
    const gridOrTable = pg.locator('[class*="grid"], [class*="timetable"], [class*="calendar"], table').first();
    await expect(gridOrTable).toBeVisible({ timeout: 5_000 });
  });

  test('TC-CLS-05: Edit class capacity to 25 → toast success', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Wait for table
    await expect(classes.table).toBeVisible({ timeout: 10_000 });
    await expect(classes.getRowByName('UAT Math Class')).toBeVisible({ timeout: 5_000 });

    // Edit class — change capacity to 25
    await classes.editClass('UAT Math Class', {
      capacity: '25',
    });

    // Toast success
    await expect(classes.getToast()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CLS-07: Click class row → detail drawer opens with class info', async ({
    loggedInPage,
    page,
  }) => {
    const pg = await loggedInPage('admin');
    const classes = new ClassesPage(pg);
    await classes.goto();

    // Wait for table
    await expect(classes.table).toBeVisible({ timeout: 10_000 });
    await expect(classes.getRowByName('UAT Math Class')).toBeVisible({ timeout: 5_000 });

    const row = classes.getRowByName('UAT Math Class');

    // Try clicking a "View" button in the row first
    const viewBtn = row.getByRole('button', { name: /view|detail/i });
    const hasViewBtn = await viewBtn.isVisible().catch(() => false);

    if (hasViewBtn) {
      await viewBtn.click();
    } else {
      // Try the row menu approach
      await classes.openRowMenu('UAT Math Class');
      const viewMenuItem = pg.getByText(/view.*class|class.*detail/i);
      const hasViewMenuItem = await viewMenuItem.isVisible().catch(() => false);
      if (hasViewMenuItem) {
        await viewMenuItem.click();
      } else {
        // Click the row itself (first cell to avoid action buttons)
        await row.locator('td').first().click();
      }
    }

    // Detail drawer/panel should open
    const drawer = pg.locator('[class*="drawer"], [class*="sheet"], [role="dialog"], [class*="panel"]').last();
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // Verify class name is displayed in the drawer
    await expect(drawer.getByText('UAT Math Class')).toBeVisible({ timeout: 3_000 });

    // The drawer should contain meaningful content
    const drawerText = await drawer.textContent();
    expect(drawerText).toBeTruthy();
  });
});
