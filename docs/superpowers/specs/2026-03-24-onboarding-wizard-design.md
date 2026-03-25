# Onboarding Wizard — Admin First-Login Flow

## Problem

When a SuperAdmin creates a new institution, the admin's first login experience is fragmented:

1. Redirected to `/onboarding` for a single billing mode selection (only 2 cards)
2. After completing, redirected again to `/settings?tab=security` to change password
3. Admin has no guidance on setting up academic config (rooms, subjects, working days) before creating classes

Two separate redirect mechanisms (`onboarding_completed` on Institution, `must_change_password` on User) create a disjointed experience. The onboarding should be a unified, step-by-step wizard.

## Solution

Refactor the existing onboarding page into a 4-step wizard that covers all essential first-login setup:

```
Step 1: Change Password
Step 2: Institution Profile
Step 3: Academic Setup
Step 4: Billing Mode
```

### Step 1: Change Password (required)

- **Heading:** "Amankan Akun Anda"
- **Context:** "Password saat ini dibuat oleh admin sistem. Ganti dengan password pribadi Anda untuk keamanan akun."
- **Fields:** Current password, New password, Confirm new password
- **Validation:** Min 8 chars, uppercase letter, digit required (same as SecurityTab)
- **Navigation:** "Lanjut" only (no back, no skip — this is step 1 and mandatory)
- **Endpoint:** `POST /api/auth/change-password` (existing)
- **Saves immediately** on "Lanjut"

### Step 2: Institution Profile (skippable)

- **Heading:** "Lengkapi Profil Institusi"
- **Context:** "Informasi ini akan ditampilkan di invoice, laporan, dan komunikasi dengan orang tua siswa."
- **Fields:**
  - Institution name (read-only, pre-filled from SuperAdmin creation)
  - Phone — helper: "Untuk kontak di invoice dan komunikasi dengan orang tua"
  - Email — helper: "Untuk notifikasi sistem dan kontak resmi institusi"
- **Navigation:** "Lanjut" + "Lewati" + "Kembali"
- **Endpoint:** `PATCH /api/settings/general` (existing)
- **Saves immediately** on "Lanjut" (skip saves nothing)

### Step 3: Academic Setup (skippable)

- **Heading:** "Pengaturan Akademik"
- **Context:** "Data ini dibutuhkan saat membuat kelas dan jadwal. Anda bisa menambah atau mengubahnya nanti di Settings."
- **3 sections in 1 page:**
  1. **Working Days** — 7 day chips (Mon-Sun), default Mon-Sat selected. Helper: "Hari dimana institusi Anda menerima jadwal belajar"
  2. **Rooms** — Text input + "Tambah" button, tag list with delete. Helper: "Tempat belajar yang tersedia. Digunakan saat menjadwalkan kelas."
  3. **Subjects** — Text input + "Tambah" button, tag list with delete. Helper: "Mata pelajaran yang diajarkan. Digunakan saat membuat kelas baru."
- **Navigation:** "Lanjut" + "Lewati" + "Kembali"
- **Endpoint:** `PATCH /api/settings/academic` (existing)
- **Saves immediately** on "Lanjut" (skip saves nothing)

### Step 4: Billing Mode (required)

- **Heading:** "Pilih Mode Tagihan"
- **Context:** "Tentukan bagaimana institusi Anda menghitung biaya belajar siswa. Mode ini tidak dapat diubah setelah onboarding."
- **Options:**
  - **Per Sesi** — "Tagihan otomatis dihitung setiap kali siswa hadir. Cocok untuk bimbel dengan jadwal fleksibel." Example: "Siswa hadir 12x dalam sebulan dengan biaya Rp50.000/sesi -> tagihan Rp600.000"
  - **Bulanan Tetap** — "Tagihan bulanan dengan jumlah tetap, digenerate otomatis setiap awal bulan. Cocok untuk bimbel dengan biaya bulanan." Example: "Biaya kelas Rp500.000/bulan -> tagihan Rp500.000 otomatis setiap tanggal 1"
- **Warning:** "Mode tagihan tidak dapat diubah setelah onboarding selesai. Hubungi support jika perlu mengubah."
- **Navigation:** "Selesai" (disabled until selection) + "Kembali". No skip.
- **On "Selesai":** Calls `POST /api/onboarding/billing-mode` then `POST /api/onboarding/complete` sequentially.

## Billing Mode Mutability During Onboarding

Billing mode is **not sent to the backend until "Selesai"** on step 4. The selection is held in frontend state only. This means:

- User can navigate back from step 4, change other steps, return, and change billing mode selection freely
- Only when "Selesai" is clicked does the billing mode get committed (irreversible)
- This requires no backend change — `POST /api/onboarding/billing-mode` is called once at completion

## Backend Changes

**Only 1 change required:**

In `onboarding.service.ts` method `complete()`, add:

```typescript
// After setting onboarding_completed = true on institution:
await this.prisma.user.update({
  where: { id: userId },
  data: { must_change_password: false },
});
```

This eliminates the separate password-change redirect after onboarding. The `complete()` controller method needs `@CurrentUser()` decorator to inject `userId`, and the service method signature needs a `userId` parameter.

**No new endpoints. No new migrations. No schema changes.**

All existing endpoints are reused:
- `POST /api/auth/change-password`
- `PATCH /api/settings/general`
- `PATCH /api/settings/academic`
- `POST /api/onboarding/billing-mode`
- `POST /api/onboarding/complete`

## Frontend Changes

### File Structure

```
pages/Onboarding/
  index.tsx              -- Wizard container (refactored from current single-step)
  steps/
    PasswordStep.tsx     -- Step 1
    ProfileStep.tsx      -- Step 2
    AcademicStep.tsx     -- Step 3
    BillingStep.tsx      -- Step 4 (refactored from current onboarding content)
```

### Wizard Container (`index.tsx`)

- Manages `currentStep` state (1-4)
- Renders progress bar showing all 4 steps
- Renders active step component
- Passes `onNext`, `onBack`, `onSkip` callbacks to step components
- On final step completion: calls billing-mode + complete endpoints, then `window.location.href = '/'` (intentionally hard navigation, not `navigate('/')` — this forces a full page reload which re-fetches `/api/auth/me` and clears stale auth state)

### Redirect Logic Changes

**`ProtectedRoute.tsx`:** No change needed — already redirects to `/onboarding` when `onboarding_completed = false`.

**`Layout.tsx`:** Add guard to skip `must_change_password` redirect when `onboarding_completed = false`. The onboarding wizard handles password change as step 1, so the Layout redirect should not interfere.

```typescript
// Layout.tsx — modify mustChangePassword redirect
if (mustChangePassword && user?.institution?.onboarding_completed !== false) {
  navigate('/settings?tab=security');
}
```

## What Does NOT Change

- Backend onboarding endpoints (status, billing-mode, complete) — reused as-is
- Settings pages — admin can still edit all settings after onboarding
- SuperAdmin flow — not affected by onboarding
- TUTOR role — no onboarding redirect
- Database schema — no new migrations
- Onboarding route path (`/onboarding`) — same URL

## Testing

- New admin login -> redirected to step 1 (password change)
- Complete step 1 -> proceeds to step 2
- Skip step 2 -> proceeds to step 3 (no data saved)
- Fill step 3 (rooms, subjects, working days) -> saved via settings endpoint
- Back from step 4 to step 3 -> can edit academic data
- Select billing mode on step 4 -> "Selesai" enabled
- Click "Selesai" -> billing mode committed, onboarding completed, `must_change_password` cleared
- Redirect to dashboard, no further redirects
- Existing institutions (`onboarding_completed = true`) -> no change in behavior
