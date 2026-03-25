# Pages Refactor Batch — Design Spec

**Date:** 2026-03-18
**Scope:** Split 4 remaining large pages into directory-per-page structure
**Type:** Pure refactor — no behavior changes
**Pattern:** Replicates the Students page refactor (PR #18)

---

## Pages to Refactor

### 1. Classes.tsx (1,123 lines) → `pages/Classes/`

```
pages/Classes/
  index.tsx               — Orchestrator: header, stats, view toggle, pagination
  useClassesPage.ts       — 27 useState + queries + handlers
  ClassTable.tsx           — Table with columns, action menus
  ClassFormModal.tsx        — Add/Edit class form (schedules, fees, tutor)
  ClassDetailDrawer.tsx     — Class detail: tutor, schedules, students, actions
  GenerateSessionsModal.tsx — Session generation with date range
  ClassDeleteModal.tsx      — Delete confirmation
  ClassFilters.tsx          — Search, subject filter, status filter
```

### 2. Schedules.tsx (893 lines) → `pages/Schedules/`

```
pages/Schedules/
  index.tsx                — Orchestrator: calendar header, view switcher
  useSchedulesPage.ts      — 19 useState + queries + handlers
  ScheduleFilters.tsx       — Date, class, status filters
  CalendarMonth.tsx         — Month grid view
  CalendarWeek.tsx          — Week view
  CalendarDay.tsx           — Day view
  ScheduleSessionModal.tsx  — Create/edit session modal
  GenerateSessionsModal.tsx — Auto-generate sessions
  SessionDetailDrawer.tsx   — Session detail with attendance
```

### 3. Enrollments.tsx (849 lines) → `pages/Enrollments/`

```
pages/Enrollments/
  index.tsx                 — Orchestrator: header, stats, bulk bar
  useEnrollmentsPage.ts     — 20 useState + queries + handlers
  EnrollmentTable.tsx        — Table with filters inline
  EnrollmentStats.tsx        — Stats overview cards
  NewEnrollmentModal.tsx     — Two-column enrollment form
  EditEnrollmentModal.tsx    — Edit enrollment modal
  BulkImportModal.tsx        — CSV bulk import
  BulkDeleteModal.tsx        — Bulk delete confirmation
```

### 4. Settings.tsx (731 lines) → `pages/Settings/`

```
pages/Settings/
  index.tsx              — Orchestrator: sidebar nav + tab routing
  useSettingsPage.ts     — 22 useState + save handlers
  tabs/GeneralTab.tsx     — Institution info form
  tabs/BillingTab.tsx     — Billing mode, currency, bank accounts, categories
  tabs/BrandingTab.tsx    — Color/logo customization
  tabs/AcademicTab.tsx    — Rooms, subjects
  tabs/SecurityTab.tsx    — Password/auth settings
  tabs/IntegrationsTab.tsx — Third-party integrations
```

---

## Pattern Rules (same as Students)

1. **`index.tsx`** — Orchestrator that imports `usePageHook()` and all sub-components. Contains layout, stats, pagination.
2. **`usePageHook.ts`** — All useState, query hooks, mutation hooks, handlers, derived values. Returns flat object.
3. **Sub-components** — Stateless (props in, callbacks out). Exception: components with `useRef` for DOM elements (e.g., file inputs) hold local state.
4. **Import paths** — `../../components/UI`, `../../lib/utils`, `@/src/hooks/...`
5. **Routing** — No changes. `pages/X/index.tsx` resolves automatically.
6. **Named export preserved** — `export const X = () => { ... }` in `index.tsx`

---

## Execution Strategy

- 4 parallel branches, each with one PR
- Each branch created from master in an isolated git worktree
- Each page split by a subagent independently
- Verify build after each split
- Merge one by one after review

---

## Testing (per page)

- `npm run lint` — TypeScript passes
- `npm run build` — Production build succeeds
- Manual browser check — page loads, all features work
