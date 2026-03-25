# Sprint 1: Bug Fixes & Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 UX bugs: server-side filtering for Students & Tutors, accurate expense totals, working command palette search, and registration detail display.

**Architecture:** Backend changes add aggregate fields to existing response meta (additive, backward-compatible). Frontend changes replace client-side filtering with server-side query params and add debounce. No new endpoints needed.

**Tech Stack:** NestJS + Prisma (backend), React + TanStack Query + TailwindCSS (frontend)

**Spec:** `docs/superpowers/specs/2026-03-22-sprint1-bugfixes-design.md`

---

## Task 1: Backend — Add `active_count` / `inactive_count` to Student Response Meta

**Files:**
- Modify: `sinaloka-backend/src/modules/student/student.service.ts` (findAll method, ~line 37-77)

- [ ] **Step 1: Update `findAll` to include active/inactive counts**

In `student.service.ts`, replace the existing `Promise.all` block with one that adds two institution-wide count queries:

```typescript
const [data, total, activeCount, inactiveCount] = await Promise.all([
  this.prisma.student.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sort_by]: sort_order },
  }),
  this.prisma.student.count({ where }),
  this.prisma.student.count({
    where: { institution_id: institutionId, status: 'ACTIVE' },
  }),
  this.prisma.student.count({
    where: { institution_id: institutionId, status: 'INACTIVE' },
  }),
]);

return {
  data,
  meta: {
    ...buildPaginationMeta(total, page, limit),
    active_count: activeCount,
    inactive_count: inactiveCount,
  },
};
```

Note: `activeCount`/`inactiveCount` use `institutionId` without search/grade filters — these are institution-wide overview stats.

- [ ] **Step 2: Build and verify**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/student/student.service.ts
git commit -m "fix(backend): add active/inactive counts to student response meta"
```

---

## Task 2: Backend — Add `total_amount` to Expense Response Meta

**Files:**
- Modify: `sinaloka-backend/src/modules/expense/expense.service.ts` (findAll method, ~line 20-53)

- [ ] **Step 1: Add Prisma aggregate to `findAll`**

In `expense.service.ts`, replace the `Promise.all` block:

```typescript
const [data, total, aggregate] = await Promise.all([
  this.prisma.expense.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sort_by]: sort_order },
  }),
  this.prisma.expense.count({ where }),
  this.prisma.expense.aggregate({
    where,
    _sum: { amount: true },
  }),
]);

return {
  data,
  meta: {
    ...buildPaginationMeta(total, page, limit),
    total_amount: Number(aggregate._sum.amount ?? 0),
  },
};
```

Note: Uses same `where` clause so `total_amount` respects active category/search/date filters.

- [ ] **Step 2: Build and verify**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.service.ts
git commit -m "fix(backend): add total_amount to expense response meta"
```

---

## Task 3: Frontend — Student Server-Side Filtering + Stats Fix

**Files:**
- Modify: `sinaloka-platform/src/pages/Students/useStudentPage.ts`
- Modify: `sinaloka-platform/src/pages/Students/index.tsx` (wire `updateFilters` to filter component)

- [ ] **Step 1: Add debounced search state**

At the top of `useStudentPage()`, after `const [searchQuery, setSearchQuery] = useState('');`, add a debounced search value:

```typescript
const [debouncedSearch, setDebouncedSearch] = useState('');

// Debounce search — 300ms delay before API call
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
    setPage(1);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

Add `useEffect` to imports: update the first line to include it:
```typescript
import { useState, useMemo, useEffect } from 'react';
```

- [ ] **Step 2: Pass server-side params to `useStudents`**

Replace:
```typescript
const { data, isLoading } = useStudents({ page, limit });
```

With:
```typescript
const { data, isLoading } = useStudents({
  page,
  limit,
  search: debouncedSearch || undefined,
  grade: activeFilters.grade || undefined,
  status: activeFilters.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE' | undefined,
});
```

- [ ] **Step 3: Remove client-side `filteredStudents` and fix dependent code**

Remove the entire `filteredStudents` useMemo block (~lines 59-71):
```typescript
// DELETE THIS BLOCK:
const filteredStudents = useMemo(() => {
  ...
}, [data?.data, searchQuery, activeFilters]);
```

Replace all references to `filteredStudents` with `data?.data ?? []`:

In `toggleSelectAll`:
```typescript
const toggleSelectAll = () => {
  const students = data?.data ?? [];
  if (selectedIds.length === students.length) {
    setSelectedIds([]);
  } else {
    setSelectedIds(students.map(s => s.id));
  }
};
```

- [ ] **Step 4: Reset `selectedIds` and page on filter change**

Add a `useEffect` to clear selection when filters change:
```typescript
useEffect(() => {
  setSelectedIds([]);
}, [debouncedSearch, activeFilters]);
```

Add `setPage(1)` when activeFilters change. Update `setActiveFilters` usage — wrap in a helper:
```typescript
const updateFilters = (newFilters: { grade?: string; status?: string }) => {
  setActiveFilters(newFilters);
  setPage(1);
};
```

Update `removeFilter`:
```typescript
const removeFilter = (key: keyof typeof activeFilters) => {
  const newFilters = { ...activeFilters };
  delete newFilters[key];
  setActiveFilters(newFilters);
  setPage(1);
};
```

- [ ] **Step 5: Fix stats to use backend meta**

Replace:
```typescript
const statsTotal = meta?.total ?? data?.data.length ?? 0;
const statsActive = data?.data.filter(s => s.status === 'ACTIVE').length ?? 0;
const statsInactive = data?.data.filter(s => s.status === 'INACTIVE').length ?? 0;
```

With:
```typescript
const statsTotal = meta?.total ?? 0;
const statsActive = (meta as any)?.active_count ?? 0;
const statsInactive = (meta as any)?.inactive_count ?? 0;
```

- [ ] **Step 6: Update return object**

In the return object, replace `filteredStudents` with a computed value so downstream components don't break:
```typescript
// In return:
filteredStudents: data?.data ?? [],
```

Also export `updateFilters`:
```typescript
updateFilters,
```

- [ ] **Step 7: Update `Students/index.tsx` to use `updateFilters`**

In `sinaloka-platform/src/pages/Students/index.tsx`, find where `s.setActiveFilters` is used (typically in filter component props and clear-all handler) and replace with `s.updateFilters`:

- Replace `onFilterChange={s.setActiveFilters}` with `onFilterChange={s.updateFilters}`
- Replace `s.setActiveFilters({})` (clear all) with `s.updateFilters({})`

This ensures filter changes from the `StudentFilters` component also trigger `setPage(1)`.

- [ ] **Step 8: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add sinaloka-platform/src/pages/Students/useStudentPage.ts sinaloka-platform/src/pages/Students/index.tsx
git commit -m "fix(platform): migrate student filtering to server-side with debounce"
```

---

## Task 4: Frontend — Tutor Server-Side Filtering

**Files:**
- Modify: `sinaloka-platform/src/types/tutor.ts`
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Update `TutorQueryParams` type**

In `sinaloka-platform/src/types/tutor.ts`, replace the `TutorQueryParams` interface:

```typescript
export interface TutorQueryParams extends PaginationParams {
  subject_id?: string;
  is_verified?: boolean;
  sort_by?: 'rating' | 'experience_years' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
}
```

This aligns with the backend's `TutorQuerySchema` which expects `subject_id` (UUID), not `subject` (name). Adding explicit `sort_by`/`sort_order` overrides the loose `string` type from `PaginationParams` for better type safety.

- [ ] **Step 2: Add debounced search and server-side params in `Tutors.tsx`**

In the `Tutors` component, add `useEffect` to the React import (it already imports `useState` and `useMemo`). Note: `useSubjects` is already imported on line 50 — do not add a duplicate.

```typescript
import { useState, useMemo, useEffect } from 'react';
```

After the existing state declarations, add debounce:

```typescript
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
    setPage(1);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

- [ ] **Step 3: Wire server-side params to `useTutors`**

Replace:
```typescript
const { data, isLoading } = useTutors({ page, limit });
```

With:
```typescript
const { data: allSubjects = [] } = useSubjects();

const { data, isLoading } = useTutors({
  page,
  limit,
  search: debouncedSearch || undefined,
  subject_id: filterSubject || undefined,
  sort_by: sortBy,
  sort_order: sortBy === 'name' ? 'asc' : 'desc',
});
```

Note: `filterSubject` state now stores subject UUID (not name). Default sort `rating` desc matches current UI behavior.

- [ ] **Step 4: Remove client-side filtering and fix subject dropdown**

Remove the entire `filteredTutors` useMemo block.

Remove the client-side subject extraction:
```typescript
// DELETE:
const subjects = Array.from(new Set(tutors.flatMap(t => t.tutor_subjects.map(ts => ts.subject.name))));
```

Replace all `filteredTutors` references with `tutors` (which is `data?.data ?? []`).

Update the subject filter dropdown to use `allSubjects` with UUID values:
- Options: `allSubjects.map(s => ({ value: s.id, label: s.name }))`
- `filterSubject` now stores UUID, `setFilterSubject` receives UUID

- [ ] **Step 5: Add `setPage(1)` on filter/sort changes**

After each filter setter, add page reset:

```typescript
// Wrap filter changes to reset page
const handleFilterSubject = (value: string) => {
  setFilterSubject(value);
  setPage(1);
};

const handleSortChange = (value: 'rating' | 'experience_years' | 'name') => {
  setSortBy(value);
  setPage(1);
};
```

Use `handleFilterSubject` and `handleSortChange` in the JSX instead of direct setters.

- [ ] **Step 6: Add pagination UI**

Add pagination section at the bottom of the page (after the grid/list view), following the Students page pattern:

```tsx
{meta && meta.totalPages > 1 && (
  <div className="flex items-center justify-between mt-6">
    <p className="text-sm text-muted-foreground">
      {t('common.pageInfo', { page, totalPages: meta.totalPages, total: meta.total })}
    </p>
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={!meta.hasPreviousPage}
      >
        <ChevronLeft size={16} />
      </Button>
      {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
        .filter(p => Math.abs(p - page) <= 2)
        .map(p => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPage(p)}
          >
            {p}
          </Button>
        ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
        disabled={!meta.hasNextPage}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  </div>
)}
```

Add `ChevronLeft`, `ChevronRight` to lucide imports if not already present.

- [ ] **Step 7: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/types/tutor.ts sinaloka-platform/src/pages/Tutors.tsx
git commit -m "fix(platform): migrate tutor filtering to server-side with pagination"
```

---

## Task 5: Frontend — Expense Total from Backend Meta

**Files:**
- Modify: `sinaloka-platform/src/types/common.ts`
- Modify: `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`

- [ ] **Step 1: Add `ExpenseMeta` type**

In `sinaloka-platform/src/types/common.ts`, add after `PaginatedResponse`:

```typescript
export interface ExpensePaginationMeta extends PaginationMeta {
  total_amount: number;
}
```

- [ ] **Step 2: Replace client-side total with backend meta value**

In `OperatingExpenses.tsx`, replace:

```typescript
const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
```

With:
```typescript
import type { ExpensePaginationMeta } from '@/src/types/common';

const totalExpenses = (expensesData?.meta as ExpensePaginationMeta)?.total_amount ?? 0;
```

Note: Add the import at the top of the file with other type imports.

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/common.ts sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx
git commit -m "fix(platform): use backend total_amount for expense stats"
```

---

## Task 6: Frontend — Command Palette Search

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add search state**

Near the existing `isCommandPaletteOpen` state (~line 58), add:

```typescript
const [paletteSearch, setPaletteSearch] = useState('');
```

- [ ] **Step 2: Wire search input**

Replace the command palette `<input>`:

```tsx
<input
  autoFocus
  placeholder={t('dashboard.commandPalette.searchPlaceholder')}
  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
/>
```

With:

```tsx
<input
  autoFocus
  value={paletteSearch}
  onChange={(e) => setPaletteSearch(e.target.value)}
  placeholder={t('dashboard.commandPalette.searchPlaceholder')}
  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
/>
```

- [ ] **Step 3: Filter actions based on search**

Extract the actions array to a constant above the JSX, then filter it:

```typescript
const quickActions = [
  { icon: UserPlus, label: t('dashboard.commandPalette.enrollNewStudent'), path: '/enrollments', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Receipt, label: t('dashboard.commandPalette.recordNewPayment'), path: '/finance/payments', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Calendar, label: t('dashboard.commandPalette.scheduleMakeupClass'), path: '/schedules', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Users, label: t('dashboard.commandPalette.addNewTutor'), path: '/tutors', color: 'text-violet-500', bg: 'bg-violet-500/10' },
];

const filteredActions = paletteSearch.trim()
  ? quickActions.filter(a => a.label.toLowerCase().includes(paletteSearch.toLowerCase()))
  : quickActions;
```

Then in the JSX, replace the inline array `.map(...)` with `filteredActions.map(...)`.

Add empty state after the map:
```tsx
{filteredActions.length === 0 && (
  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
    {t('common.noResults', { defaultValue: 'No results found' })}
  </div>
)}
```

- [ ] **Step 4: Reset search on open/close**

Update the open handler:
```typescript
onClick={() => { setPaletteSearch(''); setIsCommandPaletteOpen(true); }}
```

The close handler already sets `setIsCommandPaletteOpen(false)` — add reset there too:
```typescript
onClick={() => { setPaletteSearch(''); setIsCommandPaletteOpen(false); }}
```

Also in the backdrop click:
```typescript
onClick={() => { setPaletteSearch(''); setIsCommandPaletteOpen(false); }}
```

- [ ] **Step 5: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Dashboard.tsx
git commit -m "fix(platform): wire command palette search to filter actions"
```

---

## Task 7: Frontend — Registration Detail in Approve/Reject Modals

**Files:**
- Modify: `sinaloka-platform/src/pages/Registrations.tsx`

- [ ] **Step 1: Create shared `RegistrationDetailBlock` component**

Add this component above `ApproveModal` in `Registrations.tsx`:

```typescript
function RegistrationDetailBlock({ registration }: { registration: Registration }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Name & contact */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-1">
        <p className="font-medium text-sm dark:text-zinc-100">{registration.name}</p>
        <p className="text-xs text-zinc-500">
          {registration.email || registration.phone || '—'}
        </p>
      </div>

      {/* Detail fields */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {registration.type === 'STUDENT' && (
          <>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.grade', { defaultValue: 'Grade' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.grade || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.parentName', { defaultValue: 'Parent Name' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.parent_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.parentPhone', { defaultValue: 'Parent Phone' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.parent_phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.parentEmail', { defaultValue: 'Parent Email' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.parent_email || '—'}</p>
            </div>
          </>
        )}
        {registration.type === 'TUTOR' && (
          <>
            <div className="col-span-2">
              <p className="text-xs text-zinc-500 mb-0.5">{t('tutors.form.subjects', { defaultValue: 'Subjects' })}</p>
              <p className="font-medium dark:text-zinc-100">
                {registration.subject_names?.length > 0
                  ? registration.subject_names.join(', ')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('tutors.form.yearsOfExperience', { defaultValue: 'Experience' })}</p>
              <p className="font-medium dark:text-zinc-100">
                {registration.experience_years != null
                  ? `${registration.experience_years} ${t('common.years', { defaultValue: 'years' })}`
                  : '—'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use `RegistrationDetailBlock` in `ApproveModal`**

In `ApproveModal`, replace the existing name/email block:

```tsx
<div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-1">
  <p className="font-medium text-sm dark:text-zinc-100">{registration.name}</p>
  <p className="text-xs text-zinc-500">
    {registration.email ?? registration.phone ?? '—'}
  </p>
</div>
```

With:

```tsx
<RegistrationDetailBlock registration={registration} />
```

- [ ] **Step 3: Use `RegistrationDetailBlock` in `RejectModal`**

Same replacement in `RejectModal` — replace the name/email block with:

```tsx
<RegistrationDetailBlock registration={registration} />
```

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Registrations.tsx
git commit -m "fix(platform): show registration details in approve/reject modals"
```

---

## Task 8: Final Verification & PR

- [ ] **Step 1: Full build check**

```bash
cd sinaloka-backend && npm run build && npm run lint
cd ../sinaloka-platform && npm run build && npm run lint
```

Expected: Both apps build and lint clean.

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "fix: sprint 1 bug fixes — server-side filtering, stats accuracy, UX improvements" --body "$(cat <<'EOF'
## Summary
- **Students**: migrate filtering from client-side to server-side, add debounce, fix active/inactive stats
- **Tutors**: migrate filtering to server-side, add pagination UI, fix subject filter to use UUID
- **Expenses**: use backend aggregate for total instead of per-page sum
- **Dashboard**: wire command palette search input to filter actions
- **Registrations**: show full registration details (grade, parent info, subjects) in approve/reject modals

Fixes issues identified in platform analysis v4.

## Test plan
- [ ] Students: search finds students across all pages, filter resets to page 1, stats consistent
- [ ] Tutors: search/filter uses server-side, pagination works, sort defaults to rating desc
- [ ] Expenses: total amount consistent across pages, changes with filters
- [ ] Dashboard: command palette search filters actions, resets on open/close
- [ ] Registrations: approve/reject modals show student grade/parent or tutor subjects/experience

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
