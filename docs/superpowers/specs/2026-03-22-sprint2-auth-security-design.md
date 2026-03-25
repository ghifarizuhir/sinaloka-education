# Sprint 2: Auth & Security — Design Spec

> **Date:** 2026-03-22
> **Scope:** 3 items across sinaloka-platform + sinaloka-backend
> **Branch:** `fix/sprint2-auth-security`

---

## Item 1: SuperAdmin Reset Password for Admin Users

### Problem
Saat admin lupa password, tidak ada cara reset di platform. Edit User modal SuperAdmin hanya punya Name, Email, Active toggle — tidak ada opsi reset password.

### Current State
- Backend `user.service.ts` `update` method sudah mendukung `password` field opsional — jika `dto.password` diisi, akan di-hash dan di-update
- Tapi tidak ada mekanisme set `must_change_password = true` saat password di-reset oleh SuperAdmin
- Edit User modal (`SuperAdmin/Users.tsx`) hanya punya name, email, is_active fields
- Password validation rules di `auth.service.ts` changePassword: password di-hash dengan bcrypt

### Solution

**Backend (`user.service.ts`):**
- Extend `update` method: jika `dto.password` diberikan, **unconditionally** set `must_change_password = true` pada user — tidak perlu cek caller role karena hanya SUPER_ADMIN yang bisa akses Edit User modal
- `must_change_password` TIDAK ditambahkan ke UpdateUserDto sebagai field yang bisa di-set client — flag ini di-set **secara internal** oleh service saat `password` ada di payload. Ini mencegah client mengirim `{ must_change_password: false }` untuk bypass forced-change gate
- Tambah `password` (optional, min 8 chars) ke UpdateUserDto jika belum ada
- **Revoke semua refresh tokens milik target user** saat password di-reset — ini memaksa re-login di semua device. Gunakan pattern yang sama dari `auth.service.ts` changePassword (line 386-389): `prisma.refresh_token.deleteMany({ where: { user_id } })`
- Validasi password: min 8 chars (backend sudah handle hashing via bcrypt)

**Frontend (`SuperAdmin/Users.tsx`):**
- Tambah "Reset Password" section di Edit User modal, di bawah Active toggle
- Field: New Password (password input dengan toggle visibility via eye icon)
- Validasi client-side: min 8 chars, 1 uppercase letter, 1 digit (sama dengan Security tab)
- Live validation checklist (sama pattern dengan Settings > Security tab)
- Button: "Reset Password" (terpisah dari "Save Changes", variant outline)
- Confirm dialog sebelum submit: "Password akan di-reset. Admin harus ganti password saat login berikutnya."
- On success: toast success, clear password field
- API call: `PATCH /api/admin/users/:id` dengan `{ password }` — hanya kirim password, `must_change_password` di-set server-side

### Files to Change
- `sinaloka-backend/src/modules/user/user.service.ts` — set `must_change_password` + revoke refresh tokens when password provided
- `sinaloka-backend/src/modules/user/user.dto.ts` — ensure password field in UpdateUserDto
- `sinaloka-platform/src/pages/SuperAdmin/Users.tsx` — add reset password UI to edit modal

### Verification
- SuperAdmin reset password → admin's existing sessions invalidated (refresh tokens revoked)
- Admin login with new password → force redirect ke Security tab (advisory via `mustChangePassword` amber banner — navigation guard already exists in Layout)
- Password validation shows live checklist
- Confirm dialog appears before reset
- toast success setelah reset berhasil
- Weak password (< 8 chars, no uppercase, no digit) ditolak di client-side
- Client CANNOT send `must_change_password: false` — field not in DTO

---

## Item 2: Forgot Password Info di Login Page

### Problem
Login page tidak ada panduan saat admin lupa password. Tidak ada "Forgot Password" link.

### Current State
- Login page: hanya email + password fields, tombol Sign in
- Backend sudah punya `forgotPassword` + `resetPassword` flow, tapi kita tidak pakai — flow yang diinginkan adalah admin hubungi SuperAdmin secara manual

### Solution

**Frontend (`Login.tsx`):**
- Tambah link "Lupa kata sandi?" / "Forgot password?" di bawah password field, sebelum tombol Sign in
- Klik → toggle visibility info panel (bukan navigate, bukan modal)
- Info panel content: "Hubungi administrator sistem Anda untuk mereset kata sandi." / "Contact your system administrator to reset your password."
- Styling: subtle info box (zinc bg, small text, info icon)
- i18n keys: `login.forgotPassword` (link text) + `login.forgotPasswordInfo` (panel text)
- Panel bisa di-dismiss dengan klik link lagi (toggle)

### Files to Change
- `sinaloka-platform/src/pages/Login.tsx`
- `sinaloka-platform/src/locales/en.json` — add `login.forgotPassword` + `login.forgotPasswordInfo` keys
- `sinaloka-platform/src/locales/id.json` — add same keys in Bahasa Indonesia

### Verification
- Link "Lupa kata sandi?" muncul di bawah password field
- Klik toggle info panel on/off
- Teks sesuai dengan bahasa aktif (ID/EN)
- Panel tidak mengganggu layout form

---

## Item 3: Impersonation Institution Name Fix

### Problem
Saat SuperAdmin impersonate institusi, Dashboard menampilkan `auth.user.institution.name` dari JWT (null untuk SuperAdmin). Seharusnya menampilkan nama institusi yang di-impersonate.

### Current State
- `Dashboard.tsx` line 69: `const institutionName = auth?.user?.institution?.name ?? 'Dashboard';`
- `AuthContext` menyediakan `impersonatedInstitution: { id, name }` dan `isImpersonating: boolean`
- Institution name hanya ditampilkan di Dashboard (Layout/sidebar tidak menampilkan institution name)
- Layout sidebar hanya menampilkan "Sinaloka" hardcoded + Impersonation banner (sudah ada, terpisah)

### Solution

**Frontend (`Dashboard.tsx`):**
- Ganti logic institution name:
```typescript
const institutionName = auth?.isImpersonating
  ? auth.impersonatedInstitution?.name ?? 'Dashboard'
  : auth?.user?.institution?.name ?? 'Dashboard';
```
- Ini satu-satunya tempat yang perlu di-fix (Layout tidak menampilkan institution name)

### Files to Change
- `sinaloka-platform/src/pages/Dashboard.tsx`

### Verification
- SuperAdmin impersonate institusi "ABC" → Dashboard header menampilkan "ABC"
- SuperAdmin exit impersonation → redirect ke `/super/institutions`
- Admin biasa → Dashboard menampilkan nama institusi mereka seperti biasa
- Jika institution name null → fallback ke "Dashboard"

---

## Implementation Notes

### Urutan Implementasi
1. Item 1 backend (user.service.ts + DTO) — perlu deploy dulu
2. Item 1 frontend (Users.tsx reset password UI)
3. Item 2 (Login forgot password info)
4. Item 3 (Dashboard impersonation fix)

### Testing Strategy
- Backend: `npm run build` + `npm run lint`
- Frontend: `npm run build` + `npm run lint`
- Manual smoke test: login flow, reset password flow, impersonation
- Semua perubahan dalam 1 PR: `fix/sprint2-auth-security`

### Risk Assessment
- **Item 1** — Financial/Security domain (password handling): perlu hashing, must_change_password flag. Medium risk.
- **Item 2** — UI only, no API calls. Low risk.
- **Item 3** — 1 line fix. Low risk.
