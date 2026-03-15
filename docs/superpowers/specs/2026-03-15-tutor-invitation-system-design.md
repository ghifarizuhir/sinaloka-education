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
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

**Key points:**
- `token`: 32-byte hex string via `crypto.randomBytes(32).toString('hex')`
- `tutor_id`: FK to Tutor (created at invite time with `user.is_active = false`)
- `onDelete: Cascade`: cancelling/deleting tutor removes invitation
- `expires_at`: set to `now() + 48 hours` on creation

## Data Flow

### Invitation Flow

1. Admin submits invite form (email, subjects, optional name/experience)
2. Backend `POST /api/admin/tutors/invite`:
   - Check email uniqueness (User table)
   - Create `User` (role: TUTOR, `is_active: false`, `password_hash: null`)
   - Create `Tutor` (linked to user, with subjects/experience)
   - Create `Invitation` (token, status: PENDING, expires_at: now + 48h)
   - Send email via Resend with link: `{TUTOR_PORTAL_URL}/accept-invite?token={token}`
   - Return tutor + invitation data
3. Tutor clicks link in email
4. Tutor portal `GET /api/auth/invitation/{token}`:
   - Validate token exists and is not expired/cancelled/accepted
   - Return: email, institution name, tutor name (if set)
5. Tutor fills in password (+ optional name override, bank details)
6. `POST /api/auth/accept-invite`:
   - Validate token again
   - Set `password_hash` on User
   - Set `is_active: true` on User
   - Set invitation status to ACCEPTED
   - Return success
7. Tutor redirected to login page

### Resend Flow

1. Admin clicks "Resend Invite" on a pending/expired tutor
2. Backend `POST /api/admin/tutors/:id/resend-invite`:
   - Generate new token
   - Reset `expires_at` to now + 48h
   - Set status back to PENDING (if was EXPIRED)
   - Send new email via Resend
3. Old token is invalidated (replaced)

### Cancel Flow

1. Admin clicks "Cancel Invite" on a pending tutor
2. Backend `POST /api/admin/tutors/:id/cancel-invite`:
   - Set invitation status to CANCELLED
   - Delete Tutor record (cascades to invitation)
   - Delete User record

## API Endpoints

### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/tutors/invite` | Admin JWT | Create tutor + send invitation email |
| `POST` | `/api/admin/tutors/:id/resend-invite` | Admin JWT | Resend invitation (new token + expiry) |
| `POST` | `/api/admin/tutors/:id/cancel-invite` | Admin JWT | Cancel invitation, delete inactive tutor |
| `GET` | `/api/auth/invitation/:token` | Public | Validate token, return invitation details |
| `POST` | `/api/auth/accept-invite` | Public | Set password, activate account |

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

### New Route: `/accept-invite`

**Page: `AcceptInvitePage`**

On mount:
- Extract `token` from URL query params
- Call `GET /api/auth/invitation/{token}`
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
- Call `POST /api/auth/accept-invite` with token + form data
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
