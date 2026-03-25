# Forgot Password / Reset Password for sinaloka-tutors

**Date:** 2026-03-16
**Status:** Approved

## Overview

Add a forgot password flow to the tutor app so tutors can reset their password via email. Uses the existing Resend email infrastructure.

## User Flow

1. Tutor on login page taps "Lupa Password?"
2. Navigates to forgot password page, enters email, taps "Kirim Link Reset"
3. Backend creates a `PasswordResetToken`, sends email via Resend with reset link
4. Backend always returns success (don't reveal if email exists)
5. Tutor receives email with link: `{TUTOR_PORTAL_URL}/reset-password?token=xxx`
6. Link opens reset password page, validates token via `GET /api/auth/reset-password/:token`
7. Tutor enters new password + confirmation, taps "Simpan Password Baru"
8. Backend hashes password, updates user, marks token as used
9. Redirect to login page with success message

## Database

New Prisma model:

```prisma
model PasswordResetToken {
  id         String    @id @default(uuid())
  user_id    String
  token      String    @unique
  expires_at DateTime
  used_at    DateTime?
  created_at DateTime  @default(now())

  user User @relation(fields: [user_id], references: [id])

  @@map("password_reset_tokens")
}
```

Add `password_reset_tokens PasswordResetToken[]` relation to the `User` model.

## Backend Endpoints

All three endpoints are `@Public()` (no JWT required).

### `POST /api/auth/forgot-password`

**Request:** `{ "email": "tutor@example.com" }`

**Logic:**
1. Look up user by email
2. If not found or inactive, return success anyway (don't reveal existence)
3. Invalidate any existing unused reset tokens for this user (`UPDATE ... SET used_at = now()`)
4. Create new `PasswordResetToken` with 64-char hex token, 1 hour expiry
5. Send password reset email via `EmailService.sendPasswordReset()`
6. Return `{ "message": "Jika email terdaftar, link reset password telah dikirim." }`

### `GET /api/auth/reset-password/:token`

**Logic:**
1. Look up token in `PasswordResetToken`
2. If not found, expired, or already used → 400 error
3. Return `{ "valid": true, "email": user.email }` (shows who the token belongs to)

### `POST /api/auth/reset-password`

**Request:** `{ "token": "xxx", "password": "newpassword123" }`

**Validation:** password min 8 chars

**Logic:**
1. Look up token, validate not expired/used
2. Hash new password with bcrypt (10 rounds, same as existing)
3. Update `user.password_hash`
4. Mark token as used (`used_at = now()`)
5. Revoke all refresh tokens for this user (force re-login everywhere)
6. Return `{ "message": "Password berhasil direset." }`

## Email Template

New method `EmailService.sendPasswordReset(email, name, resetUrl)`.

HTML email matching the existing invitation email style:
- Subject: "Reset Password Sinaloka"
- Body: greeting, explanation, button with reset link, expiry warning (1 jam), footer

## Frontend Pages

### `ForgotPasswordPage.tsx`

- Route: `/forgot-password`
- Email input field
- "Kirim Link Reset" button (lime-400)
- On success: show confirmation message "Link reset password telah dikirim ke email kamu."
- "Kembali ke Login" link
- Matches login page styling (zinc-950 bg, centered form)

### `ResetPasswordPage.tsx`

- Route: `/reset-password` (reads `?token=xxx` from URL)
- On mount: validates token via `GET /api/auth/reset-password/:token`
- Shows loading spinner while validating
- If invalid/expired: show error with "Kembali ke Login" link
- If valid: show form with new password + confirm password fields
- Frontend validation: min 8 chars, passwords must match
- On success: redirect to `/login?reset=true`

### `LoginPage.tsx` changes

- Add "Lupa Password?" link below the login button
- Link navigates to `/forgot-password`
- If URL has `?reset=true`, show success toast "Password berhasil direset. Silakan login."

## Security

- Token: 64-char hex string (`crypto.randomBytes(32).toString('hex')`)
- Expiry: 1 hour
- One-time use (mark `used_at` on consumption)
- Always return success on forgot-password (prevent email enumeration)
- Invalidate previous tokens when creating new one
- Revoke all refresh tokens on password reset (force re-login)

## Files

### Backend (new/modified)
- Modify: `prisma/schema.prisma` — add `PasswordResetToken` model + User relation
- Modify: `src/modules/auth/auth.dto.ts` — add `ForgotPasswordSchema`, `ResetPasswordSchema`
- Modify: `src/modules/auth/auth.service.ts` — add `forgotPassword()`, `validateResetToken()`, `resetPassword()`
- Modify: `src/modules/auth/auth.controller.ts` — add 3 new `@Public()` endpoints
- Modify: `src/modules/email/email.service.ts` — add `sendPasswordReset()` method

### Frontend (new/modified)
- Create: `src/pages/ForgotPasswordPage.tsx`
- Create: `src/pages/ResetPasswordPage.tsx`
- Modify: `src/pages/LoginPage.tsx` — add "Lupa Password?" link + reset success message
- Modify: `src/App.tsx` — add `/forgot-password` and `/reset-password` routes
