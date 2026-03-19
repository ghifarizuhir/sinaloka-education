# External Integrations

**Analysis Date:** 2026-03-19

## Database

**PostgreSQL** via Prisma ORM
- Datasource: `postgresql` (configured in `prisma/schema.prisma`)
- Client generated to `sinaloka-backend/generated/prisma/`
- Connection string: `DATABASE_URL` env var
- Migrations: `sinaloka-backend/prisma/migrations/`
- Seed script: `sinaloka-backend/prisma/seed.ts` (executed via `tsx`)

## Email — Resend

- **Service:** `sinaloka-backend/src/modules/email/email.service.ts`
- **Module:** `sinaloka-backend/src/modules/email/email.module.ts` (registered as `@Global()`)
- **SDK:** `resend` npm package
- **Config:** `RESEND_API_KEY` env var
- **Usage:** Transactional emails (invite tokens, notifications)

## WhatsApp — Meta Cloud API

- **Service:** `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts`
- **Cron:** `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` (scheduled via `@nestjs/schedule`)
- **API:** Meta Graph API (`graph.facebook.com`) — direct `fetch()` calls
- **Config env vars:**
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - `WHATSAPP_APP_SECRET`
  - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Features:** Send messages, webhook receiver for incoming messages, cron-based message processing
- **Webhook verification:** HMAC signature validation using `crypto` module

## Authentication — JWT

- **Module:** `sinaloka-backend/src/modules/auth/`
- **Strategy:** JWT access + refresh tokens via `@nestjs/jwt` and `@nestjs/passport`
- **Config:** `JWT_SECRET`, `JWT_REFRESH_SECRET` env vars
- **Guards:**
  - `JwtAuthGuard` — globally applied, skip with `@Public()` decorator
  - `RolesGuard` — role-based access via `@Roles()` decorator
- **Roles:** `SUPER_ADMIN`, `ADMIN`, `TUTOR`, `PARENT`
- **Token storage (frontend):** `localStorage` for access/refresh tokens
- **Refresh flow:** Automatic retry with token queue in `sinaloka-platform/src/lib/api.ts`

## File Upload

- **Module:** `sinaloka-backend/src/modules/upload/`
- **Storage:** Local filesystem via `UPLOAD_DIR` env var (default: `./uploads`)
- **Handling:** Multer integration via NestJS

## Frontend → Backend Communication

### Platform (Admin Dashboard)
- **HTTP client:** Axios with interceptors (`sinaloka-platform/src/lib/api.ts`)
- **Base URL:** `VITE_API_URL` env var (default: `http://localhost:3000`)
- **API prefix:** `/api` on all backend routes
- **Caching:** TanStack Query (`@tanstack/react-query`) for data fetching and cache management
- **Multi-tenancy:** Request interceptor injects `institution_id` query param for SUPER_ADMIN impersonation (reads from `sessionStorage`)
- **Token storage:** Both access + refresh tokens in `localStorage`

### Tutors (Tutor-Facing App)
- **HTTP client:** Axios with interceptors (`sinaloka-tutors/src/api/client.ts`)
- **Base URL:** `/api` (relative, uses Vite proxy or same-origin deployment)
- **API endpoints used:**
  - `POST /auth/login` — tutor login
  - `POST /auth/refresh` — token refresh
  - `POST /auth/logout` — logout
  - `GET /tutor/profile` — fetch tutor profile
  - `PATCH /tutor/profile` — update tutor profile
  - `GET /tutor/schedule` — fetch schedule (with `?status=` filter)
  - `PATCH /tutor/schedule/:id/cancel` — cancel session
  - `PATCH /tutor/schedule/:id/request-reschedule` — request reschedule
  - `GET /tutor/schedule/:id/students` — fetch students for attendance
  - `POST /tutor/attendance` — submit attendance
  - `GET /tutor/payouts` — fetch payout list
  - `POST /auth/accept-invite` — accept tutor invite
  - `POST /auth/forgot-password` — request password reset
  - `POST /auth/reset-password` — reset password
- **Token storage:** Access token in memory, refresh token in `localStorage` (`sinaloka_refresh_token`)
- **Auth failure:** Dispatches `auth:logout` window event (handled by AuthContext)
- **Data mapping:** `sinaloka-tutors/src/mappers/index.ts` transforms snake_case backend responses to camelCase frontend types

### Parent (Parent-Facing App)
- **HTTP client:** Axios with interceptors (`sinaloka-parent/src/api/client.ts`)
- **Base URL:** `/api` (relative)
- **API endpoints used:**
  - `POST /auth/login` — parent login
  - `POST /auth/refresh` — token refresh
  - `POST /auth/logout` — logout
  - `POST /auth/register/parent` — invite-based registration
  - `GET /auth/me` — fetch parent profile
  - `GET /parent/children` — list parent's children
  - `GET /parent/children/:id` — child detail
  - `GET /parent/children/:id/attendance` — child attendance records
  - `GET /parent/children/:id/sessions` — child session records
  - `GET /parent/children/:id/payments` — child payment records
  - `GET /parent/children/:id/enrollments` — child enrollment records
  - `POST /auth/forgot-password` — request password reset
  - `POST /auth/reset-password` — reset password
- **Token storage:** Access token in memory, refresh token in `localStorage` (`sinaloka_parent_refresh_token`)
- **Auth failure:** Dispatches `auth:logout` window event (handled by AuthContext)
- **Data mapping:** `sinaloka-parent/src/mappers/index.ts` transforms backend responses to typed frontend objects
- **Backend guard:** `ParentStudentGuard` enforces parents can only access their own children's data

## Scheduled Tasks

- **Framework:** `@nestjs/schedule` (cron decorators)
- **WhatsApp cron:** `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` — periodic message processing

## CI/CD — GitHub Actions

- **Workflows:** Per-app CI pipelines triggered by path filters
  - `ci-backend.yml` — Lint, Unit Tests (with PostgreSQL service), Build, Security Audit
  - `ci-platform.yml` — Type Check, Build, E2E Smoke, Security Audit
  - `ci-tutors.yml` — Type Check, Build, Security Audit
  - `ci-parent.yml` — Type Check, Build, Security Audit
- **PR checks:** `pr-checks.yml` — title convention, size labels, TruffleHog secret detection
- **Deploy:** Staging auto-deploy on push to master; production via manual `workflow_dispatch`
- **Concurrency:** Stale deploy cancellation enabled

## Environment Variables Summary

### Backend (`sinaloka-backend/.env.example`)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `UPLOAD_DIR` | File upload directory |
| `RESEND_API_KEY` | Email service |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | WhatsApp webhook |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Cloud API |
| `WHATSAPP_APP_SECRET` | WhatsApp webhook HMAC |

### Frontend (all apps)
| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL |
