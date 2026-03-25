# Sinaloka Platform — Backend Integration Design

**Date:** 2026-03-15
**Scope:** Integrate sinaloka-platform (React frontend) with sinaloka-backend (NestJS API)

## Context

The sinaloka-platform is a React 19 + Vite + TypeScript SPA serving as an **admin panel** for the `ADMIN` role only. It currently uses hardcoded mock data across all pages. The sinaloka-backend is a NestJS API with JWT auth, Prisma ORM, PostgreSQL, and multi-tenancy — already fully functional with CRUD endpoints for all domains.

This design covers wiring the frontend to consume the backend API.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Target role | ADMIN only | Super admins use a separate platform |
| HTTP client | Axios | Mature, interceptor support for auth |
| Server state | React Query (TanStack Query) | Caching, mutations, loading/error states out of the box |
| Architecture | Layered Services | Services (API calls) → Hooks (React Query) → Components. Clean separation, testable, extensible |
| Pagination | Server-side | Backend already supports paginated responses |
| Search/Filter | Hybrid | Server pagination + client-side filtering on current page data |
| Auth | JWT Bearer + refresh token | Matches backend implementation |
| Multi-tenancy | Transparent | Backend scopes data via JWT automatically; no UI needed |
| Migration | Full replacement | All mock data replaced with API calls in one pass |
| Reports | Preview + download | Modal with parameter inputs, PDF preview in iframe, download button |
| Toast library | sonner | Lightweight notification for mutation feedback |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Components / Pages                │
│  (Dashboard, Students, Tutors, Classes, etc.)       │
├─────────────────────────────────────────────────────┤
│                  React Query Hooks                   │
│  useStudents, useTutors, useClasses, etc.           │
│  (useQuery, useMutation, cache invalidation)        │
├─────────────────────────────────────────────────────┤
│                   Service Layer                      │
│  students.service, tutors.service, etc.             │
│  (Raw axios calls, request/response shaping)        │
├─────────────────────────────────────────────────────┤
│                  Axios Instance                      │
│  lib/api.ts                                          │
│  (Base URL, auth interceptor, token refresh)        │
├─────────────────────────────────────────────────────┤
│              AuthContext (React Context)              │
│  (user state, login, logout, token management)      │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   sinaloka-backend    │
              │   NestJS API (:3000)  │
              │   /api/*              │
              └───────────────────────┘
```

## Section 1: API Client & Auth Foundation

### Axios Instance (`src/lib/api.ts`)

- Base URL from `VITE_API_URL` environment variable
- **Request interceptor**: Reads `access_token` from localStorage, attaches as `Authorization: Bearer <token>` header
- **Response interceptor**: On 401 response:
  1. Attempt silent refresh using stored `refresh_token` via `POST /api/auth/refresh`
  2. If refresh succeeds: store new tokens, retry the original request
  3. If refresh fails: clear tokens, redirect to `/login`
- Queue concurrent requests during refresh to avoid multiple refresh calls

### Auth Context (`src/contexts/AuthContext.tsx`)

Provides to the component tree:

- `user: User | null` — current user profile from `GET /api/auth/me`
- `login(email: string, password: string): Promise<void>` — calls `POST /api/auth/login`, stores tokens in localStorage, fetches user profile
- `logout(): Promise<void>` — calls `POST /api/auth/logout` with refresh_token, clears localStorage, redirects to `/login`
- `isAuthenticated: boolean` — derived from token presence
- `isLoading: boolean` — true during initial auth check on app load (prevents flash of login page)

### Login Page (`src/pages/Login.tsx`)

- Email + password form with validation
- Error display for invalid credentials (from backend 401)
- On success: redirects to `/` (dashboard)
- Styled consistent with the existing design system (Tailwind, glass effects)

### Route Protection (`src/components/ProtectedRoute.tsx`)

- Wraps all authenticated routes
- Checks `isAuthenticated` from AuthContext
- If not authenticated: redirects to `/login`
- If `isLoading`: shows full-page skeleton/spinner

### App.tsx Changes

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* ...existing routes... */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
</QueryClientProvider>
```

### Environment Config

Update `.env.example`:
```
VITE_API_URL=http://localhost:3000
```

## Section 2: Service Layer

Each domain gets a service file in `src/services/` encapsulating raw API calls via the shared Axios instance.

### Standard Service Shape

Every CRUD service exports these functions:

```typescript
// Example: students.service.ts
import api from '@/lib/api';

export const studentsService = {
  getAll: (params: PaginationParams & StudentFilters) => api.get('/api/admin/students', { params }),
  getById: (id: string) => api.get(`/api/admin/students/${id}`),
  create: (data: CreateStudentDto) => api.post('/api/admin/students', data),
  update: (id: string, data: UpdateStudentDto) => api.patch(`/api/admin/students/${id}`, data),
  remove: (id: string) => api.delete(`/api/admin/students/${id}`),
};
```

### Service Inventory

| Service | Endpoint Base | Domain-Specific Methods |
|---|---|---|
| `auth.service.ts` | `/api/auth` | `login`, `refresh`, `logout`, `getMe` |
| `students.service.ts` | `/api/admin/students` | `importCsv(file)`, `exportCsv()` |
| `tutors.service.ts` | `/api/admin/tutors` | — |
| `classes.service.ts` | `/api/admin/classes` | — |
| `enrollments.service.ts` | `/api/admin/enrollments` | `checkConflict(data)` |
| `sessions.service.ts` | `/api/admin/sessions` | `generate(data)`, `approveReschedule(id)` |
| `attendance.service.ts` | `/api/admin/attendance` | `getBySession(params)`, `getSummary(params)`, `update(id, data)` — no create/delete (records are auto-generated with sessions) |
| `payments.service.ts` | `/api/admin/payments` | — |
| `payouts.service.ts` | `/api/admin/payouts` | — |
| `expenses.service.ts` | `/api/admin/expenses` | — |
| `dashboard.service.ts` | `/api/admin/dashboard` | `getStats()`, `getActivity()` |
| `reports.service.ts` | `/api/admin/reports` | `getAttendanceReport(params)`, `getFinanceReport(params)`, `getStudentProgressReport(params)` — all use `responseType: 'blob'` and return PDF blob |

## Section 3: Type Definitions

All types live in `src/types/` and mirror the backend DTOs/Prisma models.

### Common Types (`src/types/common.ts`)

```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

### Domain Types

Each file (e.g., `src/types/student.ts`) exports:
- The entity interface (e.g., `Student`) matching the backend response shape
- Create DTO (e.g., `CreateStudentDto`) matching the backend's create validation
- Update DTO (e.g., `UpdateStudentDto`) — partial version of Create DTO
- Filter params if applicable (e.g., `StudentFilters`)

Types are derived from the backend's Prisma schema and Zod DTOs to ensure alignment.

## Section 4: React Query Hooks Layer

Each domain gets a hooks file in `src/hooks/` wrapping the service in React Query primitives.

### Query Key Convention

```typescript
// Consistent key structure for all domains:
['students']           // list (with params encoded)
['students', id]       // single record
['dashboard', 'stats'] // dashboard stats
['dashboard', 'activity'] // dashboard activity
```

### Standard Hook Shape

```typescript
// Example: useStudents.ts
export function useStudents(params: PaginationParams & StudentFilters) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentsService.getAll(params),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => studentsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentsService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}

// useUpdateStudent, useDeleteStudent follow same pattern
```

### Cache Invalidation Rules

- **Create** → invalidate list query
- **Update** → invalidate list + detail queries
- **Delete** → invalidate list query
- **Financial mutations** (payment/payout/expense create/update/delete) → also invalidate `['dashboard', 'stats']`
- **Attendance mutations** → also invalidate `['dashboard', 'stats']`

### Special Hooks

| Hook | Purpose |
|---|---|
| `useImportStudents()` | Mutation for CSV file upload |
| `useExportStudents()` | Triggers CSV download |
| `useGenerateSessions()` | Mutation for auto-generating sessions from class schedule |
| `useApproveReschedule(id)` | Mutation for admin approving a reschedule request |
| `useAttendanceSummary(params)` | Query for attendance summary by student/class/date |
| `useDashboardStats()` | Query for dashboard statistics |
| `useDashboardActivity()` | Query for recent activity feed |
| `useReport(type, params)` | Query returning PDF blob for preview, enabled on demand, `staleTime: Infinity` (manual refetch only — PDF generation is expensive) |

### QueryClient Configuration (`src/main.tsx`)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // 30 seconds
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

## Section 5: Page Integration

Every page transforms from mock data to real API data. The pattern is consistent:

### Common Pattern Per Page

1. Replace `useState(MOCK_DATA)` with `useXxx(params)` hook
2. Wire pagination state (`page`, `limit`) to the hook params
3. Keep search/filter as local state, applied client-side on `data` from the query
4. Replace form submit handlers with mutation hooks (`.mutate()`)
5. Add loading states using existing `<Skeleton>` component
6. Add error toast on mutation failure
7. Add success toast on mutation success

### Page-Specific Notes

**Dashboard** — `useDashboardStats()` feeds stat cards and charts. `useDashboardActivity()` feeds the activity feed. Both use skeleton loading.

**Students** — Full CRUD via modals. CSV import uses `useImportStudents()` with file input. CSV export uses `useExportStudents()` triggering a download. Bulk delete iterates `useDeleteStudent()` for each selected student.

**Attendance** — Not a standard CRUD page. Records are auto-generated when sessions are created. The admin can only view attendance by session (`getBySession`), view summaries (`getSummary`), and update individual records (`update`). No create or delete operations.

**Schedules** — Maps to Sessions API. Auto-generate button calls `useGenerateSessions()`. Reschedule approval uses `useApproveReschedule()`.

**Attendance** — View and update only (see Students note above). Loaded by session, summary view uses `useAttendanceSummary()` with date/class/student filters.

**Finance pages** — Standard CRUD. Finance Overview aggregates data from dashboard stats.

**Reports** — New `ReportPreviewModal` component with:
- Report type selector (attendance, finance, student progress)
- Date range inputs
- Optional filters (class_id, student_id)
- Preview button: fetches PDF blob, displays in `<iframe>`
- Download button: creates blob URL, triggers download

### Layout Changes

- Header: Replace hardcoded "AD" avatar with `user.name` initials from AuthContext
- Sidebar: Add logout button at bottom
- Notifications bell: placeholder for now (no notification API in backend)

## Section 6: New Dependencies

```json
{
  "axios": "^1.7.0",
  "@tanstack/react-query": "^5.60.0",
  "sonner": "^1.7.0"
}
```

## Section 7: File Inventory

### New Files (~36)

| Category | Files |
|---|---|
| Lib | `api.ts` |
| Types | `auth.ts`, `common.ts`, `student.ts`, `tutor.ts`, `class.ts`, `enrollment.ts`, `session.ts`, `attendance.ts`, `payment.ts`, `payout.ts`, `expense.ts`, `dashboard.ts` |
| Services | `auth.service.ts`, `students.service.ts`, `tutors.service.ts`, `classes.service.ts`, `enrollments.service.ts`, `sessions.service.ts`, `attendance.service.ts`, `payments.service.ts`, `payouts.service.ts`, `expenses.service.ts`, `dashboard.service.ts`, `reports.service.ts` |
| Hooks | `useAuth.ts`, `useStudents.ts`, `useTutors.ts`, `useClasses.ts`, `useEnrollments.ts`, `useSessions.ts`, `useAttendance.ts`, `usePayments.ts`, `usePayouts.ts`, `useExpenses.ts`, `useDashboard.ts`, `useReports.ts` |
| Contexts | `AuthContext.tsx` |
| Components | `ProtectedRoute.tsx`, `ReportPreviewModal.tsx` |
| Pages | `Login.tsx` |

### Modified Files (~12)

| File | Changes |
|---|---|
| `main.tsx` | Add QueryClientProvider, Toaster |
| `App.tsx` | Add AuthProvider, ProtectedRoute wrapper, Login route |
| `Layout.tsx` | User info from AuthContext, logout button |
| `Dashboard.tsx` | Replace mock data with hooks |
| `Students.tsx` | Replace mock data with hooks |
| `Tutors.tsx` | Replace mock data with hooks |
| `Classes.tsx` | Replace mock data with hooks |
| `Schedules.tsx` | Replace mock data with hooks |
| `Enrollments.tsx` | Replace mock data with hooks |
| `Attendance.tsx` | Replace mock data with hooks |
| `Finance/*.tsx` (4 files) | Replace mock data with hooks |
| `Settings.tsx` | User profile from AuthContext |

### Config Changes

| File | Changes |
|---|---|
| `.env.example` | Add `VITE_API_URL` |
| `package.json` | Add axios, @tanstack/react-query, sonner |

## Out of Scope

- Super admin features (institution management, cross-tenant views)
- Tutor-facing features (separate platform)
- Real-time notifications / WebSockets
- Offline support / service workers
- Unit or integration tests (can be added in a follow-up)
- Backend changes (backend is already complete)
