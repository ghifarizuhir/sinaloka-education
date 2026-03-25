# Parent Pull-to-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pull-to-refresh gesture and stale data banner to ChildDetailPage so parents see fresh data without navigating away.

**Architecture:** Modify `useChildDetail` hook to track `lastFetchedAt` and expose a `refresh()` function. Add pull-to-refresh touch handler and stale banner to `ChildDetailPage`. No backend changes.

**Tech Stack:** React, touch events, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-03-23-parent-pull-to-refresh-design.md`

---

### Task 1: Add refresh tracking to useChildDetail hook

**Files:**
- Modify: `sinaloka-parent/src/hooks/useChildDetail.ts`

- [ ] **Step 1: Add `lastFetchedAt` state and update it after each fetch**

Add state after line 20 (`activeTab` state):

```typescript
const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
```

In each of the 4 fetch functions (`fetchAttendance`, `fetchSessions`, `fetchPayments`, `fetchEnrollments`), add `setLastFetchedAt(new Date());` inside the `try` block after the data setter. For example, in `fetchAttendance` after `setAttendanceSummary(...)`:

```typescript
setLastFetchedAt(new Date());
```

Do this for all 4 fetch functions.

- [ ] **Step 2: Add `refresh()` function**

Add after the `fetchEnrollments` function (before the `return`):

```typescript
const refresh = useCallback(async () => {
  switch (activeTab) {
    case 'attendance': await fetchAttendance(); break;
    case 'sessions': await fetchSessions(); break;
    case 'payments': await fetchPayments(); break;
    case 'enrollments': await fetchEnrollments(); break;
  }
}, [activeTab, fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments]);
```

- [ ] **Step 3: Export new values**

Update the return statement to include `lastFetchedAt` and `refresh`:

```typescript
return {
  attendance, attendanceSummary, sessions, payments, enrollments,
  isLoading, activeTab, setActiveTab,
  fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
  lastFetchedAt, refresh,
};
```

- [ ] **Step 4: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-parent/src/hooks/useChildDetail.ts
git commit -m "feat(parent): add lastFetchedAt tracking and refresh to useChildDetail"
```

---

### Task 2: Add pull-to-refresh and stale banner to ChildDetailPage

**Files:**
- Modify: `sinaloka-parent/src/pages/ChildDetailPage.tsx`

- [ ] **Step 1: Add imports and destructure new hook values**

Update imports at top of file — add `useRef` to React import, add `RefreshCw` to lucide:

```typescript
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
```

Update the hook destructure (line 25-29) to include `lastFetchedAt` and `refresh`:

```typescript
const {
  attendance, attendanceSummary, sessions, payments, enrollments,
  isLoading, activeTab, setActiveTab,
  fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
  lastFetchedAt, refresh,
} = useChildDetail(child.id, initialTab);
```

- [ ] **Step 2: Add pull-to-refresh state and touch handlers**

After the hook destructure, add:

```typescript
const [pullDistance, setPullDistance] = useState(0);
const [isRefreshing, setIsRefreshing] = useState(false);
const touchStartY = useRef(0);
const isPulling = useRef(false);

const handleTouchStart = useCallback((e: React.TouchEvent) => {
  if (window.scrollY === 0 && !isLoading && !isRefreshing) {
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }
}, [isLoading, isRefreshing]);

const handleTouchMove = useCallback((e: React.TouchEvent) => {
  if (!isPulling.current) return;
  const diff = e.touches[0].clientY - touchStartY.current;
  if (diff > 0) {
    setPullDistance(Math.min(diff * 0.5, 80));
  }
}, []);

const handleTouchEnd = useCallback(async () => {
  if (!isPulling.current) return;
  isPulling.current = false;
  if (pullDistance > 40) {
    setIsRefreshing(true);
    setPullDistance(0);
    await refresh();
    setIsRefreshing(false);
  } else {
    setPullDistance(0);
  }
}, [pullDistance, refresh]);
```

- [ ] **Step 3: Add stale timer**

After the pull-to-refresh state, add:

```typescript
const [minutesAgo, setMinutesAgo] = useState(0);

useEffect(() => {
  if (!lastFetchedAt) return;
  const update = () => {
    setMinutesAgo(Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000));
  };
  update();
  const interval = setInterval(update, 60000);
  return () => clearInterval(interval);
}, [lastFetchedAt]);

const isStale = minutesAgo >= 5;
```

- [ ] **Step 4: Wrap content with touch handlers and add pull indicator + stale banner**

Replace the return JSX (lines 42-78). The full new return:

```tsx
return (
  <div
    className="pb-24"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
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

    {/* Pull indicator */}
    {(pullDistance > 0 || isRefreshing) && (
      <div className="flex items-center justify-center py-3 text-zinc-400 text-xs">
        <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
        {isRefreshing ? 'Memperbarui...' : pullDistance > 40 ? 'Lepas untuk refresh' : 'Tarik untuk refresh'}
      </div>
    )}

    {/* Stale banner */}
    {isStale && !isRefreshing && (
      <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 mb-4">
        <span className="text-zinc-400 text-xs">Diperbarui {minutesAgo} menit lalu</span>
        <button onClick={async () => { setIsRefreshing(true); await refresh(); setIsRefreshing(false); }}
          className="flex items-center gap-1 text-xs font-semibold text-lime-400 hover:text-lime-300">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
    )}

    {isLoading && !isRefreshing ? (
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
```

- [ ] **Step 5: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit && npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add sinaloka-parent/src/pages/ChildDetailPage.tsx
git commit -m "feat(parent): add pull-to-refresh and stale data banner to ChildDetailPage"
```
