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

## CI/CD & Git Workflow

### Prefer `gh` CLI over raw `git` for GitHub operations

Always use the GitHub CLI (`gh`) instead of raw `git` commands for remote operations. `gh` handles authentication, token refresh, and network issues more reliably:

```bash
# Pushing branches — use gh if git push fails
gh pr create                          # creates branch + PR in one step
gh pr merge 3 --squash                # merge PR

# Fetching PR info, diffs, reviews
gh pr view 3 --json state,title
gh pr diff 3 --stat
gh api repos/{owner}/{repo}/pulls/3/comments

# Syncing with remote
gh repo sync                          # sync fork
```

Use raw `git` only for local operations (commit, branch, checkout, log, diff, blame).

### Branch & Commit Standards

- **Branch naming**: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/`, `chore/` prefixes (e.g. `feat/student-enrollment`)
- **Commit messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
  - Scope is optional but recommended (e.g. `feat(backend): add billing endpoint`)
- **PR titles**: Must follow the same conventional format — enforced by CI

### Before Creating a PR

Run these checks locally in each app you changed:

```bash
# Backend
cd sinaloka-backend
npm run lint                 # ESLint
npm run test -- --ci         # Unit tests
npm run build                # Build check

# Frontend (platform / tutors / parent)
cd sinaloka-platform         # or sinaloka-tutors / sinaloka-parent
npm run lint                 # TypeScript type-check
npm run build                # Build check
```

### CI Pipeline (automatic on every PR)

Each app has its own workflow triggered by path filters — only changed apps are checked:

| App | Workflow | Jobs |
|-----|----------|------|
| Backend | `ci-backend.yml` | Lint → Unit Tests (PostgreSQL) → Build → Security Audit |
| Platform | `ci-platform.yml` | Type Check → Build → E2E Smoke → Security Audit |
| Tutors | `ci-tutors.yml` | Type Check → Build → Security Audit |
| Parent | `ci-parent.yml` | Type Check → Build → Security Audit |

### PR Quality Gates (`pr-checks.yml`)

All PRs to `master`/`main` are checked for:
- **PR title convention** — must be semantic (e.g. `feat: add X`, `fix: resolve Y`)
- **PR size labels** — auto-labeled xs/s/m/l/xl based on diff size
- **Secret detection** — TruffleHog scans for leaked credentials

### Deployment

- **Staging**: Auto-deploys on push to `master`/`main` (only changed apps)
- **Production**: Manual trigger via GitHub Actions `workflow_dispatch` — requires environment approval
- Deploy workflows use concurrency control to cancel stale in-progress deploys
- Frontend deploy uses smart change detection (`dorny/paths-filter`) to only deploy affected apps

### CI/CD Rules for Development

1. **Use PRs for runtime changes** — any change that could break build, tests, or runtime behavior must go through a PR so CI validates it first
2. **Direct push to `master` is OK for non-runtime changes** — docs, specs, plans, README, `.gitignore`, config files that don't affect builds
3. **Rule of thumb**: If `npm run build` or `npm run test` could fail because of your change, use a PR. If it's impossible for the change to break a build or test, direct push is fine.
4. **All CI checks must pass** before merging PRs
5. **No secrets in code** — use GitHub Secrets/Environment variables
6. **Database migrations**: Include in the PR if Prisma schema changed; CI runs `prisma migrate deploy` against a test database
7. **New environment variables**: Document in `.env.example` of the affected app and note in the PR description

**PR decision guide:**

| Change Type | Approach |
|---|---|
| Features, bug fixes, refactors | PR — always |
| i18n / translation changes | PR — CI confirms no broken keys |
| Backend API or DB schema changes | PR — always |
| Docs, specs, plans, README | Direct push OK |
| Config/tooling (`.gitignore`, etc.) | Direct push OK |

## Key Conventions

- Backend API prefix is `/api` — all routes are under this prefix
- Use `@CurrentUser()` decorator to access the authenticated user in controllers
- All database queries in services must scope by `tenantId` (institution isolation)
- Prisma model names use `snake_case` with `@@map()` to PostgreSQL table names
- Frontend env: `VITE_API_URL` points to the backend
- Backend env: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `UPLOAD_DIR`
