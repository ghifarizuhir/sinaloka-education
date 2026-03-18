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
| Frontend API client | `sinaloka-platform/src/lib/api.ts` |
| Auth context | `sinaloka-platform/src/contexts/AuthContext.tsx` |
| UI primitives | `sinaloka-platform/src/components/ui/` |
| E2E mock data | `sinaloka-platform/e2e/mocks/` |
| CI workflows | `.github/workflows/` |
