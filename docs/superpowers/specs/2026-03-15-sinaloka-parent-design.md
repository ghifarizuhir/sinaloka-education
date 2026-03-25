# Sinaloka Parent App — Design Spec

## Overview

A read-only parent-facing app for monitoring child/student progress at a tutoring institution. Parents register via admin-sent invites, are auto-linked to their children, and can view attendance, sessions, payments, and enrollments per child through a multi-child dashboard.

## Decisions

- **Account creation**: Admin invites parent by email + student IDs. Parent self-registers with the invite token. Auto-links additional students matching `parent_email`.
- **Interaction model**: Read-only. No actions (no messaging, payment confirmation, or schedule requests).
- **Dashboard**: Multi-child card overview. Each card shows summary stats; click into child for details.
- **Reports**: In-app data only, no PDF downloads.
- **Notifications**: Not in scope. Backend designed so notifications can be added later.

## Data Model Changes

### Role Enum

Add `PARENT` to the existing `Role` enum:

```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  TUTOR
  PARENT
}
```

### New Models

```prisma
model Parent {
  id              String          @id @default(uuid())
  user_id         String          @unique
  institution_id  String
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  user            User            @relation(fields: [user_id], references: [id])
  institution     Institution     @relation(fields: [institution_id], references: [id])
  children        ParentStudent[]

  @@map("parents")
}

model ParentStudent {
  id          String   @id @default(uuid())
  parent_id   String
  student_id  String
  created_at  DateTime @default(now())

  parent      Parent   @relation(fields: [parent_id], references: [id], onDelete: Cascade)
  student     Student  @relation(fields: [student_id], references: [id], onDelete: Cascade)

  @@unique([parent_id, student_id])
  @@map("parent_students")
}

model ParentInvite {
  id              String    @id @default(uuid())
  institution_id  String
  email           String
  token           String    @unique
  student_ids     String[]
  used_at         DateTime?
  expires_at      DateTime
  created_at      DateTime  @default(now())

  institution     Institution @relation(fields: [institution_id], references: [id])

  @@map("parent_invites")
}
```

### Relation Additions to Existing Models

- `User` — add optional `parent Parent?` relation (mirrors existing `tutor Tutor?`)
- `Institution` — add `parents Parent[]`, `parent_invites ParentInvite[]`
- `Student` — add `parent_links ParentStudent[]`

## Invite & Registration Flow

1. Admin calls `POST /admin/parents/invite` with `{ email, student_ids }`.
2. Backend validates student IDs belong to the institution, creates a `ParentInvite` with a UUID token and 72-hour expiry.
3. Admin shares the invite link with the parent (e.g., `https://parent.sinaloka.com/register?token=<token>`). Email sending is out of scope but the design accommodates it later.
4. Parent calls `POST /auth/register/parent` with `{ token, name, password }`.
5. Backend validates the token (not expired, not used), then:
   - Creates a `User` with role `PARENT`, **email from `ParentInvite.email`**, and `institution_id` from the invite.
   - Creates a `Parent` profile linked to the user.
   - Creates `ParentStudent` rows for each `student_id` from the invite.
   - Checks for additional students in the same institution where `parent_email` matches the invite email; auto-links those too.
   - Marks the invite as used (`used_at = now()`).
6. Returns access + refresh tokens (same as existing login response).

## Backend API Endpoints

### Parent Routes (role: PARENT)

All routes are tenant-scoped via `TenantInterceptor` and protected by `ParentStudentGuard` which verifies the `:studentId` belongs to the authenticated parent's linked children.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/parent/children` | List all linked students with summary stats: attendance rate, next upcoming session, latest payment status |
| `GET` | `/parent/children/:studentId` | Single child detail with full enrollment info |
| `GET` | `/parent/children/:studentId/attendance` | Attendance records, paginated. Query params: `date_from`, `date_to`, `class_id`, `page`, `limit`. Returns records + summary (present/absent/late counts, attendance rate, homework completion rate) |
| `GET` | `/parent/children/:studentId/enrollments` | Active enrollments with class name, subject, tutor name, schedule, fee, payment status |
| `GET` | `/parent/children/:studentId/sessions` | Sessions list, paginated. Query params: `status` (SCHEDULED/COMPLETED/CANCELLED), `date_from`, `date_to`, `page`, `limit`. Returns date, time, class, status, topic covered, session summary |
| `GET` | `/parent/children/:studentId/payments` | Payment records, paginated. Query params: `status` (PAID/PENDING/OVERDUE), `page`, `limit`. Returns amount, due date, paid date, status, method |

### Admin Routes (for managing parents)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/admin/parents/invite` | Create invite: `{ email: string, student_ids: string[] }`. Validates all student IDs belong to the admin's institution. Returns invite token and link |
| `GET` | `/admin/parents` | List parents in institution with linked student counts. Paginated |
| `GET` | `/admin/parents/:id` | Parent detail with linked students |
| `DELETE` | `/admin/parents/:id` | Remove parent account: deletes `ParentStudent` links (via cascade), `Parent` record, `RefreshToken` entries, and `User` record — in a transaction (same pattern as tutor deletion) |
| `POST` | `/admin/parents/:id/link` | Manually link additional students: `{ student_ids: string[] }` |
| `DELETE` | `/admin/parents/:parentId/children/:studentId` | Unlink a student from a parent |

### Auth Route Addition

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/register/parent` | Register with invite token: `{ token, name, password }` |

## Authorization

### ParentStudentGuard

A NestJS guard applied to all `/parent/children/:studentId/*` routes. It:

1. Reads `user.sub` from the JWT to find the `Parent` record.
2. Queries `ParentStudent` for a row matching `parent_id` + `studentId` param.
3. Throws `ForbiddenException` if no link exists.

This ensures a parent can only access data for their own linked children.

### Role Integration

- `PARENT` role is added to `RolesGuard` — no changes needed to the guard itself, just use `@Roles(Role.PARENT)` on parent controllers.
- `TenantInterceptor` must be updated to include `Role.PARENT` alongside `ADMIN` and `TUTOR` so that `request.tenantId` is set from the JWT's `institutionId`.
- Parent routes are completely separate from admin/tutor routes — no overlap.

## Backend Module Structure

```
src/modules/parent/
  parent.module.ts
  parent.controller.ts        # /parent/* routes
  parent-admin.controller.ts  # /admin/parents/* routes
  parent.service.ts           # Business logic: children queries, summaries
  parent-invite.service.ts    # Invite creation, token validation, registration
  parent.dto.ts               # Zod schemas for all DTOs
  guards/
    parent-student.guard.ts   # Authorization guard
```

## Frontend App (sinaloka-parent)

### Stack

Same as sinaloka-tutors: React 19, Vite (port 5174), TailwindCSS v4 (zinc palette, Inter font), Axios, TanStack Query, Lucide icons, clsx + tailwind-merge.

### Pages

- **LoginPage** — Email/password form. Same design as tutors login.
- **RegisterPage** — Accessed via invite link with token param. Name + password form.
- **DashboardPage** — Grid of child cards. Each card shows: child name, grade, attendance rate (circular or bar indicator), next upcoming session (subject + date/time), payment status badge (all paid / X pending / X overdue).
- **ChildDetailPage** — Child header (name, grade, enrollment count) + tabbed navigation:
  - **Attendance tab** — Date-filterable table/list: date, class, status (present/late/absent), homework done. Summary stats at top.
  - **Sessions tab** — Upcoming sessions grouped by date, past sessions with topics covered and summaries.
  - **Payments tab** — Payment list with status badges, amounts, due dates.
  - **Enrollments tab** — Active classes with schedule, tutor, subject info.

### Hooks

- `useAuth()` — Login, logout, register, token management (same pattern as tutors)
- `useChildren()` — Fetch `/parent/children`, returns all linked students with summaries
- `useChildDetail(studentId)` — Fetch `/parent/children/:studentId`
- `useChildAttendance(studentId, filters)` — Fetch attendance with date/class filters
- `useChildSessions(studentId, filters)` — Fetch sessions with status/date filters
- `useChildPayments(studentId, filters)` — Fetch payments with status filter
- `useChildEnrollments(studentId)` — Fetch active enrollments

### Environment

```
VITE_API_URL=http://localhost:3000
```

## Notification Readiness

While notifications are out of scope, the design supports them later by:

- `ParentInvite.email` stores the parent's email for future email notifications.
- `ParentStudent` join table provides clear parent→student links for targeting notifications.
- Events that would trigger notifications (absence, payment due, session cancelled) are already tracked in existing modules with timestamps.
- A future `Notification` model could reference `parent_id` + event type + payload.
