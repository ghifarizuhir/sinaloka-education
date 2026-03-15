# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sinaloka is a multi-tenant tutoring institution management system. It consists of four apps sharing one backend:

- **sinaloka-backend** — NestJS API (port 5000, prefix `/api`)
- **sinaloka-platform** — React admin dashboard (Vite, port 3000)
- **sinaloka-tutors** — React tutor-facing app (Vite, port 5173)
- **sinaloka-parent** — React parent-facing mobile-first app (Vite, port 5174)

## Common Commands

### Backend (`cd sinaloka-backend`)
```bash
npm run start:dev          # Dev server with watch
npm run build              # Production build
npm run lint               # ESLint with auto-fix
npm run test               # Unit tests (Jest)
npm run test -- --testPathPattern=student  # Run single test file
npm run test:e2e           # E2E tests
npm run prisma:generate    # Regenerate Prisma client (run after schema changes)
npx prisma migrate dev     # Create/apply migrations
npx prisma db seed         # Seed database (uses tsx prisma/seed.ts)
```

### Platform (`cd sinaloka-platform`)
```bash
npm run dev                # Dev server (port 3000)
npm run build              # Production build
npm run lint               # TypeScript type-check (tsc --noEmit)
npm run test:e2e           # All Playwright E2E tests
npm run test:e2e:smoke     # Smoke tests only
npm run test:e2e:light     # Light mode project
npm run test:e2e:dark      # Dark mode project
```

### Tutors (`cd sinaloka-tutors`)
```bash
npm run dev                # Dev server (port 5173)
npm run build              # Production build
npm run lint               # TypeScript type-check
```

### Parent (`cd sinaloka-parent`)
```bash
npm run dev                # Dev server (port 5174)
npm run build              # Production build
npm run lint               # TypeScript type-check
```

## Architecture

### Backend (NestJS + Prisma + PostgreSQL)

**Multi-tenancy**: Every request is scoped to an institution via `TenantInterceptor`. It reads `institution_id` from the JWT payload and injects `request.tenantId`. SUPER_ADMIN can optionally scope via `?institution_id=` query param. All service methods must filter by `tenantId`.

**Auth**: JWT-based with refresh tokens. `JwtAuthGuard` is applied globally — use `@Public()` decorator to skip auth. `RolesGuard` + `@Roles()` decorator for role-based access. Roles: `SUPER_ADMIN`, `ADMIN`, `TUTOR`, `PARENT`.

**Module pattern**: Each domain follows `module/controller/service/dto` structure in `src/modules/<domain>/`. DTOs use Zod schemas via `nestjs-zod`. Common utilities live in `src/common/` (decorators, guards, interceptors, filters, pipes, prisma).

**Prisma**: Schema at `prisma/schema.prisma`, client generated to `generated/prisma/`. After schema changes: `npx prisma migrate dev` then `npm run prisma:generate`.

**Tests**: Jest with custom global setup/teardown that patches Prisma's generated `package.json` for CJS compatibility. Module mapper redirects `generated/prisma/client` to `test/prisma-client-shim`.

### Frontend Apps (React + Vite + TailwindCSS v4)

**Platform** uses React Router, TanStack Query, Recharts, Sonner (toasts), and Lucide icons. Service layer in `src/services/` wraps Axios calls to the backend API (`VITE_API_URL`). Auth context manages JWT tokens.

**Tutors** shares the same stack minus Recharts/React Router. Uses mappers (`src/mappers/`) to transform API responses.

**Parent** is a mobile-first SPA for parents to monitor their children's attendance, sessions, payments, and enrollments. Uses Motion (Framer Motion) for page transitions, Axios for API calls, and a simple state-based router (no React Router). Backend parent module uses `ParentStudentGuard` to enforce that parents can only access their own children's data. Parents are onboarded via invite tokens.

**Shared patterns**: All frontend apps use `clsx` + `tailwind-merge` for class merging (utility in `src/lib/utils.ts`). TailwindCSS v4 with `@tailwindcss/vite` plugin. Design uses zinc palette and Inter typography.

### E2E Tests (Playwright — platform only)

Tests in `sinaloka-platform/e2e/`. Uses API mocking (`e2e/helpers/api-mocker.ts`) with mock data in `e2e/mocks/*.json`. Page objects in `e2e/pages/`. Auth fixtures in `e2e/fixtures/`. Config supports light-mode and dark-mode projects.

## Key Conventions

- Backend API prefix is `/api` — all routes are under this prefix
- Use `@CurrentUser()` decorator to access the authenticated user in controllers
- All database queries in services must scope by `tenantId` (institution isolation)
- Prisma model names use `snake_case` with `@@map()` to PostgreSQL table names
- Frontend env: `VITE_API_URL` points to the backend
- Backend env: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `UPLOAD_DIR`
