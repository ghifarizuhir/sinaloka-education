# Sinaloka Platform — Full Integration & Polish

## What This Is

Sinaloka is a multi-tenant tutoring institution management system. The admin platform (sinaloka-platform) is mostly connected to the backend, but has several incomplete areas: 4 of 6 Settings tabs are non-functional (Academic, Branding, Security, Integrations), rooms defined in Settings don't connect to Classes, and various buttons across pages are placeholder-only. This project completes all Settings functionality, connects rooms properly, and fixes all placeholder/disconnected features across the platform.

## Core Value

Every feature visible in the admin UI must be functional — no mock data, no placeholder buttons, no disconnected settings. If a button exists, it works. If a setting exists, it persists and affects the system.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ All main CRUD pages connected to backend (Students, Classes, Enrollments, Sessions, Attendance, Payments, Payouts, Expenses, Tutors) — existing
- ✓ Cross-page data dependencies working (enrollment pulls students+classes, attendance pulls sessions, etc.) — existing
- ✓ Dashboard stats computed from real backend data — existing
- ✓ Finance flows connected end-to-end — existing
- ✓ WhatsApp page connected to backend — existing
- ✓ Report generation and CSV export/import working — existing
- ✓ Settings General tab saving to backend — existing
- ✓ Settings Billing tab saving to backend — existing
- ✓ Super Admin institution management — existing
- ✓ JWT auth, multi-tenancy, RBAC — existing
- ✓ i18n and Playwright E2E infrastructure — existing
- ✓ Settings Academic tab: rooms CRUD, subject categories, grade levels, working days — Validated in Phase 1
- ✓ Rooms from Settings used as dropdown in Class creation/edit form — Validated in Phase 1
- ✓ Backend API endpoints for academic settings (rooms, subjects, grades, working days) — Validated in Phase 1

### Active

<!-- Current scope. Building toward these. -->

- [ ] Settings Branding tab: primary color persists to backend
- [ ] Settings Security tab: functional 2FA toggle, password policy settings
- [ ] Settings Integrations tab: reflects actual integration status from backend
- [ ] Settings General tab: "Delete Institution" button connected or properly disabled with confirmation
- [ ] Attendance page: "View History" button functional
- [ ] Student Payments: "Revenue Analytics", "Export PDF", "Resend Receipt" buttons functional (or removed if not needed)
- [ ] Operating Expenses: "Export" and "Filters" buttons functional
- [ ] General quality pass: remove all placeholder toasts, connect or remove non-functional UI elements

### Out of Scope

- Tutor app (sinaloka-tutors) changes — separate project
- Parent app (sinaloka-parent) changes — separate project
- New pages or major new features — focus is completing existing UI
- Major UI redesign or component refactoring
- Backend architecture changes — only add endpoints needed for Settings
- Mobile responsiveness for platform (desktop admin dashboard)
- Custom Domain feature in Branding tab — marked as "Pro Feature" intentionally

## Context

- Backend API is mostly complete but Settings module only supports General and Billing endpoints
- Academic settings (rooms, subjects, grades) have no backend storage — need new endpoints or extension of the `Institution.settings` JSON blob
- The class `room` field in Prisma schema is a free-text `String?` — may need migration to reference a rooms collection, or keep as string but validate against settings
- Security features (2FA, password policies) may require significant backend work — scope carefully
- Integrations tab status should reflect real state (e.g., WhatsApp connected if credentials exist)
- The codebase map in `.planning/codebase/` documents the full architecture, conventions, and known concerns

## Constraints

- **Tech stack**: Must use existing stack (React 19, TanStack Query, Axios, TailwindCSS v4) — no new major dependencies
- **Backend compatibility**: Extend existing Settings module rather than creating new modules
- **Multi-tenancy**: All new settings must be institution-scoped
- **Patterns**: Follow existing service → hook → page hook → component pattern
- **Storage**: Academic settings can use the `Institution.settings` JSON blob (like billing) to avoid schema migrations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Store academic settings in Institution.settings JSON blob | Avoids Prisma schema migration; consistent with billing settings pattern | — Pending |
| Keep class room as free-text but add dropdown from settings | Backward compatible; existing classes with room strings still work | — Pending |
| Remove or disable truly unimplemented features rather than keeping broken buttons | Better UX than showing non-functional controls | — Pending |
| Security tab: implement what backend supports, disable rest | 2FA and password policies may need significant backend work | — Pending |

---
*Last updated: 2026-03-19 after codebase audit*
