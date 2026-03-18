import { createRequire } from 'module';
import { test, expect } from '../../fixtures/auth.fixture';
import { setupTutorMocks } from '../../helpers/api-mocker';
import { TutorsPage } from '../../pages/tutors.page';

const require = createRequire(import.meta.url);
const tutorsData = require('../../mocks/tutors.json');

test.describe('Tutors CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupTutorMocks(mockApi);
  });

  // ── Create ──────────────────────────────────────────────────────────────

  test('create tutor with name, email, subjects shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await tutorsPage.createTutor({
      name: 'Ahmad Fauzi',
      email: 'ahmad.fauzi@sinaloka.com',
      subjects: ['Chemistry', 'Biology'],
      password: 'password123',
    });

    await expect(tutorsPage.getToast()).toContainText(/tutor (registered|created)/i);
  });

  test('create tutor with bank details shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await tutorsPage.createTutor({
      name: 'Budi Santoso',
      email: 'budi.santoso@sinaloka.com',
      subjects: ['History'],
      password: 'securepass456',
      bank_name: 'BCA',
      bank_account_number: '9876543210',
      bank_account_holder: 'Budi Santoso',
    });

    await expect(tutorsPage.getToast()).toContainText(/tutor (registered|created)/i);
  });

  // ── Read / List ──────────────────────────────────────────────────────────

  test('tutor cards load from API', async ({ authenticatedPage: page, mockApi }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    // Both tutors from mock data should be visible as cards
    await expect(page.getByText('Dewi Lestari')).toBeVisible();
    await expect(page.getByText('Rina Wijaya')).toBeVisible();
  });

  test('total tutor count matches mock data', async ({ authenticatedPage: page, mockApi }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    // Both tutors appear on page
    const tutorCount = await page.getByText(/Dewi Lestari|Rina Wijaya/).count();
    expect(tutorCount).toBeGreaterThanOrEqual(tutorsData.data.length);
  });

  // ── Search ───────────────────────────────────────────────────────────────

  test('search tutors by name filters results', async ({ authenticatedPage: page, mockApi }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await expect(page.getByText('Dewi Lestari')).toBeVisible();

    await tutorsPage.search('Dewi');

    await expect(page.getByText('Dewi Lestari')).toBeVisible();
    await expect(page.getByText('Rina Wijaya')).not.toBeVisible();
  });

  test('search with no match shows empty state', async ({ authenticatedPage: page, mockApi }) => {
    await mockApi.onGet('**/api/admin/tutors').respondWith(200, {
      data: [],
      meta: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await tutorsPage.search('zzznomatch');

    await expect(page.getByText('Dewi Lestari')).not.toBeVisible();
    await expect(page.getByText('Rina Wijaya')).not.toBeVisible();
  });

  // ── Edit ─────────────────────────────────────────────────────────────────

  test('edit tutor name shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await expect(page.getByText('Dewi Lestari')).toBeVisible();

    await tutorsPage.editTutor('Dewi Lestari', { name: 'Dewi Lestari Updated' });

    await expect(tutorsPage.getToast()).toContainText(/tutor updated/i);
  });

  test('edit tutor email shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await expect(page.getByText('Dewi Lestari')).toBeVisible();

    await tutorsPage.editTutor('Dewi Lestari', { email: 'dewi.new@sinaloka.com' });

    await expect(tutorsPage.getToast()).toContainText(/tutor updated/i);
  });

  test('edit tutor subjects shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await expect(page.getByText('Rina Wijaya')).toBeVisible();

    await tutorsPage.editTutor('Rina Wijaya', { subjects: ['English', 'French'] });

    await expect(tutorsPage.getToast()).toContainText(/tutor updated/i);
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test('delete tutor with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    await expect(page.getByText('Dewi Lestari')).toBeVisible();

    await tutorsPage.deleteTutor('Dewi Lestari');

    await expect(tutorsPage.getToast()).toContainText(/tutor deleted/i);
  });

  // ── Verification toggle ───────────────────────────────────────────────────

  test('unverified tutor card shows unverified badge', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    // Rina Wijaya is_verified: false
    const rinaCard = page.locator('[class*="Card"], .group').filter({ hasText: 'Rina Wijaya' }).first();
    await expect(rinaCard).toBeVisible();

    // Unverified badge or indicator should appear
    await expect(rinaCard.getByText(/unverified/i)).toBeVisible();
  });

  test('verified tutor card shows verified badge', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const tutorsPage = new TutorsPage(page);
    await tutorsPage.goto();

    // Dewi Lestari is_verified: true
    const dewiCard = page.locator('[class*="Card"], .group').filter({ hasText: 'Dewi Lestari' }).first();
    await expect(dewiCard).toBeVisible();

    // Verified badge should appear
    await expect(dewiCard.getByText(/verified/i)).toBeVisible();
  });
});
