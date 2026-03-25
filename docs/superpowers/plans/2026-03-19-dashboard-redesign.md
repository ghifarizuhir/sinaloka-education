# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decorative hero greeting with a functional Institution Overview card, remove redundant data displays, and add an upcoming sessions list to the sidebar.

**Architecture:** Backend gets one new method (`getUpcomingSessions`) on the existing `DashboardService` and one new route on `DashboardController`. Frontend replaces the hero section, removes 3 redundant cards, adds the institution overview card and upcoming sessions sidebar card. All changes stay within existing module boundaries.

**Tech Stack:** NestJS, Prisma, React, TanStack Query, Tailwind CSS v4, Motion (framer-motion), Lucide icons, i18next

**Spec:** `docs/superpowers/specs/2026-03-19-dashboard-redesign-design.md`

---

## File Structure

### Backend (sinaloka-backend)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/modules/dashboard/dashboard.service.ts` | Modify | Add `getUpcomingSessions()` method |
| `src/modules/dashboard/dashboard.service.spec.ts` | Modify | Add unit tests for `getUpcomingSessions()` |
| `src/modules/dashboard/dashboard.controller.ts` | Modify | Add `GET upcoming-sessions` route |

### Frontend (sinaloka-platform)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/dashboard.ts` | Modify | Add `UpcomingSession` interface |
| `src/services/dashboard.service.ts` | Modify | Add `getUpcomingSessions()` API call |
| `src/hooks/useDashboard.ts` | Modify | Add `useDashboardUpcomingSessions()` hook |
| `src/pages/Dashboard.tsx` | Modify | Replace hero, remove redundant cards, add institution overview + upcoming sessions |
| `e2e/mocks/dashboard.json` | Modify | Add `upcoming_sessions_list` mock data |

---

## Task 1: Backend — Add `getUpcomingSessions()` to DashboardService

**Files:**
- Modify: `sinaloka-backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `sinaloka-backend/src/modules/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `dashboard.service.spec.ts` inside the `describe('DashboardService')` block. First, add `findMany` to the `session` mock in `mockPrisma`:

```typescript
// In mockPrisma definition, change:
session: { count: jest.fn().mockResolvedValue(5) },
// To:
session: {
  count: jest.fn().mockResolvedValue(5),
  findMany: jest.fn().mockResolvedValue([]),
},
```

Also re-set the mock in `beforeEach` after `clearAllMocks`:

```typescript
mockPrisma.session.count.mockResolvedValue(5);
mockPrisma.session.findMany.mockResolvedValue([]);
```

Then add the test block:

```typescript
describe('getUpcomingSessions', () => {
  it('should return upcoming sessions with class, subject, and tutor details', async () => {
    const mockSessions = [
      {
        id: 'session-1',
        date: new Date('2026-03-20'),
        start_time: '10:00',
        class: {
          name: 'Math Advanced',
          subject: { name: 'Mathematics' },
          tutor: { user: { name: 'Pak Budi' } },
        },
      },
      {
        id: 'session-2',
        date: new Date('2026-03-20'),
        start_time: '13:00',
        class: {
          name: 'English Basic',
          subject: { name: 'English' },
          tutor: { user: { name: 'Bu Ani' } },
        },
      },
    ];
    mockPrisma.session.findMany.mockResolvedValue(mockSessions);

    const result = await service.getUpcomingSessions(instId);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'session-1',
      date: expect.any(Date),
      start_time: '10:00',
      subject_name: 'Mathematics',
      tutor_name: 'Pak Budi',
      class_name: 'Math Advanced',
    });
  });

  it('should scope query to institution_id', async () => {
    mockPrisma.session.findMany.mockResolvedValue([]);
    await service.getUpcomingSessions(instId);

    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institution_id: instId,
        }),
      }),
    );
  });

  it('should return empty array when no upcoming sessions', async () => {
    mockPrisma.session.findMany.mockResolvedValue([]);
    const result = await service.getUpcomingSessions(instId);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=dashboard.service`

Expected: FAIL — `service.getUpcomingSessions is not a function`

- [ ] **Step 3: Implement `getUpcomingSessions()` in DashboardService**

Add this method to `dashboard.service.ts` after the `getActivity` method:

```typescript
async getUpcomingSessions(institutionId: string) {
  const sessions = await this.prisma.session.findMany({
    where: {
      institution_id: institutionId,
      date: { gte: new Date() },
      status: 'SCHEDULED',
    },
    orderBy: { date: 'asc' },
    take: 5,
    include: {
      class: {
        select: {
          name: true,
          subject: { select: { name: true } },
          tutor: {
            select: {
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    start_time: s.start_time,
    subject_name: s.class.subject.name,
    tutor_name: s.class.tutor.user.name,
    class_name: s.class.name,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=dashboard.service`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/dashboard/dashboard.service.ts sinaloka-backend/src/modules/dashboard/dashboard.service.spec.ts
git commit -m "feat(backend): add getUpcomingSessions to DashboardService"
```

---

## Task 2: Backend — Add route to DashboardController

**Files:**
- Modify: `sinaloka-backend/src/modules/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add the route**

Add this method to `DashboardController` after the `getActivity` method:

```typescript
@Get('upcoming-sessions')
getUpcomingSessions(@CurrentUser() user: JwtPayload) {
  return this.dashboardService.getUpcomingSessions(user.institutionId!);
}
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=dashboard`

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/dashboard/dashboard.controller.ts
git commit -m "feat(backend): add upcoming-sessions route to DashboardController"
```

---

## Task 3: Frontend — Add types, service, and hook

**Files:**
- Modify: `sinaloka-platform/src/types/dashboard.ts`
- Modify: `sinaloka-platform/src/services/dashboard.service.ts`
- Modify: `sinaloka-platform/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add `UpcomingSession` type**

Append to `sinaloka-platform/src/types/dashboard.ts`:

```typescript
export interface UpcomingSession {
  id: string;
  date: string;
  start_time: string;
  subject_name: string;
  tutor_name: string;
  class_name: string;
}
```

- [ ] **Step 2: Add service method**

Add to `sinaloka-platform/src/services/dashboard.service.ts`:

```typescript
// Add UpcomingSession to the import:
import type { DashboardStats, ActivityItem, UpcomingSession } from '@/src/types/dashboard';

// Add to the dashboardService object:
getUpcomingSessions: () =>
  api.get<UpcomingSession[]>('/api/admin/dashboard/upcoming-sessions').then((r) => r.data),
```

- [ ] **Step 3: Add hook**

Append to `sinaloka-platform/src/hooks/useDashboard.ts`:

```typescript
export function useDashboardUpcomingSessions() {
  return useQuery({
    queryKey: ['dashboard', 'upcoming-sessions'],
    queryFn: dashboardService.getUpcomingSessions,
  });
}
```

- [ ] **Step 4: Run type check**

Run: `cd sinaloka-platform && npm run lint`

Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/dashboard.ts sinaloka-platform/src/services/dashboard.service.ts sinaloka-platform/src/hooks/useDashboard.ts
git commit -m "feat(platform): add upcoming sessions type, service, and hook"
```

---

## Task 4: Frontend — Redesign Dashboard.tsx

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`

This is the main task. It replaces the hero, removes redundant cards, adds the institution overview card and upcoming sessions sidebar.

- [ ] **Step 1: Update imports**

In `Dashboard.tsx`, update the imports:

Remove unused icons: `Sun`, `Moon`, `Sunset`, `BookOpen`, `Sparkles`

Add new icons: `Building2`

Add the new hook import:

```typescript
import { useDashboardStats, useDashboardActivity, useDashboardUpcomingSessions } from '@/src/hooks/useDashboard';
```

Keep `CreditCard` (used in Quick Links).

- [ ] **Step 2: Add the upcoming sessions hook call**

Inside the `Dashboard` component, after the existing hook calls, add:

```typescript
const { data: upcomingSessions } = useDashboardUpcomingSessions();
```

Also add institution name from auth context:

```typescript
const institutionName = auth?.user?.institution?.name ?? 'Dashboard';
const institutionInitial = institutionName.charAt(0).toUpperCase();
```

- [ ] **Step 3: Simplify `getGreeting()` helper**

Replace the `getGreeting` function at the top of the file:

```typescript
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};
```

Update the usage inside the component — change `const greeting = getGreeting();` (it now returns a string, not an object).

- [ ] **Step 4: Update the loading skeleton**

Replace the loading skeleton to match the new layout (no hero-height skeleton):

```tsx
if (isLoading) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace the hero section with Institution Overview Card**

Remove lines 99-172 (the hero greeting section AND the overdue alert banner). Replace with:

```tsx
{/* ─── Institution Overview ─── */}
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <Card className="p-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {institutionInitial}
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {institutionName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(`dashboard.greeting_${greeting}`)}
            {userName ? `, ${userName}` : ''}
          </p>
        </div>
      </div>
      <Button
        className="bg-foreground text-background hover:bg-foreground/90 shrink-0"
        onClick={() => setIsCommandPaletteOpen(true)}
      >
        <Zap size={16} />
        {t('dashboard.quickActions')}
      </Button>
    </div>

    {/* Contextual Alert Chips */}
    {((overdueSummary && overdueSummary.overdue_count > 0) || (stats?.upcoming_sessions && stats.upcoming_sessions > 0)) && (
      <div className="flex flex-wrap gap-2 mt-4">
        {overdueSummary && overdueSummary.overdue_count > 0 && (
          <button
            onClick={() => navigate('/finance/payments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
          >
            <AlertTriangle size={12} />
            {t('payments.overdueAlert.students', { count: overdueSummary.flagged_students.length })} {t('payments.overdueAlert.title').toLowerCase()}
          </button>
        )}
        {stats?.upcoming_sessions != null && stats.upcoming_sessions > 0 && (
          <button
            onClick={() => navigate('/schedules')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors"
          >
            <Calendar size={12} />
            {stats.upcoming_sessions} {t('dashboard.upcomingSessions').toLowerCase()}
          </button>
        )}
      </div>
    )}
  </Card>
</motion.div>
```

- [ ] **Step 6: Remove the Revenue Card and Sessions Card row**

Remove the entire `{/* Revenue + Sessions Row */}` div (the `grid grid-cols-1 sm:grid-cols-2 gap-4` block containing the Revenue Card and Sessions Card). The left column (`lg:col-span-2`) should now contain only the Activity Feed card.

- [ ] **Step 7: Remove the Sidebar Metrics Summary card**

Remove the second card in the right sidebar — the `{/* Metrics Summary */}` card with the `bg-gradient-to-br from-card to-muted/30` styling.

- [ ] **Step 8: Add Upcoming Sessions card to sidebar**

Add this card **before** the Quick Links card in the sidebar:

```tsx
{/* Upcoming Sessions */}
<Card className="p-5">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Clock size={14} className="text-muted-foreground" />
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.upcomingSessions')}</h3>
    </div>
    <Button variant="ghost" size="sm" onClick={() => navigate('/schedules')}>
      {t('common.viewAll')}
    </Button>
  </div>
  <div className="space-y-1">
    {upcomingSessions && upcomingSessions.length > 0 ? (
      upcomingSessions.map((session, i) => (
        <div
          key={session.id}
          className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-xl hover:bg-muted/50 transition-colors"
        >
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{session.subject_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {session.start_time} · {session.tutor_name}
            </p>
          </div>
        </div>
      ))
    ) : (
      <div className="py-8 text-center text-muted-foreground text-sm">
        {t('dashboard.noUpcomingSessions')}
      </div>
    )}
  </div>
</Card>
```

- [ ] **Step 9: Clean up unused imports**

Remove from the import statement: `Sun`, `Moon`, `Sunset`, `BookOpen`, `Sparkles`

Verify `CreditCard` is still used (Quick Links). Remove if not.

Remove the unused `greeting.icon` and `greeting.gradient` references if any remain.

- [ ] **Step 10: Run type check and dev server**

Run: `cd sinaloka-platform && npm run lint`

Expected: No type errors

Run: `cd sinaloka-platform && npm run build`

Expected: Build succeeds

- [ ] **Step 11: Commit**

```bash
git add sinaloka-platform/src/pages/Dashboard.tsx
git commit -m "feat(platform): redesign dashboard with institution overview card and cleanup redundancy"
```

---

## Task 5: Update E2E mock data

**Files:**
- Modify: `sinaloka-platform/e2e/mocks/dashboard.json`

- [ ] **Step 1: Add upcoming sessions mock data**

Add `upcoming_sessions_list` to `dashboard.json`:

```json
{
  "stats": {
    "total_students": 150,
    "active_tutors": 12,
    "total_revenue": 75000000,
    "attendance_rate": 92.5,
    "upcoming_sessions": 8
  },
  "activity": [
    {
      "type": "enrollment",
      "description": "Aisyah Putri enrolled in Math Advanced",
      "created_at": "2026-03-15T10:00:00Z"
    },
    {
      "type": "payment",
      "description": "Payment received from Rizki Pratama",
      "created_at": "2026-03-15T09:30:00Z"
    },
    {
      "type": "attendance",
      "description": "Attendance marked for Physics Basic",
      "created_at": "2026-03-15T09:00:00Z"
    }
  ],
  "upcoming_sessions_list": [
    {
      "id": "session-mock-1",
      "date": "2026-03-20T00:00:00Z",
      "start_time": "10:00",
      "subject_name": "Mathematics",
      "tutor_name": "Pak Budi",
      "class_name": "Math Advanced"
    },
    {
      "id": "session-mock-2",
      "date": "2026-03-20T00:00:00Z",
      "start_time": "13:00",
      "subject_name": "English",
      "tutor_name": "Bu Ani",
      "class_name": "English Basic"
    },
    {
      "id": "session-mock-3",
      "date": "2026-03-21T00:00:00Z",
      "start_time": "09:00",
      "subject_name": "Physics",
      "tutor_name": "Pak Rudi",
      "class_name": "Physics Basic"
    }
  ]
}
```

- [ ] **Step 2: Update the API mocker helper**

In `sinaloka-platform/e2e/helpers/api-mocker.ts`, add the new route inside `setupDashboardMocks()`:

```typescript
export async function setupDashboardMocks(mockApi: MockApi, data = dashboardData) {
  await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, data.stats);
  await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, data.activity);
  await mockApi.onGet('**/api/admin/dashboard/upcoming-sessions').respondWith(200, data.upcoming_sessions_list);
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/e2e/mocks/dashboard.json sinaloka-platform/e2e/helpers/api-mocker.ts
git commit -m "test(platform): add upcoming sessions mock data and api mocker for dashboard e2e"
```

---

## Task 6: Add i18n keys

**Files:**
- Check and modify translation files for any new keys used

- [ ] **Step 1: Identify new i18n keys**

New keys needed:
- `dashboard.noUpcomingSessions` — "No sessions scheduled"

All other keys used in the redesign already exist (`dashboard.greeting_morning`, `dashboard.quickActions`, `dashboard.upcomingSessions`, `payments.overdueAlert.*`, `common.viewAll`).

- [ ] **Step 2: Add missing keys to translation files**

Find the translation files and add the key:

```bash
# Find translation files
find sinaloka-platform/src -name "*.json" -path "*/locales/*" | head -5
```

Add `"noUpcomingSessions": "No sessions scheduled"` under the `dashboard` section in English, and `"noUpcomingSessions": "Belum ada sesi terjadwal"` in Indonesian.

- [ ] **Step 3: Run type check**

Run: `cd sinaloka-platform && npm run lint`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add i18n key for empty upcoming sessions state"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run backend tests**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=dashboard`

Expected: All tests PASS

- [ ] **Step 2: Run frontend type check and build**

Run: `cd sinaloka-platform && npm run lint && npm run build`

Expected: No errors, build succeeds

- [ ] **Step 3: Visual verification**

Start dev servers and verify:
- Institution overview card shows institution name, greeting, and quick actions button
- Alert chips appear when there are overdue payments or upcoming sessions
- Bento stats grid displays correctly (unchanged)
- Activity feed shows in the left 2/3 column
- Upcoming sessions list shows in the right sidebar
- Quick links card shows below upcoming sessions
- Command palette still opens from the Quick Actions button
- No hero greeting section
- No Revenue/Sessions card row
- No sidebar metrics summary card
