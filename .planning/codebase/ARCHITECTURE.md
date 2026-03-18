# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Multi-tenant SPA (Single Page Application) with centralized NestJS API backend, three independent React frontend apps sharing backend API, and database-driven architecture with Prisma ORM.

**Key Characteristics:**
- Multi-tenant isolation via JWT payload (`institution_id`) scoped through interceptor
- Frontend service layer wrapping API calls with Axios
- React Context for auth state management
- TanStack Query for server state caching and mutations
- Role-based access control (SUPER_ADMIN, ADMIN, TUTOR, PARENT)
- I18n support with language switching per institution

## Layers

**Backend API Layer (NestJS):**
- Purpose: Central business logic, data access, multi-tenancy enforcement, user authentication
- Location: `sinaloka-backend/src/`
- Contains: Module controllers, services, DTOs, Prisma ORM integration
- Depends on: PostgreSQL database via Prisma, JWT, bcrypt for auth
- Used by: All three frontend apps via HTTP/REST

**Data Access Layer (Prisma):**
- Purpose: Database abstraction and query building
- Location: `sinaloka-backend/prisma/schema.prisma`, generated client in `sinaloka-backend/generated/prisma/`
- Contains: PostgreSQL schema definition, migrations
- Depends on: PostgreSQL database
- Used by: All backend services

**Frontend Service Layer (Platform):**
- Purpose: Encapsulate all HTTP calls to backend, provide type-safe API interface
- Location: `sinaloka-platform/src/services/` (e.g., `students.service.ts`)
- Contains: Service functions wrapping Axios calls with typed responses
- Depends on: Axios HTTP client, auth context for token injection
- Used by: React hooks and components

**Frontend Mapper Layer (Tutors + Parent):**
- Purpose: Transform raw backend API responses into frontend-typed objects
- Location: `sinaloka-tutors/src/mappers/index.ts`, `sinaloka-parent/src/mappers/index.ts`
- Contains: Pure mapping functions (`mapSession`, `mapPayout`, `mapChild`, `mapPayment`, etc.) that normalize backend snake_case to frontend types
- Depends on: Frontend type definitions
- Used by: Hooks that fetch data from the API
- Pattern difference from Platform: Tutors/Parent use mappers (data transformation layer) while Platform uses service objects (API abstraction layer)

**React Query Layer (Platform only):**
- Purpose: Manage server state (caching, synchronization, invalidation)
- Location: `sinaloka-platform/src/hooks/` (e.g., `useStudents.ts`)
- Contains: Custom hooks wrapping TanStack Query's `useQuery`, `useMutation`, `useQueryClient`
- Depends on: Service layer, React Query
- Used by: Page hooks and components

**Custom Hooks Layer (Tutors + Parent):**
- Purpose: Fetch data from API with manual useState/useEffect (no query cache)
- Location: `sinaloka-tutors/src/hooks/` (e.g., `useSchedule.ts`, `usePayouts.ts`), `sinaloka-parent/src/hooks/` (e.g., `useChildren.ts`, `useChildDetail.ts`)
- Contains: Hooks with manual loading/error state, Axios calls, optimistic updates
- Depends on: API client (`src/api/client.ts`), mappers
- Note: Unlike Platform, Tutors/Parent have no query cache — refetching is manual via explicit `refetch()` calls

**Page Hook Layer (Platform only):**
- Purpose: Centralize page-level state and logic (filters, pagination, forms, modals)
- Location: `src/pages/[Feature]/use[Feature]Page.ts` (e.g., `sinaloka-platform/src/pages/Students/useStudentPage.ts`)
- Contains: All state for a page (selected items, form inputs, filters, modals), event handlers, computed values
- Depends on: React hooks, Query hooks, translations (i18n)
- Used by: Page components
- Note: Tutors/Parent apps do NOT use page hooks — all state lives in `App.tsx` and is passed down as props

**UI Component Layer:**
- Purpose: Reusable visual components, page layout shells
- Location: `src/components/` (layout, routing, UI library components)
- Contains: React functional components with minimal logic, mostly presentation and event delegation
- Depends on: Lucide icons, Sonner toasts, Tailwind CSS utilities
- Used by: Pages and other components

**Context & Auth Layer:**
- Purpose: Manage global application state (auth user, tokens)
- Location: `src/contexts/AuthContext.tsx` (all 3 apps)
- Contains: Auth provider, user state, login/logout logic, token refresh orchestration
- **Platform:** Depends on auth service + localStorage for tokens, sessionStorage for impersonation; uses `getMe()` for profile
- **Tutors:** Depends on API client + localStorage (`sinaloka_refresh_token` key); uses `GET /tutor/profile` for profile; dispatches `auth:logout` window event on token failure; supports `refreshProfile()` for profile edits
- **Parent:** Depends on API client + localStorage (`sinaloka_parent_refresh_token` key); uses `GET /auth/me` for profile; includes `register()` method for invite-based parent onboarding
- Used by: All pages via `useAuth` hook

## Data Flow

**User Authentication:**

1. User enters credentials on Login page
2. Login component calls `useAuth().login(email, password)`
3. `AuthContext.login()` calls `authService.login()` (POST `/api/auth/login`)
4. Backend validates credentials, returns access + refresh tokens
5. Tokens stored in localStorage
6. `authService.getMe()` fetches user profile with Authorization header
7. `AuthContext` updates user state, applies institution language
8. Router redirects authenticated user to Dashboard
9. All subsequent requests include `Authorization: Bearer {access_token}` via Axios interceptor

**Token Refresh (Automatic):**

1. Frontend Axios interceptor detects 401 response
2. Interceptor attempts refresh via `POST /api/auth/refresh`
3. Backend validates refresh token, returns new access + refresh tokens
4. Interceptor updates localStorage with new tokens
5. Original failed request retried with new token
6. If refresh fails, user redirected to `/login` and tokens cleared

**Impersonation (Super Admin Only):**

1. Super Admin selects institution in Institutions page
2. `enterInstitution(id, name)` stores institution in sessionStorage
3. Axios request interceptor reads sessionStorage and appends `?institution_id={id}` to all requests
4. Backend `TenantInterceptor` detects Super Admin + query param, scopes to that institution
5. All subsequent queries filtered by impersonated `institution_id`
6. `exitInstitution()` clears sessionStorage, returns to normal scoping

**Data Query & Display (Students Page Example):**

1. Page mounts, calls `useStudentPage()` hook
2. Hook calls `useStudents({ page, limit })` (React Query hook)
3. React Query calls `studentsService.getAll({ page, limit })`
4. Service calls `api.get('/api/admin/students', { params })`
5. Axios interceptor adds auth header + institution_id (if impersonating)
6. Backend `StudentController.findAll()` receives request with `tenantId` injected by `TenantInterceptor`
7. `StudentService.findAll()` queries Prisma filtered by `institution_id`
8. Prisma executes SQL on PostgreSQL, returns paginated results
9. Backend returns `{ data: [...], meta: { total, totalPages, ... } }`
10. React Query caches response
11. Page hook filters data client-side (search, grade, status)
12. Components receive filtered results and render table

**Create/Update/Delete Operation (Create Student Example):**

1. User fills form and submits in AddEditModal
2. `handleFormSubmit()` validates form locally
3. Calls `updateStudent.mutate()` or `createStudent.mutate()`
4. Mutation calls `studentsService.create(payload)` (POST `/api/admin/students`)
5. Request includes auth header + institution_id
6. Backend `StudentController.create()` receives request with injected `tenantId`
7. `StudentService.create()` validates DTO via Zod schema, creates record via Prisma
8. Prisma executes INSERT, returns created student
9. Backend returns created record (201)
10. React Query mutation `onSuccess` callback invalidates `['students']` query key
11. React Query refetches student list in background
12. Modal closes, toast shows success message
13. Table updates with new data

**Export CSV Flow:**

1. User clicks "Export" button on Students page
2. Calls `exportStudents.mutate()`
3. Service calls `api.get('/api/admin/students/export', { responseType: 'blob' })`
4. Backend `StudentController.export()` calls `StudentService.exportToCsv()`
5. Service queries all students (filtered by query params), converts to CSV via `csv-stringify`
6. Backend returns CSV as blob (binary)
7. Frontend receives blob, creates `Blob` object URL
8. Creates temporary `<a>` element with `download` attribute
9. Simulates click to trigger browser download

## Key Abstractions

**TenantInterceptor (Backend):**
- Purpose: Enforce multi-tenancy by injecting `request.tenantId` on every request
- Examples: `sinaloka-backend/src/common/interceptors/tenant.interceptor.ts`
- Pattern: NestJS interceptor that reads JWT payload (`institutionId`), validates Super Admin optionally scopes via query param, attaches `tenantId` to request object
- All services receive tenantId as first parameter and filter database queries by it

**JwtAuthGuard (Backend):**
- Purpose: Global authentication enforcement; blocks unauthenticated requests unless decorated with `@Public()`
- Examples: `sinaloka-backend/src/common/guards/jwt-auth.guard.ts`
- Pattern: NestJS guard applied globally in AppModule, uses passport-jwt to validate Bearer token
- Attached to JWT payload as `request.user`

**RolesGuard (Backend):**
- Purpose: Role-based access control; validates user has required role via `@Roles()` decorator
- Examples: `sinaloka-backend/src/common/guards/roles.guard.ts`
- Pattern: Compares user.role from JWT payload to required roles, throws ForbiddenException if no match

**Axios API Client (Frontend):**
- Purpose: Centralized HTTP client with automatic token injection and refresh orchestration
- Examples: `sinaloka-platform/src/lib/api.ts`
- Pattern: Axios instance with request interceptor injecting `Authorization` header + impersonation query param; response interceptor handling 401 with token refresh and retry queue
- All services use this instance

**AuthContext (Frontend):**
- Purpose: Global auth state management with token persistence and user profile caching
- Examples: `sinaloka-platform/src/contexts/AuthContext.tsx`
- Pattern: React Context + useState, provides user, isAuthenticated, isLoading, login, logout, impersonation methods
- Restored on app mount by checking localStorage for tokens and calling `getMe()`

**Service Layer (Frontend):**
- Purpose: Type-safe API interface, encapsulation of HTTP details
- Examples: `sinaloka-platform/src/services/students.service.ts`
- Pattern: Object with methods returning Promise<T>, each method chains Axios call to `.then((r) => r.data)` to extract response body
- Used by React hooks, not directly by components

**Query Hooks (Frontend):**
- Purpose: Wrap TanStack Query operations with service layer calls
- Examples: `sinaloka-platform/src/hooks/useStudents.ts`
- Pattern: Custom hooks exporting `useQuery`, `useMutation` functions with consistent query keys and automatic invalidation on mutation success
- Decouples components from TanStack Query API details

**Page Hooks (Frontend):**
- Purpose: Centralize all page-level state and logic in a single hook
- Examples: `sinaloka-platform/src/pages/Students/useStudentPage.ts`
- Pattern: Large custom hook returning object with state setters + handlers + query/mutation hooks; page components call hook once and destructure results
- Simplifies component JSX, makes state management explicit and testable

**Prisma Service (Backend):**
- Purpose: Dependency-inject Prisma client into all services
- Examples: `sinaloka-backend/src/common/prisma/prisma.service.ts`
- Pattern: NestJS Service wrapping Prisma client instance; all backend services receive it via constructor injection
- Ensures single client instance, handles connection lifecycle

## Entry Points

**Backend Entry:**
- Location: `sinaloka-backend/src/main.ts`
- Triggers: Application startup
- Responsibilities: Create NestJS application, enable CORS, set global `/api` prefix, listen on port (default 5000)

**Platform Frontend Entry:**
- Location: `sinaloka-platform/src/main.tsx`
- Triggers: React app bootstrap
- Responsibilities: Create React root, wrap app in QueryClientProvider (TanStack Query), wrap in AuthProvider, render App component

**Platform App Component:**
- Location: `sinaloka-platform/src/App.tsx`
- Triggers: Initial render after entry point
- Responsibilities: Define all routes (public Login, protected Dashboard/pages, Super Admin routes), render Router + Routes

**Platform Layout:**
- Location: `sinaloka-platform/src/components/Layout.tsx`
- Triggers: Rendered for all authenticated routes (via ProtectedRoute)
- Responsibilities: Render sidebar navigation, header (search, dark mode, language, user), outlet for page content

**Platform Pages (e.g., Students):**
- Location: `sinaloka-platform/src/pages/Students/index.tsx`
- Triggers: Route match (e.g., `/students`)
- Responsibilities: Call page hook, render stats cards, filters, table, modals; delegate all logic to page hook

**Tutors App Component:**
- Location: `sinaloka-tutors/src/App.tsx`
- Triggers: React app bootstrap
- Responsibilities: Uses React Router (`Routes`/`Route`) for auth routes (`/accept-invite`, `/forgot-password`, `/reset-password`, `/login`), then `MainAppContent` for authenticated views
- Architecture: `MainAppContent` is a single large component holding ALL app state (schedule, payouts, attendance, notifications, modals) — passes state/handlers as props to page components
- Navigation: `BottomNav` component with tabs: dashboard, schedule, payouts, profile
- Sub-views: AttendancePage (per-class), SessionDetailPage, ProfileEditPage rendered based on state flags (not routes)
- Animations: `motion/react` (Framer Motion) for page transitions with `AnimatePresence`

**Tutors Pages:**
- `DashboardPage` — upcoming classes, pending payout summary
- `SchedulePage` — filtered schedule list (upcoming/completed/cancelled)
- `AttendancePage` — per-student attendance marking with topic/summary fields
- `PayoutsPage` — payout history with proof image viewer
- `ProfilePage` / `ProfileEditPage` — tutor profile management
- `SessionDetailPage` — session detail view
- `AcceptInvitePage` — tutor invite acceptance flow
- `LoginPage` / `ForgotPasswordPage` / `ResetPasswordPage` — auth flows

**Parent App Component:**
- Location: `sinaloka-parent/src/App.tsx`
- Triggers: React app bootstrap
- Responsibilities: State-based routing (NO React Router) — uses `useState` for `activeTab` and `authScreen` to control which page renders
- Auth flow: Checks URL params for `?token=` (invite) or `?reset_token=` (password reset), renders RegisterPage or ResetPasswordPage accordingly; otherwise shows LoginPage/ForgotPasswordPage
- Navigation: `BottomNav` with tabs: dashboard, children, profile
- Sub-views: `ChildDetailPage` rendered when a child is selected (state-driven, not route-driven)
- UI language: Indonesian (Bahasa) — all labels hardcoded in Indonesian

**Parent Pages:**
- `DashboardPage` — children summary cards, quick stats
- `ChildDetailPage` — attendance list, session list, payment list, enrollment list for a specific child
- `LoginPage` / `RegisterPage` / `ForgotPasswordPage` / `ResetPasswordPage` — auth flows
- Components: `ChildCard`, `AttendanceList`, `SessionList`, `PaymentList`, `EnrollmentList`, `BottomNav`

## Error Handling

**Strategy:** Axios + NestJS exception filters + React Query error states

**Patterns:**

**Backend Exceptions:**
- Services throw NestJS exceptions (`NotFoundException`, `ForbiddenException`, `BadRequestException`)
- Global `HttpExceptionFilter` catches exceptions, formats as JSON with status code
- Frontend receives error in `error` property of response

**Frontend Error Boundaries:**
- React Query `useMutation` returns `error` property
- Page hook event handlers catch errors via mutation `onError` callback
- Toast messages display error via `toast.error(err?.response?.data?.message || fallback)`
- Axios response interceptor handles 401 by clearing tokens and redirecting to `/login`

**Validation:**
- Backend: Zod schemas validate DTOs via `ZodValidationPipe`
- Frontend: Page hooks validate form inputs before submission, show field errors in form UI

## Cross-Cutting Concerns

**Logging:**
- Backend: NestJS built-in Logger (used in bootstrap, exception filter)
- Frontend: Browser console (no structured logging currently)

**Validation:**
- Backend: Zod schemas on DTOs (e.g., `StudentSchema` in `student.dto.ts`)
- Frontend: Client-side validation in page hooks (regex for email, required fields check)

**Authentication:**
- Backend: JWT in Authorization header, validated by `JwtAuthGuard` + `passport-jwt`
- Frontend: Tokens stored in localStorage, automatically attached by Axios interceptor, refreshed on 401 by interceptor

**Authorization (Multi-Tenancy):**
- Backend: `TenantInterceptor` injects `tenantId` on every request, all queries filtered by it
- Frontend: Impersonation via sessionStorage (Super Admin only), Axios interceptor appends query param
- Pattern: Frontend never needs to know tenantId; backend enforces isolation via interceptor + service layer filtering

**Internationalization:**
- Backend: None (returns same data regardless of language)
- Frontend: i18next library with JSON locale files in `src/locales/`; language toggle in header persists to localStorage; institution default_language applied on login

---

*Architecture analysis: 2026-03-19*
