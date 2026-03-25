# Phase 2: Data Display UI Components Design

**Date**: 2026-03-18
**Scope**: sinaloka-platform — add 7 components to `src/components/UI.tsx`
**Goal**: Centralize data display patterns (tables, empty states, stats, pagination, avatars, spinners, dividers).
**Parent**: `docs/superpowers/specs/2026-03-18-ui-component-centralization-roadmap.md`

---

## Components

### 1. DataTable

Wraps `<table>` with consistent thead/tbody styling. Uses subcomponents for composition.

```typescript
interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}
interface DataTableHeaderProps {
  children: React.ReactNode;
}
interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}
interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  header?: boolean;
}
```

```tsx
<DataTable>
  <DataTable.Header>
    <DataTable.Cell header>Name</DataTable.Cell>
    <DataTable.Cell header>Status</DataTable.Cell>
  </DataTable.Header>
  <DataTable.Row>
    <DataTable.Cell>John</DataTable.Cell>
    <DataTable.Cell><Badge>Active</Badge></DataTable.Cell>
  </DataTable.Row>
</DataTable>
```

Styling:
- Table: `w-full text-left border-collapse`
- Header row: `bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800`
- Header cell: `px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`
- Body: `divide-y divide-zinc-100 dark:divide-zinc-800`
- Body row: `hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors`
- Body cell: `px-6 py-4`

### 2. EmptyState

Icon + heading + hint + optional action.

```typescript
interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

```tsx
<EmptyState
  icon={Search}
  title={t('students.noStudentsFound')}
  description={t('students.noStudentsHint')}
  action={<Button variant="outline">{t('common.clearAllFilters')}</Button>}
/>
```

Styling:
- Container: `flex flex-col items-center justify-center py-20 text-center`
- Icon circle: `w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4`
- Icon: `text-zinc-300` at `size={32}`
- Title: `text-lg font-bold mb-1`
- Description: `text-zinc-500 text-sm mb-6`

### 3. StatCard

Compact metric display with optional icon.

```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBg?: string;    // e.g. "bg-emerald-50 dark:bg-emerald-900/20"
  iconColor?: string; // e.g. "text-emerald-600"
  className?: string;
}
```

```tsx
<StatCard
  label={t('dashboard.totalStudents')}
  value="1,234"
  icon={Users}
  iconBg="bg-emerald-50 dark:bg-emerald-900/20"
  iconColor="text-emerald-600"
/>
```

Styling:
- Container: Card with `p-4` (or `p-6` via className)
- Label: `text-[10px] font-bold text-zinc-400 uppercase tracking-widest`
- Value: `text-2xl font-bold tracking-tight dark:text-zinc-100 mt-1`

### 4. Pagination

Prev/next + page numbers with "Showing X to Y of Z results" text.

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}
```

```tsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  total={total}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
/>
```

Styling matches existing StudentPayments pagination. Shows max 5 page buttons. Includes i18n via `useTranslation()` for "Showing", "to", "of", "results".

### 5. Avatar

Initials-based avatar with size variants.

```typescript
interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

```tsx
<Avatar name="John Doe" size="lg" />
<Avatar name="Jane" size="sm" />
```

Sizes:
- `sm`: `w-8 h-8 rounded-full text-xs` — light bg (`bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400`)
- `md`: `w-10 h-10 rounded-xl text-sm` — dark bg (`bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900`)
- `lg`: `w-16 h-16 rounded-2xl text-2xl shadow-lg` — dark bg

Initial: last word's first character (`name.split(' ').pop()?.charAt(0)`)

### 6. Spinner

Simple loading indicator, sizes matching button usage.

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}
```

```tsx
<Spinner size="sm" /> // 16px, for inside buttons
<Spinner />           // 20px default
```

Renders the existing SVG pattern with `animate-spin`.

### 7. Separator

Horizontal divider.

```typescript
interface SeparatorProps {
  className?: string;
}
```

```tsx
<Separator />
<Separator className="my-4" />
```

Styling: `h-px bg-zinc-100 dark:bg-zinc-800`

---

## Files Changed

| File | Change |
|---|---|
| `src/components/UI.tsx` | Add 7 components (~150 lines total) |

## Out of Scope

- Page migration (Phase 3)
- i18n keys for Pagination info text (already exist in `common.*`)
