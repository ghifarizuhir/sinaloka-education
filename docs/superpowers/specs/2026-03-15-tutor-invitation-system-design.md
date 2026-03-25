# Tutor Invitation System — Design Spec

## Overview

Replace the current direct tutor creation flow (admin sets password) with an invitation-based flow. Admin invites tutors by email, tutors accept and set their own password via the tutor portal. Uses Resend for email delivery.

## Goals

- Admin invites tutors by email with minimal info (email + subjects)
- Tutor receives email with a link to the tutor portal to accept and set password
- Admin can see invitation status (Pending/Accepted/Expired) and resend or cancel
- Invited-but-not-yet-registered tutors appear in the same tutor list with a "Pending Invite" badge

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tutor record creation | Hybrid — created at invite time | Admin needs subjects to schedule classes; tutor completes profile on acceptance |
| Invite link destination | Tutor portal (`/accept-invite`) | Tutors work daily in the portal; onboarding should happen there |
| Token expiry | 48 hours + admin resend | Standard security; admin retains control |
| Admin UI for pending | Mixed in same list with badge | Fewer surfaces; admin sees everyone in one place |
| Email provider | Resend SDK | Simple API (one call), good DX, no SMTP config |
| Approach | Invitation DB model | Enables status tracking, resend, cancel, admin UI badges |

## Database

### Schema Migration: Make `password_hash` nullable

The `User` model currently has `password_hash String` (not nullable). To support invited tutors who haven't set a password yet, this must become `String?`. The login flow in `auth.service.ts` must also guard against null `password_hash` (reject login attempt before `bcrypt.compare`).

```prisma
// In User model:
password_hash String?   // Changed from String to String?
```

### New Model: `Invitation`

```prisma
model Invitation {
  id              String           @id @default(uuid())
  email           String
  token           String           @unique
  institution_id  String
  institution     Institution      @relation(fields: [institution_id], references: [id])
  tutor_id        String
  tutor           Tutor            @relation(fields: [tutor_id], references: [id], onDelete: Cascade)
  status          InvitationStatus @default(PENDING)
  expires_at      DateTime
  created_at      DateTime         @default(now())
  updated_at      DateTime         @updatedAt

  @@map("invitations")
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

**Relation fields to add on existing models:**
- `Institution`: add `invitations Invitation[]`
- `Tutor`: add `invitation Invitation?` (one-to-one, a tutor has at most one invitation)

**Key points:**
- `token`: 32-byte hex string via `crypto.randomBytes(32).toString('hex')`
- `tutor_id`: FK to Tutor (created at invite time with `user.is_active = false`, `password_hash: null`)
- `onDelete: Cascade`: deleting tutor removes invitation
- `expires_at`: set to `now() + 48 hours` on creation
- `@@map("invitations")`: follows existing convention for table naming

**Note:** The existing `ParentInvite` model uses a simpler pattern (`used_at` nullable DateTime). This spec uses a status enum instead because we need richer states (PENDING/ACCEPTED/EXPIRED/CANCELLED) to drive the admin UI badge display and action menus.

## Data Flow

### Invitation Flow

1. Admin submits invite form (email, subjects, optional name/experience)
2. Backend `POST /api/admin/tutors/invite`:
   - Check email uniqueness (User table)
   - **In a single `$transaction`:**
     - Create `User` (role: TUTOR, `is_active: false`, `password_hash: null`, name: provided name or email prefix)
     - Create `Tutor` (linked to user, with subjects/experience)
     - Create `Invitation` (token, status: PENDING, expires_at: now + 48h)
   - **After transaction succeeds:** send email via Resend
   - If email send fails: records remain in DB (admin can resend later), return success with warning
   - Return tutor + invitation data
3. Tutor clicks link in email
4. Tutor portal `GET /api/auth/invitation/{token}`:
   - Validate token exists and is not expired/cancelled/accepted
   - Validate institution is still active
   - Return: email, institution name, tutor name (if set)
5. Tutor fills in password (+ optional name override, bank details)
6. `POST /api/auth/accept-invite`:
   - Validate token again (exists, not expired/cancelled/accepted)
   - Validate institution is still active
   - **In a single `$transaction`:**
     - Set `password_hash` on User
     - Set `is_active: true` on User
     - Update name/bank details on Tutor (if provided)
     - Set invitation status to ACCEPTED
   - Return success
7. Tutor redirected to login page

**Name default strategy:** If admin doesn't provide a name, `User.name` is set to the email prefix (part before `@`). Tutor can override this when accepting.

### Resend Flow

1. Admin clicks "Resend Invite" on a pending/expired tutor
2. Backend `POST /api/admin/tutors/:id/resend-invite`:
   - Verify tutor exists and `user.is_active === false`
   - **Update-in-place** on the existing Invitation record:
     - Generate new token (replaces old token — old token stops working since it no longer exists in DB)
     - Reset `expires_at` to now + 48h
     - Set status back to PENDING (if was EXPIRED)
   - Send new email via Resend with new token
   - If email fails: token is still updated, return success with warning (admin can retry)

### Cancel Flow

1. Admin clicks "Cancel Invite" on a pending tutor
2. Backend `POST /api/admin/tutors/:id/cancel-invite`:
   - Verify tutor exists and `user.is_active === false`
   - **In a single `$transaction`:**
     - Delete User record (this cascades: User → Tutor → Invitation all removed)
   - Tutor and invitation records are cleaned up via cascade deletes

## API Endpoints

### New Endpoints

**Admin endpoints (on TutorController):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/tutors/invite` | Admin JWT | Create tutor + send invitation email |
| `POST` | `/api/admin/tutors/:id/resend-invite` | Admin JWT | Resend invitation (new token + expiry) |
| `POST` | `/api/admin/tutors/:id/cancel-invite` | Admin JWT | Cancel invitation, delete inactive tutor |

**Public endpoints (on InvitationController — new `src/modules/invitation/` module):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/invitation/:token` | Public | Validate token, return invitation details |
| `POST` | `/api/invitation/accept` | Public | Set password, activate account |

The invitation module owns the `InvitationService` which handles token generation, validation, and acceptance. The `TutorController` delegates to `InvitationService` for the invite/resend/cancel actions. This keeps auth module clean and invitation logic self-contained.

**Rate limiting:** Public endpoints (`GET /api/invitation/:token` and `POST /api/invitation/accept`) must be rate-limited (e.g., 10 requests/minute per IP) to prevent token enumeration and brute-force attempts.

### DTOs

**InviteTutorDto (admin sends):**
```
email: string       — required, valid email
name: string         — optional, tutor can change later
subjects: string[]   — required, at least 1 (admin needs for scheduling)
experience_years: number — optional, default 0
```

**AcceptInviteDto (tutor sends):**
```
token: string        — required
password: string     — required, 8-128 chars
name: string         — optional, override name set by admin
bank_name: string    — optional
bank_account_number: string — optional
bank_account_holder: string — optional
```

**Invitation validation response (GET):**
```json
{
  "email": "tutor@example.com",
  "name": "Budi Santoso",
  "institution_name": "Bimbel Cerdas",
  "expires_at": "2026-03-17T10:00:00Z"
}
```

### Existing Endpoint Changes

- `POST /api/admin/tutors` — keep for backwards compatibility (direct create with password)
- `GET /api/admin/tutors` — response already includes `user.is_active`; no change needed

## Email (Resend)

### Setup

- Install: `npm install resend` in sinaloka-backend
- New module: `src/modules/email/email.module.ts`, `email.service.ts`
- Env vars:
  - `RESEND_API_KEY` — Resend API key
  - `TUTOR_PORTAL_URL` — e.g. `http://localhost:5173` (dev) or production URL
  - `EMAIL_FROM` — e.g. `Sinaloka <noreply@sinaloka.com>`

### EmailService

```ts
class EmailService {
  async sendTutorInvitation(params: {
    to: string;
    tutorName: string;
    institutionName: string;
    inviteToken: string;
  }): Promise<void>
}
```

### Email Template

Simple HTML function (no template engine). Contains:
- Institution name as header
- Body: "You've been invited to join {institution} as a tutor"
- CTA button: "Accept Invitation" → `{TUTOR_PORTAL_URL}/accept-invite?token={token}`
- Footer: "This link expires in 48 hours. If you didn't expect this, ignore this email."

## Admin Platform Changes (sinaloka-platform)

### Tutors Page

**TutorForm changes:**
- When creating (not editing): remove `password` field
- Change submit button text: "Register Tutor" → "Send Invitation"
- Remove `rating` and `is_verified` from create form (not relevant at invite time)
- Keep: email, name, subjects, experience_years

**New service methods:**
```ts
tutorsService.invite(data: InviteTutorDto)        // POST /api/admin/tutors/invite
tutorsService.resendInvite(id: string)             // POST /api/admin/tutors/:id/resend-invite
tutorsService.cancelInvite(id: string)             // POST /api/admin/tutors/:id/cancel-invite
```

**Tutor list display:**
- Tutors with `user.is_active === false` show a yellow "Pending Invite" badge
- Action menu for pending tutors:
  - "Resend Invite" (icon: Mail)
  - "Cancel Invite" (icon: XCircle, red)
- Action menu for active tutors: unchanged (Edit Profile / Delete Tutor)

**Tutor card/row changes:**
- Show email even if name is empty (for just-invited tutors)
- "Pending Invite" badge replaces the "Verified/Unverified" badge when inactive

## Tutor Portal Changes (sinaloka-tutors)

### Prerequisite: Install React Router

The tutor portal currently uses state-based tab navigation (`activeTab` state), not URL-based routing. The `/accept-invite` page needs to be a URL route (linked from email). Install `react-router-dom` and convert the app to use URL-based routing:
- `/login` → LoginPage
- `/accept-invite` → AcceptInvitePage (public, no auth)
- `/` → Main app (authenticated, current tab-based layout)

### New Route: `/accept-invite`

**Page: `AcceptInvitePage`**

On mount:
- Extract `token` from URL query params
- Call `GET /api/invitation/{token}`
- If valid → show registration form
- If expired → show "Invitation expired — contact your admin to resend"
- If already accepted → redirect to `/login`
- If invalid token → show "Invalid invitation link"

**Registration form fields:**
- Password (required)
- Confirm Password (required)
- Name (pre-filled from invitation, editable)
- Bank Name (optional)
- Bank Account Number (optional)
- Bank Account Holder (optional)

On submit:
- Call `POST /api/invitation/accept` with token + form data
- On success → redirect to `/login` with toast "Account created! Please log in."
- On error → show error message

### Router Update

Add public route (no auth required):
```
/accept-invite → AcceptInvitePage
```

## Error Handling

| Scenario | Backend Response | Frontend Display |
|----------|-----------------|------------------|
| Email already exists | 409 Conflict | "A user with this email already exists" |
| Token not found | 404 Not Found | "Invalid invitation link" |
| Token expired | 410 Gone | "Invitation expired — contact your admin" |
| Token already accepted | 409 Conflict | Redirect to login |
| Token cancelled | 410 Gone | "This invitation was cancelled" |
| Resend for active tutor | 400 Bad Request | "This tutor is already active" |
| Resend email fails | 502 Bad Gateway | "Failed to send email. Try again." |
| Login with null password (invited but not accepted) | 401 Unauthorized | "Please accept your invitation first" |
| Institution deactivated between invite and acceptance | 403 Forbidden | "This institution is no longer active" |
