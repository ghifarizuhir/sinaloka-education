# Schedules Page Fixes — Design Spec

## Overview

Four fixes for the sinaloka-platform Schedules page (`src/pages/Schedules.tsx`): missing tutor names, clickable calendar/table sessions with sidebar drawer, click-based action menu, and status-colored calendar indicators.

## 1. Fix: Tutor Name Not Displaying

### Root Cause

Backend `session.service.ts` uses `include: { class: true }` in all queries. This loads the `Class` model fields but does NOT include the nested `tutor → user` relation. The frontend accesses `session.class?.tutor?.name` which is always `undefined`, falling back to `'—'`.

### Fix

**Backend** (`session.service.ts` → `findAll`): Change `include: { class: true }` to:

```typescript
include: {
  class: {
    include: { tutor: { include: { user: { select: { id: true, name: true } } } } },
  },
},
```

Then map the response to flatten tutor:

```typescript
data: data.map((s) => ({
  ...s,
  class: s.class ? {
    ...s.class,
    fee: Number(s.class.fee),
    tutor: s.class.tutor ? { id: s.class.tutor.id, name: s.class.tutor.user.name } : null,
  } : null,
})),
```

Apply the same include+flatten pattern to all methods that return session(s) with `include: { class: true }`: `findOne`, `create`, `update`, `approveReschedule`, `requestReschedule`, `cancelSession`, and `completeSession`.

**Not** `generateSessions` — it uses `createMany` which returns `{ count }`, not full records.

**DRY approach**: Extract a private helper to avoid 14-location duplication:

```typescript
private readonly sessionInclude = {
  class: {
    include: { tutor: { include: { user: { select: { id: true, name: true } } } } },
  },
};

private flattenSession(session: any) {
  return {
    ...session,
    class: session.class ? {
      ...session.class,
      fee: Number(session.class.fee),
      tutor: session.class.tutor
        ? { id: session.class.tutor.id, name: session.class.tutor.user.name }
        : null,
    } : null,
  };
}
```

Use `this.sessionInclude` in all Prisma queries and `this.flattenSession()` on all returned sessions. `findOne` uses an extended include (adds `attendances`) and extended flatten (adds `email` to tutor, maps attendances).

## 2. Session Detail Sidebar Drawer

### Trigger

- **Table view**: Click a row → open drawer
- **Month calendar**: Click a session block → open drawer
- **Day calendar**: Click a session block → open drawer

### State

```typescript
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
```

Row/block click sets `selectedSessionId`. The drawer uses `useSession(selectedSessionId)` to fetch detail. Show already-available data from the list immediately (class name, time, status); loading spinner only for enriched sections (attendance).

### Backend Changes

Extend `findOne` to include attendance data:

```typescript
include: {
  class: {
    include: { tutor: { include: { user: { select: { id: true, name: true, email: true } } } } },
  },
  attendances: {
    include: { student: { select: { id: true, name: true, grade: true } } },
    orderBy: { created_at: 'desc' },
  },
},
```

Return flattened:

```typescript
return {
  ...session,
  class: session.class ? {
    ...session.class,
    fee: Number(session.class.fee),
    tutor: session.class.tutor
      ? { id: session.class.tutor.id, name: session.class.tutor.user.name, email: session.class.tutor.user.email }
      : null,
  } : null,
  attendances: session.attendances.map((a) => ({
    id: a.id,
    status: a.status,
    homework_done: a.homework_done,
    notes: a.notes,
    student: a.student,
  })),
};
```

### Frontend Type

Add to `types/session.ts`:

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

Update `sessionsService.getById` return type to `SessionDetail`. Update `useSession` to accept `string | null` with non-null assertion in queryFn:

```typescript
export function useSession(id: string | null) {
  return useQuery({ queryKey: ['sessions', id], queryFn: () => sessionsService.getById(id!), enabled: !!id });
}
```

Note: only `getById`/`useSession` return `SessionDetail`; list endpoint still returns `Session[]`.

### Drawer Layout

Using existing `Drawer` component:

1. **Header** — Class name + subject badge + status badge
2. **Date/Time** — Formatted date + time range with Calendar/Clock icons
3. **Tutor** — Name card with avatar initial, email from detail query
4. **Session Content** (if COMPLETED) — Topic covered + session summary in info cards
5. **Reschedule Info** (if RESCHEDULE_REQUESTED) — Orange warning box with proposed date/time, reason, and Approve/Reject buttons
6. **Attendance** (from detail query) — Student list with attendance status badges (Present/Absent/Late), homework checkbox. Loading skeleton while fetching.
7. **Action buttons** — Mark Attendance (navigates to attendance page), Cancel Session (if not cancelled)

### Click Handlers

- **Table row**: `onClick={() => setSelectedSessionId(session.id)}` on `<tr>`, with `stopPropagation` on action menu `<td>`
- **Month calendar session block** (line ~468): `onClick={() => setSelectedSessionId(s.id)}` on the session `<div>`
- **Day calendar session block** (line ~513): `onClick={() => setSelectedSessionId(s.id)}` on the session `<div>`

### Reschedule Reject Handler

The Approve button calls `approveReschedule.mutate({ id, data: { approved: true } })`. The Reject button calls `approveReschedule.mutate({ id, data: { approved: false } })`. Both close the drawer on success.

### Translation Keys

**en.json** — add under `schedules`:

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

Also add to existing `schedules.toast`:
```json
"rescheduleRejected": "Reschedule rejected"
```

**id.json** — matching Indonesian translations:

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

Also add to existing `schedules.toast`:
```json
"rescheduleRejected": "Jadwal ulang ditolak"
```

## 3. Action Menu: Click Instead of Hover

Same fix as Classes page. Replace `group-hover/menu` CSS pattern with click-based state:

```typescript
const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
```

Toggle on click, backdrop overlay closes on outside click, `AnimatePresence` + `motion.div` animation. `stopPropagation` on the action menu `<td>` to prevent drawer opening.

Add `cursor-pointer` to table rows.

## 4. Calendar Status Indicators

Month view sessions currently only color-coded by subject. Add status-based visual cues:

- **COMPLETED**: Add `border-l-2 border-l-emerald-500` (green left accent)
- **RESCHEDULE_REQUESTED**: Add `border-l-2 border-l-amber-500` (orange left accent)
- **CANCELLED**: Already handled (grey + line-through)
- **SCHEDULED**: No extra indicator (default subject color)

Same indicators apply to day view session blocks.

## Files Changed

### Backend
| File | Change |
|------|--------|
| `sinaloka-backend/src/modules/session/session.service.ts` | Include `tutor → user` in all queries, enrich `findOne` with attendances, flatten responses |

### Frontend
| File | Change |
|------|--------|
| `sinaloka-platform/src/types/session.ts` | Add `SessionDetail` interface |
| `sinaloka-platform/src/services/sessions.service.ts` | Update `getById` return type |
| `sinaloka-platform/src/hooks/useSessions.ts` | Update `useSession` to accept `null` |
| `sinaloka-platform/src/pages/Schedules.tsx` | Drawer, click-based action menu, clickable calendar/table, status indicators |
| `sinaloka-platform/src/locales/en.json` | Add `schedules.drawer.*` keys |
| `sinaloka-platform/src/locales/id.json` | Same keys, Indonesian translations |
