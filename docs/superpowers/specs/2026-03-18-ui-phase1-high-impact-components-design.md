# Phase 1: High-Impact Missing UI Components Design

**Date**: 2026-03-18
**Scope**: sinaloka-platform — add Select, DropdownMenu, Tabs, PageHeader to `src/components/UI.tsx`
**Goal**: Create 4 reusable components that eliminate the largest amount of duplicated UI code across the platform.
**Parent**: `docs/superpowers/specs/2026-03-18-ui-component-centralization-roadmap.md`

---

## Problem

The platform has 4 common UI patterns repeated inline across pages without centralized components:

1. **27 raw `<select>` elements** with identical 3-line class strings across 11 pages
2. **6+ inline dropdown action menus** each with ~40 lines of click-outside state, useRef, useEffect, and absolute positioning
3. **4 manual tab implementations** with identical button styling and state management
4. **19 inline page headers** repeating the same h2 + subtitle + flex layout

---

## Component 1: Select

### Props

```typescript
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}
```

### Usage

```tsx
<Select
  value={filterStatus}
  onChange={setFilterStatus}
  options={[
    { value: 'all', label: t('common.allStatuses') },
    { value: 'PAID', label: t('common.paid') },
    { value: 'PENDING', label: t('common.pending') },
  ]}
/>
```

### Implementation

- Renders a native `<select>` element with consistent styling
- Styling matches existing raw selects: `h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100`
- Maps `options` array to `<option>` elements
- Calls `onChange` with the selected value string (not the event)
- Supports optional `className` for overrides

### Pages Affected (27 instances across 11 pages)

Students (2), Tutors (2), Classes (5), Schedules (4), Enrollments (2), Settings (3), StudentPayments (3), TutorPayouts (2), OperatingExpenses (2), SuperAdmin/InstitutionForm (1), SuperAdmin/Users (1)

---

## Component 2: DropdownMenu

### Props

```typescript
interface DropdownMenuItem {
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

type DropdownMenuItemOrSeparator = DropdownMenuItem | { separator: true };

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItemOrSeparator[];
  align?: 'left' | 'right';
}
```

### Usage

```tsx
<DropdownMenu
  trigger={<MoreHorizontal size={18} />}
  align="right"
  items={[
    { label: t('tutors.menu.editProfile'), icon: FileText, onClick: () => handleEdit(tutor) },
    { separator: true },
    { label: t('tutors.menu.deleteTutor'), icon: XCircle, onClick: () => handleDelete(tutor.id), variant: 'danger' },
  ]}
/>
```

### Implementation

- Trigger button with consistent hover styling (p-1.5, rounded-lg, text-zinc-400 hover states)
- Internal `isOpen` state — no external state management needed
- Click-outside close via `useRef` + `mousedown` event listener
- Escape key close via `keydown` listener
- Positioned absolutely below trigger, aligned left or right (default: right)
- Menu items: `w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg`
- Danger variant: `hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600`
- Separator: `h-px bg-zinc-100 dark:bg-zinc-800 my-1`
- Menu container: `w-48 bg-white dark:bg-zinc-900 border rounded-xl shadow-xl z-10 p-1`
- Auto-closes when any item is clicked

### Pages Affected (6+ instances)

Tutors (2 — grid and list), Enrollments (1), Schedules (1), FinanceOverview (1), Students (1), Dashboard (1)

---

## Component 3: Tabs

### Props

```typescript
interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
  className?: string;
}
```

### Usage

```tsx
<Tabs
  value={activeTab}
  onChange={setActiveTab}
  items={[
    { value: 'general', label: t('settings.tabs.general') },
    { value: 'billing', label: t('settings.tabs.billing') },
    { value: 'branding', label: t('settings.tabs.branding') },
  ]}
/>
```

### Implementation

- Container: `flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg`
- Each tab button: `px-3 py-1.5 text-xs font-bold rounded-md transition-all`
- Active tab: `bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100`
- Inactive tab: `text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300`
- Controlled only — parent manages `value` state

### Pages Affected (4 instances)

Settings (6 tabs), WhatsApp (3 tabs), SuperAdmin/InstitutionDetail (3 tabs), FinanceOverview (4 period tabs)

---

## Component 4: PageHeader

### Props

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
```

### Usage

```tsx
<PageHeader
  title={t('students.title')}
  subtitle={t('students.subtitle')}
  actions={
    <div className="flex items-center gap-3">
      <Button variant="outline"><Import size={16} /> Import</Button>
      <Button><Plus size={16} /> Add Student</Button>
    </div>
  }
/>
```

### Implementation

- Container: `flex flex-col md:flex-row md:items-center justify-between gap-4`
- Title: `text-2xl font-bold tracking-tight dark:text-zinc-100`
- Subtitle: `text-zinc-500 text-sm`
- Actions rendered on the right side (flex end on md+)

### Pages Affected

All 19 pages.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/UI.tsx` | Add Select, DropdownMenu, Tabs, PageHeader components (~150 lines total) |

## No Other Changes in Phase 1

Phase 1 only creates the components. Page migration happens in Phase 3 per the roadmap.

## Out of Scope

- Page migration (Phase 3)
- Component file split (Phase 4)
- shadcn migration (Phase 5)
- Other missing components (Table, EmptyState, etc. — Phase 2)
