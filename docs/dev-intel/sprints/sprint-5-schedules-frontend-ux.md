---
title: "Sprint 5: Frontend UX Fixes"
source: docs/dev-intel/audits/audit-2026-03-28-schedules.md
scope: CLS-07, CLS-09, CLS-15, CLS-16, CLS-18, SA-011, SA-020
---

# Sprint 5: Frontend UX Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix visual gaps, data truncation, and UI inconsistencies in platform and tutors apps.

**Architecture:** Frontend-only changes — no backend modifications. Fix Sunday display, timetable limit, calendar range, subject colors, subject filter, reschedule status, and optimistic updates.

**Tech Stack:** React, TypeScript, TailwindCSS

---

## Task 1: CLS-07 — Add Sunday to ScheduleWeekPreview

**Problem:** `PREVIEW_DAYS` only includes Mon-Sat. Classes scheduled on Sunday are invisible in the schedule preview. The grid uses `repeat(6, 1fr)`.

**Fix:** Add `'Sunday'` to `PREVIEW_DAYS` and update grid to 7 columns.

**Files changed:**
- `sinaloka-platform/src/components/ScheduleWeekPreview.tsx`

### Steps

- [ ] **Step 1: Add Sunday to PREVIEW_DAYS and fix grid**

```typescript
// FILE: sinaloka-platform/src/components/ScheduleWeekPreview.tsx
// Line 5 — REPLACE:
//   const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
// WITH:
const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
```

Also update the grid class from `grid-cols-6` to `grid-cols-7` (search for `repeat(6` or `grid-cols-6` in the same file).

- [ ] **Step 2: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(platform): add Sunday to ScheduleWeekPreview (CLS-07)"
```

---

## Task 2: CLS-09 — Fix Timetable View Hard Limit 100

**Problem:** `allClassesData` is fetched with `limit: 100`. Institutions with 100+ classes see a truncated timetable.

**Fix:** Use `limit: 999` for timetable data fetch (a "get all" approach), and add a warning if truncated.

**Files changed:**
- `sinaloka-platform/src/pages/Classes/useClassesPage.ts`

### Steps

- [ ] **Step 1: Increase limit and add truncation warning**

```typescript
// FILE: sinaloka-platform/src/pages/Classes/useClassesPage.ts
// Around line 103-110, find the allClassesData query
// CHANGE limit: 100 to limit: 999
// The query should look like:
const { data: allClassesData } = useClasses({ page: 1, limit: 999, semester_id: filterSemesterId || undefined });
```

Note: A proper fix would be a dedicated backend endpoint without pagination for timetable data. But increasing limit to 999 is a pragmatic fix since no institution will have 999+ active classes.

- [ ] **Step 2: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(platform): increase timetable class limit to avoid truncation (CLS-09)"
```

---

## Task 3: CLS-15 — Extend CalendarDay Hour Range

**Problem:** `CalendarDay` renders hours 8-21 only. Sessions before 08:00 or after 21:00 are invisible.

**Fix:** Extend range to 6:00-23:00 to cover edge cases.

**Files changed:**
- `sinaloka-platform/src/pages/Schedules/CalendarDay.tsx`

### Steps

- [ ] **Step 1: Extend hour range**

```typescript
// FILE: sinaloka-platform/src/pages/Schedules/CalendarDay.tsx
// Line 27 — REPLACE:
//   {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => {
// WITH:
{Array.from({ length: 18 }, (_, i) => i + 6).map(hour => {
```

This renders 06:00-23:00 (18 hours), covering early morning and late evening sessions.

- [ ] **Step 2: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(platform): extend CalendarDay hour range to 06:00-23:00 (CLS-15)"
```

---

## Task 4: CLS-16 — Consolidate Duplicate getSubjectColor

**Problem:** Two implementations of `getSubjectColor`: hash-based (Classes) vs hardcoded 3-entry map (Schedules). The Schedules version returns empty string for any subject not in its static map.

**Fix:** Extract the hash-based version to `src/lib/utils.ts` and use it in both pages.

**Files changed:**
- `sinaloka-platform/src/lib/utils.ts`
- `sinaloka-platform/src/pages/Classes/useClassesPage.ts`
- `sinaloka-platform/src/pages/Schedules/useSchedulesPage.ts`

### Steps

- [ ] **Step 1: Add shared getSubjectColor to utils.ts**

```typescript
// FILE: sinaloka-platform/src/lib/utils.ts
// ADD at the end of file

const SUBJECT_COLOR_PALETTE = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
];

export function getSubjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLOR_PALETTE[Math.abs(hash) % SUBJECT_COLOR_PALETTE.length];
}
```

Copy the exact implementation from `useClassesPage.ts` (lines 26-38) to ensure consistency.

- [ ] **Step 2: Update useClassesPage.ts to import from utils**

Remove the local `getSubjectColor` function and import from `@/lib/utils`.

- [ ] **Step 3: Update useSchedulesPage.ts to import from utils**

Remove the local `SUBJECT_COLORS` map and `getSubjectColor` function, replace with import from `@/lib/utils`.

- [ ] **Step 4: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor(platform): consolidate duplicate getSubjectColor to utils (CLS-16)"
```

---

## Task 5: CLS-18 — Subject Filter Use ID Instead of Name

**Problem:** `ClassFilters.tsx` uses `s.name` as the Select value for subject filter, then resolves it back to ID via `subjectsList.find()`. Duplicate subject names would cause incorrect filtering.

**Fix:** Use `s.id` directly as the select value.

**Files changed:**
- `sinaloka-platform/src/pages/Classes/ClassFilters.tsx`
- `sinaloka-platform/src/pages/Classes/useClassesPage.ts`

### Steps

- [ ] **Step 1: Update ClassFilters to use ID**

```typescript
// FILE: sinaloka-platform/src/pages/Classes/ClassFilters.tsx
// Line 70 — REPLACE subject option value
// FROM: value: s.name
// TO:   value: s.id
```

- [ ] **Step 2: Update useClassesPage to use ID directly**

In `useClassesPage.ts`, the `filterSubjectId` memo currently does `subjectsList.find(s => s.name === filterSubject)?.id`. Since we're now passing the ID directly:

```typescript
// Remove the filterSubjectId memo that resolves name → ID
// Instead use filterSubject directly as the subject_id parameter
// since it now contains the UUID
```

Update the query params to use `filterSubject` directly instead of `filterSubjectId`.

- [ ] **Step 3: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix(platform): use subject ID instead of name for filter (CLS-18)"
```

---

## Task 6: SA-011 — Fix Reschedule Status Display in Tutors App

**Problem:** `RESCHEDULE_REQUESTED` is mapped to `'rescheduled'` which gets red styling (same as cancelled). No action buttons shown. Tutor doesn't know reschedule is pending.

**Fix:** Add distinct status display for `rescheduled` in ScheduleCard with a "Pending Approval" badge and keep action buttons visible.

**Files changed:**
- `sinaloka-tutors/src/components/ScheduleCard.tsx`

### Steps

- [ ] **Step 1: Add reschedule-pending status handling**

```typescript
// FILE: sinaloka-tutors/src/components/ScheduleCard.tsx
// Update the status badge logic to handle 'rescheduled' distinctly

// Add a new condition for 'rescheduled' status:
// Instead of falling through to red (cancelled style), show yellow/amber badge:
// bg-amber-500/20 text-amber-400 — "Menunggu Approval"

// Also: set isUpcoming = true for 'rescheduled' status so action buttons remain visible
// (tutor may want to cancel the reschedule request)
```

The exact implementation depends on the current badge rendering logic. Read the component, add an `else if (item.status === 'rescheduled')` branch with amber styling and "Menunggu Approval" text.

- [ ] **Step 2: Build**

```bash
cd sinaloka-tutors && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(tutors): show distinct badge for reschedule-pending sessions (SA-011)"
```

---

## Task 7: SA-020 — Consistent Optimistic Updates for Reschedule

**Problem:** `cancelSession` uses optimistic update (instant UI feedback) but `requestReschedule` does a full refetch (UI lag). Inconsistent UX.

**Fix:** Add optimistic update to `requestReschedule` matching the cancel pattern.

**Files changed:**
- `sinaloka-tutors/src/hooks/useSchedule.ts`

### Steps

- [ ] **Step 1: Add optimistic update to requestReschedule**

```typescript
// FILE: sinaloka-tutors/src/hooks/useSchedule.ts
// In requestReschedule function (around lines 48-54)
// Match the cancelSession pattern:
// 1. Save previous state
// 2. Optimistically update status to 'rescheduled'
// 3. Call API
// 4. On error: revert to previous state
// 5. On success: optionally refetch for server confirmation
```

Look at `cancelSession` (lines 34-46) for the exact optimistic update pattern and replicate it for `requestReschedule`.

- [ ] **Step 2: Build**

```bash
cd sinaloka-tutors && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(tutors): add optimistic update to requestReschedule (SA-020)"
```
