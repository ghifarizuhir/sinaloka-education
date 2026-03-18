# Schedules Page Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four issues on the Schedules page: missing tutor names, clickable calendar/table with session detail drawer, click-based action menu, and calendar status indicators.

**Architecture:** Backend first (DRY helper for session include/flatten + findOne enrichment), then frontend (types → hooks/services → translations → Schedules.tsx component).

**Tech Stack:** NestJS, Prisma, React, TanStack Query, Framer Motion, react-i18next, TailwindCSS v4, date-fns

**Spec:** `docs/superpowers/specs/2026-03-16-schedules-page-fixes-design.md`

---

## Chunk 1: Backend — DRY session include/flatten + findOne enrichment

### Task 1: Extract DRY helpers and fix all session queries

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts`

- [ ] **Step 1: Read the current file and add private helpers**

Add two private members to `SessionService` class after the constructor:

```typescript
private readonly sessionInclude = {
  class: {
    include: { tutor: { include: { user: { select: { id: true, name: true } } } } },
  },
};

private flattenSession(session: any) {
  return {
    ...session,
    class: session.class
      ? {
          ...session.class,
          fee: Number(session.class.fee),
          tutor: session.class.tutor
            ? { id: session.class.tutor.id, name: session.class.tutor.user.name }
            : null,
        }
      : null,
  };
}
```

- [ ] **Step 2: Update `create` (line 44-51)**

Replace `include: { class: true }` with `include: this.sessionInclude` and wrap the return:

```typescript
async create(institutionId: string, userId: string, dto: CreateSessionDto) {
  const classRecord = await this.prisma.class.findUnique({
    where: { id: dto.class_id, institution_id: institutionId },
  });
  if (!classRecord) {
    throw new NotFoundException(`Class with id ${dto.class_id} not found`);
  }
  const session = await this.prisma.session.create({
    data: {
      ...dto,
      institution_id: institutionId,
      created_by: userId,
    },
    include: this.sessionInclude,
  });
  return this.flattenSession(session);
}
```

- [ ] **Step 3: Update `findAll` (lines 73-89)**

Replace `include: { class: true }` with `include: this.sessionInclude` and map data:

```typescript
const [data, total] = await Promise.all([
  this.prisma.session.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sort_by]: sort_order },
    include: this.sessionInclude,
  }),
  this.prisma.session.count({ where }),
]);

return {
  data: data.map((s) => this.flattenSession(s)),
  total,
  page,
  limit,
};
```

- [ ] **Step 4: Update `findOne` (lines 92-103) — enriched with attendances**

```typescript
async findOne(institutionId: string, id: string) {
  const session = await this.prisma.session.findUnique({
    where: { id, institution_id: institutionId },
    include: {
      class: {
        include: { tutor: { include: { user: { select: { id: true, name: true, email: true } } } } },
      },
      attendances: {
        include: { student: { select: { id: true, name: true, grade: true } } },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!session) {
    throw new NotFoundException(`Session with id ${id} not found`);
  }

  return {
    ...session,
    class: session.class
      ? {
          ...session.class,
          fee: Number(session.class.fee),
          tutor: session.class.tutor
            ? { id: session.class.tutor.id, name: session.class.tutor.user.name, email: session.class.tutor.user.email }
            : null,
        }
      : null,
    attendances: session.attendances.map((a) => ({
      id: a.id,
      status: a.status,
      homework_done: a.homework_done,
      notes: a.notes,
      student: a.student,
    })),
  };
}
```

- [ ] **Step 5: Update `update` (lines 105-113)**

```typescript
async update(institutionId: string, id: string, dto: UpdateSessionDto) {
  await this.findOne(institutionId, id);
  const session = await this.prisma.session.update({
    where: { id, institution_id: institutionId },
    data: dto,
    include: this.sessionInclude,
  });
  return this.flattenSession(session);
}
```

- [ ] **Step 6: Update `getTutorSchedule` (lines 232-238)**

Replace `include: { class: true }` with `include: this.sessionInclude` and map:

```typescript
return {
  data: data.map((s) => this.flattenSession(s)),
  total,
  page,
  limit,
};
```

- [ ] **Step 7: Update `requestReschedule` (line 279-288)**

Replace the return's `include: { class: true }` with `include: this.sessionInclude` and wrap:

```typescript
const session = await this.prisma.session.update({
  where: { id: sessionId },
  data: { ... },
  include: this.sessionInclude,
});
return this.flattenSession(session);
```

- [ ] **Step 8: Update `approveReschedule` (lines 307-333)**

Both branches (approved and rejected) — replace `include: { class: true }` with `include: this.sessionInclude` and wrap with `this.flattenSession()`.

- [ ] **Step 9: Update `cancelSession` (lines 355-358)**

Replace `include: { class: true }` with `include: this.sessionInclude` and wrap:

```typescript
const session = await this.prisma.session.update({
  where: { id: sessionId },
  data: { status: 'CANCELLED' },
  include: this.sessionInclude,
});
return this.flattenSession(session);
```

- [ ] **Step 10: Update `getSessionStudents` (lines 363-365)**

The `findUnique` here is just for auth check, not returned to client. Change to `include: this.sessionInclude` for consistency but no flatten needed (result not returned).

- [ ] **Step 11: Update `completeSession` (lines 443-451)**

Replace `include: { class: true }` with `include: this.sessionInclude` and wrap:

```typescript
const updated = await this.prisma.session.update({
  where: { id: sessionId },
  data: { ... },
  include: this.sessionInclude,
});
return this.flattenSession(updated);
```

- [ ] **Step 12: Run backend tests**

Run: `cd sinaloka-backend && npm run test -- --testPathPatterns=session`
Expected: All pass (or no test file exists — verify)

- [ ] **Step 13: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "fix(backend): include tutor relation in session queries with DRY helpers

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: Frontend — Types, services, hooks, translations

### Task 2: Add `SessionDetail` type and update service/hook

**Files:**
- Modify: `sinaloka-platform/src/types/session.ts`
- Modify: `sinaloka-platform/src/services/sessions.service.ts`
- Modify: `sinaloka-platform/src/hooks/useSessions.ts`

- [ ] **Step 1: Add `SessionDetail` interface to `types/session.ts`**

Append after `SessionQueryParams`:

```typescript
export interface SessionDetail extends Session {
  class?: {
    id: string;
    name: string;
    subject: string;
    fee: number;
    tutor?: { id: string; name: string; email?: string };
  };
  attendances?: {
    id: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    homework_done: boolean;
    notes: string | null;
    student: { id: string; name: string; grade: string };
  }[];
}
```

- [ ] **Step 2: Update `sessionsService.getById` return type**

In `services/sessions.service.ts`, add `SessionDetail` to import and change `getById`:

```typescript
import type { Session, SessionDetail, CreateSessionDto, ... } from '@/src/types/session';

getById: (id: string) =>
  api.get<SessionDetail>(`/api/admin/sessions/${id}`).then((r) => r.data),
```

- [ ] **Step 3: Update `useSession` to accept `string | null`**

```typescript
export function useSession(id: string | null) {
  return useQuery({ queryKey: ['sessions', id], queryFn: () => sessionsService.getById(id!), enabled: !!id });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/session.ts sinaloka-platform/src/services/sessions.service.ts sinaloka-platform/src/hooks/useSessions.ts
git commit -m "feat(platform): add SessionDetail type and update service/hook for drawer

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 3: Add translation keys

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add keys to `en.json`**

Inside the `"schedules"` object, add `"drawer"` block after the existing `"calendar"` block:

```json
"drawer": {
  "title": "Session Details",
  "dateTime": "Date & Time",
  "tutor": "Tutor",
  "sessionContent": "Session Content",
  "topicCovered": "Topic Covered",
  "sessionSummary": "Session Summary",
  "noContent": "No content recorded yet",
  "rescheduleInfo": "Reschedule Request",
  "proposedDateTime": "Proposed",
  "reason": "Reason",
  "approve": "Approve",
  "reject": "Reject",
  "attendance": "Attendance",
  "noAttendance": "No attendance recorded",
  "present": "Present",
  "absent": "Absent",
  "late": "Late",
  "homework": "HW",
  "markAttendance": "Mark Attendance",
  "cancelSession": "Cancel Session"
}
```

Also add to existing `"toast"` block:
```json
"rescheduleRejected": "Reschedule rejected"
```

- [ ] **Step 2: Add matching keys to `id.json`**

```json
"drawer": {
  "title": "Detail Sesi",
  "dateTime": "Tanggal & Waktu",
  "tutor": "Tutor",
  "sessionContent": "Konten Sesi",
  "topicCovered": "Topik Dibahas",
  "sessionSummary": "Ringkasan Sesi",
  "noContent": "Belum ada konten yang dicatat",
  "rescheduleInfo": "Permintaan Jadwal Ulang",
  "proposedDateTime": "Diusulkan",
  "reason": "Alasan",
  "approve": "Setujui",
  "reject": "Tolak",
  "attendance": "Kehadiran",
  "noAttendance": "Belum ada kehadiran dicatat",
  "present": "Hadir",
  "absent": "Tidak Hadir",
  "late": "Terlambat",
  "homework": "PR",
  "markAttendance": "Catat Kehadiran",
  "cancelSession": "Batalkan Sesi"
}
```

Also add to existing `"toast"` block:
```json
"rescheduleRejected": "Jadwal ulang ditolak"
```

- [ ] **Step 3: Validate JSON**

Run: `cd sinaloka-platform && node -e "require('./src/locales/en.json'); require('./src/locales/id.json'); console.log('OK')"`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add translation keys for schedules drawer

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: Frontend — Schedules.tsx component changes

### Task 4: All Schedules.tsx changes (click menu, drawer, calendar indicators, clickable rows)

**Files:**
- Modify: `sinaloka-platform/src/pages/Schedules.tsx`

This is a single large task because all changes are in one file and interdependent.

- [ ] **Step 1: Add new imports and state**

Add `Drawer`, `Skeleton`, `Progress` to UI imports (line 43):

```typescript
import { Card, Button, Badge, Modal, Drawer, Input, Label, Switch, Skeleton } from '../components/UI';
```

Add `useSession` to hooks import (line 45):

```typescript
import { useSessions, useSession, useCreateSession, useUpdateSession, useDeleteSession, useGenerateSessions, useApproveReschedule } from '@/src/hooks/useSessions';
```

Add `Trash2` to lucide imports if not present.

Add new state after existing filter state (after line 84):

```typescript
const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
```

Add hook call and derived state after existing queries (after line 117):

```typescript
const sessionDetail = useSession(selectedSessionId);
const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;
```

- [ ] **Step 2: Add a `getStatusBorder` helper function**

Add near the `getSubjectColor` function:

```typescript
function getStatusBorder(status: SessionStatus): string {
  switch (status) {
    case 'COMPLETED': return 'border-l-2 border-l-emerald-500';
    case 'RESCHEDULE_REQUESTED': return 'border-l-2 border-l-amber-500';
    default: return '';
  }
}
```

- [ ] **Step 3: Update table rows to be clickable with click-based action menu**

Change the `<tr>` in `sessions.map` (line ~300) to:

```tsx
<tr
  key={session.id}
  className={cn(
    "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer",
    isCancelled && "opacity-50 grayscale-[0.5]"
  )}
  onClick={() => {
    setSelectedSessionId(session.id);
    setActiveActionMenu(null);
  }}
>
```

Replace the action menu `<td>` (lines ~337-365) with click-based version:

```tsx
<td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
  <div className="relative">
    <button
      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
      onClick={() => setActiveActionMenu(activeActionMenu === session.id ? null : session.id)}
    >
      <MoreHorizontal size={18} />
    </button>
    <AnimatePresence>
      {activeActionMenu === session.id && (
        <>
          <div className="fixed inset-0 z-[5]" onClick={() => setActiveActionMenu(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1 text-left"
          >
            <button
              onClick={() => { handleMarkAttendance(session.id); setActiveActionMenu(null); }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-indigo-600"
            >
              {t('schedules.menu.markAttendance')} <ArrowUpRight size={14} />
            </button>
            {session.status === 'RESCHEDULE_REQUESTED' && (
              <button
                onClick={() => { handleApproveReschedule(session.id); setActiveActionMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-emerald-600"
              >
                <CheckCircle2 size={14} /> {t('schedules.menu.approveReschedule')}
              </button>
            )}
            {!isCancelled && (
              <button
                onClick={() => { handleCancelSession(session.id); setActiveActionMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-red-500"
              >
                {t('schedules.menu.cancelSession')}
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </div>
</td>
```

- [ ] **Step 4: Add click handlers to calendar month view session blocks**

On the session block `<div>` in month view (line ~468), add `onClick`:

```tsx
<div
  key={s.id}
  onClick={() => setSelectedSessionId(s.id)}
  className={cn(
    "p-1.5 rounded-md text-[10px] font-medium truncate border transition-all hover:scale-[1.02] cursor-pointer",
    isCancelled ? "bg-zinc-50 text-zinc-400 border-zinc-100 line-through" : getSubjectColor(subject),
    !isCancelled && getStatusBorder(s.status)
  )}
  title={`${s.class?.name ?? ''} (${s.start_time} - ${s.end_time})`}
>
```

- [ ] **Step 5: Add click handlers to calendar day view session blocks**

On the session block `<div>` in day view (line ~514), add `onClick`:

```tsx
<div
  key={s.id}
  onClick={() => setSelectedSessionId(s.id)}
  className={cn(
    "rounded-lg p-2 border shadow-sm text-[10px] cursor-pointer hover:scale-[1.01] transition-all",
    isCancelled ? "bg-zinc-50 text-zinc-400 border-zinc-100 line-through" : getSubjectColor(s.class?.subject),
    !isCancelled && getStatusBorder(s.status)
  )}
>
```

- [ ] **Step 6: Add the session detail drawer**

Insert before the final closing `</div>` of the component (after all modals):

```tsx
{/* Session Detail Drawer */}
<Drawer
  isOpen={!!selectedSessionId}
  onClose={() => setSelectedSessionId(null)}
  title={t('schedules.drawer.title')}
>
  {selectedSession && (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xl font-bold mb-3 shadow-lg">
          {(selectedSession.class?.name ?? '?').charAt(0)}
        </div>
        <h3 className="text-lg font-bold dark:text-zinc-100">{selectedSession.class?.name ?? '—'}</h3>
        <div className="mt-2 flex gap-2">
          {selectedSession.class?.subject && (
            <span className={cn('text-[10px] font-bold px-2 py-1 rounded-md border', getSubjectColor(selectedSession.class.subject))}>
              {selectedSession.class.subject.toUpperCase()}
            </span>
          )}
          <Badge variant={selectedSession.status === 'COMPLETED' ? 'success' : selectedSession.status === 'CANCELLED' ? 'default' : 'warning'}>
            {STATUS_LABEL[selectedSession.status]}
          </Badge>
        </div>
      </div>

      {/* Date & Time */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.dateTime')}</h4>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2 text-sm dark:text-zinc-200">
            <CalendarIcon size={14} className="text-zinc-400" />
            {isValid(parseISO(selectedSession.date)) ? formatDate(selectedSession.date, i18n.language) : selectedSession.date}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
            <Clock size={14} />
            {selectedSession.start_time} - {selectedSession.end_time}
          </div>
        </div>
      </div>

      {/* Tutor */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.tutor')}</h4>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
            {(selectedSession.class?.tutor?.name ?? '?').charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold dark:text-zinc-200">{selectedSession.class?.tutor?.name ?? '—'}</p>
            {sessionDetail.data?.class?.tutor?.email && (
              <p className="text-xs text-zinc-500">{sessionDetail.data.class.tutor.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Session Content (if COMPLETED) */}
      {selectedSession.status === 'COMPLETED' && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.sessionContent')}</h4>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">{t('schedules.drawer.topicCovered')}</p>
              <p className="text-sm dark:text-zinc-200">{selectedSession.topic_covered || t('schedules.drawer.noContent')}</p>
            </div>
            {selectedSession.session_summary && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">{t('schedules.drawer.sessionSummary')}</p>
                <p className="text-sm dark:text-zinc-200">{selectedSession.session_summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reschedule Info (if RESCHEDULE_REQUESTED) */}
      {selectedSession.status === 'RESCHEDULE_REQUESTED' && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.rescheduleInfo')}</h4>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-amber-700 dark:text-amber-300 font-medium">{t('schedules.drawer.proposedDateTime')}: </span>
                <span className="dark:text-amber-200">{selectedSession.proposed_date} {selectedSession.proposed_start_time} - {selectedSession.proposed_end_time}</span>
              </div>
              {selectedSession.reschedule_reason && (
                <div>
                  <span className="text-amber-700 dark:text-amber-300 font-medium">{t('schedules.drawer.reason')}: </span>
                  <span className="dark:text-amber-200">{selectedSession.reschedule_reason}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  approveReschedule.mutate(
                    { id: selectedSession.id, data: { approved: true } },
                    {
                      onSuccess: () => { toast.success(t('schedules.toast.rescheduleApproved')); setSelectedSessionId(null); },
                      onError: () => toast.error(t('schedules.toast.rescheduleError')),
                    }
                  );
                }}
              >
                {t('schedules.drawer.approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 justify-center text-red-500"
                onClick={() => {
                  approveReschedule.mutate(
                    { id: selectedSession.id, data: { approved: false } },
                    {
                      onSuccess: () => { toast.success(t('schedules.toast.rescheduleRejected')); setSelectedSessionId(null); },
                      onError: () => toast.error(t('schedules.toast.rescheduleError')),
                    }
                  );
                }}
              >
                {t('schedules.drawer.reject')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {t('schedules.drawer.attendance')} ({sessionDetail.data?.attendances?.length ?? 0})
        </h4>
        {sessionDetail.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : sessionDetail.data?.attendances?.length ? (
          <div className="space-y-2">
            {sessionDetail.data.attendances.map((att) => (
              <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                    {att.student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-zinc-200">{att.student.name}</p>
                    {att.student.grade && <p className="text-[10px] text-zinc-400">{att.student.grade}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {att.homework_done && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('schedules.drawer.homework')}</span>
                  )}
                  <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'LATE' ? 'warning' : 'default'}>
                    {t(`schedules.drawer.${att.status.toLowerCase()}`)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">{t('schedules.drawer.noAttendance')}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          variant="outline"
          className="flex-1 justify-center"
          onClick={() => { handleMarkAttendance(selectedSession.id); setSelectedSessionId(null); }}
        >
          {t('schedules.drawer.markAttendance')}
        </Button>
        {selectedSession.status !== 'CANCELLED' && (
          <Button
            className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => { handleCancelSession(selectedSession.id); setSelectedSessionId(null); }}
          >
            {t('schedules.drawer.cancelSession')}
          </Button>
        )}
      </div>
    </div>
  )}
</Drawer>
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/pages/Schedules.tsx
git commit -m "feat(platform): add session drawer, click menu, and calendar status indicators

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
