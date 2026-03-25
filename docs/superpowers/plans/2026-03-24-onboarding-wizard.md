# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor admin onboarding from a single billing-mode step into a 4-step wizard (password → profile → academic → billing).

**Architecture:** Refactor existing `pages/Onboarding/index.tsx` into a wizard container with 4 step components. Reuse all existing backend endpoints — only 1 backend change (add `must_change_password = false` to `complete()`). Modify Layout.tsx to suppress password-redirect during onboarding.

**Tech Stack:** React, TanStack Query, Sonner, Lucide, TailwindCSS, NestJS, Prisma

**Spec:** `docs/superpowers/specs/2026-03-24-onboarding-wizard-design.md`

---

## File Structure

```
# Backend (1 file modified)
sinaloka-backend/src/modules/onboarding/onboarding.controller.ts  — add @CurrentUser() to complete()
sinaloka-backend/src/modules/onboarding/onboarding.service.ts     — add userId param, set must_change_password=false

# Frontend (6 files: 1 modified, 4 created, 1 modified)
sinaloka-platform/src/pages/Onboarding/index.tsx                  — rewrite: wizard container
sinaloka-platform/src/pages/Onboarding/steps/PasswordStep.tsx     — new: step 1
sinaloka-platform/src/pages/Onboarding/steps/ProfileStep.tsx      — new: step 2
sinaloka-platform/src/pages/Onboarding/steps/AcademicStep.tsx     — new: step 3
sinaloka-platform/src/pages/Onboarding/steps/BillingStep.tsx      — new: step 4
sinaloka-platform/src/components/Layout.tsx                        — modify: suppress password redirect during onboarding
```

---

### Task 1: Backend — Add userId to onboarding complete()

**Files:**
- Modify: `sinaloka-backend/src/modules/onboarding/onboarding.controller.ts`
- Modify: `sinaloka-backend/src/modules/onboarding/onboarding.service.ts`

- [ ] **Step 1: Update controller to inject CurrentUser**

In `onboarding.controller.ts`, add `CurrentUser` import and pass userId to service:

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OnboardingService } from './onboarding.service.js';
import { SetBillingModeSchema } from './onboarding.dto.js';
import type { SetBillingModeDto } from './onboarding.dto.js';

@Controller('onboarding')
@Roles(Role.ADMIN)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  getStatus(@InstitutionId() institutionId: string) {
    return this.onboardingService.getStatus(institutionId);
  }

  @Post('billing-mode')
  setBillingMode(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(SetBillingModeSchema)) dto: SetBillingModeDto,
  ) {
    return this.onboardingService.setBillingMode(institutionId, dto);
  }

  @Post('complete')
  complete(
    @InstitutionId() institutionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.onboardingService.complete(institutionId, userId);
  }
}
```

- [ ] **Step 2: Update service to clear must_change_password**

In `onboarding.service.ts`, add `userId` parameter to `complete()` and update user:

```typescript
async complete(institutionId: string, userId: string) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { billing_mode: true },
  });
  if (!institution) throw new NotFoundException('Institution not found');
  if (!institution.billing_mode) throw new BadRequestException('Billing mode must be set before completing onboarding.');

  const [updatedInstitution] = await this.prisma.$transaction([
    this.prisma.institution.update({
      where: { id: institutionId },
      data: { onboarding_completed: true },
      select: { onboarding_completed: true },
    }),
    this.prisma.user.update({
      where: { id: userId },
      data: { must_change_password: false },
    }),
  ]);

  return updatedInstitution;
}
```

- [ ] **Step 3: Verify backend builds**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/onboarding/onboarding.controller.ts sinaloka-backend/src/modules/onboarding/onboarding.service.ts
git commit -m "feat(backend): clear must_change_password on onboarding complete"
```

---

### Task 2: Frontend — Suppress password redirect during onboarding

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Modify Layout.tsx mustChangePassword redirect**

In `Layout.tsx`, change the useEffect (around line 49-52) from:

```typescript
useEffect(() => {
  if (mustChangePassword && !location.pathname.startsWith('/settings')) {
    navigate('/settings?tab=security');
  }
}, [mustChangePassword, location.pathname, navigate]);
```

To:

```typescript
useEffect(() => {
  if (
    mustChangePassword &&
    !location.pathname.startsWith('/settings') &&
    auth.user?.institution?.onboarding_completed !== false
  ) {
    navigate('/settings?tab=security');
  }
}, [mustChangePassword, location.pathname, navigate, auth.user?.institution?.onboarding_completed]);
```

This prevents the password redirect from firing when the admin is going through onboarding (which handles password change as step 1).

- [ ] **Step 2: Verify frontend builds**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | grep -c "Layout.tsx"`
Expected: 0 (no errors from Layout.tsx)

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/Layout.tsx
git commit -m "fix(platform): suppress password redirect during onboarding"
```

---

### Task 3: Frontend — PasswordStep component (Step 1)

**Files:**
- Create: `sinaloka-platform/src/pages/Onboarding/steps/PasswordStep.tsx`

- [ ] **Step 1: Create PasswordStep component**

This adapts the password form from SecurityTab but simplified for onboarding context. No Card wrapper (wizard container handles layout). No i18n (onboarding uses hardcoded Indonesian strings like current onboarding page).

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/src/services/auth.service';
import { cn } from '@/src/lib/utils';

interface PasswordStepProps {
  onNext: () => void;
}

export function PasswordStep({ onNext }: PasswordStepProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');

  const validations = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    digit: /[0-9]/.test(newPassword),
  };
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allValid = validations.minLength && validations.uppercase && validations.digit && passwordsMatch;

  const mutation = useMutation({
    mutationFn: () =>
      authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      toast.success('Password berhasil diubah');
      onNext();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '';
      if (message.includes('incorrect')) {
        setServerError('Password saat ini salah');
      } else if (message.includes('different')) {
        setServerError('Password baru harus berbeda dari password saat ini');
      } else {
        setServerError(message || 'Gagal mengubah password');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    mutation.mutate();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Amankan Akun Anda
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Password saat ini dibuat oleh admin sistem. Ganti dengan password pribadi Anda untuk keamanan akun.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {serverError && (
          <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {serverError}
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Password Saat Ini
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
          )}
        </div>

        {/* Validation indicators */}
        {newPassword.length > 0 && (
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Persyaratan password:
            </p>
            {[
              { key: 'minLength', label: 'Minimal 8 karakter' },
              { key: 'uppercase', label: 'Mengandung huruf besar' },
              { key: 'digit', label: 'Mengandung angka' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={validations[key as keyof typeof validations] ? 'text-green-500' : 'text-red-500'}>
                  {validations[key as keyof typeof validations] ? '✓' : '✗'}
                </span>
                <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!allValid || !currentPassword || mutation.isPending}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
            allValid && currentPassword
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
          )}
        >
          {mutation.isPending ? 'Menyimpan...' : 'Lanjut'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Onboarding/steps/PasswordStep.tsx
git commit -m "feat(platform): add PasswordStep onboarding component"
```

---

### Task 4: Frontend — ProfileStep component (Step 2)

**Files:**
- Create: `sinaloka-platform/src/pages/Onboarding/steps/ProfileStep.tsx`

- [ ] **Step 1: Create ProfileStep component**

Shows institution name (read-only), phone, and email fields. Uses `settingsService.updateGeneral()` on "Lanjut", skips save on "Lewati".

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsService } from '@/src/services/settings.service';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '@/src/lib/utils';

interface ProfileStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function ProfileStep({ onNext, onBack, onSkip }: ProfileStepProps) {
  const { user } = useAuth();
  const institutionName = user?.institution?.name || '';

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      settingsService.updateGeneral({
        phone: phone.trim() || null,
        email: email.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Profil berhasil disimpan');
      onNext();
    },
    onError: () => {
      toast.error('Gagal menyimpan profil');
    },
  });

  const hasData = phone.trim() || email.trim();

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Lengkapi Profil Institusi
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Informasi ini akan ditampilkan di invoice, laporan, dan komunikasi dengan orang tua siswa.
      </p>

      <div className="max-w-md space-y-4">
        {/* Institution Name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Nama Institusi
          </label>
          <input
            type="text"
            value={institutionName}
            disabled
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            No. Telepon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812-xxxx-xxxx"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Untuk kontak di invoice dan komunikasi dengan orang tua
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@institusi.com"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Untuk notifikasi sistem dan kontak resmi institusi
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Kembali
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Lewati
          </button>
          <button
            type="button"
            disabled={!hasData || mutation.isPending}
            onClick={() => mutation.mutate()}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
              hasData
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
            )}
          >
            {mutation.isPending ? 'Menyimpan...' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Onboarding/steps/ProfileStep.tsx
git commit -m "feat(platform): add ProfileStep onboarding component"
```

---

### Task 5: Frontend — AcademicStep component (Step 3)

**Files:**
- Create: `sinaloka-platform/src/pages/Onboarding/steps/AcademicStep.tsx`

- [ ] **Step 1: Create AcademicStep component**

Simplified academic setup with 3 sections: working days (chip toggle), rooms (tag input), subjects (tag input). Uses `settingsService.updateAcademic()` for working days/rooms, and `useCreateSubject`/`useDeleteSubject` for subjects (they use a separate CRUD API).

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GraduationCap, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { settingsService } from '@/src/services/settings.service';
import { useCreateSubject, useDeleteSubject, useSubjects } from '@/src/hooks/useSubjects';
import { cn } from '@/src/lib/utils';

interface AcademicStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const DAYS = [
  { num: 1, label: 'Sen' },
  { num: 2, label: 'Sel' },
  { num: 3, label: 'Rab' },
  { num: 4, label: 'Kam' },
  { num: 5, label: 'Jum' },
  { num: 6, label: 'Sab' },
  { num: 0, label: 'Min' },
];

export function AcademicStep({ onNext, onBack, onSkip }: AcademicStepProps) {
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addRoom = () => {
    const name = newRoom.trim();
    if (!name) return;
    if (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) return;
    setRooms((prev) => [...prev, { id: crypto.randomUUID(), name }]);
    setNewRoom('');
  };

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    createSubject.mutate(name, {
      onSuccess: () => setNewSubject(''),
      onError: () => toast.error('Gagal menambah mata pelajaran'),
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsService.updateAcademic({
        working_days: workingDays,
        rooms: rooms.map((r) => ({
          id: r.id,
          name: r.name,
          type: 'Classroom' as const,
          capacity: null,
          status: 'Available' as const,
        })),
      }),
    onSuccess: () => {
      toast.success('Pengaturan akademik disimpan');
      onNext();
    },
    onError: () => {
      toast.error('Gagal menyimpan pengaturan');
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Pengaturan Akademik
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Data ini dibutuhkan saat membuat kelas dan jadwal. Anda bisa menambah atau mengubahnya nanti di Settings.
      </p>

      <div className="max-w-lg space-y-6">
        {/* Working Days */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Hari Operasional
          </label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Hari dimana institusi Anda menerima jadwal belajar
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const isActive = workingDays.includes(day.num);
              return (
                <button
                  key={day.num}
                  type="button"
                  onClick={() => toggleDay(day.num)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-semibold border transition-all',
                    isActive
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400',
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rooms */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Ruangan
          </label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Tempat belajar yang tersedia. Digunakan saat menjadwalkan kelas.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRoom())}
              placeholder="Ruang A1"
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={addRoom}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          {rooms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {rooms.map((room) => (
                <span
                  key={room.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  {room.name}
                  <button type="button" onClick={() => removeRoom(room.id)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Subjects */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Mata Pelajaran
          </label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Mata pelajaran yang diajarkan. Digunakan saat membuat kelas baru.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              placeholder="Matematika"
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={addSubject}
              disabled={createSubject.isPending}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {subjects.map((subject) => (
                <span
                  key={subject.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  {subject.name}
                  <button
                    type="button"
                    onClick={() => deleteSubject.mutate(subject.id)}
                    disabled={deleteSubject.isPending}
                    className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Kembali
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Lewati
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-medium text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Menyimpan...' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Onboarding/steps/AcademicStep.tsx
git commit -m "feat(platform): add AcademicStep onboarding component"
```

---

### Task 6: Frontend — BillingStep component (Step 4)

**Files:**
- Create: `sinaloka-platform/src/pages/Onboarding/steps/BillingStep.tsx`

- [ ] **Step 1: Create BillingStep component**

Refactored from current onboarding page. Selection is held in local state — NOT saved to backend. Parent wizard container calls the API on "Selesai".

```tsx
import { Receipt, CalendarDays, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

interface BillingStepProps {
  selected: BillingMode | null;
  onSelect: (mode: BillingMode) => void;
  onBack: () => void;
  onComplete: () => void;
  isPending: boolean;
}

const BILLING_OPTIONS = [
  {
    value: 'PER_SESSION' as BillingMode,
    icon: Receipt,
    title: 'Per Sesi',
    description: 'Tagihan otomatis dihitung setiap kali siswa hadir. Cocok untuk bimbel dengan jadwal fleksibel.',
    example: 'Siswa hadir 12× dalam sebulan dengan biaya Rp50.000/sesi → tagihan Rp600.000',
  },
  {
    value: 'MONTHLY_FIXED' as BillingMode,
    icon: CalendarDays,
    title: 'Bulanan Tetap',
    description: 'Tagihan bulanan dengan jumlah tetap, digenerate otomatis setiap awal bulan. Cocok untuk bimbel dengan biaya bulanan.',
    example: 'Biaya kelas Rp500.000/bulan → tagihan Rp500.000 otomatis setiap tanggal 1',
  },
];

export function BillingStep({ selected, onSelect, onBack, onComplete, isPending }: BillingStepProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Receipt className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Pilih Mode Tagihan
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Tentukan bagaimana institusi Anda menghitung biaya belajar siswa. Mode ini tidak dapat diubah setelah onboarding.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {BILLING_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'relative p-6 rounded-xl border-2 text-left transition-all',
                'hover:border-zinc-400 dark:hover:border-zinc-500',
                isSelected
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50',
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white dark:text-zinc-900" />
                </div>
              )}
              <Icon className="w-8 h-8 text-zinc-700 dark:text-zinc-300 mb-3" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {option.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {option.description}
              </p>
              <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Contoh: {option.example}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Warning */}
      <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 max-w-2xl">
        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Mode tagihan tidak dapat diubah setelah onboarding selesai. Hubungi support jika perlu mengubah.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-6 max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Kembali
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={!selected || isPending}
          onClick={onComplete}
          className={cn(
            'px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
            selected
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
          )}
        >
          {isPending ? 'Menyimpan...' : 'Selesai'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Onboarding/steps/BillingStep.tsx
git commit -m "feat(platform): add BillingStep onboarding component"
```

---

### Task 7: Frontend — Rewrite wizard container (index.tsx)

**Files:**
- Modify: `sinaloka-platform/src/pages/Onboarding/index.tsx`

- [ ] **Step 1: Rewrite onboarding page as wizard container**

Replace entire content with multi-step wizard that manages step navigation, progress bar, and final completion flow.

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { onboardingService } from '@/src/services/onboarding.service';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '@/src/lib/utils';
import { PasswordStep } from './steps/PasswordStep';
import { ProfileStep } from './steps/ProfileStep';
import { AcademicStep } from './steps/AcademicStep';
import { BillingStep } from './steps/BillingStep';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

const STEPS = [
  { label: 'Password', number: 1 },
  { label: 'Profil', number: 2 },
  { label: 'Akademik', number: 3 },
  { label: 'Billing', number: 4 },
];

export default function Onboarding() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [billingMode, setBillingMode] = useState<BillingMode | null>(null);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!billingMode) return;
      await onboardingService.setBillingMode(billingMode);
      await onboardingService.complete();
    },
    onSuccess: () => {
      toast.success('Setup selesai! Selamat datang.');
      window.location.href = '/';
    },
    onError: () => {
      toast.error('Gagal menyelesaikan setup. Silakan coba lagi.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 4));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    currentStep > step.number
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : currentStep === step.number
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  {currentStep > step.number ? <Check size={14} /> : step.number}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 font-medium',
                    currentStep >= step.number
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2 mb-4',
                    currentStep > step.number
                      ? 'bg-zinc-900 dark:bg-zinc-100'
                      : 'bg-zinc-200 dark:bg-zinc-800',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          {currentStep === 1 && <PasswordStep onNext={goNext} />}
          {currentStep === 2 && <ProfileStep onNext={goNext} onBack={goBack} onSkip={goNext} />}
          {currentStep === 3 && <AcademicStep onNext={goNext} onBack={goBack} onSkip={goNext} />}
          {currentStep === 4 && (
            <BillingStep
              selected={billingMode}
              onSelect={setBillingMode}
              onBack={goBack}
              onComplete={() => completeMutation.mutate()}
              isPending={completeMutation.isPending}
            />
          )}
        </div>

        {/* Step indicator text */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Langkah {currentStep} dari {STEPS.length}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend type-checks**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | grep -i "onboarding\|PasswordStep\|ProfileStep\|AcademicStep\|BillingStep"`
Expected: No errors from onboarding files.

- [ ] **Step 3: Verify frontend builds**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Onboarding/index.tsx
git commit -m "feat(platform): rewrite onboarding as 4-step wizard"
```

---

### Task 8: Integration test & final verification

- [ ] **Step 1: Run backend build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds.

- [ ] **Step 2: Run backend tests**

Run: `cd sinaloka-backend && npm run test -- --ci`
Expected: All tests pass.

- [ ] **Step 3: Run frontend build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Run frontend type-check**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No new errors from onboarding changes.

- [ ] **Step 5: Final commit — squash into feature commit if needed**

All task commits should already be in place. Verify with:

```bash
git log --oneline -8
```
