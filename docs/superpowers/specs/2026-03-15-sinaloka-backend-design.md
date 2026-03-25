# Sinaloka Backend Design Spec

## Overview

Backend API for the Sinaloka tutoring management platform. Serves two frontend applications:

- **Sinaloka Platform** — admin dashboard for managing institutions, students, tutors, classes, schedules, finances, and reports
- **Sinaloka Tutors** — mobile-optimized app for tutors to view schedules, mark attendance, and track payouts

## Architecture

**Modular monolith** built with NestJS. Single process, single PostgreSQL database. Domain logic organized into NestJS modules with clear boundaries.

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Modular monolith | Simple deployment, fast development, clean module boundaries |
| Framework | NestJS | Structured, DI, guards, modules — fits multi-tenant SaaS |
| Database | PostgreSQL (single DB) | Relational data, tenant isolation via `institution_id` column |
| ORM | Prisma | Type-safe, great TypeScript DX, migration tooling |
| Auth | Self-hosted JWT + bcrypt | No third-party dependency, full control |
| Validation | Zod + nestjs-zod | Sharable schemas with frontend later |
| File storage | Local filesystem | Sufficient for MVP, migrate to S3 later |
| PDF generation | pdfkit | In-process, no worker needed for MVP |
| IDs | UUID v4 | All primary keys use UUID |

## Project Structure

```
sinaloka-backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/              # AuthGuard, RolesGuard, TenantGuard
│   │   ├── decorators/          # @CurrentUser, @Roles, @Tenant
│   │   ├── interceptors/        # TenantInterceptor
│   │   ├── filters/             # Global HttpExceptionFilter
│   │   ├── pipes/               # ZodValidationPipe
│   │   └── dto/                 # Shared DTOs (pagination, filters)
│   ├── modules/
│   │   ├── auth/
│   │   ├── institution/
│   │   ├── user/
│   │   ├── student/
│   │   ├── tutor/
│   │   ├── class/
│   │   ├── enrollment/
│   │   ├── session/
│   │   ├── attendance/
│   │   ├── finance/
│   │   └── report/
│   └── uploads/
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env
```

Each module contains: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts`.

## Data Models

All entities use UUID primary keys. All tenant-scoped entities include `institution_id` foreign key.

### Institution

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | String | |
| slug | String | Unique |
| address | String | Nullable |
| phone | String | Nullable |
| email | String | Nullable |
| logo_url | String | Nullable |
| settings | JSON | Branding, billing preferences |
| created_at | DateTime | |
| updated_at | DateTime | |

### User

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution, nullable for SUPER_ADMIN |
| email | String | Unique |
| password_hash | String | |
| name | String | |
| avatar_url | String | Nullable |
| role | Enum | SUPER_ADMIN, ADMIN, TUTOR |
| is_active | Boolean | Default true |
| last_login_at | DateTime | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

### Student

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| name | String | |
| email | String | Nullable |
| phone | String | Nullable |
| grade | String | |
| status | Enum | ACTIVE, INACTIVE |
| parent_name | String | Nullable |
| parent_phone | String | Nullable |
| parent_email | String | Nullable |
| enrolled_at | DateTime | |
| created_at | DateTime | |
| updated_at | DateTime | |

### Tutor

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User (unique) |
| institution_id | UUID | FK → Institution |
| subjects | String[] | Array of subjects |
| rating | Float | Default 0 |
| experience_years | Int | Default 0 |
| availability | JSON | Day/time slots |
| bank_name | String | Nullable |
| bank_account_number | String | Nullable |
| bank_account_holder | String | Nullable |
| is_verified | Boolean | Default false |
| created_at | DateTime | |
| updated_at | DateTime | |

### Class

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| tutor_id | UUID | FK → Tutor |
| name | String | |
| subject | String | |
| capacity | Int | |
| fee | Decimal | |
| schedule_days | String[] | e.g. ["Monday", "Wednesday"] — array for multi-day classes |
| schedule_start_time | String | e.g. "14:00" |
| schedule_end_time | String | e.g. "15:30" |
| room | String | Nullable |
| status | Enum | ACTIVE, ARCHIVED |
| created_at | DateTime | |
| updated_at | DateTime | |

### Enrollment

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| student_id | UUID | FK → Student |
| class_id | UUID | FK → Class |
| status | Enum | ACTIVE, TRIAL, WAITLISTED, DROPPED |
| payment_status | Enum | PAID, PENDING, OVERDUE |
| enrolled_at | DateTime | |
| created_at | DateTime | |
| updated_at | DateTime | |

Constraint: `UNIQUE(student_id, class_id)` — prevents duplicate enrollments.

### Session

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| class_id | UUID | FK → Class |
| date | Date | |
| start_time | String | e.g. "14:00" |
| end_time | String | e.g. "15:30" |
| status | Enum | SCHEDULED, COMPLETED, CANCELLED, RESCHEDULE_REQUESTED |
| topic_covered | String | Nullable |
| session_summary | Text | Nullable |
| created_by | UUID | FK → User |
| approved_by | UUID | FK → User, nullable |
| proposed_date | Date | Nullable, for reschedule requests |
| proposed_start_time | String | Nullable |
| proposed_end_time | String | Nullable |
| reschedule_reason | String | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

### Attendance

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution (denormalized for tenant query performance) |
| session_id | UUID | FK → Session |
| student_id | UUID | FK → Student |
| status | Enum | PRESENT, ABSENT, LATE |
| homework_done | Boolean | Default false |
| notes | String | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

Constraint: `UNIQUE(session_id, student_id)` — one record per student per session.

### Payment

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| student_id | UUID | FK → Student |
| enrollment_id | UUID | FK → Enrollment |
| amount | Decimal | |
| due_date | Date | |
| paid_date | Date | Nullable |
| status | Enum | PAID, PENDING, OVERDUE |
| method | Enum | CASH, TRANSFER, OTHER |
| notes | String | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

### Payout

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| tutor_id | UUID | FK → Tutor |
| amount | Decimal | |
| date | Date | |
| status | Enum | PENDING, PROCESSING, PAID |
| proof_url | String | Nullable |
| description | String | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

### Expense

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| institution_id | UUID | FK → Institution |
| category | Enum | RENT, UTILITIES, SUPPLIES, MARKETING, OTHER |
| amount | Decimal | |
| date | Date | |
| description | String | Nullable |
| receipt_url | String | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

## Authentication & Multi-Tenancy

### Auth Flow

1. `POST /auth/login` — email + password → JWT access token + refresh token
2. `POST /auth/logout` — invalidates refresh token in DB
3. `POST /auth/refresh` — refresh token → new access token
4. `GET /auth/me` — current user profile with institution info

### Token Strategy

- Access token: 15 min expiry, contains `{ userId, institutionId, role }`
- Refresh token: 7 day expiry, stored in DB for revocation

### Tenant Isolation

- Global `TenantInterceptor` extracts `institutionId` from JWT and injects into every request
- All service methods scope queries with `WHERE institution_id = ?`
- `SUPER_ADMIN` bypasses tenant scoping — can query across all institutions

### Role-Based Access

| Route prefix | SUPER_ADMIN | ADMIN | TUTOR |
|---|---|---|---|
| `/admin/institutions/*` | Full CRUD | Read own only | No access |
| `/admin/users/*` | All institutions | Own institution | No access |
| `/admin/students/*` | All institutions | Own institution | No access |
| `/admin/tutors/*` | All institutions | Own institution | No access |
| `/admin/classes/*` | All institutions | Own institution | No access |
| `/admin/enrollments/*` | All institutions | Own institution | No access |
| `/admin/sessions/*` | All institutions | Own institution | No access |
| `/admin/attendance/*` | All institutions | Own institution | No access |
| `/admin/finance/*` | All institutions | Own institution | No access |
| `/admin/reports/*` | All institutions | Own institution | No access |
| `/tutor/schedule/*` | No access | No access | Own sessions only |
| `/tutor/attendance/*` | No access | No access | Own sessions only |
| `/tutor/payouts/*` | No access | No access | Own payouts only |
| `/tutor/profile/*` | No access | No access | Own profile only |

## API Endpoints

### Auth

```
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

### Admin Routes (`/admin`)

```
# Institutions (Super Admin only)
GET    /admin/institutions
POST   /admin/institutions
GET    /admin/institutions/:id
PATCH  /admin/institutions/:id
DELETE /admin/institutions/:id

# Users
GET    /admin/users
POST   /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id
DELETE /admin/users/:id

# Students
GET    /admin/students
POST   /admin/students
GET    /admin/students/:id
PATCH  /admin/students/:id
DELETE /admin/students/:id
POST   /admin/students/import
GET    /admin/students/export

# Tutors
GET    /admin/tutors
POST   /admin/tutors
GET    /admin/tutors/:id
PATCH  /admin/tutors/:id
DELETE /admin/tutors/:id

# Classes
GET    /admin/classes
POST   /admin/classes
GET    /admin/classes/:id
PATCH  /admin/classes/:id
DELETE /admin/classes/:id

# Enrollments
GET    /admin/enrollments
POST   /admin/enrollments
GET    /admin/enrollments/:id
PATCH  /admin/enrollments/:id
DELETE /admin/enrollments/:id
POST   /admin/enrollments/check-conflict

# Sessions
GET    /admin/sessions
POST   /admin/sessions
POST   /admin/sessions/generate
GET    /admin/sessions/:id
PATCH  /admin/sessions/:id
DELETE /admin/sessions/:id
PATCH  /admin/sessions/:id/approve

# Attendance (admin can view and correct; tutors create via /tutor/attendance)
GET    /admin/attendance?session_id=
PATCH  /admin/attendance/:id
GET    /admin/attendance/summary?class_id=&date_from=&date_to=

# Finance
GET    /admin/payments
POST   /admin/payments
PATCH  /admin/payments/:id
GET    /admin/payouts
POST   /admin/payouts
PATCH  /admin/payouts/:id
POST   /admin/payouts/:id/upload-proof
GET    /admin/expenses
POST   /admin/expenses
PATCH  /admin/expenses/:id
DELETE /admin/expenses/:id

# Reports
GET    /admin/reports/attendance
GET    /admin/reports/finance
GET    /admin/reports/student-progress

# Dashboard
GET    /admin/dashboard/stats
GET    /admin/dashboard/activity
```

### Tutor Routes (`/tutor`)

```
GET    /tutor/schedule
PATCH  /tutor/schedule/:id/request-reschedule
PATCH  /tutor/schedule/:id/cancel

POST   /tutor/attendance
PATCH  /tutor/attendance/:id

GET    /tutor/payouts

GET    /tutor/profile
PATCH  /tutor/profile
```

All list endpoints support query params: `?page=&limit=&search=&sort_by=&sort_order=&status=` where applicable.

## Business Logic

### Session Auto-Generation

- Admin creates a `Class` with `schedule_days` and `schedule_start_time`/`schedule_end_time`
- `POST /admin/sessions/generate` accepts `{ class_id, date_from, date_to }`
- Creates individual `Session` records for each matching day in the date range
- Skips dates that already have a session for that class (idempotent)

### Tutor Reschedule Flow

1. Tutor calls `PATCH /tutor/schedule/:id/request-reschedule` with `{ proposed_date, proposed_start_time, proposed_end_time, reschedule_reason }`
2. Session status → `RESCHEDULE_REQUESTED`, proposed values stored on the session
3. Admin reviews, calls `PATCH /admin/sessions/:id/approve` or rejects (sets status back to `SCHEDULED`)
4. On approve → session date/time updated to proposed values, status → `SCHEDULED`, `approved_by` set

### Enrollment Conflict Detection

- `POST /admin/enrollments/check-conflict` checks if a student has a class with overlapping day and time range
- Conflict = same `schedule_days` overlap AND time ranges overlap (e.g. 14:00-15:30 conflicts with 15:00-16:30, but not with 16:00-17:00)
- Returns conflicting classes if any
- Also enforced at enrollment creation time — rejected if conflict exists

### Payment Aging

- NestJS `@Cron` job runs daily
- Any `Payment` with `status = PENDING` and `due_date < today` → auto-update to `OVERDUE`

### Payout Handling

- Admin manually creates payouts (payment is handled manually by humans)
- Admin can query completed sessions per tutor to calculate payout amount
- No auto-calculation — admin decides amount based on rate agreements

### CSV Import/Export

- **Import:** parse CSV, validate rows with Zod, create students in bulk, return success/error count per row
- **Export:** query students with current filters, stream as CSV response

### PDF Reports

Generated in-process using `pdfkit`. Three report types:

- **Attendance report** — filter by student or class + date range → table of sessions with P/A/L status
- **Finance report** — filter by date range → payment summary, payout summary, expense breakdown, net profit
- **Student progress** — per student → attendance rate, homework completion rate, tutor notes per session

Returns PDF as binary response with `Content-Type: application/pdf`.

### File Uploads

- Used for: payout proofs, expense receipts, lesson notes
- Stored locally: `uploads/{institution_id}/{type}/{uuid}.{ext}`
- Served via static file route with tenant-scoped access check
- Max file size: 5MB
- Allowed types: jpg, png, pdf

## Error Handling

Global `HttpExceptionFilter` returns consistent shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Details here"
}
```

- Zod validation errors return field-level details: `{ "field": "email", "message": "Invalid email" }`
- Prisma errors (unique constraint, not found) mapped to appropriate HTTP codes
- All errors include a request ID for debugging

## Tech Stack

### Production Dependencies

```
@nestjs/core, @nestjs/common, @nestjs/platform-express
@nestjs/config
prisma, @prisma/client
@nestjs/jwt
bcrypt
@nestjs/passport, passport-jwt
zod, nestjs-zod
@nestjs/schedule
pdfkit
csv-parse, csv-stringify
uuid
date-fns
```

### Dev Dependencies

```
@nestjs/cli
@nestjs/testing
jest, ts-jest
supertest
```

### Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/sinaloka
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE=5242880
PORT=3000
```

## Testing Strategy

- **Unit tests** for services (business logic) — mock Prisma client
- **Integration tests** for controllers — supertest against real API
- **Seed script** for local development with sample data across 2 institutions

## MVP Build Phases

| Phase | Modules | Outcome |
|---|---|---|
| Phase 1 | Auth, Institution, User | Super Admin can login, create institutions and admin users |
| Phase 2 | Student, Tutor | Admin manages students and tutors. Tutor can login and see profile |
| Phase 3 | Class, Enrollment | Admin creates classes, enrolls students, detects conflicts |
| Phase 4 | Session, Attendance | Admin generates sessions. Tutor sees schedule, marks attendance, requests reschedules |
| Phase 5 | Finance (Payment, Payout, Expense) | Admin tracks payments, creates payouts, logs expenses |
| Phase 6 | Dashboard, Reports | Admin dashboard KPIs, PDF report generation |
| Phase 7 | CSV import/export, file uploads | Bulk student import, payout proof uploads |

Each phase produces a working increment that the frontends can connect to.

## Future Considerations (Not in MVP)

- **Parent portal** — separate role and route prefix for parents to view student progress
- **Notification system** — WhatsApp/SMS/email reminders (requires message queue + worker)
- **S3 file storage** — migrate from local when scaling
- **Worker process** — extract PDF generation and heavy tasks when needed
