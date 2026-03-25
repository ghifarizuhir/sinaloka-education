# Sinaloka Parent Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only parent-facing React app that shows linked children's attendance, sessions, payments, and enrollments via the sinaloka-backend API.

**Architecture:** Single-page React app with tab-based navigation (no router needed, same pattern as sinaloka-tutors). AuthContext manages JWT login, hooks fetch data from `/parent/*` endpoints, pages render child cards and detail tabs. Mobile-first design matching the tutors app zinc/lime design system.

**Tech Stack:** React 19, Vite, TailwindCSS v4, Axios, Motion (framer-motion), Lucide icons, date-fns

---

## File Structure

### New Files (all under `sinaloka-parent/`)

```
sinaloka-parent/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  .env.example
  src/
    main.tsx
    App.tsx
    index.css
    types.ts
    lib/utils.ts
    api/client.ts
    contexts/AuthContext.tsx
    hooks/
      useAuth.ts
      useChildren.ts
      useChildDetail.ts
    mappers/index.ts
    pages/
      LoginPage.tsx
      RegisterPage.tsx
      DashboardPage.tsx
      ChildDetailPage.tsx
    components/
      BottomNav.tsx
      ChildCard.tsx
      AttendanceList.tsx
      SessionList.tsx
      PaymentList.tsx
      EnrollmentList.tsx
```

---

## Chunk 1: Project Scaffold & Auth

### Task 1: Project scaffold — config files

**Files:**
- Create: `sinaloka-parent/package.json`
- Create: `sinaloka-parent/tsconfig.json`
- Create: `sinaloka-parent/vite.config.ts`
- Create: `sinaloka-parent/index.html`
- Create: `sinaloka-parent/.env.example`
- Create: `sinaloka-parent/src/index.css`
- Create: `sinaloka-parent/src/lib/utils.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sinaloka-parent",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=5174 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "axios": "^1.13.6",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.5.0",
    "vite": "^6.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>Sinaloka Orang Tua</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create .env.example, index.css, lib/utils.ts**

`.env.example`:
```
VITE_API_URL=http://localhost:3000
```

`src/index.css`:
```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

`src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Install dependencies**

Run: `cd sinaloka-parent && npm install`

- [ ] **Step 7: Commit**

```bash
git add sinaloka-parent/
git commit -m "feat(parent-app): scaffold project with Vite, React, TailwindCSS config"
```

---

### Task 2: Types and mappers

**Files:**
- Create: `sinaloka-parent/src/types.ts`
- Create: `sinaloka-parent/src/mappers/index.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface ChildSummary {
  id: string;
  name: string;
  grade: string;
  status: string;
  enrollment_count: number;
  attendance_rate: number;
  pending_payments: number;
  overdue_payments: number;
  next_session: {
    date: string;
    start_time: string;
    subject: string;
    class_name: string;
  } | null;
  enrollments: { class_name: string; subject: string }[];
}

export interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  homework_done: boolean;
  notes: string | null;
  session: {
    date: string;
    start_time: string;
    end_time: string;
    class: { name: string; subject: string };
  };
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  homework_done: number;
  attendance_rate: number;
  homework_rate: number;
}

export interface SessionRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  topic_covered: string | null;
  session_summary: string | null;
  class: { name: string; subject: string };
}

export interface PaymentRecord {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  method: string | null;
  enrollment: {
    class: { name: string; subject: string };
  };
}

export interface EnrollmentRecord {
  id: string;
  status: string;
  class: {
    name: string;
    subject: string;
    schedule_days: string[];
    schedule_start_time: string;
    schedule_end_time: string;
    fee: number;
    tutor: { user: { name: string } };
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ParentProfile {
  id: string;
  name: string;
  email: string;
}
```

- [ ] **Step 2: Create mappers/index.ts**

```typescript
import type {
  ChildSummary,
  AttendanceRecord,
  SessionRecord,
  PaymentRecord,
  EnrollmentRecord,
  ParentProfile,
} from '../types';

export function mapChild(raw: any): ChildSummary {
  return {
    id: raw.id,
    name: raw.name,
    grade: raw.grade,
    status: raw.status,
    enrollment_count: raw.enrollment_count,
    attendance_rate: raw.attendance_rate,
    pending_payments: raw.pending_payments,
    overdue_payments: raw.overdue_payments,
    next_session: raw.next_session
      ? {
          date: new Date(raw.next_session.date).toISOString(),
          start_time: raw.next_session.start_time,
          subject: raw.next_session.subject,
          class_name: raw.next_session.class_name,
        }
      : null,
    enrollments: raw.enrollments ?? [],
  };
}

export function mapAttendance(raw: any): AttendanceRecord {
  return {
    id: raw.id,
    status: raw.status,
    homework_done: raw.homework_done,
    notes: raw.notes ?? null,
    session: {
      date: new Date(raw.session.date).toISOString(),
      start_time: raw.session.start_time,
      end_time: raw.session.end_time,
      class: raw.session.class,
    },
  };
}

export function mapSession(raw: any): SessionRecord {
  return {
    id: raw.id,
    date: new Date(raw.date).toISOString(),
    start_time: raw.start_time,
    end_time: raw.end_time,
    status: raw.status,
    topic_covered: raw.topic_covered ?? null,
    session_summary: raw.session_summary ?? null,
    class: raw.class,
  };
}

export function mapPayment(raw: any): PaymentRecord {
  return {
    id: raw.id,
    amount: Number(raw.amount),
    due_date: new Date(raw.due_date).toISOString().split('T')[0],
    paid_date: raw.paid_date ? new Date(raw.paid_date).toISOString().split('T')[0] : null,
    status: raw.status,
    method: raw.method ?? null,
    enrollment: raw.enrollment,
  };
}

export function mapEnrollment(raw: any): EnrollmentRecord {
  return {
    id: raw.id,
    status: raw.status,
    class: {
      name: raw.class.name,
      subject: raw.class.subject,
      schedule_days: raw.class.schedule_days,
      schedule_start_time: raw.class.schedule_start_time,
      schedule_end_time: raw.class.schedule_end_time,
      fee: Number(raw.class.fee),
      tutor: { user: { name: raw.class.tutor?.user?.name ?? '' } },
    },
  };
}

export function mapProfile(raw: any): ParentProfile {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/types.ts sinaloka-parent/src/mappers/
git commit -m "feat(parent-app): add types and API response mappers"
```

---

### Task 3: API client and AuthContext

**Files:**
- Create: `sinaloka-parent/src/api/client.ts`
- Create: `sinaloka-parent/src/contexts/AuthContext.tsx`
- Create: `sinaloka-parent/src/hooks/useAuth.ts`

- [ ] **Step 1: Create api/client.ts**

Same as tutors app but with parent-specific refresh token key:

```typescript
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken(): string | null { return accessToken; }

const REFRESH_TOKEN_KEY = 'sinaloka_parent_refresh_token';

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}
export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
    const { access_token, refresh_token } = response.data;
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    return access_token;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 2: Create contexts/AuthContext.tsx**

```typescript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import api, { setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from '../api/client';
import type { ParentProfile } from '../types';
import { mapProfile } from '../mappers';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: ParentProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (token: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ParentProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
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

  const register = useCallback(async (token: string, name: string, password: string) => {
    const res = await api.post('/auth/register/parent', { token, name, password });
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    await fetchProfile();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Always clear local tokens regardless
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      axios.post('/api/auth/refresh', { refresh_token: refreshToken })
        .then((res) => {
          setAccessToken(res.data.access_token);
          setRefreshToken(res.data.refresh_token);
          return fetchProfile();
        })
        .catch(() => clearTokens())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => { clearTokens(); setIsAuthenticated(false); setProfile(null); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, profile, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Create hooks/useAuth.ts**

```typescript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-parent/src/api/ sinaloka-parent/src/contexts/ sinaloka-parent/src/hooks/
git commit -m "feat(parent-app): add API client, AuthContext with register support, useAuth hook"
```

---

### Task 4: Data hooks — useChildren and useChildDetail

**Files:**
- Create: `sinaloka-parent/src/hooks/useChildren.ts`
- Create: `sinaloka-parent/src/hooks/useChildDetail.ts`

- [ ] **Step 1: Create useChildren.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import type { ChildSummary } from '../types';
import { mapChild } from '../mappers';

export function useChildren() {
  const [data, setData] = useState<ChildSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/parent/children');
      setData(res.data.map(mapChild));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data anak');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  return { data, isLoading, error, refetch: fetchChildren };
}
```

- [ ] **Step 2: Create useChildDetail.ts**

```typescript
import { useState, useCallback } from 'react';
import api from '../api/client';
import type {
  AttendanceRecord,
  AttendanceSummary,
  SessionRecord,
  PaymentRecord,
  EnrollmentRecord,
  PaginationMeta,
} from '../types';
import { mapAttendance, mapSession, mapPayment, mapEnrollment } from '../mappers';

export function useChildDetail(studentId: string | null) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'sessions' | 'payments' | 'enrollments'>('attendance');

  const fetchAttendance = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/parent/children/${studentId}/attendance`, { params: { limit: 50 } });
      setAttendance(res.data.data.map(mapAttendance));
      setAttendanceSummary(res.data.summary);
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchSessions = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/parent/children/${studentId}/sessions`, { params: { limit: 50 } });
      setSessions(res.data.data.map(mapSession));
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchPayments = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/parent/children/${studentId}/payments`, { params: { limit: 50 } });
      setPayments(res.data.data.map(mapPayment));
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/parent/children/${studentId}/enrollments`);
      setEnrollments(res.data.map(mapEnrollment));
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  return {
    attendance, attendanceSummary, sessions, payments, enrollments,
    isLoading, activeTab, setActiveTab,
    fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/hooks/
git commit -m "feat(parent-app): add useChildren and useChildDetail data hooks"
```

---

## Chunk 2: Pages & Components

### Task 5: LoginPage and RegisterPage

**Files:**
- Create: `sinaloka-parent/src/pages/LoginPage.tsx`
- Create: `sinaloka-parent/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Create LoginPage.tsx**

Copy from tutors app, change subtitle to "Portal Orang Tua" and placeholder to "parent@example.com":

```typescript
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage({ onSwitchToRegister }: { onSwitchToRegister?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try { await login(email, password); }
    catch (err: any) {
      setError(err?.response?.data?.message || 'Login gagal. Periksa email dan password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Sinaloka</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Portal Orang Tua</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="parent@example.com"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all">
            <LogIn className="w-6 h-6" />
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
        {onSwitchToRegister && (
          <p className="text-center text-zinc-500 text-sm mt-6">
            Punya kode undangan?{' '}
            <button onClick={onSwitchToRegister} className="text-lime-400 font-semibold">Daftar</button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create RegisterPage.tsx**

```typescript
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage({ inviteToken, onSwitchToLogin }: { inviteToken: string; onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try { await register(inviteToken, name, password); }
    catch (err: any) {
      setError(err?.response?.data?.message || 'Pendaftaran gagal.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Sinaloka</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Daftar Akun Orang Tua</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Nama Lengkap</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama Anda"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimal 8 karakter" minLength={8}
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all">
            <UserPlus className="w-6 h-6" />
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>
        <p className="text-center text-zinc-500 text-sm mt-6">
          Sudah punya akun?{' '}
          <button onClick={onSwitchToLogin} className="text-lime-400 font-semibold">Masuk</button>
        </p>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/pages/LoginPage.tsx sinaloka-parent/src/pages/RegisterPage.tsx
git commit -m "feat(parent-app): add LoginPage and RegisterPage"
```

---

### Task 6: BottomNav and ChildCard components

**Files:**
- Create: `sinaloka-parent/src/components/BottomNav.tsx`
- Create: `sinaloka-parent/src/components/ChildCard.tsx`

- [ ] **Step 1: Create BottomNav.tsx**

```typescript
import React from 'react';
import { LayoutDashboard, Users, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'children', label: 'Anak', icon: Users },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 px-6 py-3 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex flex-col items-center gap-1 transition-all duration-300", isActive ? "text-lime-400 scale-110" : "text-zinc-500")}>
              <Icon className={cn("w-6 h-6", isActive && "fill-lime-400/20")} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create ChildCard.tsx**

```typescript
import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { ChildSummary } from '../types';

interface ChildCardProps {
  child: ChildSummary;
  onSelect: (id: string) => void;
}

export function ChildCard({ child, onSelect }: ChildCardProps) {
  const hasPaymentIssue = child.pending_payments > 0 || child.overdue_payments > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(child.id)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-3 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-white">{child.name}</h3>
          <p className="text-zinc-500 text-xs">Kelas {child.grade} · {child.enrollment_count} mata pelajaran</p>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className={`text-lg font-bold ${child.attendance_rate >= 80 ? 'text-lime-400' : child.attendance_rate >= 60 ? 'text-orange-400' : 'text-red-400'}`}>
            {child.attendance_rate}%
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kehadiran</p>
        </div>
        <div className="text-center">
          {child.next_session ? (
            <>
              <div className="text-xs font-semibold text-white">{child.next_session.subject}</div>
              <p className="text-[10px] text-zinc-500">{child.next_session.start_time}</p>
            </>
          ) : (
            <div className="text-xs text-zinc-600">—</div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sesi Berikut</p>
        </div>
        <div className="text-center">
          {hasPaymentIssue ? (
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">{child.pending_payments + child.overdue_payments}</span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-lime-400">Lunas</div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Bayar</p>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/components/
git commit -m "feat(parent-app): add BottomNav and ChildCard components"
```

---

### Task 7: Detail list components

**Files:**
- Create: `sinaloka-parent/src/components/AttendanceList.tsx`
- Create: `sinaloka-parent/src/components/SessionList.tsx`
- Create: `sinaloka-parent/src/components/PaymentList.tsx`
- Create: `sinaloka-parent/src/components/EnrollmentList.tsx`

- [ ] **Step 1: Create AttendanceList.tsx**

```typescript
import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { AttendanceRecord, AttendanceSummary } from '../types';

const STATUS_CONFIG = {
  PRESENT: { icon: CheckCircle2, color: 'text-lime-400', label: 'Hadir' },
  ABSENT: { icon: XCircle, color: 'text-red-400', label: 'Absen' },
  LATE: { icon: Clock, color: 'text-orange-400', label: 'Telat' },
};

export function AttendanceList({ data, summary }: { data: AttendanceRecord[]; summary: AttendanceSummary | null }) {
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-lime-400">{summary.attendance_rate}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kehadiran</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{summary.homework_rate}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">PR Selesai</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{summary.present + summary.absent + summary.late}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Sesi</p>
          </div>
        </div>
      )}
      {data.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">Belum ada data kehadiran.</p>
        </div>
      ) : (
        data.map((record) => {
          const config = STATUS_CONFIG[record.status];
          const Icon = config.icon;
          return (
            <div key={record.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{record.session.class.subject}</p>
                <p className="text-xs text-zinc-500">{format(new Date(record.session.date), 'dd MMM yyyy')} · {record.session.start_time}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                {record.homework_done && <p className="text-[10px] text-lime-400">PR ✓</p>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SessionList.tsx**

```typescript
import React from 'react';
import { Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { SessionRecord } from '../types';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-lime-500/20 text-lime-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

export function SessionList({ data }: { data: SessionRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Belum ada data sesi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((session) => (
        <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-white">{session.class.subject}</p>
              <p className="text-xs text-zinc-500">{format(new Date(session.date), 'dd MMM yyyy')} · {session.start_time}–{session.end_time}</p>
            </div>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", STATUS_COLORS[session.status] ?? 'bg-zinc-800 text-zinc-400')}>
              {session.status}
            </span>
          </div>
          {session.topic_covered && (
            <div className="mt-2 flex items-start gap-2">
              <BookOpen className="w-3 h-3 text-zinc-500 mt-0.5" />
              <p className="text-xs text-zinc-400">{session.topic_covered}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create PaymentList.tsx**

```typescript
import React from 'react';
import { format } from 'date-fns';
import type { PaymentRecord } from '../types';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-lime-500/20 text-lime-400',
  PENDING: 'bg-orange-500/20 text-orange-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Lunas',
  PENDING: 'Belum Bayar',
  OVERDUE: 'Terlambat',
};

export function PaymentList({ data }: { data: PaymentRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Belum ada data pembayaran.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((payment) => (
        <div key={payment.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{payment.enrollment.class.subject}</p>
            <p className="text-xs text-zinc-500">Jatuh tempo: {format(new Date(payment.due_date), 'dd MMM yyyy')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white">Rp {payment.amount.toLocaleString('id-ID')}</p>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", STATUS_COLORS[payment.status])}>
              {STATUS_LABELS[payment.status]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create EnrollmentList.tsx**

```typescript
import React from 'react';
import type { EnrollmentRecord } from '../types';

const DAY_LABELS: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab', Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab', Sunday: 'Min',
};

export function EnrollmentList({ data }: { data: EnrollmentRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Belum ada pendaftaran aktif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((enrollment) => (
        <div key={enrollment.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-white">{enrollment.class.subject}</p>
              <p className="text-xs text-zinc-500">{enrollment.class.name}</p>
            </div>
            <p className="text-sm font-bold text-lime-400">Rp {enrollment.class.fee.toLocaleString('id-ID')}</p>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {enrollment.class.schedule_days.map((day) => (
              <span key={day} className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{DAY_LABELS[day] ?? day}</span>
            ))}
            <span className="text-[10px] text-zinc-500 ml-1">{enrollment.class.schedule_start_time}–{enrollment.class.schedule_end_time}</span>
          </div>
          <p className="text-xs text-zinc-500">Tutor: {enrollment.class.tutor.user.name}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-parent/src/components/
git commit -m "feat(parent-app): add AttendanceList, SessionList, PaymentList, EnrollmentList components"
```

---

### Task 8: DashboardPage and ChildDetailPage

**Files:**
- Create: `sinaloka-parent/src/pages/DashboardPage.tsx`
- Create: `sinaloka-parent/src/pages/ChildDetailPage.tsx`

- [ ] **Step 1: Create DashboardPage.tsx**

```typescript
import React from 'react';
import { Users, GraduationCap } from 'lucide-react';
import { ChildCard } from '../components/ChildCard';
import type { ChildSummary } from '../types';

interface DashboardPageProps {
  firstName: string;
  children: ChildSummary[];
  isLoading: boolean;
  onSelectChild: (id: string) => void;
}

export function DashboardPage({ firstName, children, isLoading, onSelectChild }: DashboardPageProps) {
  const totalPending = children.reduce((acc, c) => acc + c.pending_payments + c.overdue_payments, 0);

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Halo, {firstName}!</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Perkembangan Anak Anda</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-lime-400 p-5 rounded-xl text-black">
          <div className="flex justify-between items-start mb-4">
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Aktif</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1">Anak Terdaftar</p>
          <p className="text-xl font-bold tracking-tight">{children.length} Anak</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-white">
          <div className="flex justify-between items-start mb-4">
            <GraduationCap className="w-6 h-6 text-lime-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1 text-zinc-400">Tagihan Aktif</p>
          <p className={`text-xl font-bold tracking-tight ${totalPending > 0 ? 'text-orange-400' : 'text-lime-400'}`}>
            {totalPending > 0 ? `${totalPending} Tagihan` : 'Lunas'}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Anak Anda</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-zinc-900 rounded-xl h-28 animate-pulse" />)}
          </div>
        ) : children.length > 0 ? (
          children.map((child) => <ChildCard key={child.id} child={child} onSelect={onSelectChild} />)
        ) : (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">Belum ada data anak terhubung.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChildDetailPage.tsx**

```typescript
import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useChildDetail } from '../hooks/useChildDetail';
import { AttendanceList } from '../components/AttendanceList';
import { SessionList } from '../components/SessionList';
import { PaymentList } from '../components/PaymentList';
import { EnrollmentList } from '../components/EnrollmentList';
import type { ChildSummary } from '../types';
import { cn } from '../lib/utils';

interface ChildDetailPageProps {
  child: ChildSummary;
  onBack: () => void;
}

const TABS = [
  { id: 'attendance' as const, label: 'Kehadiran' },
  { id: 'sessions' as const, label: 'Sesi' },
  { id: 'payments' as const, label: 'Bayar' },
  { id: 'enrollments' as const, label: 'Kelas' },
];

export function ChildDetailPage({ child, onBack }: ChildDetailPageProps) {
  const {
    attendance, attendanceSummary, sessions, payments, enrollments,
    isLoading, activeTab, setActiveTab,
    fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
  } = useChildDetail(child.id);

  useEffect(() => {
    switch (activeTab) {
      case 'attendance': fetchAttendance(); break;
      case 'sessions': fetchSessions(); break;
      case 'payments': fetchPayments(); break;
      case 'enrollments': fetchEnrollments(); break;
    }
  }, [activeTab, fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments]);

  return (
    <div className="pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold">{child.name}</h1>
        <p className="text-zinc-500 text-xs">Kelas {child.grade} · {child.enrollment_count} mata pelajaran</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
              activeTab === tab.id ? "bg-lime-400 text-black" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-zinc-900 rounded-lg h-16 animate-pulse" />)}
        </div>
      ) : (
        <>
          {activeTab === 'attendance' && <AttendanceList data={attendance} summary={attendanceSummary} />}
          {activeTab === 'sessions' && <SessionList data={sessions} />}
          {activeTab === 'payments' && <PaymentList data={payments} />}
          {activeTab === 'enrollments' && <EnrollmentList data={enrollments} />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/pages/
git commit -m "feat(parent-app): add DashboardPage and ChildDetailPage"
```

---

### Task 9: App shell — main.tsx and App.tsx

**Files:**
- Create: `sinaloka-parent/src/main.tsx`
- Create: `sinaloka-parent/src/App.tsx`

- [ ] **Step 1: Create main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Create App.tsx**

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChildDetailPage } from './pages/ChildDetailPage';
import { useAuth } from './hooks/useAuth';
import { useChildren } from './hooks/useChildren';
import { LogOut } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: children, isLoading: childrenLoading } = useChildren();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Check URL for invite token
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('token');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (inviteToken || authMode === 'register') {
      return <RegisterPage inviteToken={inviteToken ?? ''} onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthMode('register')} />;
  }

  const parentName = profile?.name ?? 'Orang Tua';
  const firstName = parentName.split(' ')[0];
  const selectedChild = selectedChildId ? children.find((c) => c.id === selectedChildId) ?? null : null;

  const renderPage = () => {
    if (selectedChild) {
      return <ChildDetailPage child={selectedChild} onBack={() => setSelectedChildId(null)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            firstName={firstName}
            children={children}
            isLoading={childrenLoading}
            onSelectChild={setSelectedChildId}
          />
        );
      case 'children':
        return (
          <div className="space-y-4 pb-24">
            <h1 className="text-2xl font-bold tracking-tight">Anak Anda</h1>
            {childrenLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="bg-zinc-900 rounded-xl h-28 animate-pulse" />)}</div>
            ) : (
              children.map((child) => (
                <div key={child.id}>
                  <div className="cursor-pointer" onClick={() => setSelectedChildId(child.id)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                      <h3 className="font-semibold text-white">{child.name}</h3>
                      <p className="text-zinc-500 text-xs">Kelas {child.grade} · Kehadiran {child.attendance_rate}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6 pb-24">
            <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white">{profile?.name}</h2>
              <p className="text-zinc-500 text-sm">{profile?.email}</p>
            </div>
            <button onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl py-4 text-red-400 font-semibold transition-all hover:bg-red-500/10">
              <LogOut className="w-5 h-5" /> Keluar
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-lime-400 selection:text-black overflow-x-hidden">
      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChildId ? `child-${selectedChildId}` : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!selectedChild && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `cd sinaloka-parent && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Verify the dev server starts**

Run: `cd sinaloka-parent && npm run dev`
Expected: Vite dev server starts on port 5174.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-parent/src/main.tsx sinaloka-parent/src/App.tsx
git commit -m "feat(parent-app): add App shell with tab navigation, auth flow, and child detail view"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffold (config files) | package.json, tsconfig, vite.config, index.html, css, utils |
| 2 | Types and mappers | types.ts, mappers/index.ts |
| 3 | API client and AuthContext | api/client.ts, contexts/AuthContext.tsx, hooks/useAuth.ts |
| 4 | Data hooks | hooks/useChildren.ts, hooks/useChildDetail.ts |
| 5 | Login and Register pages | pages/LoginPage.tsx, pages/RegisterPage.tsx |
| 6 | BottomNav and ChildCard | components/BottomNav.tsx, components/ChildCard.tsx |
| 7 | Detail list components | AttendanceList, SessionList, PaymentList, EnrollmentList |
| 8 | Dashboard and ChildDetail pages | pages/DashboardPage.tsx, pages/ChildDetailPage.tsx |
| 9 | App shell (main + App) | main.tsx, App.tsx |
