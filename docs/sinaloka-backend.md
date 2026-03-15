# Sinaloka Backend - Technical Documentation

## Overview

Sinaloka Backend is a multi-tenant REST API for tutoring institution management. It serves two client applications: an admin dashboard (sinaloka-platform) and a tutor mobile app (sinaloka-tutors).

Built as a **NestJS modular monolith** with **Prisma 7** ORM and **PostgreSQL**.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 22+ |
| Framework | NestJS | 11 |
| ORM | Prisma | 7.5 |
| Database | PostgreSQL | 16 |
| Auth | JWT (passport-jwt) | - |
| Validation | Zod v4 | 4.3 |
| PDF | pdfkit | 0.18 |
| CSV | csv-parse / csv-stringify | 6.x |
| Testing | Jest + Supertest | 30 / 7 |

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16 (or Docker)
- npm

### Setup

```bash
cd sinaloka-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed demo data (optional)
npx prisma db seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

### Docker (PostgreSQL only)

```bash
docker run -d \
  --name sinaloka-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sinaloka \
  -p 5434:5432 \
  postgres:16
```

Then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5434/sinaloka` in `.env`.

### Running Tests

```bash
# All tests (301 tests across 33 suites)
npm test -- --runInBand

# Single module
npm test -- --runInBand student.service

# With coverage
npm run test:cov -- --runInBand
```

Note: `NODE_OPTIONS="--experimental-vm-modules"` is automatically set in the test script for Prisma 7 compatibility.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `JWT_SECRET` | Secret for access token signing | (required) |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing | (required) |
| `JWT_EXPIRY` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` |
| `UPLOAD_DIR` | File upload storage path | `./uploads` |
| `UPLOAD_MAX_SIZE` | Max upload size in bytes | `5242880` (5MB) |
| `PORT` | Server port | `3000` |

## Architecture

### Modular Monolith

Single NestJS process with domain-organized modules. Each module owns its DTOs, service, controller, and tests.

```
src/
  common/                  # Shared infrastructure
    decorators/            # @CurrentUser, @Roles, @Public
    filters/               # HttpExceptionFilter
    guards/                # JwtAuthGuard, RolesGuard
    interceptors/          # TenantInterceptor
    pipes/                 # ZodValidationPipe
    prisma/                # PrismaService (global)
    dto/                   # Pagination helpers
  modules/
    auth/                  # Login, logout, refresh, profile
    institution/           # Institution CRUD (Super Admin)
    user/                  # User CRUD (Super Admin, Admin)
    student/               # Student CRUD + CSV import/export
    tutor/                 # Tutor CRUD + profile self-service
    class/                 # Class CRUD with schedule
    enrollment/            # Enrollment CRUD + conflict detection
    session/               # Session CRUD + auto-generate + reschedule
    attendance/            # Attendance batch tracking
    payment/               # Payment recording
    payout/                # Tutor payout management
    expense/               # Expense tracking
    dashboard/             # Aggregated stats + activity feed
    report/                # PDF report generation
    upload/                # File upload/serve
```

### Multi-Tenancy

All entities include an `institution_id` column. Tenant isolation is enforced by:

1. **TenantInterceptor** (global) - Extracts `institutionId` from JWT and attaches to request
2. **Service layer** - Every query includes `WHERE institution_id = ?`
3. **Super Admin** has cross-tenant access (institutionId = null)

### Authentication & Authorization

- **JWT Access Token** (15min) + **Refresh Token** (7d, stored in DB with rotation)
- Password hashing: bcrypt with 10 rounds
- Three roles:
  - `SUPER_ADMIN` - Cross-tenant, manages institutions and all data
  - `ADMIN` - Single institution, manages that institution's data
  - `TUTOR` - Single institution, manages own profile/schedule/attendance

Global guards registered in `AppModule`:
- `JwtAuthGuard` - Validates JWT on all routes except `@Public()`
- `RolesGuard` - Checks `@Roles()` decorator against JWT role

### Validation

All request validation uses **Zod v4** schemas with a custom `ZodValidationPipe`. DTOs are defined as:

```ts
export const CreateStudentSchema = z.object({ ... });
export type CreateStudentDto = z.infer<typeof CreateStudentSchema>;
```

### Error Responses

All errors follow a consistent format via `HttpExceptionFilter`:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Student with id abc not found"
}
```

## API Reference

All routes are prefixed with `/api`. Auth is required unless marked `@Public`.

### Auth (`/api/auth`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/login` | Public | Login with email/password, returns access + refresh tokens |
| POST | `/auth/refresh` | Public | Rotate refresh token, get new access token |
| POST | `/auth/logout` | Required | Revoke refresh token |
| GET | `/auth/me` | Required | Get current user profile |

### Admin Routes (`/api/admin/...`)

All admin routes require `SUPER_ADMIN` or `ADMIN` role unless noted.

#### Institutions (Super Admin only)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/institutions` | List all institutions (paginated) |
| GET | `/admin/institutions/:id` | Get institution by ID |
| POST | `/admin/institutions` | Create institution (auto-generates slug) |
| PATCH | `/admin/institutions/:id` | Update institution |
| DELETE | `/admin/institutions/:id` | Delete institution |

#### Users (Super Admin + Admin)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/users` | List users (scoped to institution for Admin) |
| GET | `/admin/users/:id` | Get user by ID |
| POST | `/admin/users` | Create user with role |
| PATCH | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |

#### Students

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/students` | List students (filterable by grade, status, search) |
| GET | `/admin/students/:id` | Get student |
| POST | `/admin/students` | Create student |
| PATCH | `/admin/students/:id` | Update student |
| DELETE | `/admin/students/:id` | Delete student |
| POST | `/admin/students/import` | Import students from CSV (multipart) |
| GET | `/admin/students/export` | Export students as CSV |

#### Tutors

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/tutors` | List tutors (filterable by subject, verified status) |
| GET | `/admin/tutors/:id` | Get tutor with user info |
| POST | `/admin/tutors` | Create tutor (creates User + Tutor in transaction) |
| PATCH | `/admin/tutors/:id` | Update tutor |
| DELETE | `/admin/tutors/:id` | Delete tutor + associated user |

#### Classes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/classes` | List classes (filterable by subject, status) |
| GET | `/admin/classes/:id` | Get class with enrolled count |
| POST | `/admin/classes` | Create class with schedule |
| PATCH | `/admin/classes/:id` | Update class |
| DELETE | `/admin/classes/:id` | Delete class |

#### Enrollments

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/enrollments` | List enrollments (filterable by student, class, status) |
| GET | `/admin/enrollments/:id` | Get enrollment with student/class details |
| POST | `/admin/enrollments` | Create enrollment (checks schedule conflict + duplicate) |
| PATCH | `/admin/enrollments/:id` | Update enrollment status |
| DELETE | `/admin/enrollments/:id` | Delete enrollment |
| POST | `/admin/enrollments/check-conflict` | Pre-check schedule conflict before enrolling |

#### Sessions

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/sessions` | List sessions (filterable by class, status, date range) |
| GET | `/admin/sessions/:id` | Get session |
| POST | `/admin/sessions` | Create single session |
| PATCH | `/admin/sessions/:id` | Update session |
| DELETE | `/admin/sessions/:id` | Delete session |
| POST | `/admin/sessions/generate` | Auto-generate sessions from class schedule for date range |
| PATCH | `/admin/sessions/:id/approve` | Approve or reject reschedule request |

#### Attendance

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/attendance` | List attendance records (by session) |
| GET | `/admin/attendance/summary` | Attendance summary stats |
| PATCH | `/admin/attendance/:id` | Update attendance record |

#### Payments

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/payments` | List payments (filterable by student, status) |
| GET | `/admin/payments/:id` | Get payment |
| POST | `/admin/payments` | Record payment |
| PATCH | `/admin/payments/:id` | Update payment |
| DELETE | `/admin/payments/:id` | Delete payment |

#### Payouts

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/payouts` | List payouts (filterable by tutor, status) |
| GET | `/admin/payouts/:id` | Get payout |
| POST | `/admin/payouts` | Create payout |
| PATCH | `/admin/payouts/:id` | Update payout |
| DELETE | `/admin/payouts/:id` | Delete payout |

#### Expenses

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/expenses` | List expenses (filterable by category, date range) |
| GET | `/admin/expenses/:id` | Get expense |
| POST | `/admin/expenses` | Record expense |
| PATCH | `/admin/expenses/:id` | Update expense |
| DELETE | `/admin/expenses/:id` | Delete expense |

#### Dashboard

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/dashboard/stats` | Aggregated stats (students, tutors, revenue, attendance rate, etc.) |
| GET | `/admin/dashboard/activity` | Recent activity feed |

#### Reports (PDF)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/reports/attendance` | Attendance report (PDF) |
| GET | `/admin/reports/finance` | Financial report (PDF) |
| GET | `/admin/reports/student-progress` | Student progress report (PDF) |

### Tutor Routes (`/api/tutor/...`)

All tutor routes require `TUTOR` role.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/tutor/profile` | Get own tutor profile |
| PATCH | `/tutor/profile` | Update own profile (availability, bank details) |
| GET | `/tutor/schedule` | View own teaching schedule |
| PATCH | `/tutor/schedule/:id/request-reschedule` | Request session reschedule |
| PATCH | `/tutor/schedule/:id/cancel` | Cancel own session |
| POST | `/tutor/attendance` | Batch create attendance for own sessions |
| PATCH | `/tutor/attendance/:id` | Update attendance record for own sessions |
| GET | `/tutor/payouts` | View own payout history |

### File Uploads

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/uploads/:institutionId/:type/:filename` | Serve uploaded file |

## Database Schema

### Entity Relationship Overview

```
Institution
  |-- User (institution_id?)
  |     |-- Tutor (user_id, 1:1)
  |     |-- RefreshToken (user_id)
  |-- Student (institution_id)
  |     |-- Enrollment (student_id)
  |     |-- Attendance (student_id)
  |     |-- Payment (student_id)
  |-- Class (institution_id, tutor_id)
  |     |-- Enrollment (class_id)
  |     |-- Session (class_id)
  |-- Enrollment (student_id + class_id, unique)
  |     |-- Payment (enrollment_id)
  |-- Session (class_id, created_by)
  |     |-- Attendance (session_id + student_id, unique)
  |-- Payment (student_id, enrollment_id)
  |-- Payout (tutor_id)
  |-- Expense (institution_id)
```

### Enums

| Enum | Values |
|------|--------|
| Role | `SUPER_ADMIN`, `ADMIN`, `TUTOR` |
| StudentStatus | `ACTIVE`, `INACTIVE` |
| ClassStatus | `ACTIVE`, `ARCHIVED` |
| EnrollmentStatus | `ACTIVE`, `TRIAL`, `WAITLISTED`, `DROPPED` |
| SessionStatus | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULE_REQUESTED` |
| AttendanceStatus | `PRESENT`, `ABSENT`, `LATE` |
| PaymentStatus | `PAID`, `PENDING`, `OVERDUE` |
| PaymentMethod | `CASH`, `TRANSFER`, `OTHER` |
| PayoutStatus | `PENDING`, `PROCESSING`, `PAID` |
| ExpenseCategory | `RENT`, `UTILITIES`, `SUPPLIES`, `MARKETING`, `OTHER` |

### Key Constraints

- `enrollments`: unique on `(student_id, class_id)` - one enrollment per student per class
- `attendances`: unique on `(session_id, student_id)` - one record per student per session
- `users`: unique on `email`
- `institutions`: unique on `slug`
- `tutors`: unique on `user_id` (1:1 with User)

## Key Business Logic

### Enrollment Conflict Detection

When enrolling a student in a class, the system checks for schedule conflicts:

1. Gets the target class schedule (days + time range)
2. Gets all active enrollments for the student with class schedules
3. Checks each for **day overlap** AND **time range overlap**
4. Adjacent times (end == start) are **not** considered conflicts
5. Only `ACTIVE` and `TRIAL` enrollments are checked (not `DROPPED`/`WAITLISTED`)

Pre-check available via `POST /admin/enrollments/check-conflict`.

### Session Auto-Generation

`POST /admin/sessions/generate` accepts `{ class_id, date_from, date_to }` and:

1. Gets the class schedule (e.g., Monday + Wednesday, 14:00-15:30)
2. Iterates each day in the range
3. For matching days of week, creates a session
4. Skips dates with existing sessions (idempotent)
5. Uses `createMany` with `skipDuplicates`

### Reschedule Flow

1. Tutor requests: `PATCH /tutor/schedule/:id/request-reschedule` with proposed date/time/reason
   - Status changes to `RESCHEDULE_REQUESTED`
2. Admin approves/rejects: `PATCH /admin/sessions/:id/approve`
   - Approved: updates date/time to proposed values, status back to `SCHEDULED`
   - Rejected: clears proposed fields, status back to `SCHEDULED`

### Tutor Creation Transaction

Creating a tutor (`POST /admin/tutors`) atomically:
1. Checks email uniqueness
2. Creates a `User` with role `TUTOR` and hashed password
3. Creates a `Tutor` record linked to that user
4. Both in a single `$transaction`

Deletion reverses both in a transaction.

## Project Conventions

### Code Style

- Imports use `.js` extensions (TypeScript ESM resolution)
- DTOs: Zod schemas with `z.infer<>` types (not class-based)
- Role checks: `@Roles(Role.SUPER_ADMIN, Role.ADMIN)` using Prisma enum
- Services throw `NotFoundException`, `ConflictException`, etc. directly
- Controllers use `@CurrentUser()` decorator to access JWT payload
- Tenant scoping happens in service layer, not controller

### Testing

- **Unit tests** (`*.service.spec.ts`): Mock Prisma with `jest.fn()`, test service logic
- **Integration tests** (`*.controller.spec.ts`): Real database via `AppModule`, real HTTP via supertest
- Tests create isolated fixture data with unique slugs/emails, clean up in `afterAll`
- Global test setup handles Prisma 7 ESM compatibility

### Pagination Response Format

All list endpoints return:

```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production build |
| `npm test -- --runInBand` | Run all tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma db seed` | Seed demo data |
| `npx prisma studio` | Open Prisma database browser |
