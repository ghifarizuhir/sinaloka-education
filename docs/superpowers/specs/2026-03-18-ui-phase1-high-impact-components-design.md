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
3. **3 manual tab implementations** with identical pill-style button styling and state management (Settings uses a vertical sidebar nav — different component, out of scope)
4. **19 inline page headers** repeating the same h2 + subtitle + flex layout

---

## Component 1: Select

### Props

```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | SelectOptionGroup)[];
  placeholder?: string;
}
```

### Usage

```tsx
// Simple flat options
<Select
  value={filterStatus}
  onChange={setFilterStatus}
  options={[
    { value: 'all', label: t('common.allStatuses') },
    { value: 'PAID', label: t('common.paid') },
    { value: 'PENDING', label: t('common.pending') },
  ]}
/>

// Grouped options (optgroup)
<Select
  value={selectedGrade}
  onChange={setSelectedGrade}
  options={[
    { label: 'SMP', options: [
      { value: '7', label: 'Kelas 7' },
      { value: '8', label: 'Kelas 8' },
    ]},
    { label: 'SMA', options: [
      { value: '10', label: 'Kelas 10' },
    ]},
  ]}
/>
```

### Implementation

- Renders a native `<select>` element with consistent styling
- Styling: `h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:text-zinc-100`
- Uses `focus-visible:` (not `focus:`) to match existing Input component convention — ring only shows on keyboard navigation
- Detects grouped vs flat options: if an item has `options` array property, renders as `<optgroup>`
- Calls `onChange` with the selected value string (not the event)
- Spreads remaining HTML select attributes (`name`, `id`, `required`, `disabled`, etc.) via `...rest` props

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
  className?: string;
  disabled?: boolean;
}

type DropdownMenuEntry =
  | DropdownMenuItem
  | { separator: true }
  | { content: React.ReactNode };

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuEntry[];
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

// Custom color via className
{ label: 'Approve', icon: CheckCircle, onClick: handleApprove, className: 'text-emerald-600' }

// Non-interactive content (e.g. info message)
{ content: <div className="px-3 py-2 text-xs text-zinc-400 flex items-center gap-1"><Lock size={12} /> Locked</div> }
```

### Implementation

- Trigger button with consistent hover styling (p-1.5, rounded-lg, text-zinc-400 hover states)
- Internal `isOpen` state — no external state management needed
- Click-outside close via `useRef` + `mousedown` event listener
- Escape key close via `keydown` listener
- Enter/exit animation via `AnimatePresence` + `motion.div` (matches existing Modal/Drawer pattern)
- Positioned absolutely below trigger, aligned left or right (default: right)
- Menu items: `w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg`
- Danger variant: `hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600`
- Custom colors via `className` prop on items (overrides default text color)
- Disabled items: `opacity-50 cursor-not-allowed` with click handler suppressed
- Separator: `h-px bg-zinc-100 dark:bg-zinc-800 my-1`
- Content entries: rendered as-is (no click handler, no hover styling)
- Menu container: `w-48 bg-white dark:bg-zinc-900 border rounded-xl shadow-xl z-10 p-1`
- Auto-closes when any non-disabled item is clicked

### Pages Affected (6+ instances)

Tutors (2 — grid and list), Enrollments (1), Schedules (1), FinanceOverview (1), Students (1), Dashboard (1)

---

## Component 3: Tabs

### Props

```typescript
interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  items: TabItem[];
  className?: string;
}
```

### Usage

```tsx
<Tabs
  value={activeTab}
  onChange={setActiveTab}
  items={[
    { value: 'messages', label: t('whatsapp.tabs.messages') },
    { value: 'reminders', label: t('whatsapp.tabs.paymentReminders') },
    { value: 'settings', label: t('whatsapp.tabs.settings'), disabled: !isConfigured },
  ]}
/>
```

### Implementation

- Container: `flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg`
- Each tab button: `px-3 py-1.5 text-xs font-bold rounded-md transition-all`
- Active tab: `bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100`
- Inactive tab: `text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300`
- Disabled tab: `opacity-40 cursor-not-allowed` (click suppressed)
- Controlled only — parent manages `value` state

### Pages Affected (3 instances)

WhatsApp (3 tabs), SuperAdmin/InstitutionDetail (3 tabs), FinanceOverview (4 period tabs)

> **Note**: Settings page uses a vertical sidebar navigation pattern — this is a fundamentally different component and is NOT covered by Tabs. Settings will be addressed separately (either as a `VerticalNav` component in Phase 2 or kept as-is).

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

> **Note**: The `dark:text-zinc-100` on the title is intentionally included. Some pages currently omit this — the centralized component will fix a dark mode inconsistency on ~11 pages.

### Pages Affected

All 19 pages.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/UI.tsx` | Add Select, DropdownMenu, Tabs, PageHeader components (~200 lines total) |

## No Other Changes in Phase 1

Phase 1 only creates the components. Page migration happens in Phase 3 per the roadmap.

## Out of Scope

- Page migration (Phase 3)
- Component file split (Phase 4)
- shadcn migration (Phase 5)
- Other missing components (Table, EmptyState, etc. — Phase 2)
- Settings sidebar navigation (different pattern from Tabs)
- Vertical/sidebar tab variant
