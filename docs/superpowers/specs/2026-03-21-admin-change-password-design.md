# Admin Change Password — Design Spec

## Overview

Add self-service password change for platform admin users, with forced password change after first login when password was set manually (seeded or created by another admin).

## Scope

- **In scope:** Backend change-password endpoint (all roles), Security tab in platform Settings, force-change flow for ADMIN users
- **Out of scope:** Change password UI in tutor/parent apps (backend endpoint is universal, UI deferred to future iteration). SUPER_ADMIN force-change is also out of scope (SUPER_ADMIN uses a separate layout without the Settings page).

## Approach

Database flag `must_change_password` on User model. Login response and profile endpoint both include the flag. Frontend route guard redirects to Settings Security tab when flag is true. After password change, flag is cleared and new tokens issued.

---

## Backend

### 1. Prisma Schema

Add to `User` model:

```prisma
must_change_password Boolean @default(false)
```

Migration: single boolean column, default false. Existing users unaffected.

### 2. Seed Update

In `prisma/seed.ts`, set `must_change_password: true` for seeded `ADMIN` users only. Exclusions:
- **SUPER_ADMIN:** Uses `SuperAdminLayout` which does not render the Settings page — there is no UI path to resolve the flag. SUPER_ADMIN passwords should be changed manually or via a future dedicated flow.
- **TUTOR/PARENT:** No change-password UI in their apps yet — forcing the flag without a way to resolve it would be a dead end.

### 3. Login Response

Modify `AuthService.login()` to include `must_change_password` in the response body:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc...",
  "token_type": "Bearer",
  "expires_in": 900,
  "must_change_password": true
}
```

Note: The login response includes the flag for completeness and for non-platform clients. However, the platform frontend's `AuthContext.login()` discards the login response body after storing tokens — it immediately calls `getMe()` to populate user state. Therefore the **primary delivery mechanism** for the flag to the frontend is the profile endpoint below.

### 4. Profile Endpoint: GET /api/auth/me

Modify `AuthService.getProfile()` to include `must_change_password` in the response. Concrete changes required:

- **Backend:** Add `must_change_password: true` to the `select` clause in `AuthService.getProfile()` (in `auth.service.ts`)
- **Frontend type:** Add `must_change_password: boolean` to the `User` interface in `src/types/auth.ts`

This ensures the flag survives page refresh — when the frontend re-initializes AuthContext via `getMe()`, the flag is restored from the server. This is also how the flag reaches the frontend after login (since `login()` calls `getMe()` immediately after storing tokens).

### 5. New Endpoint: POST /api/auth/change-password

**Auth:** Requires valid JWT (authenticated). Available to all roles.

**Request body (Zod validated):**

```typescript
{
  current_password: string,          // required
  new_password: string               // min 8 chars, must contain uppercase + digit
}
```

**Logic:**

1. Get user from JWT (`@CurrentUser()`)
2. Verify `current_password` against stored `password_hash` via `bcrypt.compare`
3. Reject if `current_password === new_password` (both are plaintext in the request body, so a simple string comparison suffices)
4. Hash `new_password` with bcrypt (salt rounds 10)
5. Update `password_hash` and set `must_change_password = false`
6. Revoke all refresh tokens for this user (use `updateMany` with `{ revoked: false }` filter, matching the existing `resetPassword()` pattern)
7. Issue new `access_token` + `refresh_token`
8. Return new tokens + `must_change_password: false`

**After success, frontend must replace both `access_token` and `refresh_token` in localStorage** — old tokens are invalidated by the revocation in step 6.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 | Current password incorrect |
| 400 | New password same as current password |
| 400 | New password fails validation (min 8, uppercase, digit) |

### 6. Admin Create User — auto-set flag

Set `must_change_password: true` unconditionally when `InstitutionService.create()` creates the institution's first admin user (this code path always receives a password). Users who set their own password via invitation acceptance or self-registration keep `must_change_password: false`.

### 7. Password Complexity Consistency

The existing `ResetPasswordSchema` (in `auth.dto.ts`) only enforces `min(8)` without uppercase or digit requirements. This is acknowledged as an inconsistency — out of scope for this iteration but should be aligned in a future pass. The new `ChangePasswordSchema` will enforce the stricter rules (min 8 + uppercase + digit).

---

## Frontend (Platform)

### 1. AuthContext

- Add `mustChangePassword` to `AuthContextType` interface
- Add `must_change_password` to `User` type in `src/types/auth.ts`
- The flag is populated from `/api/auth/me` response (via `getMe()` called both after login and on page refresh/init). The `login()` handler does not need to read the flag from the login response — `getMe()` handles it.
- After successful password change: replace both tokens in localStorage, clear `mustChangePassword` flag in state

### 2. Route Guard

Place the guard inside the `Layout` component (not `ProtectedRoute`), since Layout already wraps all authenticated pages and renders the sidebar/header that should remain visible:

- If `mustChangePassword === true` and current path is not `/settings`: redirect to `/settings?tab=security`
- Sidebar and header remain visible (user knows they're logged in)
- Clicking any menu item redirects back to Settings Security
- Logout remains accessible

Note: SUPER_ADMIN users go through `SuperAdminLayout` and are not affected by this guard. This is intentional — see Scope and Seed Update sections.

### 3. Security Tab (new)

Add "Security" tab to existing Settings page (`/settings?tab=security`), alongside General, Billing, Academic, Registration, Plans. Use i18n key `settings.tabs.security` for the tab label.

**Two modes:**

**Normal mode** (`mustChangePassword = false`):
- Security tab accessible like any other Settings tab
- No alert banner
- After success: Sonner toast "Password berhasil diubah", stay on Settings page

**Force mode** (`mustChangePassword = true`):
- Amber alert banner at top: "Anda harus mengganti password default sebelum melanjutkan"
- Other Settings tabs visually greyed out (reduced opacity) and non-interactive (`pointer-events: none`)
- After success: update AuthContext (clear flag + store new tokens), redirect to dashboard
- Toast: "Password berhasil diubah. Selamat datang!"

**Form fields:**
- Password Saat Ini (password input)
- Password Baru (password input)
- Konfirmasi Password Baru (password input, client-side match validation only)

**Real-time validation checklist (frontend only):**
- ✓/✗ Minimal 8 karakter
- ✓/✗ Mengandung huruf besar
- ✓/✗ Mengandung angka

Note: "Different from current password" is validated server-side only (to avoid implying we can see the user's current password). If backend returns 400 for same password, display inline error on the form.

**Submit button:** Disabled until all 3 frontend validations pass and confirm password matches.

### 4. Service Layer

Add to `src/services/auth.service.ts`:

```typescript
changePassword(current_password: string, new_password: string)
  // POST /api/auth/change-password
  // Returns { access_token, refresh_token, must_change_password }
```

---

## Password Validation Rules

| Rule | Where |
|------|-------|
| Min 8 characters | Frontend (real-time) + Backend (Zod) |
| Contains uppercase letter | Frontend (real-time) + Backend (Zod regex) |
| Contains digit | Frontend (real-time) + Backend (Zod regex) |
| Confirm password matches | Frontend only (client-side) |
| Different from current password | Backend only (compare request body fields) |
