# Move Registration to Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move tutor/student public registration from sinaloka-landing to sinaloka-platform, leveraging per-institution subdomains.

**Architecture:** Add `/register` as a public route in sinaloka-platform. The page uses `InstitutionContext` to get the slug from the subdomain, fetches registration settings via the existing public API, and renders a state-machine-driven form using platform UI components. Remove the registration route from sinaloka-landing.

**Tech Stack:** React, React Router, TailwindCSS v4, Axios, Lucide icons, platform UI components (Input, Button, Card, Label)

**Spec:** `docs/superpowers/specs/2026-03-23-move-registration-to-platform-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `sinaloka-platform/src/pages/Register/useRegisterPage.ts` | State machine, form state, validation, API calls |
| Create | `sinaloka-platform/src/pages/Register/index.tsx` | Page component — renders each state (loading, error, closed, role-select, form, success) |
| Modify | `sinaloka-platform/src/services/registration.service.ts` | Add 3 public registration functions |
| Modify | `sinaloka-platform/src/App.tsx` | Add `/register` public route |
| Modify | `sinaloka-platform/src/pages/InstitutionLanding.tsx` | Change "Daftar" button to internal navigate, remove `registration_enabled` guard |
| Delete | `sinaloka-landing/src/pages/RegisterPage.tsx` | Remove old registration page |
| Modify | `sinaloka-landing/src/App.tsx` | Remove `/register/:slug` route |

---

### Task 1: Add Public Registration Service Functions

**Files:**
- Modify: `sinaloka-platform/src/services/registration.service.ts`

- [ ] **Step 1: Add public registration functions to the service**

The existing `api` instance in `sinaloka-platform/src/lib/api.ts` has a 401 response interceptor that hard-redirects to `/login` when no refresh token exists. While the backend endpoints are `@Public()` and should never return 401, using `api` for unauthenticated calls is risky — any unexpected 401 would redirect the user away from the registration page with no error message.

**Decision:** Use a separate plain `axios` instance for these three public functions. Import `axios` directly (already a dependency) and use the same `API_BASE_URL`.

Add these to `sinaloka-platform/src/services/registration.service.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const publicApi = axios.create({ baseURL: API_BASE_URL });

// Add this interface above the registrationService object
interface RegistrationInfo {
  institution: { name: string; logo_url: string | null; slug: string };
  registration: { student_enabled: boolean; tutor_enabled: boolean };
}

interface StudentRegistrationPayload {
  name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  phone?: string;
  parent_email?: string;
}

interface TutorRegistrationPayload {
  name: string;
  email: string;
  phone?: string;
  subject_names: string[];
  experience_years?: number;
}
```

Add to the `registrationService` object:

```typescript
  // Public registration endpoints (no auth required — uses publicApi to avoid 401 interceptor redirect)
  getRegistrationInfo: (slug: string) =>
    publicApi.get<RegistrationInfo>(`/api/register/${slug}`).then((r) => r.data),

  submitStudentRegistration: (slug: string, data: StudentRegistrationPayload) =>
    publicApi.post(`/api/register/${slug}/student`, data).then((r) => r.data),

  submitTutorRegistration: (slug: string, data: TutorRegistrationPayload) =>
    publicApi.post(`/api/register/${slug}/tutor`, data).then((r) => r.data),
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/services/registration.service.ts
git commit -m "feat(platform): add public registration service functions"
```

---

### Task 2: Create useRegisterPage Hook

**Files:**
- Create: `sinaloka-platform/src/pages/Register/useRegisterPage.ts`

- [ ] **Step 1: Create the hook file**

Create `sinaloka-platform/src/pages/Register/useRegisterPage.ts` with the following content:

```typescript
import { useEffect, useState } from 'react';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { registrationService } from '@/src/services/registration.service';

type Role = 'student' | 'tutor';
type PageState = 'loading' | 'error' | 'closed' | 'no-slug' | 'role-select' | 'form' | 'success';

interface InstitutionInfo {
  name: string;
  logo_url: string | null;
  slug: string;
  student_enabled: boolean;
  tutor_enabled: boolean;
}

interface StudentFormData {
  name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  phone: string;
  parent_email: string;
}

interface TutorFormData {
  name: string;
  email: string;
  phone: string;
  subject_names: string;
  experience_years: string;
}

const INITIAL_STUDENT_FORM: StudentFormData = {
  name: '', grade: '', parent_name: '', parent_phone: '',
  email: '', phone: '', parent_email: '',
};

const INITIAL_TUTOR_FORM: TutorFormData = {
  name: '', email: '', phone: '', subject_names: '', experience_years: '',
};

export function useRegisterPage() {
  const { slug } = useInstitution();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [regInfo, setRegInfo] = useState<InstitutionInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentFormData>(INITIAL_STUDENT_FORM);
  const [tutorForm, setTutorForm] = useState<TutorFormData>(INITIAL_TUTOR_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) {
      setPageState('no-slug');
      return;
    }

    registrationService.getRegistrationInfo(slug)
      .then((res) => {
        const info: InstitutionInfo = {
          name: res.institution.name,
          logo_url: res.institution.logo_url,
          slug: res.institution.slug,
          student_enabled: res.registration.student_enabled,
          tutor_enabled: res.registration.tutor_enabled,
        };
        setRegInfo(info);

        if (!info.student_enabled && !info.tutor_enabled) {
          setPageState('closed');
        } else if (info.student_enabled && !info.tutor_enabled) {
          setSelectedRole('student');
          setPageState('form');
        } else if (!info.student_enabled && info.tutor_enabled) {
          setSelectedRole('tutor');
          setPageState('form');
        } else {
          setPageState('role-select');
        }
      })
      .catch(() => {
        setPageState('error');
      });
  }, [slug]);

  function validateStudent(): boolean {
    const errors: Record<string, string> = {};
    if (!studentForm.name.trim()) errors.name = 'Nama wajib diisi';
    if (!studentForm.grade.trim()) errors.grade = 'Kelas wajib diisi';
    if (!studentForm.parent_name.trim()) errors.parent_name = 'Nama orang tua wajib diisi';
    if (!studentForm.parent_phone.trim()) errors.parent_phone = 'No. HP orang tua wajib diisi';
    if (!studentForm.email.trim()) errors.email = 'Email siswa wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email)) errors.email = 'Format email tidak valid';
    if (studentForm.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.parent_email))
      errors.parent_email = 'Format email tidak valid';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateTutor(): boolean {
    const errors: Record<string, string> = {};
    if (!tutorForm.name.trim()) errors.name = 'Nama wajib diisi';
    if (!tutorForm.email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorForm.email)) errors.email = 'Format email tidak valid';
    if (!tutorForm.subject_names.trim()) errors.subject_names = 'Mata pelajaran wajib diisi';
    if (tutorForm.experience_years && (isNaN(Number(tutorForm.experience_years)) || Number(tutorForm.experience_years) < 0))
      errors.experience_years = 'Masukkan angka yang valid';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const isValid = selectedRole === 'student' ? validateStudent() : validateTutor();
    if (!isValid || !slug) return;

    setIsSubmitting(true);

    try {
      if (selectedRole === 'student') {
        const payload = {
          name: studentForm.name.trim(),
          grade: studentForm.grade.trim(),
          parent_name: studentForm.parent_name.trim(),
          parent_phone: studentForm.parent_phone.trim(),
          email: studentForm.email.trim(),
          ...(studentForm.phone.trim() && { phone: studentForm.phone.trim() }),
          ...(studentForm.parent_email.trim() && { parent_email: studentForm.parent_email.trim() }),
        };
        await registrationService.submitStudentRegistration(slug, payload);
      } else {
        const subjectList = tutorForm.subject_names.split(',').map((s) => s.trim()).filter(Boolean);
        const payload = {
          name: tutorForm.name.trim(),
          email: tutorForm.email.trim(),
          ...(tutorForm.phone.trim() && { phone: tutorForm.phone.trim() }),
          subject_names: subjectList,
          ...(tutorForm.experience_years.trim() && { experience_years: Number(tutorForm.experience_years) }),
        };
        await registrationService.submitTutorRegistration(slug, payload);
      }
      setPageState('success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { message?: string } } };
      const status = axiosErr.response?.status;
      if (status === 409) {
        setSubmitError('Data dengan email ini sudah terdaftar.');
      } else if (status === 429) {
        setSubmitError('Terlalu banyak percobaan. Coba lagi beberapa saat.');
      } else if (status === 403) {
        setSubmitError('Pendaftaran saat ini tidak tersedia.');
      } else if (status === 400) {
        const msg = axiosErr.response?.data?.message;
        setSubmitError(typeof msg === 'string' ? msg : 'Data yang dimasukkan tidak valid.');
      } else {
        setSubmitError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectRole(role: Role) {
    setSelectedRole(role);
    setFieldErrors({});
    setSubmitError(null);
    setPageState('form');
  }

  function goBackToRoleSelect() {
    setSelectedRole(null);
    setFieldErrors({});
    setSubmitError(null);
    setPageState('role-select');
  }

  return {
    pageState,
    regInfo,
    selectedRole,
    submitError,
    isSubmitting,
    studentForm,
    setStudentForm,
    tutorForm,
    setTutorForm,
    fieldErrors,
    handleSubmit,
    selectRole,
    goBackToRoleSelect,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Register/useRegisterPage.ts
git commit -m "feat(platform): add useRegisterPage hook with state machine"
```

---

### Task 3: Create Register Page Component

**Files:**
- Create: `sinaloka-platform/src/pages/Register/index.tsx`

- [ ] **Step 1: Create the page component**

Create `sinaloka-platform/src/pages/Register/index.tsx`. This component renders each state using platform UI components (Card, Input, Button, Label). No framer-motion — the platform doesn't use it.

```tsx
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, BookOpen, ArrowLeft, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useRegisterPage } from './useRegisterPage';
import { Button } from '@/src/components/UI';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';

function FormField({
  id, label, required, error, hint, children,
}: {
  id: string; label: string; required?: boolean; error?: string; hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    pageState, regInfo, selectedRole, submitError, isSubmitting,
    studentForm, setStudentForm, tutorForm, setTutorForm, fieldErrors,
    handleSubmit, selectRole, goBackToRoleSelect,
  } = useRegisterPage();

  // ── No-slug guard (SuperAdmin mode) ─────────────────────────────────────
  if (pageState === 'no-slug') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Halaman Tidak Tersedia</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Halaman ini hanya tersedia dari subdomain institusi.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="w-24 h-3 rounded bg-muted animate-pulse" />
              <div className="w-full h-10 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Institusi Tidak Ditemukan</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Tautan pendaftaran ini tidak valid atau sudah tidak aktif.
          </p>
          <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  // ── Closed ──────────────────────────────────────────────────────────────
  if (pageState === 'closed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Pendaftaran Ditutup</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Pendaftaran sedang ditutup sementara. Hubungi pihak{' '}
            {regInfo?.name ?? 'institusi'} untuk informasi lebih lanjut.
          </p>
          <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Pendaftaran Berhasil!</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Terima kasih telah mendaftar di{' '}
            <strong className="text-foreground">{regInfo?.name}</strong>. Admin akan meninjau data Anda dan menghubungi segera.
          </p>
          <Button onClick={() => navigate('/login')}>
            Masuk
          </Button>
        </div>
      </div>
    );
  }

  // ── Role select & Form ──────────────────────────────────────────────────
  const isStudent = selectedRole === 'student';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Institution header */}
        {regInfo && (
          <div className="text-center mb-8">
            {regInfo.logo_url ? (
              <img src={regInfo.logo_url} alt={regInfo.name} className="w-14 h-14 rounded-xl object-cover mx-auto mb-3" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3 text-primary-foreground text-xl font-bold">
                {regInfo.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-lg font-bold text-foreground">{regInfo.name}</h1>
            <p className="text-sm text-muted-foreground">Portal Registrasi</p>
          </div>
        )}

        {pageState === 'role-select' && regInfo ? (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Pilih jenis pendaftaran</h2>
              <p className="text-sm text-muted-foreground">Silakan pilih peran Anda untuk melanjutkan.</p>
            </div>

            <div className="space-y-3">
              {regInfo.student_enabled && (
                <Card
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => selectRole('student')}
                  onKeyDown={(e) => e.key === 'Enter' && selectRole('student')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">Daftar sebagai Murid</div>
                      <div className="text-sm text-muted-foreground">Bergabung sebagai siswa di institusi ini</div>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              )}

              {regInfo.tutor_enabled && (
                <Card
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => selectRole('tutor')}
                  onKeyDown={(e) => e.key === 'Enter' && selectRole('tutor')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">Daftar sebagai Tutor</div>
                      <div className="text-sm text-muted-foreground">Bergabung sebagai pengajar di institusi ini</div>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              )}
            </div>

            <div className="mt-6 text-center">
              <Link to="/welcome" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </div>
          </div>
        ) : pageState === 'form' ? (
          <Card>
            {/* Form header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                  'bg-primary/10 text-primary',
                )}>
                  {isStudent ? <GraduationCap className="size-3.5" /> : <BookOpen className="size-3.5" />}
                  {isStudent ? 'Registrasi Murid' : 'Registrasi Tutor'}
                </span>

                {regInfo?.student_enabled && regInfo?.tutor_enabled && (
                  <button
                    type="button"
                    onClick={goBackToRoleSelect}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="size-3" />
                    Ganti peran
                  </button>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                {isStudent ? 'Formulir Pendaftaran Murid' : 'Formulir Pendaftaran Tutor'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Lengkapi data berikut. Kolom bertanda <span className="text-destructive">*</span> wajib diisi.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                {isStudent ? (
                  <>
                    <FormField id="name" label="Nama Lengkap" required error={fieldErrors.name}>
                      <Input id="name" placeholder="Nama lengkap siswa" value={studentForm.name}
                        onChange={(e) => setStudentForm((f) => ({ ...f, name: e.target.value }))} />
                    </FormField>
                    <FormField id="grade" label="Kelas / Jenjang" required error={fieldErrors.grade}>
                      <Input id="grade" placeholder="Contoh: Kelas 10 SMA" value={studentForm.grade}
                        onChange={(e) => setStudentForm((f) => ({ ...f, grade: e.target.value }))} />
                    </FormField>

                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Data Orang Tua / Wali</p>
                      <div className="space-y-4">
                        <FormField id="parent_name" label="Nama Orang Tua / Wali" required error={fieldErrors.parent_name}>
                          <Input id="parent_name" placeholder="Nama lengkap" value={studentForm.parent_name}
                            onChange={(e) => setStudentForm((f) => ({ ...f, parent_name: e.target.value }))} />
                        </FormField>
                        <FormField id="parent_phone" label="No. HP Orang Tua" required error={fieldErrors.parent_phone}>
                          <Input id="parent_phone" type="tel" placeholder="08123456789" value={studentForm.parent_phone}
                            onChange={(e) => setStudentForm((f) => ({ ...f, parent_phone: e.target.value }))} />
                        </FormField>
                        <FormField id="parent_email" label="Email Orang Tua" error={fieldErrors.parent_email}>
                          <Input id="parent_email" type="email" placeholder="email@contoh.com (opsional)" value={studentForm.parent_email}
                            onChange={(e) => setStudentForm((f) => ({ ...f, parent_email: e.target.value }))} />
                        </FormField>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Kontak Siswa</p>
                      <div className="space-y-4">
                        <FormField id="email" label="Email Siswa" required error={fieldErrors.email}>
                          <Input id="email" type="email" placeholder="email@contoh.com" value={studentForm.email}
                            onChange={(e) => setStudentForm((f) => ({ ...f, email: e.target.value }))} />
                        </FormField>
                        <FormField id="phone" label="No. HP Siswa" error={fieldErrors.phone}>
                          <Input id="phone" type="tel" placeholder="08123456789 (opsional)" value={studentForm.phone}
                            onChange={(e) => setStudentForm((f) => ({ ...f, phone: e.target.value }))} />
                        </FormField>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <FormField id="name" label="Nama Lengkap" required error={fieldErrors.name}>
                      <Input id="name" placeholder="Nama lengkap" value={tutorForm.name}
                        onChange={(e) => setTutorForm((f) => ({ ...f, name: e.target.value }))} />
                    </FormField>
                    <FormField id="email" label="Email" required error={fieldErrors.email}>
                      <Input id="email" type="email" placeholder="email@contoh.com" value={tutorForm.email}
                        onChange={(e) => setTutorForm((f) => ({ ...f, email: e.target.value }))} />
                    </FormField>
                    <FormField id="phone" label="No. HP" error={fieldErrors.phone}>
                      <Input id="phone" type="tel" placeholder="08123456789 (opsional)" value={tutorForm.phone}
                        onChange={(e) => setTutorForm((f) => ({ ...f, phone: e.target.value }))} />
                    </FormField>
                    <FormField id="subject_names" label="Mata Pelajaran" required error={fieldErrors.subject_names} hint="Pisahkan dengan koma">
                      <Input id="subject_names" placeholder="Matematika, Fisika, Kimia" value={tutorForm.subject_names}
                        onChange={(e) => setTutorForm((f) => ({ ...f, subject_names: e.target.value }))} />
                    </FormField>
                    <FormField id="experience_years" label="Pengalaman Mengajar (tahun)" error={fieldErrors.experience_years}>
                      <Input id="experience_years" type="number" placeholder="Contoh: 3 (opsional)" value={tutorForm.experience_years}
                        onChange={(e) => setTutorForm((f) => ({ ...f, experience_years: e.target.value }))} />
                    </FormField>
                  </>
                )}
              </div>

              {/* Error alert */}
              {submitError && (
                <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <div className="mt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      Kirim Pendaftaran
                      <ChevronRight className="size-4" />
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Dengan mendaftar, Anda menyetujui bahwa data yang dimasukkan adalah benar.
                </p>
              </div>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Register/
git commit -m "feat(platform): add public registration page"
```

---

### Task 4: Add Route and Update InstitutionLanding

**Files:**
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/pages/InstitutionLanding.tsx`

- [ ] **Step 1: Add `/register` route to App.tsx**

In `sinaloka-platform/src/App.tsx`:

1. Add lazy import at the top (after the existing imports, before `function InstitutionGate`):

```typescript
const RegisterPage = React.lazy(() => import('./pages/Register'));
```

2. Add the route right after `<Route path="/login" element={<Login />} />`, wrapping it in `Suspense`:

```tsx
<Route path="/register" element={
  <React.Suspense fallback={
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
    </div>
  }>
    <RegisterPage />
  </React.Suspense>
} />
```

- [ ] **Step 2: Update InstitutionLanding.tsx**

In `sinaloka-platform/src/pages/InstitutionLanding.tsx`:

1. Remove the `{institution.registration_enabled && (` guard wrapping the "Daftar" button (lines 80-94). Replace the entire conditional block with the button always shown:

```tsx
<Button
  size="lg"
  variant="outline"
  onClick={() => navigate('/register')}
  className={bgImage ? 'border-white/30 text-white hover:bg-white/10' : ''}
>
  Daftar
</Button>
```

2. The `window.open(...)` external link is replaced with `navigate('/register')` — internal navigation.

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/App.tsx sinaloka-platform/src/pages/InstitutionLanding.tsx
git commit -m "feat(platform): add /register public route and update welcome page link"
```

---

### Task 5: Remove Registration from Landing

**Files:**
- Delete: `sinaloka-landing/src/pages/RegisterPage.tsx`
- Modify: `sinaloka-landing/src/App.tsx`

- [ ] **Step 1: Delete RegisterPage.tsx**

```bash
rm sinaloka-landing/src/pages/RegisterPage.tsx
```

- [ ] **Step 2: Remove route and import from App.tsx**

In `sinaloka-landing/src/App.tsx`:

1. Remove line 5: `const RegisterPage = lazy(() => import('./pages/RegisterPage'));`
2. Remove line 30: `<Route path="/register/:slug" element={<RegisterPage />} />`

- [ ] **Step 3: Verify landing build**

Run: `cd sinaloka-landing && npx tsc --noEmit && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Verify platform build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-landing/src/pages/RegisterPage.tsx sinaloka-landing/src/App.tsx
git commit -m "refactor(landing): remove registration page (moved to platform)"
```

---

### Task 6: Manual Smoke Test

- [ ] **Step 1: Start backend and platform dev servers**

```bash
cd sinaloka-backend && npm run start:dev &
cd sinaloka-platform && npm run dev &
```

- [ ] **Step 2: Test on institution subdomain**

Open `http://<institution-slug>.localhost:3000/welcome` (or use the actual subdomain if available):
- Verify "Daftar" button is visible
- Click "Daftar" → navigates to `/register`
- Verify registration page loads, shows institution name/logo
- Test role select (if both enabled)
- Fill student form → submit → verify success state
- Verify "Masuk" button navigates to `/login`

- [ ] **Step 3: Test edge cases**

- Open `http://localhost:3000/register` (no subdomain) → should show "Halaman ini hanya tersedia dari subdomain institusi"
- Test with institution that has registration disabled → should show "Pendaftaran Ditutup"
- Submit with empty required fields → verify validation errors appear

- [ ] **Step 4: Test landing page**

Open `http://localhost:4000/register/any-slug` → should show 404 (route removed)

---

## Files Affected

### Modify
- sinaloka-platform/src/services/registration.service.ts
- sinaloka-platform/src/App.tsx
- sinaloka-platform/src/pages/InstitutionLanding.tsx
- sinaloka-landing/src/App.tsx

### Create
- sinaloka-platform/src/pages/Register/index.tsx
- sinaloka-platform/src/pages/Register/useRegisterPage.ts

### Delete
- sinaloka-landing/src/pages/RegisterPage.tsx
