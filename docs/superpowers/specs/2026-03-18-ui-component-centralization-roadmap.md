# UI Component Centralization & shadcn Migration Roadmap

**Date**: 2026-03-18
**Scope**: sinaloka-platform — full UI component system overhaul
**Goal**: Centralize all repeated UI patterns into reusable components, then migrate internals to shadcn/ui for a production-grade component library.

---

## Current State

### What Exists (16 components in UI.tsx)

| Component | Status | Used By |
|---|---|---|
| Card | Centralized | All 19 pages |
| Button | Centralized | All 19 pages |
| Input | Centralized | 13 pages |
| PasswordInput | Centralized | 4 pages |
| SearchInput | Centralized | 10 pages |
| Label | Centralized | 13 pages |
| Badge | Centralized | 17 pages |
| Progress | Centralized | 2 pages |
| Checkbox | Centralized | 6 pages |
| Switch | Centralized | 7 pages |
| Slider | Centralized (unused) | 0 pages — candidate for removal |
| Skeleton | Centralized | 12 pages |
| Modal | Centralized | 11 pages |
| ConfirmDialog | Centralized | 5 pages |
| Drawer | Centralized | 7 pages |
| MultiSelect | Centralized | 1 page (Tutors) |

### What's Missing (repeated inline patterns, not centralized)

| Missing Component | Raw Pattern | Instances | Pages Affected |
|---|---|---|---|
| **Select** | Raw `<select>` with identical 3-line class strings | 27 | Students, Tutors, Classes, Schedules, Enrollments, Settings, Finance, SuperAdmin |
| **DropdownMenu** | Inline absolute-positioned menus with click-outside state | 6+ | Tutors, Enrollments, Schedules, FinanceOverview, Students, Dashboard |
| **Tabs** | Manual button state with identical styling | 4 | Settings, WhatsApp, InstitutionDetail, FinanceOverview |
| **PageHeader** | Inline `<h2>` + `<p>` subtitle | 19 | Every single page |
| **Table** | Raw `<table>` with repeated thead/tbody/tr styling | 19 | Nearly every data page |
| **EmptyState** | Icon + heading + hint card pattern | 8+ | Students, Tutors, Classes, Schedules, Enrollments, Payments, Payouts, Expenses |
| **StatCard** | Card + uppercase label + bold value | 5+ | Dashboard, FinanceOverview, StudentPayments, Enrollments |
| **Pagination** | Manual prev/next buttons with page state | 4 | StudentPayments, Institutions, Enrollments, Classes |
| **Avatar** | Inline rounded div with name initials | 20+ | Students, Tutors, Enrollments |
| **Spinner** | Inline SVG `animate-spin` in buttons | 10+ | Multiple pages |
| **Separator** | `h-px bg-zinc-100` dividers | 15+ | Multiple pages |
| **Tooltip** | None exists — title attributes used | — | Action buttons |

### Codebase Stats

- **19 pages** totaling ~11,000 lines
- **10 component files** in `src/components/`
- **TailwindCSS v4** with zinc palette, Inter font, class-based dark mode
- **No shadcn/ui** installed yet
- **Lucide React** for icons (already shadcn-compatible)
- **Framer Motion** for animations (Modal, Drawer, ConfirmDialog)

---

## Roadmap

### Phase 1: High-Impact Missing Components

**Goal**: Create the most-needed reusable components that eliminate the largest amount of duplicated code.

**Components to add:**
- **Select** — styled dropdown matching the design system, replaces 27 raw `<select>` elements
- **DropdownMenu** — click-triggered popover menu with items, replaces 6+ inline implementations
- **Tabs** — tab group with active state management, replaces 4 manual implementations
- **PageHeader** — title + subtitle layout, replaces inline pattern on every page

**Estimated impact**: Eliminates ~200 lines of duplicated styling and ~100 lines of duplicated state management across pages.

**Deliverable**: New components in `src/components/UI.tsx` (or split into individual files if UI.tsx grows too large).

---

### Phase 2: Data Display Components

**Goal**: Centralize data display patterns used across table-heavy pages.

**Components to add:**
- **Table** — wrapper with Head, Body, Row, Cell subcomponents matching the design system
- **EmptyState** — icon + heading + hint with consistent layout
- **StatCard** — compact metric display (label + value + optional icon/color)
- **Pagination** — prev/next/page buttons with page state
- **Avatar** — initials-based avatar with color derivation from name
- **Spinner** — loading indicator for buttons and inline use
- **Separator** — horizontal divider with consistent styling

**Estimated impact**: Eliminates ~500 lines of repeated table/pagination/stat styling across all data pages.

**Deliverable**: New components added to the component library.

---

### Phase 3: Page Migration

**Goal**: Update all 19 pages to use the new centralized components. No new components — just replacing inline patterns with imports.

**Migration order** (by complexity, easiest first):
1. Login, NotFound (trivial — already mostly centralized)
2. Institutions, InstitutionForm, InstitutionDetail (SuperAdmin — lower traffic)
3. Users (SuperAdmin)
4. Dashboard (medium — stat cards, page header)
5. WhatsApp (medium — tabs, table)
6. OperatingExpenses (medium — table, pagination, drawer)
7. TutorPayouts (high — table, reconciliation view)
8. StudentPayments (high — table, batch modal, pagination)
9. FinanceOverview (high — multiple tables, charts, stat cards)
10. Attendance (high — session list, attendance table)
11. Settings (high — tabs, many forms, multiple selects)
12. Tutors (high — grid/list, dropdown menus, table)
13. Enrollments (very high — bulk ops, table, dropdown menus)
14. Schedules (very high — calendar, session table, drawer)
15. Classes (very high — schedule management, timetable, table)
16. Students (very high — bulk ops, import/export, dual view)

**Deliverable**: Every page imports from the centralized component library. Zero raw `<select>`, zero inline dropdown menus, zero repeated table styling.

---

### Phase 4: Component File Split

**Goal**: Split the monolithic `UI.tsx` into individual component files before shadcn migration.

**Structure**:
```
src/components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── checkbox.tsx
│   ├── switch.tsx
│   ├── select.tsx
│   ├── multi-select.tsx
│   ├── dropdown-menu.tsx
│   ├── tabs.tsx
│   ├── table.tsx
│   ├── dialog.tsx          (Modal)
│   ├── alert-dialog.tsx    (ConfirmDialog)
│   ├── sheet.tsx           (Drawer)
│   ├── skeleton.tsx
│   ├── progress.tsx
│   ├── avatar.tsx
│   ├── pagination.tsx
│   ├── separator.tsx
│   ├── spinner.tsx
│   ├── tooltip.tsx
│   ├── page-header.tsx
│   ├── stat-card.tsx
│   └── empty-state.tsx
├── layout.tsx
├── super-admin-layout.tsx
├── protected-route.tsx
└── (feature components...)
```

**Deliverable**: Each component in its own file, barrel export from `src/components/ui/index.ts`. All page imports updated.

---

### Phase 5: shadcn/ui Migration

**Goal**: Replace custom component internals with shadcn/ui primitives. Pages don't change — only component files change.

**Prerequisites**:
- Install shadcn/ui CLI and configure `components.json`
- Set up CSS variables for shadcn theme (map zinc palette)
- Configure TailwindCSS v4 compatibility

**Migration mapping**:

| Current Component | shadcn Component | Notes |
|---|---|---|
| Button | `button` | Direct replacement, map variants |
| Input | `input` | Direct replacement |
| Label | `label` | Direct replacement |
| Card | `card` | Map to Card + CardHeader + CardContent |
| Badge | `badge` | Map variant names |
| Checkbox | `checkbox` | Different API — shadcn uses Radix |
| Switch | `switch` | Different API — shadcn uses Radix |
| Select | `select` | Replace with shadcn Select (Radix-based) |
| MultiSelect | Custom (keep) | No shadcn equivalent — keep custom or use cmdk |
| Modal → Dialog | `dialog` | Radix-based, different API |
| ConfirmDialog → AlertDialog | `alert-dialog` | Radix-based |
| Drawer → Sheet | `sheet` | Radix-based |
| DropdownMenu | `dropdown-menu` | Radix-based |
| Tabs | `tabs` | Radix-based |
| Table | `table` | Direct replacement |
| Skeleton | `skeleton` | Direct replacement |
| Progress | `progress` | Radix-based |
| Avatar | `avatar` | Radix-based with fallback |
| Pagination | `pagination` | shadcn pattern |
| Separator | `separator` | Radix-based |
| Tooltip | `tooltip` | Radix-based (new) |
| Spinner | Custom (keep) | No shadcn equivalent |
| PageHeader | Custom (keep) | App-specific layout |
| StatCard | Custom (keep) | App-specific layout |
| EmptyState | Custom (keep) | App-specific layout |

**Key decisions**:
- **Framer Motion** stays for page transitions and custom animations
- **Radix UI** comes in via shadcn for accessible primitives (Select, Dialog, Tabs, etc.)
- **Sonner** stays for toasts (shadcn recommends it)
- **Lucide** stays for icons (shadcn uses it)
- **clsx + tailwind-merge** stay (shadcn uses the same `cn()` pattern)

**Deliverable**: All components powered by shadcn/Radix primitives. Accessible, consistent, production-grade.

---

## Timeline Estimate

| Phase | Scope | Size |
|---|---|---|
| Phase 1 | Select, DropdownMenu, Tabs, PageHeader | Small (4 new components) |
| Phase 2 | Table, EmptyState, StatCard, Pagination, Avatar, Spinner, Separator | Medium (7 new components) |
| Phase 3 | Migrate all 19 pages | Large (11K lines touched) |
| Phase 4 | Split UI.tsx into individual files | Medium (file restructure) |
| Phase 5 | shadcn/ui migration | Large (component rewrites) |

**Each phase gets its own**: spec → plan → implementation → PR → merge cycle.

---

## Cleanup & Removal After Full Migration

- Remove `Slider` component (unused after tutor form changes)
- Remove `SearchInput` if replaced by shadcn Input with search icon composition
- Remove old `UI.tsx` monolith after Phase 4 split
- Update E2E page objects after any component API changes
- Update `sinaloka-tutors` and `sinaloka-parent` apps if they share components (currently they don't — they have their own inline UI)

---

## Principles

1. **No page should break between phases** — each phase is independently deployable
2. **Component API stability** — props interfaces should remain stable through Phase 3→4→5 transitions
3. **Dark mode always works** — every component must support class-based dark mode
4. **i18n always works** — no hardcoded English strings in components
5. **Accessibility improves** — shadcn/Radix brings ARIA attributes, keyboard navigation, focus management
6. **Performance stays** — no unnecessary re-renders from component library changes
