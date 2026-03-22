# Sprint 4: Quick Wins — Design Spec

> **Date:** 2026-03-22
> **Scope:** 3 items, all wiring existing hooks/endpoints
> **Branch:** `fix/sprint4-quick-wins`

---

## Item 1: Attendance Summary per Class

### Problem
- `useAttendanceSummary` hook imported di `Attendance.tsx` tapi tidak pernah dipanggil
- Backend endpoint `GET /api/admin/attendance/summary` sudah ada dan return `{ total_records, present, absent, late, homework_done, attendance_rate }`
- Halaman Attendance hanya tampilkan "X/N present" per session — tidak ada overview per class

### Solution
- Tambah summary cards di atas session list (panel kiri) yang menampilkan attendance stats untuk class yang sedang dipilih
- Wire `useAttendanceSummary` dengan params: `class_id` dari selected session, `date_from`/`date_to` dari bulan berjalan
- Tampilkan: Attendance Rate (%), Present count, Absent count, Late count
- Summary hanya muncul saat ada session terpilih (karena perlu `class_id`)

### Files to Change
- `sinaloka-platform/src/pages/Attendance.tsx`

---

## Item 2: Redirect After Login (`?redirect=`)

### Problem
- `ProtectedRoute` redirect ke `/login` tanpa menyimpan URL asal
- `Login.tsx` selalu redirect ke `/` atau `/super/institutions` setelah login
- User kehilangan context halaman yang mau diakses

### Current State
- `ProtectedRoute.tsx` line 20: `<Navigate to="/login" replace />`
- `Login.tsx` lines 32-35: hardcoded navigate ke `/` atau `/super/institutions`

### Solution

**`ProtectedRoute.tsx`:**
- Ganti redirect ke `/login` dengan menyimpan current path:
```tsx
<Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
```

**`Login.tsx`:**
- Baca `redirect` dari URL search params
- Setelah login sukses, navigate ke `redirect` param (jika ada dan valid), atau fallback ke default
- Validasi: `redirect` harus dimulai dengan `/` (prevent open redirect attack ke URL eksternal)
- SUPER_ADMIN tetap ke `/super/institutions` (ignore redirect param karena mereka tidak akses admin routes)

### Files to Change
- `sinaloka-platform/src/components/ProtectedRoute.tsx`
- `sinaloka-platform/src/pages/Login.tsx`

---

## Item 3: Enrollment Conflict Check Before Enroll

### Problem
- `useCheckConflict` hook ada dan di-instantiate di `useEnrollmentsPage.ts` tapi `.mutate()` tidak pernah dipanggil
- Backend `POST /api/admin/enrollments/check-conflict` sudah ada
- Admin bisa enroll student ke class yang sudah di-enroll tanpa warning

### Solution
- Di `handleEnroll` function di `useEnrollmentsPage.ts`, sebelum create enrollment:
  1. Call `checkConflict.mutateAsync({ student_id, class_id })` untuk setiap student-class pair
  2. Jika conflict ditemukan (student sudah enrolled di class tersebut), tampilkan warning toast dan skip student tersebut
  3. Lanjutkan create enrollment hanya untuk student yang tidak conflict
- Ini mencegah duplikat enrollment tanpa memblokir seluruh batch

### Files to Change
- `sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts`

---

## Implementation Notes

### Urutan
1. Item 1 (Attendance summary) — frontend only
2. Item 2 (Login redirect) — frontend only, 2 files
3. Item 3 (Enrollment conflict) — frontend only

### Risk: Semua low risk — wiring existing endpoints, no backend changes.
