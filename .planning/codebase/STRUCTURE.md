# Directory Structure

**Analysis Date:** 2026-03-19

## Top-Level Layout

```
sinaloka/
├── sinaloka-backend/       # NestJS API server
├── sinaloka-platform/      # React admin dashboard
├── sinaloka-tutors/        # React tutor-facing app
├── sinaloka-parent/        # React parent-facing mobile-first app
├── .github/workflows/      # CI/CD pipelines
├── docs/                   # Brand guidelines, documentation
└── CLAUDE.md               # AI assistant instructions
```

Each app is an independent npm project with its own `package.json` and `node_modules`.

## Backend Structure (`sinaloka-backend/`)

```
sinaloka-backend/
├── src/
│   ├── app.module.ts                    # Root module
│   ├── main.ts                          # Entry point (port 5000)
│   ├── modules/                         # Domain modules
│   │   ├── attendance/                  # Attendance tracking
│   │   ├── auth/                        # Authentication (JWT)
│   │   ├── class/                       # Class management
│   │   ├── dashboard/                   # Dashboard aggregations
│   │   ├── email/                       # Resend email service (@Global)
│   │   ├── enrollment/                  # Student enrollments
│   │   ├── expense/                     # Operating expenses
│   │   ├── institution/                 # Multi-tenant institutions
│   │   ├── invitation/                  # Parent invite tokens
│   │   ├── parent/                      # Parent portal + guards
│   │   ├── payment/                     # Student payments
│   │   ├── payout/                      # Tutor payouts
│   │   ├── report/                      # Report generation
│   │   ├── session/                     # Class sessions
│   │   ├── settings/                    # Institution settings
│   │   ├── student/                     # Student management
│   │   ├── subject/                     # Subjects
│   │   ├── tutor/                       # Tutor management
│   │   ├── upload/                      # File uploads (Multer)
│   │   ├── user/                        # User management
│   │   └── whatsapp/                    # WhatsApp Cloud API
│   └── common/                          # Shared utilities
│       ├── decorators/                  # @CurrentUser(), @Public(), @Roles()
│       ├── guards/                      # JwtAuthGuard, RolesGuard
│       ├── interceptors/               # TenantInterceptor
│       ├── filters/                     # Exception filters
│       ├── pipes/                       # Validation pipes
│       └── prisma/                      # PrismaService, PrismaModule
├── prisma/
│   ├── schema.prisma                    # Database schema
│   ├── migrations/                      # Migration files
│   └── seed.ts                          # Database seeder
├── generated/prisma/                    # Generated Prisma client
├── test/                                # Test utilities
│   └── prisma-client-shim/             # CJS compat shim for tests
└── uploads/                             # File upload directory
```

### Module Pattern (each domain module)

```
src/modules/<domain>/
├── <domain>.module.ts         # NestJS module definition
├── <domain>.controller.ts     # HTTP route handlers
├── <domain>.service.ts        # Business logic
├── <domain>.dto.ts            # Zod-based DTOs (nestjs-zod)
├── <domain>.controller.spec.ts # Controller unit tests
└── <domain>.service.spec.ts    # Service unit tests
```

## Platform Structure (`sinaloka-platform/`)

```
sinaloka-platform/
├── src/
│   ├── main.tsx                         # React entry point
│   ├── App.tsx                          # Router + providers
│   ├── index.css                        # TailwindCSS v4 entry
│   ├── pages/                           # Page components
│   │   ├── Dashboard.tsx                # Single-file pages
│   │   ├── Login.tsx
│   │   ├── Attendance.tsx
│   │   ├── Tutors.tsx
│   │   ├── WhatsApp.tsx
│   │   ├── NotFound.tsx
│   │   ├── Classes/                     # Multi-file page modules
│   │   │   ├── index.tsx                # Main page component
│   │   │   ├── useClassesPage.ts        # Page hook (data + logic)
│   │   │   ├── ClassTable.tsx           # Sub-components
│   │   │   ├── ClassFormModal.tsx
│   │   │   ├── ClassDetailDrawer.tsx
│   │   │   ├── ClassFilters.tsx
│   │   │   └── ClassDeleteModal.tsx
│   │   ├── Enrollments/
│   │   ├── Finance/                     # Sub-pages: Payments, Payouts, Expenses, Overview
│   │   ├── Schedules/
│   │   ├── Settings/
│   │   ├── Students/
│   │   └── SuperAdmin/
│   ├── services/                        # API service layer (Axios wrappers)
│   │   ├── students.service.ts
│   │   ├── auth.service.ts
│   │   ├── classes.service.ts
│   │   └── ... (one per domain)
│   ├── hooks/                           # TanStack Query hooks
│   │   ├── useStudents.ts
│   │   ├── useAuth.ts
│   │   ├── useClasses.ts
│   │   └── ... (one per domain)
│   ├── components/                      # Shared components
│   │   ├── Layout.tsx                   # Main layout with sidebar
│   │   ├── ProtectedRoute.tsx           # Auth route guard
│   │   ├── SuperAdminRoute.tsx          # SUPER_ADMIN route guard
│   │   ├── SuperAdminLayout.tsx         # Admin layout
│   │   ├── ImpersonationBanner.tsx      # Institution impersonation UI
│   │   ├── WeekCalendar.tsx
│   │   ├── ScheduleWeekPreview.tsx
│   │   ├── ClassTimetable.tsx
│   │   ├── ReportPreviewModal.tsx
│   │   ├── UI.tsx
│   │   └── ui/                          # Reusable UI primitives
│   │       ├── index.ts                 # Barrel export
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── data-table.tsx
│   │       ├── modal.tsx
│   │       ├── drawer.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── confirm-dialog.tsx
│   │       ├── empty-state.tsx
│   │       ├── page-header.tsx
│   │       ├── search-input.tsx
│   │       ├── stat-card.tsx
│   │       └── ... (25+ primitives)
│   ├── contexts/
│   │   └── AuthContext.tsx              # Auth state + token management
│   ├── types/                           # TypeScript type definitions
│   │   ├── student.ts
│   │   ├── auth.ts
│   │   ├── common.ts                   # Shared types (pagination, etc.)
│   │   └── ... (one per domain)
│   ├── lib/
│   │   ├── api.ts                       # Axios instance + interceptors
│   │   ├── utils.ts                     # cn() helper (clsx + tailwind-merge)
│   │   ├── constants.ts                 # App constants
│   │   └── i18n.ts                      # Internationalization setup
│   └── locales/                         # Translation files
├── e2e/                                 # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── specs/
│   │   ├── smoke/                       # Quick smoke tests (9 specs)
│   │   ├── crud/                        # CRUD operation tests (8 specs)
│   │   └── integration/                 # Integration tests (2 specs)
│   ├── pages/                           # Page object models (13 pages)
│   ├── fixtures/                        # Test fixtures (auth, mock-api)
│   ├── helpers/                         # API mocker, test data
│   └── mocks/                           # Mock JSON data (12 files)
└── public/                              # Static assets
```

## Tutors Structure (`sinaloka-tutors/`)

```
sinaloka-tutors/
├── src/
│   ├── main.tsx                         # React entry point
│   ├── App.tsx                          # React Router + MainAppContent (all state here)
│   ├── index.css                        # TailwindCSS v4 entry (Sinaloka brand tokens)
│   ├── pages/                           # Page components (receive props, minimal state)
│   │   ├── DashboardPage.tsx            # Upcoming classes, payout summary
│   │   ├── SchedulePage.tsx             # Filtered schedule list
│   │   ├── AttendancePage.tsx           # Per-class attendance marking
│   │   ├── PayoutsPage.tsx              # Payout history + proof viewer
│   │   ├── ProfilePage.tsx              # Tutor profile view
│   │   ├── ProfileEditPage.tsx          # Tutor profile editing
│   │   ├── SessionDetailPage.tsx        # Session detail view
│   │   ├── AcceptInvitePage.tsx         # Tutor invite acceptance
│   │   ├── LoginPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── hooks/                           # Data hooks (manual useState/useEffect)
│   │   ├── useAuth.ts                   # Auth context consumer
│   │   ├── useSchedule.ts              # Schedule data + cancel/reschedule actions
│   │   ├── usePayouts.ts               # Payout data fetching
│   │   ├── useAttendance.ts            # Student attendance per session
│   │   └── useProfile.ts               # Profile data + update
│   ├── components/                      # Shared components
│   │   ├── BottomNav.tsx                # Mobile bottom navigation
│   │   ├── PasswordInput.tsx            # Password input with toggle
│   │   ├── PayoutCard.tsx               # Payout card display
│   │   ├── RescheduleModal.tsx          # Reschedule request modal
│   │   └── ScheduleCard.tsx             # Schedule card with actions
│   ├── contexts/
│   │   └── AuthContext.tsx              # JWT auth + profile (tutor-specific)
│   ├── api/
│   │   └── client.ts                    # Axios instance + interceptors + token mgmt
│   ├── mappers/
│   │   └── index.ts                     # Backend→Frontend mappers (session, student, payout, profile)
│   ├── types.ts                         # All types in single file
│   └── lib/
│       └── utils.ts                     # cn() utility
├── e2e/                                 # Playwright config exists but no tests written
└── public/                              # Static assets
```

## Parent Structure (`sinaloka-parent/`)

```
sinaloka-parent/
├── src/
│   ├── main.tsx                         # React entry point
│   ├── App.tsx                          # State-based router (NO React Router)
│   ├── index.css                        # TailwindCSS v4 entry
│   ├── pages/                           # Page components
│   │   ├── DashboardPage.tsx            # Children summary cards
│   │   ├── ChildDetailPage.tsx          # Child attendance, sessions, payments, enrollments
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx             # Invite-based parent registration
│   │   ├── ForgotPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── hooks/                           # Data hooks (manual useState/useEffect)
│   │   ├── useAuth.ts                   # Auth context consumer
│   │   ├── useChildren.ts              # Children list fetching
│   │   └── useChildDetail.ts           # Per-child detail data (attendance, sessions, payments)
│   ├── components/                      # Shared components
│   │   ├── BottomNav.tsx                # Mobile bottom navigation
│   │   ├── ChildCard.tsx                # Child summary card
│   │   ├── AttendanceList.tsx           # Attendance record list
│   │   ├── SessionList.tsx              # Session record list
│   │   ├── PaymentList.tsx              # Payment record list
│   │   ├── EnrollmentList.tsx           # Enrollment list
│   │   └── PasswordInput.tsx            # Password input with toggle
│   ├── contexts/
│   │   └── AuthContext.tsx              # JWT auth + parent profile + register method
│   ├── api/
│   │   └── client.ts                    # Axios instance (baseURL: /api, parent-specific refresh key)
│   ├── mappers/
│   │   └── index.ts                     # Backend→Frontend mappers (child, attendance, session, payment, enrollment, profile)
│   ├── types.ts                         # All types in single file
│   └── lib/
│       └── utils.ts                     # cn() utility
└── public/                              # Static assets
```

## Architecture Comparison: Three Frontend Apps

| Aspect | Platform | Tutors | Parent |
|--------|----------|--------|--------|
| **Router** | React Router DOM | React Router DOM | State-based (useState) |
| **Data fetching** | TanStack Query | Manual hooks | Manual hooks |
| **API layer** | Service objects (`src/services/`) | Mappers + hooks | Mappers + hooks |
| **State management** | Page hooks per feature | Centralized in App.tsx | Centralized in App.tsx |
| **Token storage key** | `access_token` / `refresh_token` | `sinaloka_refresh_token` | `sinaloka_parent_refresh_token` |
| **Token location** | localStorage (both tokens) | Memory (access) + localStorage (refresh) | Memory (access) + localStorage (refresh) |
| **Auth profile endpoint** | `GET /api/auth/me` | `GET /api/tutor/profile` | `GET /api/auth/me` |
| **UI primitives** | Custom `src/components/ui/` (25+) | Inline (no shared ui library) | Inline (no shared ui library) |
| **Types** | Per-domain files in `src/types/` | Single `src/types.ts` | Single `src/types.ts` |
| **i18n** | i18next (en/id) | None (Indonesian hardcoded) | None (Indonesian hardcoded) |
| **Animations** | Motion (AnimatePresence) | Motion (AnimatePresence) | Motion (AnimatePresence) |
| **E2E Tests** | Playwright (19 specs) | Playwright configured, no tests | None |
| **Mobile-first** | No (desktop admin) | Yes (mobile-first) | Yes (mobile-first) |

## Naming Conventions

### Files
| Context | Convention | Example |
|---------|-----------|---------|
| Backend modules | `kebab-case` | `student.service.ts`, `student.controller.spec.ts` |
| Frontend pages | `PascalCase` | `Dashboard.tsx`, `Classes/index.tsx` |
| Frontend page hooks | `camelCase` with `use` prefix | `useClassesPage.ts` |
| Frontend services | `kebab-case` | `students.service.ts` |
| Frontend hooks | `camelCase` with `use` prefix | `useStudents.ts` |
| Frontend types | `kebab-case` | `student.ts`, `common.ts` |
| UI components | `kebab-case` | `data-table.tsx`, `page-header.tsx` |
| E2E page objects | `kebab-case` | `students.page.ts` |
| E2E specs | `kebab-case` | `students.crud.spec.ts` |
| Mock data | `kebab-case` JSON | `students.json` |

### Code
| Context | Convention | Example |
|---------|-----------|---------|
| React components | `PascalCase` | `StudentTable`, `ClassFormModal` |
| Hooks | `camelCase` with `use` prefix | `useStudents`, `useClassesPage` |
| Services (frontend) | `camelCase` object exports | `studentsService.getAll()` |
| NestJS services | `PascalCase` classes | `StudentService` |
| DTOs | `PascalCase` with suffix | `CreateStudentDto` |
| Database models | `snake_case` with `@@map()` | `enrollment_status` |
| API routes | `kebab-case` | `/api/admin/students`, `/api/admin/class-sessions` |
| Env vars | `SCREAMING_SNAKE_CASE` | `VITE_API_URL`, `JWT_SECRET` |

## Key Locations Quick Reference

| What | Where |
|------|-------|
| Database schema | `sinaloka-backend/prisma/schema.prisma` |
| API routes | `sinaloka-backend/src/modules/*/controller.ts` |
| Auth guards | `sinaloka-backend/src/common/guards/` |
| Tenant interceptor | `sinaloka-backend/src/common/interceptors/` |
| Platform API client | `sinaloka-platform/src/lib/api.ts` |
| Tutors API client | `sinaloka-tutors/src/api/client.ts` |
| Parent API client | `sinaloka-parent/src/api/client.ts` |
| Platform auth context | `sinaloka-platform/src/contexts/AuthContext.tsx` |
| Tutors auth context | `sinaloka-tutors/src/contexts/AuthContext.tsx` |
| Parent auth context | `sinaloka-parent/src/contexts/AuthContext.tsx` |
| Tutors mappers | `sinaloka-tutors/src/mappers/index.ts` |
| Parent mappers | `sinaloka-parent/src/mappers/index.ts` |
| UI primitives | `sinaloka-platform/src/components/ui/` |
| E2E mock data | `sinaloka-platform/e2e/mocks/` |
| CI workflows | `.github/workflows/` |
