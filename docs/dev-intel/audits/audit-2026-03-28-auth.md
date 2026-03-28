# Audit Report — Auth Feature
**Date:** 2026-03-28
**Scope:** 1 feature audited (auth), all areas
**Knowledge base:** 46168c4449003fa1583007cb19f4bd90d7fb713e

## Executive Summary

| Metric | Count |
|--------|-------|
| Features audited | 1 (auth) |
| Findings CRITICAL | 1 |
| Findings HIGH | 2 |
| Findings MEDIUM | 9 |
| Findings LOW | 6 |
| **Total** | **18** |

### Systemic Issues
- **Inkonsistensi keamanan token antar app:** Platform menyimpan kedua token di localStorage, sedangkan Tutors/Parent sudah lebih aman (access in memory).
- **Privilege escalation gap di UserService:** ADMIN bisa membuat/mengubah user ke SUPER_ADMIN karena validasi role hanya di Zod schema tanpa business logic check.
- **Password validation tidak konsisten:** Reset password lebih lemah dari change password.
- **Hardcoded strings di Tutors/Parent:** Tidak menggunakan i18n seperti Platform.

### Cross-Feature Dependencies
- SA-AUTH-003 + SA-AUTH-004 (privilege escalation via create dan update)
- SA-AUTH-002 + SA-AUTH-008 (platform token storage + hard navigate)
- SA-AUTH-001 + SA-AUTH-014 (race condition + atomicity issues)

---

## Findings

### ~~[CRITICAL] SA-AUTH-001 — Race Condition pada Refresh Token: Revoke-then-Create Tidak Atomik~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-backend/src/modules/auth/auth.service.ts` (line 144-213)
**Description:** Method `refresh()` melakukan revoke old token dan create new token dalam dua operasi terpisah (tanpa `$transaction`). Jika dua request concurrent menggunakan refresh token yang sama, keduanya bisa berhasil melewati check `revoked === false` sebelum salah satu melakukan revoke. Ini membuat satu refresh token bisa dipakai dua kali, menghasilkan dua set token yang valid.

**Problematic code:**
```typescript
// Revoke old refresh token (line 176-179)
await this.prisma.refreshToken.update({
  where: { id: refreshToken.id },
  data: { revoked: true },
});

// ... Generate new tokens ...

// Create new refresh token (line 197-203)
await this.prisma.refreshToken.create({
  data: {
    user_id: refreshToken.user.id,
    token: newRefreshTokenValue,
    expires_at: expiresAt,
  },
});
```

**Expected fix:**
```typescript
// Wrap revoke + create in a $transaction
const newRefreshTokenValue = crypto.randomBytes(64).toString('hex');
await this.prisma.$transaction([
  this.prisma.refreshToken.update({
    where: { id: refreshToken.id },
    data: { revoked: true },
  }),
  this.prisma.refreshToken.create({
    data: {
      user_id: refreshToken.user.id,
      token: newRefreshTokenValue,
      expires_at: expiresAt,
    },
  }),
]);
```

**Acceptance criteria:**
- [ ] Revoke dan create dalam satu transaction
- [ ] Concurrent refresh dengan token yang sama: hanya satu yang berhasil
- [ ] Unit test untuk concurrent refresh scenario

**Dependencies:**
- Related to: SA-AUTH-014
- Affects modules: auth

**Test plan:**
- Manual: Kirim dua refresh request simultaneous dengan token yang sama, pastikan hanya satu yang berhasil
- Automated: Unit test dengan mock yang simulate concurrent access
- Build: `cd sinaloka-backend && npm run test`

**Effort:** Small (<1hr)

---

### ~~[HIGH] SA-AUTH-002 — Platform Menyimpan Kedua Token di localStorage (XSS Vulnerable)~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-platform/src/lib/api.ts` (line 27, 90-91) dan `sinaloka-platform/src/contexts/AuthContext.tsx` (line 70-71)
**Description:** Platform menyimpan baik `access_token` maupun `refresh_token` di localStorage. Jika terjadi XSS, attacker bisa mencuri kedua token dan mendapat akses penuh. Bandingkan dengan Tutors dan Parent yang sudah menyimpan access token di memory saja -- approach yang lebih aman.

**Problematic code:**
```typescript
// AuthContext.tsx line 70-71
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);

// api.ts line 27
const token = localStorage.getItem('access_token');
```

**Expected fix:**
Migrasi Platform ke pola yang sama dengan Tutors/Parent: access token di memory variable, refresh token di localStorage (atau idealnya httpOnly cookie).

**Acceptance criteria:**
- [ ] Access token disimpan di memory variable, bukan localStorage
- [ ] Refresh token tetap di localStorage (acceptable tradeoff)
- [ ] Token refresh flow tetap bekerja setelah page reload
- [ ] Tidak ada regresi pada auth flow

**Dependencies:**
- Related to: SA-AUTH-008
- Affects modules: sinaloka-platform

**Test plan:**
- Manual: Login, periksa localStorage hanya berisi refresh token
- Automated: E2E auth test
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Medium (1-4hr)

---

### ~~[HIGH] SA-AUTH-003 — ADMIN Bisa Membuat User SUPER_ADMIN via UserService~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-backend/src/modules/user/user.dto.ts` (line 7) dan `sinaloka-backend/src/modules/user/user.service.ts` (line 120-151)
**Description:** `CreateUserSchema` mengizinkan role `SUPER_ADMIN` dalam enum. Controller `UserController.create` hanya membutuhkan role `SUPER_ADMIN` atau `ADMIN`. Artinya seorang ADMIN bisa membuat user dengan role `SUPER_ADMIN` -- privilege escalation.

**Problematic code:**
```typescript
// user.dto.ts line 7
role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TUTOR']),

// user.controller.ts line 29
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
```

**Expected fix:**
```typescript
// Option 1: Hapus SUPER_ADMIN dari CreateUserSchema
role: z.enum(['ADMIN', 'TUTOR']),

// Option 2: Validasi di service bahwa hanya SUPER_ADMIN yang bisa create SUPER_ADMIN
if (dto.role === 'SUPER_ADMIN' && callerRole !== 'SUPER_ADMIN') {
  throw new ForbiddenException('Only Super Admin can create Super Admin users');
}
```

**Acceptance criteria:**
- [ ] ADMIN tidak bisa membuat user SUPER_ADMIN
- [ ] SUPER_ADMIN masih bisa membuat SUPER_ADMIN jika diperlukan
- [ ] Unit test untuk privilege escalation attempt

**Dependencies:**
- Related to: SA-AUTH-004
- Affects modules: user

**Test plan:**
- Manual: Login sebagai ADMIN, coba POST /api/admin/users dengan role SUPER_ADMIN
- Automated: `cd sinaloka-backend && npm run test -- --testPathPattern=user`
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Small (<1hr)

---

### ~~[HIGH] SA-AUTH-004 — ADMIN Bisa Mengubah Role User ke SUPER_ADMIN via Update~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-backend/src/modules/user/user.dto.ts` (line 19) dan `sinaloka-backend/src/modules/user/user.service.ts` (line 154-211)
**Description:** `UpdateUserSchema` juga mengizinkan role `SUPER_ADMIN`. Seorang ADMIN bisa mengubah role user lain (atau user baru) menjadi `SUPER_ADMIN`. Selain itu, `UpdateUserSchema` memperbolehkan `institution_id` diubah -- ADMIN bisa memindahkan user ke institusi lain.

**Problematic code:**
```typescript
// user.dto.ts line 19
role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TUTOR']).optional(),

// user.dto.ts line 21-24
institution_id: z.string().uuid('Invalid institution ID').optional().nullable(),
```

**Expected fix:**
```typescript
// Hapus SUPER_ADMIN dari UpdateUserSchema.role
role: z.enum(['ADMIN', 'TUTOR']).optional(),

// Hapus institution_id dari UpdateUserSchema (atau restrict ke SUPER_ADMIN only di service)
```

**Acceptance criteria:**
- [ ] ADMIN tidak bisa set role SUPER_ADMIN via update
- [ ] ADMIN tidak bisa mengubah institution_id user
- [ ] SUPER_ADMIN tetap bisa melakukan keduanya

**Dependencies:**
- Related to: SA-AUTH-003
- Affects modules: user

**Test plan:**
- Manual: Login sebagai ADMIN, coba PATCH user dengan role=SUPER_ADMIN
- Automated: Unit test + integration test
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Small (<1hr)

---

### [MEDIUM] SA-AUTH-005 — Rate Limiting Berbasis In-Memory, Tidak Efektif di Multi-Instance

**Category:** Security
**File:** `sinaloka-backend/src/common/guards/rate-limit.guard.ts` (line 21)
**Description:** Rate limiting menggunakan `Map` in-memory. Jika backend di-deploy di beberapa instance (horizontal scaling), setiap instance punya Map sendiri. Attacker bisa bypass rate limit dengan request ke instance berbeda. Saat ini Railway single-instance, tapi ini bisa jadi masalah saat scaling.

**Problematic code:**
```typescript
const ipMap = new Map<string, RateLimitEntry>();
```

**Expected fix:**
Gunakan Redis-backed rate limiter (e.g., `@nestjs/throttler` dengan Redis adapter), atau setidaknya dokumentasikan bahwa ini hanya efektif untuk single-instance deployment.

**Acceptance criteria:**
- [ ] Rate limit awareness di dokumentasi deployment
- [ ] (Ideal) Migrasi ke Redis-backed rate limiting

**Dependencies:**
- Affects modules: common/guards

**Test plan:**
- Manual: Verify rate limit masih bekerja di single instance
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Medium (1-4hr) untuk Redis migration, Small untuk dokumentasi

---

### ~~[MEDIUM] SA-AUTH-006 — Logout Endpoint Membutuhkan Auth Tapi Refresh Token Sudah Cukup~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/auth/auth.controller.ts` (line 81-86)
**Description:** Endpoint `POST /auth/logout` tidak ditandai `@Public()`, artinya membutuhkan valid access token. Tapi saat access token expired, user tidak bisa logout (karena 401). Tutors dan Parent frontend mengirim logout request yang mungkin gagal jika access token sudah expired -- mereka handle ini dengan try/catch dan tetap clear local tokens. Tapi ini berarti refresh token tidak di-revoke di server, masih bisa digunakan.

**Problematic code:**
```typescript
@Post('logout')
@HttpCode(HttpStatus.OK)
@UsePipes(new ZodValidationPipe(LogoutSchema))
async logout(@Body() dto: LogoutDto) {
  return this.authService.logout(dto);
}
```

**Expected fix:**
```typescript
@Public() // Tambahkan @Public() karena logout hanya perlu refresh token
@Post('logout')
@HttpCode(HttpStatus.OK)
@UsePipes(new ZodValidationPipe(LogoutSchema))
async logout(@Body() dto: LogoutDto) {
  return this.authService.logout(dto);
}
```

**Acceptance criteria:**
- [ ] Logout berhasil meskipun access token expired
- [ ] Refresh token di-revoke di server saat logout
- [ ] Tidak ada security regression (logout hanya revoke token yang dikirim)

**Dependencies:**
- Affects modules: auth

**Test plan:**
- Manual: Tunggu access token expired, coba logout, verify refresh token di-revoke
- Automated: `cd sinaloka-backend && npm run test -- --testPathPattern=auth`
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Small (<1hr)

---

### ~~[MEDIUM] SA-AUTH-007 — Reset Password Tidak Enforce Complexity yang Sama dengan Change Password~~ FIXED 2026-03-28

**Category:** Gap
**File:** `sinaloka-backend/src/modules/auth/auth.dto.ts` (line 38-42 vs 44-51)
**Description:** `ResetPasswordSchema` hanya memvalidasi `min(8)`, sementara `ChangePasswordSchema` memvalidasi `min(8)` + uppercase + digit. User bisa set password lemah via reset password flow yang tidak bisa mereka set via change password.

**Problematic code:**
```typescript
// ResetPasswordSchema - weak validation
password: z.string().min(8, 'Password must be at least 8 characters'),

// ChangePasswordSchema - strong validation
new_password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit'),
```

**Expected fix:**
```typescript
// Buat shared password validator
const passwordValidator = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

// Gunakan di kedua schema
```

**Acceptance criteria:**
- [ ] Semua endpoint yang set password menggunakan validasi yang sama
- [ ] Frontend reset password form menampilkan requirements yang sama

**Dependencies:**
- Affects modules: auth, parent (ParentRegisterSchema juga perlu dicek)

**Test plan:**
- Manual: Coba reset password dengan "abcdefgh" (no uppercase/digit), harus ditolak
- Automated: Unit test validation
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Small (<1hr)

---

### ~~[MEDIUM] SA-AUTH-008 — Platform Intercept 401 Melakukan Hard Navigate, Kehilangan State~~ FIXED 2026-03-28

**Category:** UX / Bug
**File:** `sinaloka-platform/src/lib/api.ts` (line 101)
**Description:** Saat refresh gagal, platform melakukan `window.location.href = '/login'` yang akan full page reload, kehilangan semua React state. Tutors dan Parent lebih baik karena dispatch custom event yang ditangkap oleh AuthContext. Platform seharusnya mengikuti pola yang sama.

**Problematic code:**
```typescript
// api.ts line 101
window.location.href = '/login';
```

**Expected fix:**
```typescript
window.dispatchEvent(new Event('auth:logout'));
```
Dan di AuthContext, handle event ini untuk clear state dan redirect.

**Acceptance criteria:**
- [ ] Refresh failure tidak menyebabkan hard navigate
- [ ] AuthContext menangani forced logout dengan graceful redirect
- [ ] User mendapat toast notification "Session expired"

**Dependencies:**
- Related to: SA-AUTH-002
- Affects modules: sinaloka-platform

**Test plan:**
- Manual: Invalidate refresh token, trigger 401, verify graceful redirect
- Automated: E2E test
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Small (<1hr)

---

### ~~[MEDIUM] SA-AUTH-009 — Tutor Login Tidak Mengirim Slug, Bisa Login ke Institusi Lain~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-tutors/src/contexts/AuthContext.tsx` (line 40)
**Description:** Tutor login tidak mengirim `slug` ke backend. Jika `ENFORCE_SUBDOMAIN_LOGIN` tidak `true` (default `false`), seorang tutor dari institusi A bisa login di URL apapun. Ini bukan masalah besar karena data masih tenant-isolated, tapi secara UX membingungkan dan secara security bisa lebih ketat.

**Problematic code:**
```typescript
// Tutor AuthContext line 40
const res = await api.post('/api/auth/login', { email, password });
// Tidak ada slug
```

**Expected fix:**
Tambahkan slug detection di Tutors app (mirip Platform), atau set `ENFORCE_SUBDOMAIN_LOGIN=true` di production.

**Acceptance criteria:**
- [ ] Tutor login mengirim slug jika di subdomain
- [ ] Backend memvalidasi tutor milik institusi yang benar

**Dependencies:**
- Affects modules: sinaloka-tutors

**Test plan:**
- Manual: Login tutor di subdomain institusi yang bukan miliknya
- Build: `cd sinaloka-tutors && npm run build`

**Effort:** Small (<1hr)

---

### ~~[MEDIUM] SA-AUTH-010 — PasswordResetToken Tidak Punya Index pada user_id~~ FIXED 2026-03-28

**Category:** Performance
**File:** `sinaloka-backend/prisma/schema.prisma`
**Description:** Model `PasswordResetToken` tidak punya `@@index([user_id])`. Method `forgotPassword` melakukan `updateMany({ where: { user_id, used_at: null } })` yang akan full scan tanpa index. `RefreshToken` sudah punya `@@index([user_id])`, tapi `PasswordResetToken` belum.

**Problematic code:**
```prisma
model PasswordResetToken {
  // ... fields ...
  user User @relation(fields: [user_id], references: [id])
  @@map("password_reset_tokens")
  // Missing: @@index([user_id])
}
```

**Expected fix:**
```prisma
@@index([user_id])
```

**Acceptance criteria:**
- [ ] Index pada user_id ditambahkan via migration
- [ ] Query forgotPassword lebih efisien

**Dependencies:**
- Affects modules: prisma schema

**Test plan:**
- Manual: `EXPLAIN ANALYZE` query updateMany
- Build: `cd sinaloka-backend && npx prisma migrate dev --name add-prt-user-index`

**Effort:** Small (<1hr)

---

### [MEDIUM] SA-AUTH-011 — Expired Refresh Token Tidak Pernah Dibersihkan

**Category:** Performance / Data Integrity
**File:** `sinaloka-backend/src/modules/auth/auth.service.ts`
**Description:** Refresh token yang expired atau revoked tidak pernah dihapus dari database. Seiring waktu, tabel `refresh_tokens` akan membesar. Tidak ada scheduled cleanup.

**Expected fix:**
Tambahkan cron job atau scheduled task yang menghapus refresh token yang `revoked = true` ATAU `expires_at < NOW()` secara berkala (misalnya setiap hari).

**Acceptance criteria:**
- [ ] Expired/revoked tokens dibersihkan secara otomatis
- [ ] Cleanup tidak mengganggu active tokens
- [ ] PasswordResetToken yang expired juga dibersihkan

**Dependencies:**
- Affects modules: auth, prisma

**Test plan:**
- Manual: Verify cleanup removes only expired/revoked tokens
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Medium (1-4hr)

---

### ~~[MEDIUM] SA-AUTH-012 — Tidak Ada Brute Force Detection pada Login Selain Rate Limit~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-backend/src/modules/auth/auth.service.ts` (line 42-141)
**Description:** Login hanya dibatasi oleh rate limit (5 per 15 menit per IP). Tidak ada account lockout setelah N kali gagal, timing attack mitigation (bcrypt compare hanya dipanggil jika user ada), atau logging failed attempts. Di line 48-49, jika user tidak ditemukan, langsung throw tanpa bcrypt compare — membuat perbedaan waktu response antara "user exists" vs "user not found".

**Problematic code:**
```typescript
if (!user) {
  throw new UnauthorizedException('Invalid email or password');
  // No bcrypt compare -> faster response -> timing oracle
}
```

**Expected fix:**
```typescript
if (!user) {
  // Dummy bcrypt compare to prevent timing attack
  await bcrypt.compare(dto.password, '$2b$10$dummyhashdummyhashdummyhash');
  throw new UnauthorizedException('Invalid email or password');
}
```

**Acceptance criteria:**
- [ ] Response time konsisten antara user not found dan wrong password
- [ ] Failed login attempts di-log untuk monitoring
- [ ] (Optional) Account lockout setelah N kali gagal

**Dependencies:**
- Affects modules: auth

**Test plan:**
- Manual: Bandingkan response time antara email tidak ada vs password salah
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Small (<1hr) untuk timing fix, Medium untuk account lockout

---

### [LOW] SA-AUTH-013 — Hardcoded Strings di Frontend Tutors dan Parent

**Category:** UX / i18n
**File:** Seluruh file di `sinaloka-tutors/src/pages/` dan `sinaloka-parent/src/pages/`
**Description:** Platform sudah menggunakan i18n (`useTranslation`), tapi Tutors dan Parent masih punya banyak hardcoded Bahasa Indonesia strings. Contoh: "Masuk", "Login gagal", "Lupa Password?", "Portal Tutor", "Aktivasi Akun Tutor", dll.

**Acceptance criteria:**
- [ ] Semua user-facing strings menggunakan i18n
- [ ] Konsistensi bahasa antar app

**Dependencies:**
- Affects modules: sinaloka-tutors, sinaloka-parent

**Test plan:**
- Manual: Ganti language, verify semua string berubah
- Build: `npm run build` di kedua app

**Effort:** Large (4+hr)

---

### ~~[LOW] SA-AUTH-014 — AuthService.login Tidak Atomik (Update last_login_at + Create RefreshToken)~~ FIXED 2026-03-28

**Category:** Data Integrity
**File:** `sinaloka-backend/src/modules/auth/auth.service.ts` (line 102-131)
**Description:** Login melakukan `user.update` (last_login_at) dan `refreshToken.create` terpisah. Jika create gagal setelah update, last_login_at sudah terupdate tapi user tidak dapat token. Minor issue, tapi bisa dibungkus transaction.

**Expected fix:**
Bungkus dalam `$transaction`.

**Acceptance criteria:**
- [ ] Login operations dalam satu transaction

**Dependencies:**
- Related to: SA-AUTH-001
- Affects modules: auth

**Test plan:**
- Build: `cd sinaloka-backend && npm run test`

**Effort:** Small (<1hr)

---

### ~~[LOW] SA-AUTH-015 — UserService.remove Hard-Deletes User Tanpa Cascade Safety~~ FIXED 2026-03-28

**Category:** Data Integrity
**File:** `sinaloka-backend/src/modules/user/user.service.ts` (line 214-225)
**Description:** `remove()` menghapus refresh tokens lalu hard-delete user. Tapi user mungkin punya relasi lain (Tutor, Parent, Session, AuditLog, Notification) yang bisa gagal atau orphan. RefreshToken punya `onDelete: Cascade`, tapi PasswordResetToken tidak.

**Problematic code:**
```typescript
await this.prisma.refreshToken.deleteMany({ where: { user_id: id } });
return this.prisma.user.delete({ where: { id } });
// PasswordResetToken, AuditLog, Notification tidak di-handle
```

**Expected fix:**
Tambahkan cleanup untuk PasswordResetToken, atau tambahkan `onDelete: Cascade` di schema, atau gunakan soft-delete.

**Acceptance criteria:**
- [ ] User deletion tidak menyebabkan foreign key errors
- [ ] Semua related records dibersihkan

**Dependencies:**
- Affects modules: user, prisma schema

**Test plan:**
- Manual: Delete user yang punya password reset tokens, verify no FK errors
- Build: `cd sinaloka-backend && npm run build`

**Effort:** Small (<1hr)

---

### [LOW] SA-AUTH-016 — Unit Test AuthService Tidak Cover forgotPassword, resetPassword, changePassword

**Category:** Test Coverage
**File:** `sinaloka-backend/src/modules/auth/auth.service.spec.ts`
**Description:** Unit test hanya cover `login`, `refresh`, dan `logout`. Method `forgotPassword`, `validateResetToken`, `resetPassword`, `changePassword`, dan `getProfile` tidak di-test sama sekali.

**Acceptance criteria:**
- [ ] forgotPassword: test success, user not found (still returns success), email sent
- [ ] validateResetToken: test valid, expired, already used
- [ ] resetPassword: test success, invalid token, transaction rollback
- [ ] changePassword: test success, wrong current password, same password
- [ ] getProfile: test success, user not found

**Dependencies:**
- Affects modules: auth

**Test plan:**
- Automated: `cd sinaloka-backend && npm run test -- --testPathPattern=auth.service`

**Effort:** Medium (1-4hr)

---

### ~~[LOW] SA-AUTH-017 — ChangePassword di Platform Melakukan Logout Setelah Sukses~~ FIXED 2026-03-28

**Category:** UX
**File:** `sinaloka-platform/src/pages/ChangePassword.tsx` (line 35-38)
**Description:** Setelah change password berhasil, page melakukan `logout()` yang menghapus semua tokens. Tapi backend `changePassword` sudah mengembalikan token baru. Seharusnya token baru disimpan dan user tetap login, bukan dipaksa login ulang.

**Problematic code:**
```typescript
const handlePasswordChanged = async () => {
  toast.success(t('changePassword.success'));
  await logout(); // Membuang token baru yang baru saja diterima
};
```

**Expected fix:**
Simpan token baru dari response changePassword, update auth context, redirect ke dashboard.

**Acceptance criteria:**
- [ ] Setelah change password, user tetap login dengan token baru
- [ ] User tidak perlu login ulang

**Dependencies:**
- Affects modules: sinaloka-platform

**Test plan:**
- Manual: Change password, verify tetap login
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Small (<1hr)

---

### ~~[LOW] SA-AUTH-018 — Parent Register Tidak Validate Invite Token di Frontend Sebelum Show Form~~ FIXED 2026-03-28

**Category:** UX
**File:** `sinaloka-parent/src/pages/RegisterPage.tsx`
**Description:** Parent RegisterPage langsung menampilkan form tanpa memvalidasi invite token terlebih dahulu. Berbeda dengan Tutor AcceptInvitePage yang melakukan `GET /api/invitation/:token` untuk validasi sebelum menampilkan form. Jika token invalid, parent baru tahu setelah submit form.

**Expected fix:**
Tambahkan validasi token saat component mount (mirip AcceptInvitePage).

**Acceptance criteria:**
- [ ] Invalid token menampilkan error message, bukan form
- [ ] Valid token menampilkan form pre-filled

**Dependencies:**
- Affects modules: sinaloka-parent

**Test plan:**
- Manual: Navigate ke parent app dengan token invalid, verify error shown
- Build: `cd sinaloka-parent && npm run build`

**Effort:** Small (<1hr)

---

## Priority Table

| # | ID | Severity | Category | Judul | Effort |
|---|---|---|---|---|---|
| 1 | SA-AUTH-001 | CRITICAL | Security | Race Condition pada Refresh Token | Small |
| 2 | SA-AUTH-003 | HIGH | Security | ADMIN Bisa Create SUPER_ADMIN | Small |
| 3 | SA-AUTH-004 | HIGH | Security | ADMIN Bisa Update Role ke SUPER_ADMIN | Small |
| 4 | SA-AUTH-006 | MEDIUM | Bug | Logout Butuh Auth Padahal Tidak Perlu | Small |
| 5 | SA-AUTH-007 | MEDIUM | Gap | Reset Password Validation Lebih Lemah | Small |
| 6 | SA-AUTH-012 | MEDIUM | Security | Timing Attack pada Login | Small |
| 7 | SA-AUTH-002 | HIGH | Security | Platform Token di localStorage | Medium |
| 8 | SA-AUTH-008 | MEDIUM | UX/Bug | Hard Navigate pada Refresh Failure | Small |
| 9 | SA-AUTH-009 | MEDIUM | Security | Tutor Login Tanpa Slug | Small |
| 10 | SA-AUTH-010 | MEDIUM | Performance | Missing Index PasswordResetToken | Small |
| 11 | SA-AUTH-014 | LOW | Data Integrity | Login Operations Tidak Atomik | Small |
| 12 | SA-AUTH-017 | LOW | UX | ChangePassword Logout Setelah Sukses | Small |
| 13 | SA-AUTH-018 | LOW | UX | Parent Register Tanpa Token Validation | Small |
| 14 | SA-AUTH-015 | LOW | Data Integrity | Hard Delete User Tanpa Full Cascade | Small |
| 15 | SA-AUTH-016 | LOW | Test Coverage | Unit Test Coverage Gap | Medium |
| 16 | SA-AUTH-011 | MEDIUM | Perf/Data | Expired Tokens Tidak Dibersihkan | Medium |
| 17 | SA-AUTH-005 | MEDIUM | Security | Rate Limit In-Memory Only | Medium |
| 18 | SA-AUTH-013 | LOW | UX/i18n | Hardcoded Strings di Tutors/Parent | Large |

## Fix Progress

| Finding | Severity | Status | Sprint | PR |
|---------|----------|--------|--------|----|
| SA-AUTH-001 | CRITICAL | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-002 | HIGH | FIXED | 2026-03-28 | Sprint 2 — Platform Token & Frontend UX | TBD |
| SA-AUTH-003 | HIGH | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-004 | HIGH | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-005 | MEDIUM | PLANNED | - | Sprint 3 | - |
| SA-AUTH-006 | MEDIUM | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-007 | MEDIUM | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-008 | MEDIUM | FIXED | 2026-03-28 | Sprint 2 — Platform Token & Frontend UX | TBD |
| SA-AUTH-009 | MEDIUM | FIXED | 2026-03-28 | Sprint 2 — Platform Token & Frontend UX | TBD |
| SA-AUTH-010 | MEDIUM | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-011 | MEDIUM | PLANNED | - | Sprint 3 | - |
| SA-AUTH-012 | MEDIUM | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-013 | LOW | PLANNED | - | Backlog | - |
| SA-AUTH-014 | LOW | FIXED | 2026-03-28 | Sprint 1: Auth Critical & Security | TBD |
| SA-AUTH-015 | LOW | FIXED | 2026-03-28 | Sprint 2 — Platform Token & Frontend UX | TBD |
| SA-AUTH-016 | LOW | PLANNED | - | Sprint 3 | - |
| SA-AUTH-017 | LOW | FIXED | 2026-03-28 | Sprint 2 — Platform Token & Frontend UX | TBD |
| SA-AUTH-018 | LOW | FIXED | 2026-03-28 | Sprint 2 — Platform Token & Frontend UX | TBD |
