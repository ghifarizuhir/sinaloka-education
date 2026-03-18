# Sinaloka Platform — Full Integration

## What This Is

Sinaloka is a multi-tenant tutoring institution management system. The admin platform (sinaloka-platform) has a complete UI with pages for Students, Classes, Enrollments, Sessions, Attendance, Payments, Payouts, Expenses, Tutors, Dashboard, Settings, WhatsApp, and Reports — but many pages operate on static/mock data and aren't connected to the backend API. This project wires everything up end-to-end so every page works with real data and cross-page data dependencies are correct.

## Core Value

Every page in the admin platform must work with real backend data, and changes in one domain must correctly propagate to dependent domains (e.g., creating a student shows up in enrollments, completing a session affects attendance and payouts).

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Backend NestJS API with 20+ domain modules — existing
- ✓ JWT authentication with refresh tokens — existing
- ✓ Multi-tenancy via TenantInterceptor — existing
- ✓ Role-based access control (SUPER_ADMIN, ADMIN, TUTOR, PARENT) — existing
- ✓ Platform React app with TailwindCSS, TanStack Query, React Router — existing
- ✓ Service layer pattern (src/services/) wrapping Axios calls — existing
- ✓ Hook layer pattern (src/hooks/) wrapping TanStack Query — existing
- ✓ Page hook pattern (src/pages/*/use*Page.ts) for page state — existing
- ✓ UI component library (src/components/ui/) with 25+ primitives — existing
- ✓ Playwright E2E test infrastructure with mock API fixtures — existing
- ✓ i18n support with language switching — existing
- ✓ Super Admin impersonation flow — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] All CRUD operations on every page connected to backend API
- [ ] Cross-page data dependencies working correctly (enrollment depends on student + class, session depends on class, attendance depends on session, payment depends on enrollment, payout depends on session completion)
- [ ] Dashboard stats computed from real backend data
- [ ] Finance flows end-to-end (payments, payouts, expenses)
- [ ] Settings page connected to backend
- [ ] Fix any backend API gaps discovered during integration
- [ ] WhatsApp page connected to backend
- [ ] Report generation connected to backend
- [ ] CSV export/import working end-to-end
- [ ] Schedule page showing real session data with correct dependencies

### Out of Scope

- Tutor app (sinaloka-tutors) changes — separate project
- Parent app (sinaloka-parent) changes — separate project
- New features or pages — focus is wiring existing UI to backend
- Major UI redesign or component refactoring
- Backend architecture changes — only fix gaps needed for integration
- Mobile responsiveness for platform (it's a desktop admin dashboard)

## Context

- Backend API is mostly complete (~37 spec files covering all domains), with known gaps in Settings
- Platform has service files (`src/services/`) and hooks (`src/hooks/`) for every domain — some may be stubs or partially implemented
- Some pages use hardcoded/mock data instead of calling services
- Data relationships exist in Prisma schema but frontend doesn't always reflect them (e.g., enrollment dropdowns should pull from students + classes)
- The codebase map in `.planning/codebase/` documents the full architecture, conventions, and known concerns

## Constraints

- **Tech stack**: Must use existing stack (React 19, TanStack Query, Axios, TailwindCSS v4) — no new major dependencies
- **Backend compatibility**: Frontend must adapt to existing backend API shapes — minimize backend changes
- **Multi-tenancy**: All API calls must respect tenant scoping via existing interceptor pattern
- **Patterns**: Follow existing service → hook → page hook → component pattern documented in CONVENTIONS.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix all pages systematically rather than prioritizing one flow | User wants fully functional platform with all areas equally important | — Pending |
| Fix backend gaps as discovered during integration | Unknown which endpoints are missing until frontend is wired up | — Pending |
| Keep existing patterns (service/hook/page hook) | Consistent with established codebase conventions | — Pending |

---
*Last updated: 2026-03-19 after initialization*
