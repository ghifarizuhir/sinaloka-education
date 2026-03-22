import { test, expect } from '../../e2e/fixtures/mock-api.fixture';
import { setupAuthMocks, setupTutorMocks, setupSubjectMocks } from '../helpers/api-mocker';
import { TutorsPage } from '../pages/tutors.page';

test.describe('Tutors', () => {
  let tutors: TutorsPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupTutorMocks(mockApi);
    await setupSubjectMocks(mockApi);
    tutors = new TutorsPage(authedPage);
  });

  // ── Smoke ──

  test('cards load with tutors', async () => {
    await tutors.goto();
    await expect(tutors.getCardByName('Dewi Lestari')).toBeVisible();
    await expect(tutors.getCardByName('Rina Wijaya')).toBeVisible();
  });

  test('search filters cards', async () => {
    await tutors.goto();
    await tutors.search('Dewi');
    await expect(tutors.searchInput).toHaveValue('Dewi');
    await expect(tutors.getCardByName('Dewi Lestari')).toBeVisible();
  });

  test('status badges shown', async ({ authedPage }) => {
    await tutors.goto();
    const dewiCard = tutors.getCardByName('Dewi Lestari');
    await expect(dewiCard.getByText('Verified')).toBeVisible();

    const rinaCard = tutors.getCardByName('Rina Wijaya');
    await expect(rinaCard.getByText('Unverified')).toBeVisible();
  });

  // ── CRUD ──

  test('invite tutor', async () => {
    await tutors.goto();
    await tutors.inviteTutor({ name: 'New Tutor', email: 'new@example.com' });
    await expect(tutors.getToast()).toBeVisible();
  });

  test('edit tutor', async () => {
    await tutors.goto();
    await tutors.editTutor('Dewi Lestari', { name: 'Dewi Updated' });
    await expect(tutors.getToast()).toBeVisible();
  });

  test('delete tutor', async () => {
    await tutors.goto();
    await tutors.deleteTutor('Rina Wijaya');
    await expect(tutors.getToast()).toBeVisible();
  });

  // ── Negative ──

  test('duplicate email shows error', async ({ mockApi }) => {
    // Override POST to return conflict error
    await mockApi.onPost('**/api/admin/tutors/invite').respondWith(409, {
      message: 'A tutor with this email already exists',
    });
    await tutors.goto();
    await tutors.inviteTutor({ name: 'Duplicate Tutor', email: 'dewi@example.com' });
    await expect(tutors.getToast()).toBeVisible();
  });
});
