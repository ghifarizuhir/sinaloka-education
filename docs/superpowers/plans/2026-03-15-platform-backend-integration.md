# Sinaloka Platform — Backend Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the sinaloka-platform React frontend to consume the sinaloka-backend NestJS API, replacing all mock data with real API calls.

**Architecture:** Layered services approach — Axios instance with JWT interceptors → Service modules (one per domain) → React Query hooks → Page components. Auth via JWT Bearer + refresh token flow.

**Tech Stack:** React 19, TypeScript, Axios, TanStack React Query v5, Sonner (toasts), Vite, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-15-platform-backend-integration-design.md`

---

## Chunk 1: Foundation — Dependencies, API Client, Types

### Task 1: Install dependencies and update environment config

**Files:**
- Modify: `sinaloka-platform/package.json`
- Modify: `sinaloka-platform/.env.example`

- [ ] **Step 1: Install new dependencies**

```bash
cd sinaloka-platform
npm install axios @tanstack/react-query sonner
```

- [ ] **Step 2: Update .env.example**

Add `VITE_API_URL` to `.env.example`:

```
VITE_API_URL=http://localhost:3000
```

Keep existing `GEMINI_API_KEY` and `APP_URL` entries.

- [ ] **Step 3: Create .env file for local development**

```bash
cp .env.example .env
```

Edit `.env` and set `VITE_API_URL=http://localhost:3000` (or wherever the backend runs).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add axios, react-query, sonner dependencies and VITE_API_URL env"
```

---

### Task 2: Create shared types

**Files:**
- Create: `sinaloka-platform/src/types/common.ts`
- Create: `sinaloka-platform/src/types/auth.ts`
- Create: `sinaloka-platform/src/types/student.ts`
- Create: `sinaloka-platform/src/types/tutor.ts`
- Create: `sinaloka-platform/src/types/class.ts`
- Create: `sinaloka-platform/src/types/enrollment.ts`
- Create: `sinaloka-platform/src/types/session.ts`
- Create: `sinaloka-platform/src/types/attendance.ts`
- Create: `sinaloka-platform/src/types/payment.ts`
- Create: `sinaloka-platform/src/types/payout.ts`
- Create: `sinaloka-platform/src/types/expense.ts`
- Create: `sinaloka-platform/src/types/dashboard.ts`
- Create: `sinaloka-platform/src/types/report.ts`

- [ ] **Step 1: Create `src/types/common.ts`**

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

- [ ] **Step 2: Create `src/types/auth.ts`**

```typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR';
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  institution: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}
```

- [ ] **Step 3: Create `src/types/student.ts`**

```typescript
import type { PaginationParams } from './common';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  grade: string;
  status: 'ACTIVE' | 'INACTIVE';
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  enrolled_at: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentDto {
  name: string;
  email?: string;
  phone?: string;
  grade: string;
  status?: 'ACTIVE' | 'INACTIVE';
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  enrolled_at?: string;
}

export type UpdateStudentDto = Partial<CreateStudentDto>;

export interface StudentQueryParams extends PaginationParams {
  grade?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}
```

- [ ] **Step 4: Create `src/types/tutor.ts`**

```typescript
import type { PaginationParams } from './common';

export interface Tutor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  experience_years: number;
  rating: number;
  is_verified: boolean;
  availability: Record<string, unknown> | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  user_id: string;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTutorDto {
  name: string;
  email: string;
  password: string;
  subjects: string[];
  experience_years?: number;
  availability?: Record<string, unknown>;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
}

export interface UpdateTutorDto {
  name?: string;
  subjects?: string[];
  experience_years?: number;
  availability?: Record<string, unknown>;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  is_verified?: boolean;
  rating?: number;
}

export interface TutorQueryParams extends PaginationParams {
  subject?: string;
  is_verified?: boolean;
}
```

- [ ] **Step 5: Create `src/types/class.ts`**

```typescript
import type { PaginationParams } from './common';

export type ScheduleDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Class {
  id: string;
  name: string;
  subject: string;
  capacity: number;
  fee: number;
  schedule_days: ScheduleDay[];
  schedule_start_time: string;
  schedule_end_time: string;
  room: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  tutor_id: string;
  tutor?: { id: string; name: string };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClassDto {
  tutor_id: string;
  name: string;
  subject: string;
  capacity: number;
  fee: number;
  schedule_days: ScheduleDay[];
  schedule_start_time: string;
  schedule_end_time: string;
  room?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export type UpdateClassDto = Partial<CreateClassDto>;

export interface ClassQueryParams extends PaginationParams {
  subject?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}
```

- [ ] **Step 6: Create `src/types/enrollment.ts`**

```typescript
import type { PaginationParams } from './common';

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status: 'PAID' | 'PENDING' | 'OVERDUE';
  enrolled_at: string;
  student?: { id: string; name: string };
  class?: { id: string; name: string };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentDto {
  student_id: string;
  class_id: string;
  status?: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE';
  enrolled_at?: string;
}

export interface UpdateEnrollmentDto {
  status?: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface EnrollmentQueryParams extends PaginationParams {
  student_id?: string;
  class_id?: string;
  status?: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface CheckConflictDto {
  student_id: string;
  class_id: string;
}
```

- [ ] **Step 7: Create `src/types/session.ts`**

```typescript
import type { PaginationParams } from './common';

export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULE_REQUESTED';

export interface Session {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  topic_covered: string | null;
  session_summary: string | null;
  reschedule_reason: string | null;
  proposed_date: string | null;
  proposed_start_time: string | null;
  proposed_end_time: string | null;
  class?: { id: string; name: string; subject: string; tutor?: { id: string; name: string } };
  created_by_id: string | null;
  approved_by_id: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionDto {
  class_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status?: SessionStatus;
  topic_covered?: string;
  session_summary?: string;
}

export interface UpdateSessionDto {
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: SessionStatus;
  topic_covered?: string;
  session_summary?: string;
}

export interface GenerateSessionsDto {
  class_id: string;
  date_from: string;
  date_to: string;
}

export interface ApproveRescheduleDto {
  approved: boolean;
}

export interface SessionQueryParams extends PaginationParams {
  class_id?: string;
  status?: SessionStatus;
  date_from?: string;
  date_to?: string;
}
```

- [ ] **Step 8: Create `src/types/attendance.ts`**

```typescript
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  homework_done: boolean;
  notes: string | null;
  student?: { id: string; name: string; grade: string };
  session?: { id: string; date: string; class?: { id: string; name: string } };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateAttendanceDto {
  status?: AttendanceStatus;
  homework_done?: boolean;
  notes?: string;
}

export interface AttendanceQueryParams {
  session_id: string;
}

export interface AttendanceSummaryParams {
  class_id: string;
  date_from: string;
  date_to: string;
}
```

- [ ] **Step 9: Create `src/types/payment.ts`**

```typescript
import type { PaginationParams } from './common';

export interface Payment {
  id: string;
  student_id: string;
  enrollment_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  method: 'CASH' | 'TRANSFER' | 'OTHER' | null;
  notes: string | null;
  student?: { id: string; name: string };
  enrollment?: { id: string; class?: { id: string; name: string } };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentDto {
  student_id: string;
  enrollment_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status?: 'PAID' | 'PENDING' | 'OVERDUE';
  method?: 'CASH' | 'TRANSFER' | 'OTHER';
  notes?: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  due_date?: string;
  paid_date?: string;
  status?: 'PAID' | 'PENDING' | 'OVERDUE';
  method?: 'CASH' | 'TRANSFER' | 'OTHER';
  notes?: string;
}

export interface PaymentQueryParams extends PaginationParams {
  status?: 'PAID' | 'PENDING' | 'OVERDUE';
  student_id?: string;
}
```

- [ ] **Step 10: Create `src/types/payout.ts`**

```typescript
import type { PaginationParams } from './common';

export interface Payout {
  id: string;
  tutor_id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  description: string | null;
  tutor?: { id: string; name: string; bank_name: string | null; bank_account_number: string | null };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayoutDto {
  tutor_id: string;
  amount: number;
  date: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
}

export interface UpdatePayoutDto {
  amount?: number;
  date?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
}

export interface PayoutQueryParams extends PaginationParams {
  tutor_id?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
}
```

- [ ] **Step 11: Create `src/types/expense.ts`**

```typescript
import type { PaginationParams } from './common';

export type ExpenseCategory = 'RENT' | 'UTILITIES' | 'SUPPLIES' | 'MARKETING' | 'OTHER';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseDto {
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  receipt_url?: string;
}

export interface UpdateExpenseDto {
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  description?: string;
  receipt_url?: string;
}

export interface ExpenseQueryParams extends PaginationParams {
  category?: ExpenseCategory;
  date_from?: string;
  date_to?: string;
}
```

- [ ] **Step 12: Create `src/types/dashboard.ts`**

```typescript
export interface DashboardStats {
  total_students: number;
  active_tutors: number;
  total_revenue: number;
  attendance_rate: number;
  upcoming_sessions: number;
}

export interface ActivityItem {
  type: 'enrollment' | 'payment' | 'attendance';
  description: string;
  created_at: string;
}
```

- [ ] **Step 13: Create `src/types/report.ts`**

```typescript
export interface AttendanceReportParams {
  date_from: string;
  date_to: string;
  class_id?: string;
  student_id?: string;
}

export interface FinanceReportParams {
  date_from: string;
  date_to: string;
}

export interface StudentProgressReportParams {
  student_id: string;
  date_from?: string;
  date_to?: string;
}
```

- [ ] **Step 14: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript type definitions for all API domains"
```

---

### Task 3: Create Axios API client with JWT interceptors

**Files:**
- Create: `sinaloka-platform/src/lib/api.ts`

- [ ] **Step 1: Create `src/lib/api.ts`**

```typescript
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Track refresh state to queue concurrent 401 requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
}

// Request interceptor: attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip refresh for login/refresh endpoints or already-retried requests
    if (
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        processQueue(null, data.access_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

Expected: No errors related to `src/lib/api.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add Axios API client with JWT interceptors and token refresh"
```

---

## Chunk 2: Services & React Query Hooks

### Task 4: Create auth service

**Files:**
- Create: `sinaloka-platform/src/services/auth.service.ts`

- [ ] **Step 1: Create `src/services/auth.service.ts`**

```typescript
import api from '@/lib/api';
import type { LoginRequest, TokenResponse, User } from '@/types/auth';

export const authService = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/api/auth/login', data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/api/auth/refresh', { refresh_token }).then((r) => r.data),

  logout: (refresh_token: string) =>
    api.post('/api/auth/logout', { refresh_token }),

  getMe: () =>
    api.get<User>('/api/auth/me').then((r) => r.data),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat: add auth service"
```

---

### Task 5: Create CRUD services for all domains

**Files:**
- Create: `sinaloka-platform/src/services/students.service.ts`
- Create: `sinaloka-platform/src/services/tutors.service.ts`
- Create: `sinaloka-platform/src/services/classes.service.ts`
- Create: `sinaloka-platform/src/services/enrollments.service.ts`
- Create: `sinaloka-platform/src/services/sessions.service.ts`
- Create: `sinaloka-platform/src/services/attendance.service.ts`
- Create: `sinaloka-platform/src/services/payments.service.ts`
- Create: `sinaloka-platform/src/services/payouts.service.ts`
- Create: `sinaloka-platform/src/services/expenses.service.ts`
- Create: `sinaloka-platform/src/services/dashboard.service.ts`
- Create: `sinaloka-platform/src/services/reports.service.ts`

- [ ] **Step 1: Create `src/services/students.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Student, CreateStudentDto, UpdateStudentDto, StudentQueryParams } from '@/types/student';

export const studentsService = {
  getAll: (params?: StudentQueryParams) =>
    api.get<PaginatedResponse<Student>>('/api/admin/students', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Student>(`/api/admin/students/${id}`).then((r) => r.data),

  create: (data: CreateStudentDto) =>
    api.post<Student>('/api/admin/students', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateStudentDto }) =>
    api.patch<Student>(`/api/admin/students/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/students/${id}`),

  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/admin/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  exportCsv: () =>
    api.get('/api/admin/students/export', { responseType: 'blob' }).then((r) => r.data),
};
```

- [ ] **Step 2: Create `src/services/tutors.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Tutor, CreateTutorDto, UpdateTutorDto, TutorQueryParams } from '@/types/tutor';

export const tutorsService = {
  getAll: (params?: TutorQueryParams) =>
    api.get<PaginatedResponse<Tutor>>('/api/admin/tutors', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Tutor>(`/api/admin/tutors/${id}`).then((r) => r.data),

  create: (data: CreateTutorDto) =>
    api.post<Tutor>('/api/admin/tutors', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateTutorDto }) =>
    api.patch<Tutor>(`/api/admin/tutors/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/tutors/${id}`),
};
```

- [ ] **Step 3: Create `src/services/classes.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Class, CreateClassDto, UpdateClassDto, ClassQueryParams } from '@/types/class';

export const classesService = {
  getAll: (params?: ClassQueryParams) =>
    api.get<PaginatedResponse<Class>>('/api/admin/classes', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Class>(`/api/admin/classes/${id}`).then((r) => r.data),

  create: (data: CreateClassDto) =>
    api.post<Class>('/api/admin/classes', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateClassDto }) =>
    api.patch<Class>(`/api/admin/classes/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/classes/${id}`),
};
```

- [ ] **Step 4: Create `src/services/enrollments.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type {
  Enrollment, CreateEnrollmentDto, UpdateEnrollmentDto,
  EnrollmentQueryParams, CheckConflictDto,
} from '@/types/enrollment';

export const enrollmentsService = {
  getAll: (params?: EnrollmentQueryParams) =>
    api.get<PaginatedResponse<Enrollment>>('/api/admin/enrollments', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Enrollment>(`/api/admin/enrollments/${id}`).then((r) => r.data),

  create: (data: CreateEnrollmentDto) =>
    api.post<Enrollment>('/api/admin/enrollments', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateEnrollmentDto }) =>
    api.patch<Enrollment>(`/api/admin/enrollments/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/enrollments/${id}`),

  checkConflict: (data: CheckConflictDto) =>
    api.post('/api/admin/enrollments/check-conflict', data).then((r) => r.data),
};
```

- [ ] **Step 5: Create `src/services/sessions.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type {
  Session, CreateSessionDto, UpdateSessionDto,
  SessionQueryParams, GenerateSessionsDto, ApproveRescheduleDto,
} from '@/types/session';

export const sessionsService = {
  getAll: (params?: SessionQueryParams) =>
    api.get<PaginatedResponse<Session>>('/api/admin/sessions', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Session>(`/api/admin/sessions/${id}`).then((r) => r.data),

  create: (data: CreateSessionDto) =>
    api.post<Session>('/api/admin/sessions', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateSessionDto }) =>
    api.patch<Session>(`/api/admin/sessions/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/sessions/${id}`),

  generate: (data: GenerateSessionsDto) =>
    api.post('/api/admin/sessions/generate', data).then((r) => r.data),

  approveReschedule: ({ id, data }: { id: string; data: ApproveRescheduleDto }) =>
    api.patch(`/api/admin/sessions/${id}/approve`, data).then((r) => r.data),
};
```

- [ ] **Step 6: Create `src/services/attendance.service.ts`**

Note: No create or delete — attendance records are auto-generated with sessions.

```typescript
import api from '@/lib/api';
import type { Attendance, UpdateAttendanceDto, AttendanceQueryParams, AttendanceSummaryParams } from '@/types/attendance';

export const attendanceService = {
  getBySession: (params: AttendanceQueryParams) =>
    api.get<Attendance[]>('/api/admin/attendance', { params }).then((r) => r.data),

  getSummary: (params: AttendanceSummaryParams) =>
    api.get('/api/admin/attendance/summary', { params }).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateAttendanceDto }) =>
    api.patch<Attendance>(`/api/admin/attendance/${id}`, data).then((r) => r.data),
};
```

- [ ] **Step 7: Create `src/services/payments.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Payment, CreatePaymentDto, UpdatePaymentDto, PaymentQueryParams } from '@/types/payment';

export const paymentsService = {
  getAll: (params?: PaymentQueryParams) =>
    api.get<PaginatedResponse<Payment>>('/api/admin/payments', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Payment>(`/api/admin/payments/${id}`).then((r) => r.data),

  create: (data: CreatePaymentDto) =>
    api.post<Payment>('/api/admin/payments', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdatePaymentDto }) =>
    api.patch<Payment>(`/api/admin/payments/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/payments/${id}`),
};
```

- [ ] **Step 8: Create `src/services/payouts.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Payout, CreatePayoutDto, UpdatePayoutDto, PayoutQueryParams } from '@/types/payout';

export const payoutsService = {
  getAll: (params?: PayoutQueryParams) =>
    api.get<PaginatedResponse<Payout>>('/api/admin/payouts', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Payout>(`/api/admin/payouts/${id}`).then((r) => r.data),

  create: (data: CreatePayoutDto) =>
    api.post<Payout>('/api/admin/payouts', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdatePayoutDto }) =>
    api.patch<Payout>(`/api/admin/payouts/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/payouts/${id}`),
};
```

- [ ] **Step 9: Create `src/services/expenses.service.ts`**

```typescript
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Expense, CreateExpenseDto, UpdateExpenseDto, ExpenseQueryParams } from '@/types/expense';

export const expensesService = {
  getAll: (params?: ExpenseQueryParams) =>
    api.get<PaginatedResponse<Expense>>('/api/admin/expenses', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Expense>(`/api/admin/expenses/${id}`).then((r) => r.data),

  create: (data: CreateExpenseDto) =>
    api.post<Expense>('/api/admin/expenses', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateExpenseDto }) =>
    api.patch<Expense>(`/api/admin/expenses/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/admin/expenses/${id}`),
};
```

- [ ] **Step 10: Create `src/services/dashboard.service.ts`**

```typescript
import api from '@/lib/api';
import type { DashboardStats, ActivityItem } from '@/types/dashboard';

export const dashboardService = {
  getStats: () =>
    api.get<DashboardStats>('/api/admin/dashboard/stats').then((r) => r.data),

  getActivity: () =>
    api.get<ActivityItem[]>('/api/admin/dashboard/activity').then((r) => r.data),
};
```

- [ ] **Step 11: Create `src/services/reports.service.ts`**

```typescript
import api from '@/lib/api';
import type { AttendanceReportParams, FinanceReportParams, StudentProgressReportParams } from '@/types/report';

export const reportsService = {
  getAttendanceReport: (params: AttendanceReportParams) =>
    api.get('/api/admin/reports/attendance', { params, responseType: 'blob' }).then((r) => r.data as Blob),

  getFinanceReport: (params: FinanceReportParams) =>
    api.get('/api/admin/reports/finance', { params, responseType: 'blob' }).then((r) => r.data as Blob),

  getStudentProgressReport: (params: StudentProgressReportParams) =>
    api.get('/api/admin/reports/student-progress', { params, responseType: 'blob' }).then((r) => r.data as Blob),
};
```

- [ ] **Step 12: Commit**

```bash
git add src/services/
git commit -m "feat: add service layer for all API domains"
```

---

### Task 6: Create React Query hooks for all domains

**Files:**
- Create: `sinaloka-platform/src/hooks/useStudents.ts`
- Create: `sinaloka-platform/src/hooks/useTutors.ts`
- Create: `sinaloka-platform/src/hooks/useClasses.ts`
- Create: `sinaloka-platform/src/hooks/useEnrollments.ts`
- Create: `sinaloka-platform/src/hooks/useSessions.ts`
- Create: `sinaloka-platform/src/hooks/useAttendance.ts`
- Create: `sinaloka-platform/src/hooks/usePayments.ts`
- Create: `sinaloka-platform/src/hooks/usePayouts.ts`
- Create: `sinaloka-platform/src/hooks/useExpenses.ts`
- Create: `sinaloka-platform/src/hooks/useDashboard.ts`
- Create: `sinaloka-platform/src/hooks/useReports.ts`

- [ ] **Step 1: Create `src/hooks/useStudents.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import type { StudentQueryParams } from '@/types/student';

export function useStudents(params?: StudentQueryParams) {
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useImportStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsService.importCsv,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useExportStudents() {
  return useMutation({
    mutationFn: studentsService.exportCsv,
  });
}
```

- [ ] **Step 2: Create `src/hooks/useTutors.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tutorsService } from '@/services/tutors.service';
import type { TutorQueryParams } from '@/types/tutor';

export function useTutors(params?: TutorQueryParams) {
  return useQuery({
    queryKey: ['tutors', params],
    queryFn: () => tutorsService.getAll(params),
  });
}

export function useTutor(id: string) {
  return useQuery({
    queryKey: ['tutors', id],
    queryFn: () => tutorsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTutor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tutorsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }),
  });
}

export function useUpdateTutor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tutorsService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }),
  });
}

export function useDeleteTutor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tutorsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }),
  });
}
```

- [ ] **Step 3: Create `src/hooks/useClasses.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesService } from '@/services/classes.service';
import type { ClassQueryParams } from '@/types/class';

export function useClasses(params?: ClassQueryParams) {
  return useQuery({
    queryKey: ['classes', params],
    queryFn: () => classesService.getAll(params),
  });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: ['classes', id],
    queryFn: () => classesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: classesService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: classesService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: classesService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });
}
```

- [ ] **Step 4: Create `src/hooks/useEnrollments.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsService } from '@/services/enrollments.service';
import type { EnrollmentQueryParams } from '@/types/enrollment';

export function useEnrollments(params?: EnrollmentQueryParams) {
  return useQuery({
    queryKey: ['enrollments', params],
    queryFn: () => enrollmentsService.getAll(params),
  });
}

export function useEnrollment(id: string) {
  return useQuery({
    queryKey: ['enrollments', id],
    queryFn: () => enrollmentsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrollmentsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function useUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrollmentsService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function useDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrollmentsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function useCheckConflict() {
  return useMutation({ mutationFn: enrollmentsService.checkConflict });
}
```

- [ ] **Step 5: Create `src/hooks/useSessions.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService } from '@/services/sessions.service';
import type { SessionQueryParams } from '@/types/session';

export function useSessions(params?: SessionQueryParams) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionsService.getAll(params),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => sessionsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useGenerateSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsService.generate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useApproveReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsService.approveReschedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
```

- [ ] **Step 6: Create `src/hooks/useAttendance.ts`**

No create/delete — records are auto-generated with sessions.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import type { AttendanceSummaryParams } from '@/types/attendance';

export function useAttendanceBySession(sessionId: string) {
  return useQuery({
    queryKey: ['attendance', sessionId],
    queryFn: () => attendanceService.getBySession({ session_id: sessionId }),
    enabled: !!sessionId,
  });
}

export function useAttendanceSummary(params: AttendanceSummaryParams) {
  return useQuery({
    queryKey: ['attendance', 'summary', params],
    queryFn: () => attendanceService.getSummary(params),
    enabled: !!params.class_id && !!params.date_from && !!params.date_to,
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}
```

- [ ] **Step 7: Create `src/hooks/usePayments.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsService } from '@/services/payments.service';
import type { PaymentQueryParams } from '@/types/payment';

export function usePayments(params?: PaymentQueryParams) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsService.getAll(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}
```

- [ ] **Step 8: Create `src/hooks/usePayouts.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payoutsService } from '@/services/payouts.service';
import type { PayoutQueryParams } from '@/types/payout';

export function usePayouts(params?: PayoutQueryParams) {
  return useQuery({
    queryKey: ['payouts', params],
    queryFn: () => payoutsService.getAll(params),
  });
}

export function usePayout(id: string) {
  return useQuery({
    queryKey: ['payouts', id],
    queryFn: () => payoutsService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useUpdatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutsService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useDeletePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutsService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}
```

- [ ] **Step 9: Create `src/hooks/useExpenses.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesService } from '@/services/expenses.service';
import type { ExpenseQueryParams } from '@/types/expense';

export function useExpenses(params?: ExpenseQueryParams) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesService.getAll(params),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expensesService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expensesService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expensesService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}
```

- [ ] **Step 3: Create `src/hooks/useDashboard.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: dashboardService.getActivity,
  });
}
```

- [ ] **Step 4: Create `src/hooks/useReports.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import type { AttendanceReportParams, FinanceReportParams, StudentProgressReportParams } from '@/types/report';

export function useAttendanceReport(params: AttendanceReportParams, enabled = false) {
  return useQuery({
    queryKey: ['reports', 'attendance', params],
    queryFn: () => reportsService.getAttendanceReport(params),
    enabled,
    staleTime: Infinity,
  });
}

export function useFinanceReport(params: FinanceReportParams, enabled = false) {
  return useQuery({
    queryKey: ['reports', 'finance', params],
    queryFn: () => reportsService.getFinanceReport(params),
    enabled,
    staleTime: Infinity,
  });
}

export function useStudentProgressReport(params: StudentProgressReportParams, enabled = false) {
  return useQuery({
    queryKey: ['reports', 'student-progress', params],
    queryFn: () => reportsService.getStudentProgressReport(params),
    enabled,
    staleTime: Infinity,
  });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/
git commit -m "feat: add React Query hooks for all domains"
```

---

## Chunk 3: Auth UI, App Wiring, Layout

### Task 7: Create AuthContext and auth hook

**Files:**
- Create: `sinaloka-platform/src/contexts/AuthContext.tsx`
- Create: `sinaloka-platform/src/hooks/useAuth.ts`

- [ ] **Step 1: Create `src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import type { User } from '@/types/auth';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authService
      .getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authService.login({ email, password });
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    const profile = await authService.getMe();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // Ignore logout API errors
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Create `src/hooks/useAuth.ts`**

```typescript
import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/ src/hooks/useAuth.ts
git commit -m "feat: add AuthContext and useAuth hook"
```

---

### Task 8: Create Login page

**Files:**
- Create: `sinaloka-platform/src/pages/Login.tsx`

- [ ] **Step 1: Create `src/pages/Login.tsx`**

Build a login page with:
- Centered card layout with the Sinaloka logo/branding
- Email and password inputs using existing `Input` component from `UI.tsx`
- Submit button using existing `Button` component
- Error state for invalid credentials (display message from API error response)
- Loading state on submit button
- `useAuth().login()` on form submit
- `useNavigate()` to redirect to `/` on success
- If already authenticated, redirect to `/` immediately
- Style consistent with existing design (Tailwind, glass effect, dark mode support)

Reference: existing UI components in `src/components/UI.tsx` — use `Input`, `Button`, `Card`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: add Login page"
```

---

### Task 9: Create ProtectedRoute and wire App.tsx

**Files:**
- Create: `sinaloka-platform/src/components/ProtectedRoute.tsx`
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/main.tsx`

- [ ] **Step 1: Create `src/components/ProtectedRoute.tsx`**

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/UI';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Update `src/App.tsx`**

Modify the existing router setup to:
1. Add `/login` route outside the protected wrapper
2. Wrap all existing routes in `<ProtectedRoute>` as a layout route
3. Keep existing `<Layout>` inside the protected route

The structure becomes:
```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<Layout />}>
      {/* ...all existing routes unchanged... */}
    </Route>
  </Route>
</Routes>
```

Add imports for `Login` and `ProtectedRoute`.

- [ ] **Step 3: Update `src/main.tsx`**

Wrap the app with `QueryClientProvider` and `AuthProvider`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Verify app compiles and renders login page**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds. Dev server shows login page at `/`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProtectedRoute.tsx src/App.tsx src/main.tsx
git commit -m "feat: add route protection, QueryClient, AuthProvider, and Toaster"
```

---

### Task 10: Update Layout with auth integration

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Update Layout.tsx**

Changes to make:
1. Import `useAuth` hook
2. Replace hardcoded "AD" avatar initials with `user.name` initials (first letter of first and last name)
3. Add a logout button at the bottom of the sidebar (below the storage card)
4. On logout click: call `auth.logout()`, then `navigate('/login')`
5. Optionally display user name/email in the header or sidebar footer

Find the hardcoded avatar section (look for "AD" text) and replace with dynamic initials derived from `auth.user?.name`.

- [ ] **Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: integrate auth into Layout — dynamic user info and logout"
```

---

## Chunk 4: Page Integration — Dashboard, Students, Tutors, Classes

### Task 11: Integrate Dashboard page

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `useDashboardStats` and `useDashboardActivity` from `@/hooks/useDashboard`
2. Import `toast` from `sonner`
3. Remove all hardcoded mock constants: `REVENUE_SPARKLINE`, `STUDENT_SPARKLINE`, `TUTOR_SPARKLINE`, `CLASS_SPARKLINE`, `REVENUE_HISTORY`, `NOW_NEXT_CLASSES`, `ATTENTION_ITEMS`, `RECENT_ACTIVITY`
4. At component top, call:
   ```typescript
   const { data: stats, isLoading: statsLoading } = useDashboardStats();
   const { data: activity, isLoading: activityLoading } = useDashboardActivity();
   ```
5. Replace stat card values with `stats?.total_students`, `stats?.active_tutors`, `stats?.total_revenue`, `stats?.attendance_rate`
6. Replace activity feed with `activity` array
7. Wrap data-dependent sections in loading checks — show `<Skeleton>` when loading
8. For charts that need historical data not available from the stats endpoint: show the current values from stats and remove sparkline charts that depend on mock time-series data, or keep static placeholder charts. The dashboard endpoint returns current aggregates only.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: integrate Dashboard with backend API"
```

---

### Task 12: Integrate Students page

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import hooks: `useStudents`, `useCreateStudent`, `useUpdateStudent`, `useDeleteStudent`, `useImportStudents`, `useExportStudents` from `@/hooks/useStudents`
2. Import `toast` from `sonner`
3. Remove `INITIAL_STUDENTS` mock data array
4. Add pagination state:
   ```typescript
   const [page, setPage] = useState(1);
   const [limit] = useState(20);
   ```
5. Call `useStudents({ page, limit })` to get paginated data
6. Replace `students` state with `data?.data` from the query
7. Use `data?.meta` for pagination controls (total pages, hasNextPage, etc.)
8. Keep `searchQuery` and `activeFilters` as local state for client-side filtering on `data?.data`
9. Replace form submit in add/edit modal with `createStudent.mutate(formData)` / `updateStudent.mutate({ id, data: formData })`
10. On mutation success: show `toast.success(...)`, close modal
11. On mutation error: show `toast.error(...)` with message from error response
12. Replace delete handler with `deleteStudent.mutate(id)`
13. For bulk delete: iterate `deleteStudent.mutate()` for each selected ID
14. Replace CSV import handler with `importStudents.mutate(file)`
15. Replace CSV export handler with:
    ```typescript
    exportStudents.mutate(undefined, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
    ```
16. Show `<Skeleton>` while `isLoading` is true
17. Update pagination controls to use `setPage` and `data?.meta`

- [ ] **Step 2: Commit**

```bash
git add src/pages/Students.tsx
git commit -m "feat: integrate Students page with backend API"
```

---

### Task 13: Integrate Tutors page

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

Same pattern as Students:
1. Import `useTutors`, `useCreateTutor`, `useUpdateTutor`, `useDeleteTutor` from `@/hooks/useTutors`
2. Remove `INITIAL_TUTORS` mock data
3. Add pagination state, call `useTutors({ page, limit })`
4. Replace form handlers with mutations
5. Add toast notifications for success/error
6. Add loading skeletons
7. Wire pagination controls to `data?.meta`

Note on tutor creation: The backend creates a User account + Tutor record together, requiring `name`, `email`, `password`, and `subjects`. Ensure the add tutor modal includes a password field.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Tutors.tsx
git commit -m "feat: integrate Tutors page with backend API"
```

---

### Task 14: Integrate Classes page

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

Same pattern:
1. Import `useClasses`, `useCreateClass`, `useUpdateClass`, `useDeleteClass`
2. Also import `useTutors` — needed to populate the tutor dropdown in the add/edit class form
3. Remove `INITIAL_CLASSES` mock data
4. Add pagination state, call `useClasses({ page, limit })`
5. For the class creation form: call `useTutors({ limit: 100 })` to get tutor list for the dropdown. Map `tutor_id` field.
6. Replace form handlers with mutations, add toasts, add skeletons

Note: The backend class model uses `fee` (number) and `schedule_days` (string array like `['Monday', 'Wednesday']`) plus `schedule_start_time`/`schedule_end_time` (HH:mm). The frontend mock uses `price`, `schedule` (string like "Mon, Wed, Fri"), and `time` (string like "14:00 - 15:30"). The form must map to the backend shape.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Classes.tsx
git commit -m "feat: integrate Classes page with backend API"
```

---

## Chunk 5: Page Integration — Schedules, Enrollments, Attendance

### Task 15: Integrate Schedules page

**Files:**
- Modify: `sinaloka-platform/src/pages/Schedules.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `useSessions`, `useCreateSession`, `useUpdateSession`, `useDeleteSession`, `useGenerateSessions`, `useApproveReschedule` from `@/hooks/useSessions`
2. Import `useClasses` from `@/hooks/useClasses` — for class dropdown
3. Remove `INITIAL_SESSIONS`, `CLASSES_DATA`, `ROOMS_DATA` mock data
4. Call `useSessions({ page, limit, date_from, date_to, class_id, status })` with filter state
5. Replace the session list with `data?.data`
6. Wire auto-generate button to `generateSessions.mutate({ class_id, date_from, date_to })`
7. Wire reschedule approval to `approveReschedule.mutate({ id, data: { approved: true } })`
8. Replace create/edit/delete handlers with mutations
9. Add toasts and loading states

Note: The frontend mock uses `Date` objects and string times. The backend expects ISO date strings and HH:mm time strings. Ensure date-fns `format()` is used for conversion.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Schedules.tsx
git commit -m "feat: integrate Schedules page with backend API"
```

---

### Task 16: Integrate Enrollments page

**Files:**
- Modify: `sinaloka-platform/src/pages/Enrollments.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `useEnrollments`, `useCreateEnrollment`, `useUpdateEnrollment`, `useDeleteEnrollment`, `useCheckConflict` from `@/hooks/useEnrollments`
2. Import `useStudents` and `useClasses` — for dropdowns in the enrollment form
3. Remove `INITIAL_ENROLLMENTS`, `STUDENTS`, `CLASSES` mock data
4. Call `useEnrollments({ page, limit, status, student_id, class_id })`
5. For the add enrollment form:
   - Load students via `useStudents({ limit: 100 })` for dropdown
   - Load classes via `useClasses({ limit: 100 })` for dropdown
   - Before creating: call `checkConflict.mutate({ student_id, class_id })` and display result
6. Replace handlers with mutations
7. Add toasts and loading states

Note: Backend enrollment status values are uppercase (`ACTIVE`, `TRIAL`, `WAITLISTED`, `DROPPED`) while the frontend mock uses mixed case (`Confirmed`, `Pending`, `Trial`, `Waitlisted`). Update UI display to map backend values.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Enrollments.tsx
git commit -m "feat: integrate Enrollments page with backend API"
```

---

### Task 17: Integrate Attendance page

**Files:**
- Modify: `sinaloka-platform/src/pages/Attendance.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `useAttendanceBySession`, `useAttendanceSummary`, `useUpdateAttendance` from `@/hooks/useAttendance`
2. Import `useSessions` from `@/hooks/useSessions` — to list sessions for selection
3. Remove `INITIAL_SESSIONS` mock data and inline `StudentAttendance`/`Session` types (use imported types instead)
4. Add session selection state — load sessions list, let admin pick a session
5. Call `useAttendanceBySession(selectedSessionId)` to load attendance records for selected session
6. Replace attendance status update with `updateAttendance.mutate({ id, data: { status, homework_done, notes } })`
7. For summary view: call `useAttendanceSummary({ class_id, date_from, date_to })`
8. No create/delete buttons — attendance records are auto-generated
9. Add toasts and loading states

Note: Backend attendance status values are uppercase (`PRESENT`, `ABSENT`, `LATE`) while mock uses mixed case. Map accordingly.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Attendance.tsx
git commit -m "feat: integrate Attendance page with backend API"
```

---

## Chunk 6: Page Integration — Finance, Reports, Settings

### Task 18: Integrate Finance Overview page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `useDashboardStats` from `@/hooks/useDashboard`
2. Remove mock data: `REVENUE_DATA`, `AGING_DATA`, `EXPENSE_DATA`, `SESSION_DETAILS`, hardcoded stat values
3. Call `useDashboardStats()` to get aggregate financial stats
4. Feed `stats.total_revenue` into revenue card
5. For charts that need historical/breakdown data not in the stats endpoint: simplify to show current aggregates, or keep placeholder visualizations with a note they'll be enhanced when the backend adds more detailed financial endpoints
6. Add loading skeletons

- [ ] **Step 2: Commit**

```bash
git add src/pages/Finance/FinanceOverview.tsx
git commit -m "feat: integrate Finance Overview with backend API"
```

---

### Task 19: Integrate Student Payments page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `usePayments`, `useCreatePayment`, `useUpdatePayment`, `useDeletePayment` from `@/hooks/usePayments`
2. Import `useStudents` and `useEnrollments` — for dropdowns in payment form
3. Remove `INITIAL_PAYMENTS` mock data
4. Call `usePayments({ page, limit, status, student_id })`
5. Replace form handlers with mutations
6. Add toasts and loading states

Note: Backend payment has `student_id` and `enrollment_id` (both required on create). The frontend mock uses `student` and `class` names. Map to IDs using data from the query response's nested relations.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Finance/StudentPayments.tsx
git commit -m "feat: integrate Student Payments with backend API"
```

---

### Task 20: Integrate Tutor Payouts page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `usePayouts`, `useCreatePayout`, `useUpdatePayout`, `useDeletePayout` from `@/hooks/usePayouts`
2. Import `useTutors` — for tutor dropdown in payout form
3. Remove all mock data constants (e.g., `MOCK_SESSIONS`, payout arrays — check actual constant names in the file)
4. Call `usePayouts({ page, limit, tutor_id, status })`
5. Replace form handlers with mutations
6. Add toasts and loading states

- [ ] **Step 2: Commit**

```bash
git add src/pages/Finance/TutorPayouts.tsx
git commit -m "feat: integrate Tutor Payouts with backend API"
```

---

### Task 21: Integrate Operating Expenses page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`

- [ ] **Step 1: Replace mock data with API hooks**

1. Import `useExpenses`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense` from `@/hooks/useExpenses`
2. Remove `INITIAL_EXPENSES` and `CATEGORIES` mock data
3. Call `useExpenses({ page, limit, category, date_from, date_to })`
4. Replace form handlers with mutations
5. Add toasts and loading states

Note: Backend `ExpenseCategory` values are uppercase (`RENT`, `UTILITIES`, `SUPPLIES`, `MARKETING`, `OTHER`). The frontend mock includes `Software` and `Maintenance` which don't exist in the backend. Replace the mock `CATEGORIES` array with a hardcoded constant matching the backend enum:
```typescript
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];
```
Display as title case in the UI (e.g., "Rent"), send as uppercase to the API.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Finance/OperatingExpenses.tsx
git commit -m "feat: integrate Operating Expenses with backend API"
```

---

### Task 22: Create Report Preview Modal

**Files:**
- Create: `sinaloka-platform/src/components/ReportPreviewModal.tsx`

- [ ] **Step 1: Create `src/components/ReportPreviewModal.tsx`**

Build a modal component with:
- Report type selector (attendance, finance, student progress) using tabs or dropdown
- Date range inputs (date_from, date_to) — required for all report types
- Optional filter inputs:
  - Class dropdown (for attendance report) — loaded from `useClasses`
  - Student dropdown (for student progress report) — loaded from `useStudents`
- Preview button: sets `enabled=true` on the appropriate `useReport` hook, which fetches the PDF blob
- When blob loads: render in an `<iframe>` using `URL.createObjectURL(blob)`
- Download button: creates a download link from the blob
- Loading spinner while report generates
- Error handling with toast
- Use existing `Modal` component from `UI.tsx`

- [ ] **Step 2: Add "Generate Report" button to Finance Overview**

Modify `src/pages/Finance/FinanceOverview.tsx`:
1. Import `ReportPreviewModal`
2. Add a state: `const [showReportModal, setShowReportModal] = useState(false)`
3. Add a "Generate Report" button in the page header area (next to date range selector)
4. Render `<ReportPreviewModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />`

- [ ] **Step 3: Commit**

```bash
git add src/components/ReportPreviewModal.tsx
git commit -m "feat: add Report Preview Modal with PDF preview and download"
```

---

### Task 23: Update Settings page

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings.tsx`

- [ ] **Step 1: Wire user profile from AuthContext**

1. Import `useAuth` hook
2. In the "General" tab, display `user.name`, `user.email`, `user.institution.name` from auth context
3. In the "Security" tab, keep the UI but note that password change is not yet available via the admin API (out of scope)
4. Keep other tabs as-is (branding, academic, billing, integrations are institution settings not currently exposed via API)

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: integrate Settings page with auth context"
```

---

### Task 24: Final build verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run production build**

```bash
cd sinaloka-platform && npm run build
```

Fix any build errors.

- [ ] **Step 3: Verify dev server**

```bash
cd sinaloka-platform && npm run dev
```

Verify:
- Login page renders at `/`
- After login: dashboard loads with real data
- Navigate to each page: Students, Tutors, Classes, Schedules, Enrollments, Attendance, Finance pages
- Verify CRUD operations work on at least one page (e.g., create a student)
- Verify logout works

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add src/
git commit -m "fix: resolve build issues from integration"
```
