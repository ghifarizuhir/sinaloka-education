# Tutor Frontend–Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data in sinaloka-tutors with real API calls to sinaloka-backend, adding auth, data hooks, and a mapping layer.

**Architecture:** Three new layers in the frontend (API client → Auth context → Data hooks) plus two additive backend endpoints. Frontend types and components stay unchanged (one minor guard fix in ScheduleCard.tsx); a mapper converts between snake_case backend and camelCase frontend.

**Tech Stack:** React 19, Vite 6, Axios, NestJS, Prisma, Zod

**Spec:** `docs/superpowers/specs/2026-03-15-tutor-frontend-backend-integration-design.md`

---

## Chunk 1: Backend Additions

Additive-only changes. No existing methods are modified.

### Task 1: Add CompleteSession DTO

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.dto.ts` (append after line 74)

- [ ] **Step 1: Add CompleteSessionSchema to session.dto.ts**

Append at the end of the file:

```typescript
export const CompleteSessionSchema = z.object({
  topic_covered: z.string().min(1).max(500),
  session_summary: z.string().max(2000).optional().nullable(),
});
export type CompleteSessionDto = z.infer<typeof CompleteSessionSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.dto.ts
git commit -m "feat(backend): add CompleteSessionSchema DTO"
```

---

### Task 2: Add getSessionStudents service method

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts` (append new method after `cancelSession` at line 359)

- [ ] **Step 1: Add import for CompleteSessionDto**

At the top of `session.service.ts`, add `CompleteSessionDto` to the import from `./session.dto.js`:

```typescript
import type {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  GenerateSessionsDto,
  ApproveRescheduleDto,
  RequestRescheduleDto,
  TutorScheduleQueryDto,
  CompleteSessionDto,
} from './session.dto.js';
```

- [ ] **Step 2: Add getSessionStudents method**

Append after the `cancelSession` method (after line 359):

```typescript
  async getSessionStudents(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only view students for your own sessions');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        class_id: session.class_id,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { session_id: sessionId },
    });

    const attendanceMap = new Map(
      attendances.map((a) => [a.student_id, a]),
    );

    return {
      students: enrollments.map((e) => {
        const att = attendanceMap.get(e.student.id);
        return {
          id: e.student.id,
          name: e.student.name,
          grade: e.student.grade,
          attendance: att?.status ?? null,
          homework_done: att?.homework_done ?? false,
          notes: att?.notes ?? null,
        };
      }),
    };
  }
```

- [ ] **Step 3: Add completeSession method**

Append after `getSessionStudents`:

```typescript
  async completeSession(userId: string, sessionId: string, dto: CompleteSessionDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only complete your own sessions');
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only sessions with status SCHEDULED can be completed',
      );
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary ?? null,
      },
      include: { class: true },
    });
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "feat(backend): add getSessionStudents and completeSession service methods"
```

---

### Task 3: Add controller endpoints

**Files:**
- Modify: `sinaloka-backend/src/modules/session/tutor-session.controller.ts`

- [ ] **Step 1: Update imports**

Replace the import block at the top of `tutor-session.controller.ts` with:

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SessionService } from './session.service.js';
import {
  RequestRescheduleSchema,
  TutorScheduleQuerySchema,
  CompleteSessionSchema,
} from './session.dto.js';
import type {
  RequestRescheduleDto,
  TutorScheduleQueryDto,
  CompleteSessionDto,
} from './session.dto.js';
```

- [ ] **Step 2: Add getStudents endpoint**

Add after the `cancel` method (after line 53, before the closing `}`):

```typescript
  @Get(':id/students')
  getStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.getSessionStudents(user.userId, id);
  }

  @Patch(':id/complete')
  complete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CompleteSessionSchema)) dto: CompleteSessionDto,
  ) {
    return this.sessionService.completeSession(user.userId, id, dto);
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/session/tutor-session.controller.ts
git commit -m "feat(backend): add GET students and PATCH complete tutor endpoints"
```

---

## Chunk 2: Frontend Infrastructure

### Task 4: Install axios and configure Vite proxy

**Files:**
- Modify: `sinaloka-tutors/package.json`
- Modify: `sinaloka-tutors/vite.config.ts`

- [ ] **Step 1: Install axios**

Run: `cd sinaloka-tutors && npm install axios`

- [ ] **Step 2: Update package.json dev script port**

The `package.json` dev script hardcodes `--port=3000` which conflicts with the backend. In `sinaloka-tutors/package.json`, replace the dev script:

```json
"dev": "vite --port=5173 --host=0.0.0.0",
```

- [ ] **Step 3: Update Vite dev port and add API proxy**

In `sinaloka-tutors/vite.config.ts`, replace the `server` block (lines 18-22):

```typescript
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
```

- [ ] **Step 4: Verify Vite config is valid**

Run: `cd sinaloka-tutors && npx vite build --mode development 2>&1 | head -5`
Expected: Build starts without config errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-tutors/package.json sinaloka-tutors/package-lock.json sinaloka-tutors/vite.config.ts
git commit -m "feat(tutors): install axios and configure vite proxy to backend"
```

---

### Task 5: Create API client with JWT interceptor

**Files:**
- Create: `sinaloka-tutors/src/api/client.ts`

- [ ] **Step 1: Create the API client**

Create `sinaloka-tutors/src/api/client.ts`:

```typescript
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const REFRESH_TOKEN_KEY = 'sinaloka_refresh_token';

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = response.data;
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    return access_token;
  } catch {
    clearTokens();
    return null;
  }
}

// Request interceptor: attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 with serialized refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Serialize concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — dispatch event for AuthContext to handle
      window.dispatchEvent(new Event('auth:logout'));
    }

    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-tutors/src/api/client.ts
git commit -m "feat(tutors): add axios API client with JWT interceptor and token refresh"
```

---

### Task 6: Create data mappers

**Files:**
- Create: `sinaloka-tutors/src/mappers/index.ts`

- [ ] **Step 1: Create the mapper file**

Create `sinaloka-tutors/src/mappers/index.ts`:

```typescript
import type { ClassSchedule, Payout, Student, TutorProfile } from '../types';

// --- Status mappings ---

const SESSION_STATUS_MAP: Record<string, ClassSchedule['status']> = {
  SCHEDULED: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULE_REQUESTED: 'rescheduled',
};

const PAYOUT_STATUS_MAP: Record<string, Payout['status']> = {
  PENDING: 'pending',
  PROCESSING: 'pending',
  PAID: 'paid',
};

const ATTENDANCE_TO_BACKEND: Record<string, string> = {
  P: 'PRESENT',
  A: 'ABSENT',
  L: 'LATE',
};

const ATTENDANCE_FROM_BACKEND: Record<string, 'P' | 'A' | 'L'> = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
};

// --- Backend → Frontend ---

export function mapSession(raw: any): ClassSchedule {
  return {
    id: raw.id,
    subject: raw.class?.subject ?? '',
    date: new Date(raw.date).toISOString(),
    startTime: raw.start_time,
    endTime: raw.end_time,
    status: SESSION_STATUS_MAP[raw.status] ?? 'upcoming',
    students: [],
    location: raw.class?.room ?? '',
    topicCovered: raw.topic_covered ?? undefined,
    sessionSummary: raw.session_summary ?? undefined,
  };
}

export function mapStudent(raw: any): Student {
  return {
    id: raw.id,
    name: raw.name,
    grade: raw.grade ?? undefined,
    attendance: raw.attendance ? ATTENDANCE_FROM_BACKEND[raw.attendance] : undefined,
    homeworkDone: raw.homework_done ?? false,
    note: raw.notes ?? undefined,
  };
}

export function mapPayout(raw: any): Payout {
  return {
    id: raw.id,
    amount: Number(raw.amount),
    date: new Date(raw.date).toISOString().split('T')[0],
    status: PAYOUT_STATUS_MAP[raw.status] ?? 'pending',
    description: raw.description ?? '',
    proofUrl: raw.proof_url ?? undefined,
  };
}

export function mapProfile(raw: any): TutorProfile {
  return {
    id: raw.id,
    name: raw.user?.name ?? '',
    email: raw.user?.email ?? '',
    subject: raw.subjects?.[0] ?? '',
    rating: raw.rating ?? 0,
    avatar: `https://picsum.photos/seed/${raw.user?.id ?? 'default'}/300/300`,
  };
}

// --- Frontend → Backend ---

export function mapAttendanceToBackend(
  sessionId: string,
  students: Student[],
): { session_id: string; records: any[] } {
  return {
    session_id: sessionId,
    records: students
      .filter((s) => s.attendance !== undefined)
      .map((s) => ({
        student_id: s.id,
        status: ATTENDANCE_TO_BACKEND[s.attendance!],
        homework_done: s.homeworkDone ?? false,
        notes: s.note ?? null,
      })),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-tutors/src/mappers/index.ts
git commit -m "feat(tutors): add backend-frontend data mappers"
```

---

### Task 7: Create AuthContext and useAuth hook

**Files:**
- Create: `sinaloka-tutors/src/contexts/AuthContext.tsx`
- Create: `sinaloka-tutors/src/hooks/useAuth.ts`

- [ ] **Step 1: Create AuthContext**

Create `sinaloka-tutors/src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import api, {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '../api/client';
import type { TutorProfile } from '../types';
import { mapProfile } from '../mappers';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: TutorProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<TutorProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/tutor/profile');
      setProfile(mapProfile(res.data));
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    await fetchProfile();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore — always clear local tokens
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      axios.post('/api/auth/refresh', { refresh_token: refreshToken })
        .then((res) => {
          setAccessToken(res.data.access_token);
          setRefreshToken(res.data.refresh_token);
          return fetchProfile();
        })
        .catch(() => {
          clearTokens();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  // Listen for forced logout from interceptor
  useEffect(() => {
    const handler = () => {
      clearTokens();
      setIsAuthenticated(false);
      setProfile(null);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, profile, login, logout, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Create useAuth hook**

Create `sinaloka-tutors/src/hooks/useAuth.ts`:

```typescript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-tutors/src/contexts/AuthContext.tsx sinaloka-tutors/src/hooks/useAuth.ts
git commit -m "feat(tutors): add AuthContext with JWT token management and useAuth hook"
```

---

### Task 8: Create LoginPage

**Files:**
- Create: `sinaloka-tutors/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create LoginPage component**

Create `sinaloka-tutors/src/pages/LoginPage.tsx`:

```typescript
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Login gagal. Periksa email dan password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-lime-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">
            Sinaloka
          </h1>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">
            Portal Tutor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tutor@example.com"
              className="w-full px-6 py-4 rounded-2xl bg-stone-900 border border-stone-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-6 py-4 rounded-2xl bg-stone-900 border border-stone-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-5 rounded-[24px] shadow-[0_10px_30px_rgba(163,230,53,0.2)] uppercase italic tracking-tighter text-lg flex items-center justify-center gap-3 transition-all"
          >
            <LogIn className="w-6 h-6" />
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-tutors/src/pages/LoginPage.tsx
git commit -m "feat(tutors): add login page with email/password form"
```

---

## Chunk 3: Data Hooks

### Task 9: Create useSchedule hook

**Files:**
- Create: `sinaloka-tutors/src/hooks/useSchedule.ts`

- [ ] **Step 1: Create useSchedule hook**

Create `sinaloka-tutors/src/hooks/useSchedule.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import type { ClassSchedule } from '../types';
import { mapSession } from '../mappers';

type ScheduleFilter = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | undefined;

export function useSchedule(initialFilter?: ScheduleFilter) {
  const [data, setData] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>(initialFilter);

  const fetchSchedule = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (activeFilter) params.status = activeFilter;
      const res = await api.get('/tutor/schedule', { params });
      setData(res.data.data.map(mapSession));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat jadwal');
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const cancelSession = useCallback(async (id: string) => {
    // Optimistic update
    setData((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'cancelled' as const } : s)),
    );
    try {
      await api.patch(`/tutor/schedule/${id}/cancel`);
    } catch (err: any) {
      // Revert
      await fetchSchedule();
      throw err;
    }
  }, [fetchSchedule]);

  const requestReschedule = useCallback(async (
    id: string,
    dto: { proposed_date: string; proposed_start_time: string; proposed_end_time: string; reschedule_reason: string },
  ) => {
    await api.patch(`/tutor/schedule/${id}/request-reschedule`, dto);
    await fetchSchedule();
  }, [fetchSchedule]);

  return {
    data,
    isLoading,
    error,
    activeFilter,
    setFilter: setActiveFilter,
    refetch: fetchSchedule,
    cancelSession,
    requestReschedule,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-tutors/src/hooks/useSchedule.ts
git commit -m "feat(tutors): add useSchedule hook with API filtering and cancel"
```

---

### Task 10: Create usePayouts hook

**Files:**
- Create: `sinaloka-tutors/src/hooks/usePayouts.ts`

- [ ] **Step 1: Create usePayouts hook**

Create `sinaloka-tutors/src/hooks/usePayouts.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import type { Payout } from '../types';
import { mapPayout } from '../mappers';

export function usePayouts() {
  const [data, setData] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/tutor/payouts', { params: { limit: '100' } });
      setData(res.data.data.map(mapPayout));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data payout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  return { data, isLoading, error, refetch: fetchPayouts };
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/hooks/usePayouts.ts
git commit -m "feat(tutors): add usePayouts hook"
```

---

### Task 11: Create useProfile hook

**Files:**
- Create: `sinaloka-tutors/src/hooks/useProfile.ts`

- [ ] **Step 1: Create useProfile hook**

Create `sinaloka-tutors/src/hooks/useProfile.ts`:

```typescript
import { useAuth } from './useAuth';

export function useProfile() {
  const { profile, isLoading, refreshProfile } = useAuth();
  return { data: profile, isLoading, refetch: refreshProfile };
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/hooks/useProfile.ts
git commit -m "feat(tutors): add useProfile hook"
```

---

### Task 12: Create useAttendance hook

**Files:**
- Create: `sinaloka-tutors/src/hooks/useAttendance.ts`

- [ ] **Step 1: Create useAttendance hook**

Create `sinaloka-tutors/src/hooks/useAttendance.ts`:

```typescript
import { useState, useCallback } from 'react';
import api from '../api/client';
import type { Student } from '../types';
import { mapStudent, mapAttendanceToBackend } from '../mappers';

export function useAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/tutor/schedule/${sessionId}/students`);
      setStudents(res.data.students.map(mapStudent));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data siswa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAttendance = useCallback(async (
    sessionId: string,
    studentList: Student[],
    topicCovered: string,
    sessionSummary?: string,
  ) => {
    // Step 1: Submit attendance records
    const payload = mapAttendanceToBackend(sessionId, studentList);
    await api.post('/tutor/attendance', payload);

    // Step 2: Complete the session
    await api.patch(`/tutor/schedule/${sessionId}/complete`, {
      topic_covered: topicCovered,
      session_summary: sessionSummary || null,
    });
  }, []);

  return {
    students,
    setStudents,
    isLoading,
    error,
    fetchStudents,
    submitAttendance,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-tutors/src/hooks/useAttendance.ts
git commit -m "feat(tutors): add useAttendance hook with batch submit and session complete"
```

---

## Chunk 4: App Integration

### Task 13: Fix ScheduleCard empty students guard

**Files:**
- Modify: `sinaloka-tutors/src/components/ScheduleCard.tsx`

The `ScheduleCard` component computes `allAttended = item.students.every(s => s.attendance !== undefined)`. With an empty `students` array (which the mapper returns), `Array.every` returns `true`, hiding the action buttons (Absensi, Atur Ulang, Cancel) for all upcoming sessions.

- [ ] **Step 1: Fix the allAttended guard**

In `sinaloka-tutors/src/components/ScheduleCard.tsx`, replace line 19:

```typescript
  const allAttended = item.students.every(s => s.attendance !== undefined);
```

With:

```typescript
  const allAttended = item.students.length > 0 && item.students.every(s => s.attendance !== undefined);
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/components/ScheduleCard.tsx
git commit -m "fix(tutors): guard allAttended against empty students array"
```

---

### Task 14: Wire App.tsx to real API

This is the largest task. We replace mock data with hooks, add auth gate, and wire filter tabs.

**Files:**
- Modify: `sinaloka-tutors/src/App.tsx`
- Modify: `sinaloka-tutors/src/main.tsx`
- Delete: `sinaloka-tutors/src/mockData.ts`

- [ ] **Step 1: Wrap app with AuthProvider in main.tsx**

Replace `sinaloka-tutors/src/main.tsx` content with:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Rewrite App.tsx imports and state setup**

Replace the entire import block and initial state setup (lines 1-36) with:

```typescript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  ChevronRight,
  Star,
  TrendingUp,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
  LogOut,
  Settings,
  ShieldCheck,
  CreditCard,
  Download,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { ScheduleCard } from './components/ScheduleCard';
import { PayoutCard } from './components/PayoutCard';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import { useSchedule } from './hooks/useSchedule';
import { usePayouts } from './hooks/usePayouts';
import { useAttendance } from './hooks/useAttendance';
import type { ClassSchedule } from './types';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: schedule, isLoading: scheduleLoading, activeFilter, setFilter, refetch: refetchSchedule, cancelSession } = useSchedule();
  const { data: payouts } = usePayouts();
  const { students, setStudents, fetchStudents, submitAttendance } = useAttendance();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [topicCovered, setTopicCovered] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');

  // Fetch students when opening attendance view
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId, fetchStudents]);

  // Auth loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login gate
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const upcomingClasses = schedule.filter((s) => s.status === 'upcoming');
  const pendingPayout = payouts
    .filter((p) => p.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalEarnings = pendingPayout + totalPaid;

  const tutorName = profile?.name ?? 'Tutor';
  const firstName = tutorName.split(' ')[0];
```

- [ ] **Step 3: Replace attendance handlers**

Replace the handler functions (the old `handleToggleAttendance`, `handleToggleHomework`, `handleUpdateTopic`, `handleUpdateSummary`, `handleFinishAttendance`, `handleCancel`, `handleReschedule`, `handleEdit`, and `triggerNotification`) with:

```typescript
  const triggerNotification = (msg: string) => {
    setNotificationMessage(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleToggleAttendance = (classId: string, studentId: string, attendance: 'P' | 'A' | 'L') => {
    setStudents((prev) =>
      prev.map((st) => (st.id === studentId ? { ...st, attendance } : st)),
    );
  };

  const handleToggleHomework = (classId: string, studentId: string) => {
    setStudents((prev) =>
      prev.map((st) =>
        st.id === studentId ? { ...st, homeworkDone: !st.homeworkDone } : st,
      ),
    );
  };

  const selectedClass = selectedClassId
    ? schedule.find((s) => s.id === selectedClassId) ?? null
    : null;

  // Reset topic/summary when opening a new attendance view
  useEffect(() => {
    if (selectedClass) {
      setTopicCovered(selectedClass.topicCovered ?? '');
      setSessionSummary(selectedClass.sessionSummary ?? '');
    }
  }, [selectedClassId]);

  const handleFinishAttendance = async (classId: string) => {
    const allMarked = students.every((s) => s.attendance !== undefined);
    if (!allMarked) {
      triggerNotification('Harap isi semua absensi murid!');
      return;
    }

    if (!topicCovered) {
      triggerNotification('Harap isi topik yang diajarkan!');
      return;
    }

    try {
      await submitAttendance(classId, students, topicCovered, sessionSummary);
      setSelectedClassId(null);
      triggerNotification('Absensi kelas berhasil disimpan!');
      refetchSchedule();
    } catch (err: any) {
      triggerNotification(err?.response?.data?.message || 'Gagal menyimpan absensi');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSession(id);
      triggerNotification('Jadwal berhasil dibatalkan.');
    } catch (err: any) {
      triggerNotification(err?.response?.data?.message || 'Gagal membatalkan jadwal');
    }
  };

  const handleReschedule = (id: string) => {
    triggerNotification('Fitur atur ulang jadwal akan segera hadir!');
  };

  const handleEdit = (id: string) => {
    triggerNotification('Fitur edit detail jadwal akan segera hadir!');
  };
```

- [ ] **Step 4: Update renderAttendanceView to use `students` from hook and local topic/summary state**

Replace the `renderAttendanceView` function. The key changes are:
- Use `students` (from hook state) instead of `cls.students`
- Use `topicCovered`/`sessionSummary` local state instead of `cls.topicCovered`/`cls.sessionSummary`
- Use `selectedClass` instead of `cls`
- Replace hardcoded "Ghifari Zuhir" with `tutorName`

```typescript
  const renderAttendanceView = () => {
    if (!selectedClass) return null;

    const presentCount = students.filter((s) => s.attendance === 'P').length;

    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedClassId(null)}
              className="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none mb-1">{selectedClass.subject}</h1>
              <div className="flex items-center gap-3 text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-stone-800 px-2 py-0.5 rounded text-stone-400">Scheduled</span>
                <span>{tutorName}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter leading-none">{presentCount} / {students.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Present</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="flex flex-wrap gap-4 text-stone-400 text-[10px] font-bold uppercase tracking-widest bg-stone-900/50 p-4 rounded-2xl border border-stone-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3 h-3 text-stone-600" />
            <span>{format(new Date(selectedClass.date), 'EEEE, MMM d, yyyy', { locale: id })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-stone-600" />
            <span>{selectedClass.startTime} - {selectedClass.endTime}</span>
          </div>
        </div>

        {/* Topic & Attachments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-2">Topic Covered</label>
            <input
              type="text"
              value={topicCovered}
              onChange={(e) => setTopicCovered(e.target.value)}
              placeholder="e.g., Algebraic Fractions"
              className="w-full px-6 py-4 rounded-2xl bg-stone-900 border border-stone-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-2">Attachments</label>
            <button className="w-full px-6 py-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center gap-3 text-stone-500 hover:text-white transition-all text-sm font-bold">
              <Download className="w-4 h-4" />
              Upload Lesson Notes
            </button>
          </div>
        </div>

        {/* Student List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">Student List</h3>
            <button
              onClick={() => students.forEach((s) => handleToggleAttendance(selectedClass.id, s.id, 'P'))}
              className="text-[10px] font-black uppercase tracking-widest text-lime-400 hover:text-lime-300"
            >
              Mark All Present
            </button>
          </div>

          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="bg-stone-900 border border-stone-800 rounded-[24px] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white font-black uppercase italic tracking-tighter">{student.name}</h4>
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">{student.grade}</p>
                  </div>
                  <div className="flex gap-1">
                    {(['P', 'A', 'L'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleToggleAttendance(selectedClass.id, student.id, status)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-[10px] font-black transition-all border',
                          student.attendance === status
                            ? status === 'P'
                              ? 'bg-lime-400 border-lime-400 text-black'
                              : status === 'A'
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-orange-400 border-orange-400 text-white'
                            : 'bg-stone-800 border-stone-700 text-stone-500',
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={student.homeworkDone || false}
                      onChange={() => handleToggleHomework(selectedClass.id, student.id)}
                      className="w-4 h-4 rounded border-stone-700 bg-stone-800 text-lime-400 focus:ring-lime-400/20"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">HW Done</span>
                  </div>
                  <button className="text-stone-500 hover:text-white transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Summary */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-2">Session Summary</label>
          <textarea
            value={sessionSummary}
            onChange={(e) => setSessionSummary(e.target.value)}
            placeholder="Enter learning summary, materials taught, or important notes..."
            rows={4}
            className="w-full px-6 py-4 rounded-3xl bg-stone-900 border border-stone-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm resize-none"
          />
        </div>

        {/* Footer Action */}
        <div className="pt-8">
          <button
            onClick={() => handleFinishAttendance(selectedClass.id)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-5 rounded-[24px] shadow-[0_10px_30px_rgba(16,185,129,0.2)] uppercase italic tracking-tighter text-lg flex items-center justify-center gap-3 transition-all"
          >
            <CheckCircle2 className="w-6 h-6" />
            Finalize & Close
          </button>
        </div>
      </div>
    );
  };
```

- [ ] **Step 5: Update renderDashboard**

Replace the `renderDashboard` function. Key changes:
- Replace hardcoded "Ghifari" with `firstName`
- Use dynamic data

```typescript
  const renderDashboard = () => (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Halo, {firstName}!</h1>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Jadwal Mengajar Kamu</p>
        </div>
        <div className="relative">
          <button className="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400">
            <Bell className="w-5 h-5" />
          </button>
          <div className="absolute top-0 right-0 w-3 h-3 bg-lime-400 rounded-full border-2 border-black"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-lime-400 p-5 rounded-[32px] text-black">
          <div className="flex justify-between items-start mb-4">
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Pending</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1">Total Payout</p>
          <p className="text-xl font-black tracking-tighter">Rp {pendingPayout.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-[32px] text-white">
          <div className="flex justify-between items-start mb-4">
            <CalendarIcon className="w-6 h-6 text-lime-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Today</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1 text-stone-400">Sesi Mengajar</p>
          <p className="text-xl font-black tracking-tighter">{upcomingClasses.length} Kelas</p>
        </div>
      </div>

      {/* Today's Schedule Preview */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-black uppercase italic tracking-tighter">Jadwal Hari Ini</h2>
          <button onClick={() => setActiveTab('schedule')} className="text-lime-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {scheduleLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-stone-900 rounded-[24px] h-32 animate-pulse" />
            ))}
          </div>
        ) : upcomingClasses.length > 0 ? (
          upcomingClasses.slice(0, 2).map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              onOpenAttendance={setSelectedClassId}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-[24px] p-8 text-center">
            <p className="text-stone-500 text-sm italic">Gak ada jadwal buat hari ini. <br/>Waktunya istirahat!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-stone-900 border border-stone-800 rounded-[32px] p-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-500 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center gap-3 p-3 rounded-2xl bg-stone-800 hover:bg-stone-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Star className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white">Rating Siswa</span>
          </button>
          <button className="flex items-center gap-3 p-3 rounded-2xl bg-stone-800 hover:bg-stone-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white">Sertifikasi</span>
          </button>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 6: Update renderSchedule with working filter tabs**

Replace the `renderSchedule` function:

```typescript
  const filterOptions = [
    { label: 'Upcoming', value: 'SCHEDULED' as const },
    { label: 'Completed', value: 'COMPLETED' as const },
    { label: 'Cancelled', value: 'CANCELLED' as const },
  ];

  const renderSchedule = () => (
    <div className="space-y-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">Jadwal Mengajar</h1>
        <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Manajemen sesi dan absensi</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(activeFilter === f.value ? undefined : f.value)}
            className={cn(
              'px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all',
              activeFilter === f.value
                ? 'bg-lime-400 text-black'
                : 'bg-stone-900 text-stone-500 border border-stone-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div>
        {scheduleLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-stone-900 rounded-[24px] h-32 animate-pulse" />
            ))}
          </div>
        ) : schedule.length > 0 ? (
          schedule.map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              onOpenAttendance={setSelectedClassId}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-[24px] p-8 text-center">
            <p className="text-stone-500 text-sm italic">Tidak ada jadwal ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
```

- [ ] **Step 7: Update renderPayouts with dynamic totals**

Replace the `renderPayouts` function:

```typescript
  const renderPayouts = () => (
    <div className="space-y-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">Payouts</h1>
        <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Riwayat pendapatan kamu</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-[32px] p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-lime-400 flex items-center justify-center text-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Total Pendapatan</p>
            <p className="text-2xl font-black tracking-tighter text-white">Rp {totalEarnings.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="h-px bg-stone-800 mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Pending</p>
            <p className="text-lg font-black tracking-tighter text-orange-400">Rp {pendingPayout.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Paid</p>
            <p className="text-lg font-black tracking-tighter text-lime-400">Rp {totalPaid.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-500 mb-4 px-2">Transaksi Terakhir</h3>
        {payouts.map((payout) => (
          <PayoutCard key={payout.id} payout={payout} onViewProof={setSelectedProof} />
        ))}
      </div>
    </div>
  );
```

- [ ] **Step 8: Update renderProfile with dynamic data and working logout**

Replace the `renderProfile` function:

```typescript
  const renderProfile = () => (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col items-center text-center pt-8">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-lime-400 shadow-[0_0_40px_rgba(163,230,53,0.3)]">
            <img src={profile?.avatar ?? ''} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-black border-2 border-stone-800 p-2 rounded-2xl">
            <Settings className="w-5 h-5 text-lime-400" />
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-1">{tutorName}</h1>
        <p className="text-lime-400 text-xs font-black uppercase tracking-widest mb-4">{profile?.subject ?? ''} Tutor</p>
        <div className="flex gap-4">
          <div className="bg-stone-900 px-4 py-2 rounded-full border border-stone-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-black">{profile?.rating?.toFixed(1) ?? '0.0'}</span>
          </div>
          <div className="bg-stone-900 px-4 py-2 rounded-full border border-stone-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400" />
            <span className="text-sm font-black tracking-tighter uppercase italic">Verified</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button className="w-full flex items-center justify-between p-5 rounded-[24px] bg-stone-900 border border-stone-800 hover:bg-stone-800 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-lime-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter">Metode Pembayaran</span>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
        <button className="w-full flex items-center justify-between p-5 rounded-[24px] bg-stone-900 border border-stone-800 hover:bg-stone-800 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-lime-400">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter">Pengaturan Akun</span>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-5 rounded-[24px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter text-red-400">Keluar Platform</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400/50" />
        </button>
      </div>
    </div>
  );
```

- [ ] **Step 9: Update toast notification to show dynamic message**

In the return JSX, find the toast notification section and replace the hardcoded text. Find:

```
Notifikasi Berhasil!
```

Replace with:

```
{notificationMessage}
```

- [ ] **Step 10: Delete mockData.ts**

Run: `rm sinaloka-tutors/src/mockData.ts`

- [ ] **Step 11: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 12: Verify Vite builds**

Run: `cd sinaloka-tutors && npx vite build`
Expected: Build succeeds

- [ ] **Step 13: Commit**

```bash
git add -A sinaloka-tutors/src/
git rm sinaloka-tutors/src/mockData.ts 2>/dev/null; true
git commit -m "feat(tutors): integrate frontend with backend API - replace mock data with real API calls"
```

---

## Chunk 5: Manual Verification

### Task 15: End-to-end smoke test

- [ ] **Step 1: Start backend**

Run: `cd sinaloka-backend && npm run start:dev`

- [ ] **Step 2: Start frontend**

Run: `cd sinaloka-tutors && npm run dev`
Verify: Frontend starts on port 5173

- [ ] **Step 3: Test login flow**

Open `http://localhost:5173` in a browser. Verify:
- Login page is shown
- Invalid credentials show error message
- Valid tutor credentials log in and show dashboard

- [ ] **Step 4: Test dashboard**

Verify:
- Tutor name displayed (not hardcoded "Ghifari")
- Payout and class counts reflect real data
- Schedule cards render

- [ ] **Step 5: Test schedule filtering**

Navigate to Schedule tab. Verify:
- Filter buttons toggle between Upcoming/Completed/Cancelled
- Data refreshes on filter change
- Loading skeleton shows during fetch

- [ ] **Step 6: Test attendance flow**

Click "Absensi" on a scheduled session. Verify:
- Students list loads from API
- Can mark P/A/L
- "Finalize & Close" submits attendance and completes session

- [ ] **Step 7: Test payouts**

Navigate to Payouts tab. Verify:
- Total earnings calculated from real data
- Transaction cards render

- [ ] **Step 8: Test profile and logout**

Navigate to Profile tab. Verify:
- Tutor name, subject, rating from API
- Logout button clears session and returns to login
