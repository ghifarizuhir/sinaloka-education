# Sprint 5: Medium Items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 features to the platform: dashboard charts (attendance trend, student growth, revenue vs expenses), bulk operations for tutors, and tutor profile photo upload.

**Architecture:** Backend-first approach — add NestJS endpoints and DTOs, then wire up React frontend. Each item is independent so tasks are grouped by item. All backend endpoints follow existing multi-tenant pattern (tenantId scoping). Frontend follows existing TanStack Query + service layer pattern.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, TanStack Query, Recharts, react-easy-crop, Motion (Framer), TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-22-sprint5-medium-items-design.md`

---

## File Structure

### Item 1: Dashboard Charts
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `sinaloka-backend/src/modules/dashboard/dashboard.service.ts` | 3 new methods: getAttendanceTrend, getStudentGrowth, getRevenueExpenses |
| Modify | `sinaloka-backend/src/modules/dashboard/dashboard.controller.ts` | 3 new GET endpoints |
| Modify | `sinaloka-platform/src/types/dashboard.ts` | New chart data types |
| Modify | `sinaloka-platform/src/services/dashboard.service.ts` | 3 new service methods |
| Modify | `sinaloka-platform/src/hooks/useDashboard.ts` | 3 new query hooks |
| Modify | `sinaloka-platform/src/pages/Dashboard.tsx` | Add chart section with 3 charts |

### Item 2: Bulk Operations Tutors
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `sinaloka-backend/src/modules/tutor/tutor.dto.ts` | 4 new bulk DTOs |
| Modify | `sinaloka-backend/src/modules/tutor/tutor.service.ts` | bulkVerify + bulkDelete methods |
| Modify | `sinaloka-backend/src/modules/invitation/invitation.service.ts` | bulkResendInvite + bulkCancelInvite methods |
| Modify | `sinaloka-backend/src/modules/tutor/tutor.controller.ts` | 4 new bulk endpoints |
| Modify | `sinaloka-platform/src/types/tutor.ts` | avatar_url field on Tutor interface |
| Modify | `sinaloka-platform/src/services/tutors.service.ts` | 4 new bulk service methods |
| Modify | `sinaloka-platform/src/hooks/useTutors.ts` | 4 new mutation hooks |
| Modify | `sinaloka-platform/src/pages/Tutors.tsx` | Checkbox selection, floating bar, confirmation modals |

### Item 3: Profile Photos
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `sinaloka-backend/src/modules/upload/upload.controller.ts` | Add 'avatars' to ALLOWED_UPLOAD_TYPES |
| Modify | `sinaloka-backend/src/modules/tutor/tutor.dto.ts` | Add avatar_url to UpdateTutorProfileSchema |
| Modify | `sinaloka-backend/src/modules/tutor/tutor.service.ts` | Cross-model avatar_url update, add to user select |
| Modify | `sinaloka-backend/src/modules/tutor/tutor-profile.controller.ts` | New POST avatar endpoint for TUTOR role |
| Modify | `sinaloka-platform/src/components/ui/avatar.tsx` | Add src prop with image support |
| Create | `sinaloka-platform/src/components/CropModal.tsx` | Shared crop modal using react-easy-crop |
| Modify | `sinaloka-platform/src/pages/Tutors.tsx` | Pass avatar_url to Avatar, upload in edit modal |
| Modify | `sinaloka-platform/src/services/tutors.service.ts` | uploadAvatar method |
| Modify | `sinaloka-tutors/src/types.ts` | Add avatar_url to TutorProfile |
| Modify | `sinaloka-tutors/src/mappers/index.ts` | Replace picsum with real avatar_url |
| Create | `sinaloka-tutors/src/components/CropModal.tsx` | Crop modal for tutors app |
| Modify | `sinaloka-tutors/src/pages/ProfilePage.tsx` | Real avatar + upload flow |

---

## Item 1: Dashboard Charts

### Task 1: Backend — Dashboard chart endpoints

**Files:**
- Modify: `sinaloka-backend/src/modules/dashboard/dashboard.service.ts:144` (append after getUpcomingSessions)
- Modify: `sinaloka-backend/src/modules/dashboard/dashboard.controller.ts:25` (append before closing brace)

- [ ] **Step 1: Add `getAttendanceTrend` method to dashboard.service.ts**

Append after line 143 (end of `getUpcomingSessions`):

```typescript
  async getAttendanceTrend(institutionId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        session: { date: { gte: sixMonthsAgo } },
      },
      select: { status: true, session: { select: { date: true } } },
    });

    // Group by session month (not created_at — session date is the actual class date)
    const byMonth = new Map<string, { present: number; total: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, { present: 0, total: 0 });
    }

    for (const a of attendances) {
      const key = `${a.session.date.getFullYear()}-${String(a.session.date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byMonth.get(key);
      if (bucket) {
        bucket.total++;
        if (a.status === 'PRESENT' || a.status === 'LATE') bucket.present++;
      }
    }

    return {
      data: Array.from(byMonth.entries()).map(([month, { present, total }]) => ({
        month,
        rate: total > 0 ? Math.round((present / total) * 10000) / 100 : 0,
      })),
    };
  }
```

- [ ] **Step 2: Add `getStudentGrowth` method to dashboard.service.ts**

Append after `getAttendanceTrend`:

```typescript
  async getStudentGrowth(institutionId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Total students created before the window
    const baseCount = await this.prisma.student.count({
      where: {
        institution_id: institutionId,
        created_at: { lt: sixMonthsAgo },
      },
    });

    // Students created within the window
    const newStudents = await this.prisma.student.findMany({
      where: {
        institution_id: institutionId,
        created_at: { gte: sixMonthsAgo },
      },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });

    // Build month buckets
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const countByMonth = new Map(months.map((m) => [m, 0]));
    for (const s of newStudents) {
      const key = `${s.created_at.getFullYear()}-${String(s.created_at.getMonth() + 1).padStart(2, '0')}`;
      if (countByMonth.has(key)) countByMonth.set(key, countByMonth.get(key)! + 1);
    }

    let cumulative = baseCount;
    return {
      data: months.map((month) => {
        cumulative += countByMonth.get(month)!;
        return { month, count: cumulative };
      }),
    };
  }
```

- [ ] **Step 3: Add `getRevenueExpenses` method to dashboard.service.ts**

Append after `getStudentGrowth`:

```typescript
  async getRevenueExpenses(institutionId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          institution_id: institutionId,
          status: 'PAID',
          paid_date: { gte: sixMonthsAgo },
        },
        select: { amount: true, paid_date: true },
      }),
      this.prisma.expense.findMany({
        where: {
          institution_id: institutionId,
          date: { gte: sixMonthsAgo },
        },
        select: { amount: true, date: true },
      }),
    ]);

    // Build month buckets
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const revenueByMonth = new Map(months.map((m) => [m, 0]));
    const expensesByMonth = new Map(months.map((m) => [m, 0]));

    for (const p of payments) {
      if (!p.paid_date) continue;
      const key = `${p.paid_date.getFullYear()}-${String(p.paid_date.getMonth() + 1).padStart(2, '0')}`;
      if (revenueByMonth.has(key)) revenueByMonth.set(key, revenueByMonth.get(key)! + Number(p.amount));
    }

    for (const e of expenses) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      if (expensesByMonth.has(key)) expensesByMonth.set(key, expensesByMonth.get(key)! + Number(e.amount));
    }

    return {
      data: months.map((month) => ({
        month,
        revenue: revenueByMonth.get(month)!,
        expenses: expensesByMonth.get(month)!,
      })),
    };
  }
```

- [ ] **Step 4: Add 3 new endpoints to dashboard.controller.ts**

Add before the closing brace of the class (after line 25):

```typescript
  @Get('attendance-trend')
  getAttendanceTrend(@InstitutionId() institutionId: string) {
    return this.dashboardService.getAttendanceTrend(institutionId);
  }

  @Get('student-growth')
  getStudentGrowth(@InstitutionId() institutionId: string) {
    return this.dashboardService.getStudentGrowth(institutionId);
  }

  @Get('revenue-expenses')
  getRevenueExpenses(@InstitutionId() institutionId: string) {
    return this.dashboardService.getRevenueExpenses(institutionId);
  }
```

- [ ] **Step 5: Build and verify backend**

Run: `cd sinaloka-backend && npm run build`
Expected: Compiles without errors.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/dashboard/
git commit -m "feat(backend): add dashboard chart endpoints — attendance-trend, student-growth, revenue-expenses"
```

---

### Task 2: Frontend — Dashboard chart types, service, hooks

**Files:**
- Modify: `sinaloka-platform/src/types/dashboard.ts`
- Modify: `sinaloka-platform/src/services/dashboard.service.ts`
- Modify: `sinaloka-platform/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add chart types to dashboard.ts**

Append after `UpcomingSession` interface (after line 22):

```typescript

export interface AttendanceTrendPoint {
  month: string;
  rate: number;
}

export interface StudentGrowthPoint {
  month: string;
  count: number;
}

export interface RevenueExpensesPoint {
  month: string;
  revenue: number;
  expenses: number;
}
```

- [ ] **Step 2: Add service methods to dashboard.service.ts**

Add these 3 methods to the `dashboardService` object:

```typescript
  getAttendanceTrend: () =>
    api.get<{ data: AttendanceTrendPoint[] }>('/api/admin/dashboard/attendance-trend').then((r) => r.data),
  getStudentGrowth: () =>
    api.get<{ data: StudentGrowthPoint[] }>('/api/admin/dashboard/student-growth').then((r) => r.data),
  getRevenueExpenses: () =>
    api.get<{ data: RevenueExpensesPoint[] }>('/api/admin/dashboard/revenue-expenses').then((r) => r.data),
```

Update the import line to include the new types:

```typescript
import type { DashboardStats, ActivityItem, UpcomingSession, AttendanceTrendPoint, StudentGrowthPoint, RevenueExpensesPoint } from '@/src/types/dashboard';
```

- [ ] **Step 3: Add hooks to useDashboard.ts**

Append after `useDashboardUpcomingSessions`:

```typescript
export function useDashboardAttendanceTrend() {
  return useQuery({ queryKey: ['dashboard', 'attendance-trend'], queryFn: dashboardService.getAttendanceTrend });
}
export function useDashboardStudentGrowth() {
  return useQuery({ queryKey: ['dashboard', 'student-growth'], queryFn: dashboardService.getStudentGrowth });
}
export function useDashboardRevenueExpenses() {
  return useQuery({ queryKey: ['dashboard', 'revenue-expenses'], queryFn: dashboardService.getRevenueExpenses });
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/dashboard.ts sinaloka-platform/src/services/dashboard.service.ts sinaloka-platform/src/hooks/useDashboard.ts
git commit -m "feat(platform): add dashboard chart types, service methods, and query hooks"
```

---

### Task 3: Frontend — Dashboard chart UI

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add Recharts imports and chart hooks to Dashboard.tsx**

Add to imports at top of file:

```typescript
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
```

Add hook calls inside the component, alongside existing hooks:

```typescript
const { data: attendanceTrend } = useDashboardAttendanceTrend();
const { data: studentGrowth } = useDashboardStudentGrowth();
const { data: revenueExpenses } = useDashboardRevenueExpenses();
```

Import the new hooks:

```typescript
import { useDashboardStats, useDashboardActivity, useDashboardUpcomingSessions, useDashboardAttendanceTrend, useDashboardStudentGrowth, useDashboardRevenueExpenses } from '@/src/hooks/useDashboard';
```

- [ ] **Step 2: Add chart section to Dashboard.tsx**

Insert a new section **after the bento stats grid** and **before the 2/3 + 1/3 activity layout**. The chart section uses the spec layout: Revenue vs Expenses (2/3 width left), Attendance Trend + Student Growth stacked (1/3 width right).

```tsx
{/* Charts Section */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* Revenue vs Expenses — large left */}
  <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
    <h3 className="text-sm font-semibold text-foreground mb-4">{t('dashboard.revenueVsExpenses', 'Revenue vs Expenses')}</h3>
    {revenueExpenses?.data?.length ? (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={revenueExpenses.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)' }} />
          <Legend />
          <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} name={t('dashboard.revenue', 'Revenue')} />
          <Bar dataKey="expenses" fill="var(--chart-4)" radius={[6, 6, 0, 0]} name={t('dashboard.expenses', 'Expenses')} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">{t('dashboard.noData', 'No data yet')}</div>
    )}
  </div>

  {/* Right stack: Attendance + Student Growth */}
  <div className="flex flex-col gap-4">
    {/* Attendance Trend */}
    <div className="bg-card border border-border rounded-2xl p-6 flex-1">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t('dashboard.attendanceTrend', 'Attendance Rate')}</h3>
      {attendanceTrend?.data?.length ? (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={attendanceTrend.data}>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)' }} formatter={(v: number) => `${v}%`} />
            <Line type="monotone" dataKey="rate" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[90px] text-muted-foreground text-sm">{t('dashboard.noData', 'No data yet')}</div>
      )}
    </div>

    {/* Student Growth */}
    <div className="bg-card border border-border rounded-2xl p-6 flex-1">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t('dashboard.studentGrowth', 'Student Growth')}</h3>
      {studentGrowth?.data?.length ? (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={studentGrowth.data}>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)' }} />
            <Line type="monotone" dataKey="count" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[90px] text-muted-foreground text-sm">{t('dashboard.noData', 'No data yet')}</div>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add i18n keys**

In `sinaloka-platform/src/locales/en.json`, add to the `dashboard` namespace:

```json
"revenueVsExpenses": "Revenue vs Expenses",
"revenue": "Revenue",
"expenses": "Expenses",
"attendanceTrend": "Attendance Rate",
"studentGrowth": "Student Growth",
"noData": "No data yet"
```

In `sinaloka-platform/src/locales/id.json`, add to the `dashboard` namespace:

```json
"revenueVsExpenses": "Pendapatan vs Pengeluaran",
"revenue": "Pendapatan",
"expenses": "Pengeluaran",
"attendanceTrend": "Tingkat Kehadiran",
"studentGrowth": "Pertumbuhan Siswa",
"noData": "Belum ada data"
```

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Dashboard.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): add dashboard charts — revenue vs expenses, attendance trend, student growth"
```

---

## Item 2: Bulk Operations Tutors

### Task 4: Backend — Bulk tutor DTOs and service methods

**Files:**
- Modify: `sinaloka-backend/src/modules/tutor/tutor.dto.ts:52` (append)
- Modify: `sinaloka-backend/src/modules/tutor/tutor.service.ts:326` (append)
- Modify: `sinaloka-backend/src/modules/invitation/invitation.service.ts` (append)

- [ ] **Step 1: Add bulk DTOs to tutor.dto.ts**

Append after `UpdateTutorProfileDto` (line 52):

```typescript

export const BulkVerifyTutorSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  is_verified: z.boolean(),
});
export type BulkVerifyTutorDto = z.infer<typeof BulkVerifyTutorSchema>;

export const BulkDeleteTutorSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
export type BulkDeleteTutorDto = z.infer<typeof BulkDeleteTutorSchema>;

export const BulkTutorIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
export type BulkTutorIdsDto = z.infer<typeof BulkTutorIdsSchema>;
```

- [ ] **Step 2: Add `bulkVerify` and `bulkDelete` to tutor.service.ts**

Append after `updateProfile` method (line 325):

```typescript

  async bulkVerify(institutionId: string, ids: string[], isVerified: boolean) {
    const result = await this.prisma.tutor.updateMany({
      where: { id: { in: ids }, institution_id: institutionId },
      data: { is_verified: isVerified },
    });
    return { updated: result.count };
  }

  async bulkDelete(institutionId: string, ids: string[]) {
    // Fetch tutors to get user_ids
    const tutors = await this.prisma.tutor.findMany({
      where: { id: { in: ids }, institution_id: institutionId },
      select: { id: true, user_id: true },
    });

    if (tutors.length === 0) {
      return { deleted: 0 };
    }

    const tutorIds = tutors.map((t) => t.id);
    const userIds = tutors.map((t) => t.user_id);

    await this.prisma.$transaction(async (tx) => {
      await tx.tutorSubject.deleteMany({ where: { tutor_id: { in: tutorIds } } });
      await tx.tutor.deleteMany({ where: { id: { in: tutorIds } } });
      await tx.refreshToken.deleteMany({ where: { user_id: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });

    // Reset plan grace period if count drops below limit
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true, plan_limit_reached_at: true },
    });

    if (institution?.plan_limit_reached_at) {
      const { PLAN_LIMITS } = await import('../../common/constants/plans.js');
      const planConfig = PLAN_LIMITS[institution.plan_type as any];

      const tutorsBelowLimit =
        planConfig.maxTutors === null ||
        (await this.prisma.tutor.count({ where: { institution_id: institutionId } })) < planConfig.maxTutors;

      const studentsBelowLimit =
        planConfig.maxStudents === null ||
        (await this.prisma.student.count({ where: { institution_id: institutionId, status: 'ACTIVE' } })) < planConfig.maxStudents;

      if (tutorsBelowLimit && studentsBelowLimit) {
        await this.prisma.institution.update({
          where: { id: institutionId },
          data: { plan_limit_reached_at: null },
        });
      }
    }

    return { deleted: tutors.length };
  }
```

- [ ] **Step 3: Add `bulkResendInvite` and `bulkCancelInvite` to invitation.service.ts**

Append at end of `InvitationService` class:

```typescript

  async bulkResendInvite(institutionId: string, ids: string[]) {
    let sent = 0;
    for (const id of ids) {
      try {
        await this.resendInvite(institutionId, id);
        sent++;
      } catch {
        // Skip tutors that fail (already active, not found, etc.)
      }
    }
    return { sent };
  }

  async bulkCancelInvite(institutionId: string, ids: string[]) {
    let cancelled = 0;
    for (const id of ids) {
      try {
        await this.cancelInvite(institutionId, id);
        cancelled++;
      } catch {
        // Skip tutors that fail (already active, not found, etc.)
      }
    }
    return { cancelled };
  }
```

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-backend && npm run build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/tutor/ sinaloka-backend/src/modules/invitation/
git commit -m "feat(backend): add bulk tutor operations — verify, delete, resend-invite, cancel-invite"
```

---

### Task 5: Backend — Bulk tutor controller endpoints

**Files:**
- Modify: `sinaloka-backend/src/modules/tutor/tutor.controller.ts`

- [ ] **Step 1: Add bulk endpoint imports**

Update imports at top of `tutor.controller.ts`:

Add to the DTO imports:

```typescript
import {
  CreateTutorSchema,
  UpdateTutorSchema,
  TutorQuerySchema,
  BulkVerifyTutorSchema,
  BulkDeleteTutorSchema,
  BulkTutorIdsSchema,
} from './tutor.dto.js';
import type {
  CreateTutorDto,
  UpdateTutorDto,
  TutorQueryDto,
  BulkVerifyTutorDto,
  BulkDeleteTutorDto,
  BulkTutorIdsDto,
} from './tutor.dto.js';
```

- [ ] **Step 2: Add 4 bulk endpoints**

Add these endpoints **after `invite` and before the `:id` routes** (after line 65, before `@Post(':id/resend-invite')`). This is critical — NestJS matches routes top-to-bottom, so `/bulk` must come before `/:id`.

```typescript
  @Patch('bulk')
  async bulkVerify(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BulkVerifyTutorSchema)) dto: BulkVerifyTutorDto,
  ) {
    return this.tutorService.bulkVerify(institutionId, dto.ids, dto.is_verified);
  }

  @Delete('bulk')
  async bulkDelete(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BulkDeleteTutorSchema)) dto: BulkDeleteTutorDto,
  ) {
    return this.tutorService.bulkDelete(institutionId, dto.ids);
  }

  @Post('bulk/resend-invite')
  async bulkResendInvite(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BulkTutorIdsSchema)) dto: BulkTutorIdsDto,
  ) {
    return this.invitationService.bulkResendInvite(institutionId, dto.ids);
  }

  @Post('bulk/cancel-invite')
  async bulkCancelInvite(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BulkTutorIdsSchema)) dto: BulkTutorIdsDto,
  ) {
    return this.invitationService.bulkCancelInvite(institutionId, dto.ids);
  }
```

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-backend && npm run build`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/tutor/tutor.controller.ts
git commit -m "feat(backend): add bulk tutor controller endpoints"
```

---

### Task 6: Frontend — Bulk tutor service, hooks, and types

**Files:**
- Modify: `sinaloka-platform/src/types/tutor.ts`
- Modify: `sinaloka-platform/src/services/tutors.service.ts`
- Modify: `sinaloka-platform/src/hooks/useTutors.ts`

- [ ] **Step 1: Add `avatar_url` and `user` to Tutor interface**

In `sinaloka-platform/src/types/tutor.ts`, add `avatar_url` to the `Tutor` interface after `email`:

```typescript
  avatar_url: string | null;
```

Add to `Tutor` interface after `updated_at`:

```typescript
  user?: { id: string; is_active: boolean };
```

Add `avatar_url` to `UpdateTutorDto` interface (after `monthly_salary`):

```typescript
  avatar_url?: string | null;
```

- [ ] **Step 2: Add bulk methods to tutors.service.ts**

Append to the `tutorsService` object:

```typescript
  bulkVerify: (data: { ids: string[]; is_verified: boolean }) =>
    api.patch<{ updated: number }>('/api/admin/tutors/bulk', data).then((r) => r.data),
  bulkDelete: (ids: string[]) =>
    api.delete<{ deleted: number }>('/api/admin/tutors/bulk', { data: { ids } }).then((r) => r.data),
  bulkResendInvite: (ids: string[]) =>
    api.post<{ sent: number }>('/api/admin/tutors/bulk/resend-invite', { ids }).then((r) => r.data),
  bulkCancelInvite: (ids: string[]) =>
    api.post<{ cancelled: number }>('/api/admin/tutors/bulk/cancel-invite', { ids }).then((r) => r.data),
```

- [ ] **Step 3: Add bulk hooks to useTutors.ts**

Append after `useCancelInvite`:

```typescript
export function useBulkVerifyTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkVerify, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkDeleteTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkDelete, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkResendInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkResendInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkCancelInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkCancelInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/tutor.ts sinaloka-platform/src/services/tutors.service.ts sinaloka-platform/src/hooks/useTutors.ts
git commit -m "feat(platform): add bulk tutor service methods and mutation hooks"
```

---

### Task 7: Frontend — Tutors page bulk operations UI

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

This is the largest frontend task. Add checkbox selection to both grid and list views, a floating action bar, and confirmation modals.

- [ ] **Step 1: Add state and imports**

Add imports at top of `Tutors.tsx`:

```typescript
import { AnimatePresence, motion } from 'motion/react';
import { useBulkVerifyTutor, useBulkDeleteTutor, useBulkResendInvite, useBulkCancelInvite } from '@/src/hooks/useTutors';
```

Inside the `Tutors` component, add state:

```typescript
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
const [bulkCancelConfirm, setBulkCancelConfirm] = useState(false);

const bulkVerify = useBulkVerifyTutor();
const bulkDelete = useBulkDeleteTutor();
const bulkResendInvite = useBulkResendInvite();
const bulkCancelInvite = useBulkCancelInvite();

// Get the current tutor list from query data
const tutorList: Tutor[] = tutorsData?.data ?? [];

// Selection helpers
const toggleSelect = (id: string) =>
  setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
const toggleSelectAll = () =>
  setSelectedIds((prev) => prev.length === tutorList.length ? [] : tutorList.map((t) => t.id));

// Compute which actions are available for the selection
const selectedTutors = tutorList.filter((t) => selectedIds.includes(t.id));
const hasPending = selectedTutors.some((t) => t.user && !t.user.is_active);
const verifiedCount = selectedTutors.filter((t) => t.is_verified).length;
const shouldVerify = verifiedCount <= selectedTutors.length / 2; // majority unverified → show Verify; tie → Verify
```

- [ ] **Step 2: Add checkboxes to grid view tutor cards**

In the grid view, add a select-all checkbox in the grid header area (near the view mode toggle or search bar):

```tsx
<label className="flex items-center gap-2 text-sm text-muted-foreground">
  <input
    type="checkbox"
    className="w-4 h-4 accent-primary cursor-pointer"
    checked={selectedIds.length === tutorList.length && tutorList.length > 0}
    onChange={toggleSelectAll}
  />
  {t('common.selectAll', 'Select all')}
</label>
```

Then add a checkbox overlay at the top-right of each tutor card:

```tsx
<input
  type="checkbox"
  className="absolute top-3 right-3 w-4 h-4 accent-primary cursor-pointer"
  checked={selectedIds.includes(tutor.id)}
  onChange={() => toggleSelect(tutor.id)}
/>
```

Make the card container `relative` if not already.

- [ ] **Step 3: Add checkboxes to list view table rows**

In the list/table view, add a checkbox column. Add a header checkbox for select-all:

```tsx
<th className="w-10 px-3">
  <input
    type="checkbox"
    className="w-4 h-4 accent-primary cursor-pointer"
    checked={selectedIds.length === tutorList.length && tutorList.length > 0}
    onChange={toggleSelectAll}
  />
</th>
```

And in each row:

```tsx
<td className="w-10 px-3">
  <input
    type="checkbox"
    className="w-4 h-4 accent-primary cursor-pointer"
    checked={selectedIds.includes(tutor.id)}
    onChange={() => toggleSelect(tutor.id)}
  />
</td>
```

- [ ] **Step 4: Add floating action bar**

Add before the closing `</div>` of the page, same pattern as Enrollments:

```tsx
{/* Bulk Actions Floating Bar */}
<AnimatePresence>
  {selectedIds.length > 0 && (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 dark:border-black/10">
        <div className="flex items-center gap-2 border-r border-white/20 dark:border-black/20 pr-4">
          <span className="text-sm font-bold">{selectedIds.length}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">{t('common.selected')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-8 px-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 text-xs font-medium hover:bg-white/20 dark:hover:bg-black/20 transition-colors disabled:opacity-40"
            disabled={bulkVerify.isPending}
            onClick={() => bulkVerify.mutateAsync({ ids: selectedIds, is_verified: shouldVerify }).then(() => { setSelectedIds([]); toast.success(t('tutors.bulk.verifySuccess', 'Tutors updated')); })}
          >
            {shouldVerify ? t('tutors.bulk.verify', 'Verify') : t('tutors.bulk.unverify', 'Unverify')}
          </button>
          <button
            className="h-8 px-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 text-xs font-medium hover:bg-white/20 dark:hover:bg-black/20 transition-colors disabled:opacity-40"
            disabled={!hasPending || bulkResendInvite.isPending}
            onClick={() => bulkResendInvite.mutateAsync(selectedIds).then(() => { setSelectedIds([]); toast.success(t('tutors.bulk.resendSuccess', 'Invites resent')); })}
          >
            {t('tutors.bulk.resendInvite', 'Resend Invite')}
          </button>
          <button
            className="h-8 px-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 text-xs font-medium hover:bg-white/20 dark:hover:bg-black/20 transition-colors disabled:opacity-40"
            disabled={!hasPending || bulkCancelInvite.isPending}
            onClick={() => setBulkCancelConfirm(true)}
          >
            {t('tutors.bulk.cancelInvite', 'Cancel Invite')}
          </button>
          <button
            className="h-8 px-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium hover:bg-red-500/30 transition-colors"
            onClick={() => setBulkDeleteConfirm(true)}
          >
            {t('common.delete', 'Delete')}
          </button>
        </div>
        <button
          onClick={() => setSelectedIds([])}
          className="p-1 hover:bg-white/10 dark:hover:bg-black/5 rounded-full transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 5: Add confirmation modals**

Add two confirmation modals for destructive actions:

```tsx
{/* Bulk Delete Confirmation */}
{bulkDeleteConfirm && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-2">{t('tutors.bulk.deleteTitle', 'Delete Tutors')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('tutors.bulk.deleteWarning', 'Are you sure you want to delete {{count}} tutor(s)? This action cannot be undone.', { count: selectedIds.length })}
      </p>
      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted" onClick={() => setBulkDeleteConfirm(false)}>{t('common.cancel', 'Cancel')}</button>
        <button
          className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          disabled={bulkDelete.isPending}
          onClick={() => bulkDelete.mutateAsync(selectedIds).then(() => { setSelectedIds([]); setBulkDeleteConfirm(false); toast.success(t('tutors.bulk.deleteSuccess', 'Tutors deleted')); })}
        >
          {bulkDelete.isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
        </button>
      </div>
    </div>
  </div>
)}

{/* Bulk Cancel Invite Confirmation */}
{bulkCancelConfirm && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-2">{t('tutors.bulk.cancelInviteTitle', 'Cancel Invitations')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('tutors.bulk.cancelInviteWarning', 'Cancelling invitations will permanently delete the selected pending tutors and all their associated data (classes, sessions, enrollments). This cannot be undone.')}
      </p>
      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted" onClick={() => setBulkCancelConfirm(false)}>{t('common.cancel', 'Cancel')}</button>
        <button
          className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          disabled={bulkCancelInvite.isPending}
          onClick={() => bulkCancelInvite.mutateAsync(selectedIds).then(() => { setSelectedIds([]); setBulkCancelConfirm(false); toast.success(t('tutors.bulk.cancelInviteSuccess', 'Invitations cancelled')); })}
        >
          {bulkCancelInvite.isPending ? t('common.processing', 'Processing...') : t('tutors.bulk.confirmCancel', 'Cancel Invitations')}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Clear selection when query params change**

Add a `useEffect` to clear selection when filter/search changes:

```typescript
useEffect(() => { setSelectedIds([]); }, [search, subjectFilter, sortBy]);
```

- [ ] **Step 7: Add i18n keys for bulk operations**

In `en.json`, add to the `tutors` namespace:

```json
"bulk": {
  "verify": "Verify",
  "unverify": "Unverify",
  "verifySuccess": "Tutors updated",
  "resendInvite": "Resend Invite",
  "resendSuccess": "Invites resent",
  "cancelInvite": "Cancel Invite",
  "cancelInviteTitle": "Cancel Invitations",
  "cancelInviteWarning": "Cancelling invitations will permanently delete the selected pending tutors and all their associated data (classes, sessions, enrollments). This cannot be undone.",
  "cancelInviteSuccess": "Invitations cancelled",
  "confirmCancel": "Cancel Invitations",
  "deleteTitle": "Delete Tutors",
  "deleteWarning": "Are you sure you want to delete {{count}} tutor(s)? This action cannot be undone.",
  "deleteSuccess": "Tutors deleted"
}
```

In `id.json`, add to the `tutors` namespace:

```json
"bulk": {
  "verify": "Verifikasi",
  "unverify": "Batalkan Verifikasi",
  "verifySuccess": "Tutor diperbarui",
  "resendInvite": "Kirim Ulang Undangan",
  "resendSuccess": "Undangan terkirim",
  "cancelInvite": "Batalkan Undangan",
  "cancelInviteTitle": "Batalkan Undangan",
  "cancelInviteWarning": "Membatalkan undangan akan menghapus permanen tutor yang dipilih beserta semua data terkait (kelas, sesi, pendaftaran). Tindakan ini tidak bisa dibatalkan.",
  "cancelInviteSuccess": "Undangan dibatalkan",
  "confirmCancel": "Batalkan Undangan",
  "deleteTitle": "Hapus Tutor",
  "deleteWarning": "Apakah Anda yakin ingin menghapus {{count}} tutor? Tindakan ini tidak bisa dibatalkan.",
  "deleteSuccess": "Tutor dihapus"
}
```

- [ ] **Step 8: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Compiles without errors.

- [ ] **Step 9: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): add bulk operations UI for tutors — select, verify, delete, invite actions"
```

---

## Item 3: Profile Photos

### Task 8: Backend — Avatar upload support

**Files:**
- Modify: `sinaloka-backend/src/modules/upload/upload.controller.ts:19`
- Modify: `sinaloka-backend/src/modules/tutor/tutor.service.ts` (findAll, findOne, update, getProfile, updateProfile user selects)
- Modify: `sinaloka-backend/src/modules/tutor/tutor.dto.ts:46-51`
- Modify: `sinaloka-backend/src/modules/tutor/tutor-profile.controller.ts`

- [ ] **Step 1: Add 'avatars' to allowed upload types**

In `upload.controller.ts` line 19, change:

```typescript
const ALLOWED_UPLOAD_TYPES = ['receipts', 'proofs', 'logos'];
```

to:

```typescript
const ALLOWED_UPLOAD_TYPES = ['receipts', 'proofs', 'logos', 'avatars'];
```

- [ ] **Step 2: Add `avatar_url` to all user selects in tutor.service.ts**

There are 6 places in `tutor.service.ts` where user is selected with `{ id, name, email, role, is_active }`. Add `avatar_url: true` to each:

Find all occurrences of:
```typescript
select: {
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
},
```

Replace with:
```typescript
select: {
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
  avatar_url: true,
},
```

This appears in: `create` (line 74-79), `findAll` (line 140-145), `findOne` (line 165-170), `update` (line 220-225), `getProfile` (line 281-286), `updateProfile` (line 314-319).

- [ ] **Step 3: Add avatar_url update logic to `update` method**

In `tutor.service.ts`, in the `update` method (around line 199-205), after the existing `if (dto.name !== undefined)` block, add:

```typescript
    // If avatar_url is updated, also update the user record
    if (dto.avatar_url !== undefined) {
      await this.prisma.user.update({
        where: { id: existing.user_id },
        data: { avatar_url: dto.avatar_url },
      });
    }
```

- [ ] **Step 4: Add avatar_url to UpdateTutorSchema and UpdateTutorProfileSchema**

In `tutor.dto.ts`, add to `UpdateTutorSchema` (after `monthly_salary` line 26):

```typescript
  avatar_url: z.string().max(500).optional().nullable(),
```

Add to `UpdateTutorProfileSchema` (after `bank_account_holder` line 50):

```typescript
  avatar_url: z.string().max(500).optional().nullable(),
```

- [ ] **Step 5: Add avatar_url update logic to `updateProfile` method**

In `tutor.service.ts`, in the `updateProfile` method, add after destructuring `dto` (line 302):

```typescript
    // If avatar_url is updated, update the user record (avatar_url lives on User, not Tutor)
    if (dto.avatar_url !== undefined) {
      await this.prisma.user.update({
        where: { id: tutor.user_id },
        data: { avatar_url: dto.avatar_url },
      });
    }
```

- [ ] **Step 6: Add tutor avatar upload endpoint to tutor-profile.controller.ts**

Add imports:

```typescript
import { Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../upload/upload.service.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
```

Update constructor:

```typescript
constructor(
  private readonly tutorService: TutorService,
  private readonly uploadService: UploadService,
) {}
```

Add new endpoint after `updateProfile`:

```typescript
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @InstitutionId() institutionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.uploadService.saveFile(file, institutionId, 'avatars');
    // Update user's avatar_url (avatar_url is added to UpdateTutorProfileSchema in Task 8 Step 4)
    await this.tutorService.updateProfile(user.userId, { avatar_url: url });
    return { url };
  }
```

Add `BadRequestException` to imports from `@nestjs/common`.

- [ ] **Step 7: Register UploadModule in TutorModule**

Check if `UploadModule` needs to be imported in `TutorModule` for the `UploadService` dependency. If `UploadService` is not already available, add `UploadModule` to the `TutorModule` imports array in `sinaloka-backend/src/modules/tutor/tutor.module.ts`.

- [ ] **Step 8: Build and verify**

Run: `cd sinaloka-backend && npm run build`
Expected: Compiles without errors.

- [ ] **Step 9: Commit**

```bash
git add sinaloka-backend/src/modules/tutor/ sinaloka-backend/src/modules/upload/
git commit -m "feat(backend): add avatar upload support — avatars upload type, tutor avatar endpoint, avatar_url in responses"
```

---

### Task 9: Frontend — Avatar component upgrade + CropModal

**Files:**
- Modify: `sinaloka-platform/src/components/ui/avatar.tsx`
- Create: `sinaloka-platform/src/components/CropModal.tsx`

- [ ] **Step 1: Install react-easy-crop in platform**

Run: `cd sinaloka-platform && npm install react-easy-crop`

- [ ] **Step 2: Upgrade Avatar component**

Replace `sinaloka-platform/src/components/ui/avatar.tsx` with:

```tsx
import { useState } from 'react';
import { cn } from '../../lib/utils';

export const Avatar = ({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const [imgError, setImgError] = useState(false);
  const initial = name.split(' ').pop()?.charAt(0)?.toUpperCase() ?? '?';
  const sizes = {
    sm: 'w-8 h-8 rounded-full text-xs bg-muted text-muted-foreground',
    md: 'w-10 h-10 rounded-xl text-sm bg-primary text-primary-foreground',
    lg: 'w-16 h-16 rounded-2xl text-2xl shadow-lg bg-primary text-primary-foreground',
  };

  if (src && !imgError) {
    return (
      <img
        src={src.startsWith('http') ? src : `${import.meta.env.VITE_API_URL}/api/uploads/${src}`}
        alt={name}
        onError={() => setImgError(true)}
        className={cn("object-cover flex-shrink-0", sizes[size], className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center justify-center font-bold flex-shrink-0", sizes[size], className)}>
      {initial}
    </div>
  );
};
```

Key change: if `src` is a relative path (like `institutionId/avatars/uuid.jpg`), prefix with `VITE_API_URL/api/uploads/`. If it starts with `http`, use as-is.

- [ ] **Step 3: Create CropModal component**

Create `sinaloka-platform/src/components/CropModal.tsx`:

```tsx
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';

interface CropModalProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

export function CropModal({ imageSrc, onCrop, onClose }: CropModalProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    const image = new Image();
    image.src = imageSrc;
    await new Promise((r) => (image.onload = r));

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0, 500, 500,
    );

    canvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden">
        <div className="relative h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1} max={3} step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90" onClick={handleSave}>
              {t('common.save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/components/ui/avatar.tsx sinaloka-platform/src/components/CropModal.tsx sinaloka-platform/package.json sinaloka-platform/package-lock.json
git commit -m "feat(platform): upgrade Avatar component with image support, add CropModal"
```

---

### Task 10: Frontend — Platform tutor avatar upload

**Files:**
- Modify: `sinaloka-platform/src/services/tutors.service.ts`
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Add uploadAvatar to tutors.service.ts**

Add to the `tutorsService` object:

```typescript
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/api/uploads/avatars', formData).then((r) => r.data.url);
  },
```

- [ ] **Step 2: Update flattenTutor to include avatar_url**

In `tutors.service.ts`, update `flattenTutor`:

```typescript
function flattenTutor(raw: any): Tutor {
  return {
    ...raw,
    name: raw.name || raw.user?.name || '',
    email: raw.email || raw.user?.email || '',
    avatar_url: raw.user?.avatar_url || null,
    user: raw.user ? { id: raw.user.id, is_active: raw.user.is_active } : undefined,
  };
}
```

- [ ] **Step 3: Pass avatar_url to Avatar components in Tutors.tsx**

Find all `<Avatar name={tutor.name}` occurrences and add `src={tutor.avatar_url}`:

Grid view: `<Avatar name={tutor.name} size="lg" src={tutor.avatar_url} />`
List view: `<Avatar name={tutor.name} size="md" src={tutor.avatar_url} />`

- [ ] **Step 4: Add avatar upload to tutor edit modal**

In the `TutorForm` component, add crop modal state and file input logic. Add refs and state:

```typescript
const avatarInputRef = useRef<HTMLInputElement>(null);
const [cropSrc, setCropSrc] = useState<string | null>(null);
```

Add hidden file input and CropModal:

```tsx
<input
  ref={avatarInputRef}
  type="file"
  accept="image/jpeg,image/png"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCropSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }}
/>

{cropSrc && (
  <CropModal
    imageSrc={cropSrc}
    onClose={() => setCropSrc(null)}
    onCrop={async (blob) => {
      setCropSrc(null);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const url = await tutorsService.uploadAvatar(file);
      // If editing existing tutor, update via PATCH
      if (editingTutor) {
        await tutorsService.update({ id: editingTutor.id, data: { avatar_url: url } });
        queryClient.invalidateQueries({ queryKey: ['tutors'] });
        toast.success(t('tutors.avatarUpdated', 'Photo updated'));
      }
    }}
  />
)}
```

Make the avatar in the edit form clickable:

```tsx
<div className="cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
  <Avatar name={editingTutor?.name ?? ''} src={editingTutor?.avatar_url} size="lg" />
  <p className="text-xs text-muted-foreground mt-1 text-center">{t('tutors.changePhoto', 'Change photo')}</p>
</div>
```

Import `CropModal`:

```typescript
import { CropModal } from '@/src/components/CropModal';
```

- [ ] **Step 5: Add i18n keys**

In `en.json` tutors namespace: `"avatarUpdated": "Photo updated"`, `"changePhoto": "Change photo"`
In `id.json` tutors namespace: `"avatarUpdated": "Foto diperbarui"`, `"changePhoto": "Ganti foto"`

- [ ] **Step 6: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Compiles without errors.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx sinaloka-platform/src/services/tutors.service.ts sinaloka-platform/src/locales/
git commit -m "feat(platform): add tutor avatar upload with crop modal"
```

---

### Task 11: Frontend — Tutors app profile photo

**Files:**
- Modify: `sinaloka-tutors/src/types.ts`
- Modify: `sinaloka-tutors/src/mappers/index.ts`
- Create: `sinaloka-tutors/src/components/CropModal.tsx`
- Modify: `sinaloka-tutors/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Install react-easy-crop in tutors app**

Run: `cd sinaloka-tutors && npm install react-easy-crop`

- [ ] **Step 2: Update TutorProfile type**

In `sinaloka-tutors/src/types.ts`, change `TutorProfile.avatar` to `avatar_url`:

```typescript
export interface TutorProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  tutor_subjects: TutorSubject[];
  rating: number;
}
```

- [ ] **Step 3: Update mapper to use real avatar_url**

In `sinaloka-tutors/src/mappers/index.ts`, change the `mapProfile` function (line 78):

```typescript
    avatar_url: raw.user?.avatar_url ?? null,
```

Replace the old `avatar: \`https://picsum.photos/...\`` line.

- [ ] **Step 4: Create CropModal for tutors app**

Create `sinaloka-tutors/src/components/CropModal.tsx` — same as platform version but without i18n (hardcoded Indonesian):

```tsx
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface CropModalProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

export function CropModal({ imageSrc, onCrop, onClose }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    const image = new Image();
    image.src = imageSrc;
    await new Promise((r) => (image.onload = r));

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0, 500, 500,
    );

    canvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="relative h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Zoom</span>
            <input
              type="range"
              min={1} max={3} step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose}>
              Batal
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90" onClick={handleSave}>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update ProfilePage to use real avatar and upload**

In `sinaloka-tutors/src/pages/ProfilePage.tsx`, update the avatar display and add upload flow.

**Note:** `ProfilePage` receives `profile` as a prop from `App.tsx`. It does NOT have direct access to `api` or `refetch`. Add `onAvatarUpdate: () => void` to the component's props interface and pass it from `App.tsx` (where `useProfile()` provides `refetch`). Also import `api` from the API client module used by the app.

Add to props interface: `onAvatarUpdate?: () => void`
Add import: `import api from '../lib/api'` (or wherever the app's Axios instance lives — check existing import paths in `ProfileEditPage.tsx`)

Replace the existing `<img src={profile?.avatar ?? ''}` with:

```tsx
const avatarInputRef = useRef<HTMLInputElement>(null);
const [cropSrc, setCropSrc] = useState<string | null>(null);

// In JSX — replace the avatar img:
<div className="cursor-pointer relative" onClick={() => avatarInputRef.current?.click()}>
  {profile?.avatar_url ? (
    <img
      src={profile.avatar_url.startsWith('http') ? profile.avatar_url : `${import.meta.env.VITE_API_URL}/api/uploads/${profile.avatar_url}`}
      alt="Avatar"
      className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white dark:border-zinc-800 object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-4xl font-bold text-zinc-500">
      {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )}
  <div className="absolute bottom-1 right-1 w-8 h-8 bg-zinc-900 dark:bg-white rounded-full flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white dark:text-zinc-900">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  </div>
</div>

<input
  ref={avatarInputRef}
  type="file"
  accept="image/jpeg,image/png"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCropSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }}
/>

{cropSrc && (
  <CropModal
    imageSrc={cropSrc}
    onClose={() => setCropSrc(null)}
    onCrop={async (blob) => {
      setCropSrc(null);
      const formData = new FormData();
      formData.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      await api.post('/api/tutor/profile/avatar', formData);
      // Notify parent to refresh profile data
      onAvatarUpdate?.();
    }}
  />
)}
```

Add imports: `import { useState, useRef } from 'react'`, `import { CropModal } from '../components/CropModal'`, `import api from '../lib/api'` (verify path from existing imports in the tutors app). In `App.tsx`, pass `onAvatarUpdate={() => refetchProfile()}` to `<ProfilePage>`.

- [ ] **Step 6: Build and verify**

Run: `cd sinaloka-tutors && npm run lint && npm run build`
Expected: Compiles without errors.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-tutors/
git commit -m "feat(tutors): add profile photo upload with crop modal, replace picsum placeholder"
```

---

## Final Verification

### Task 12: Full build check

- [ ] **Step 1: Build all apps**

```bash
cd sinaloka-backend && npm run build
cd ../sinaloka-platform && npm run build
cd ../sinaloka-tutors && npm run build
```

All three must compile without errors.

- [ ] **Step 2: Run backend tests**

```bash
cd sinaloka-backend && npm run test -- --ci
```

Expected: All existing tests pass (new endpoints don't have tests — acceptable for Sprint 5 scope).

- [ ] **Step 3: Commit any remaining fixes**

If any build errors were found and fixed, commit them:

```bash
git add -A
git commit -m "fix: resolve build errors from Sprint 5 integration"
```
