# Phase 2: Data Display UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 reusable data display components (DataTable, EmptyState, StatCard, Pagination, Avatar, Spinner, Separator) to the centralized UI library.

**Architecture:** All 7 components appended to `src/components/UI.tsx` (currently 570 lines). Each is self-contained. Pagination uses `useTranslation()` for info text — requires adding `react-i18next` import. DataTable uses subcomponent pattern via static properties.

**Tech Stack:** React, TypeScript, TailwindCSS v4, react-i18next (Pagination only), Lucide (ChevronLeft/ChevronRight for Pagination)

**Spec:** `docs/superpowers/specs/2026-03-18-ui-phase2-data-display-components-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/UI.tsx` | Add 7 components after PageHeader (~150 lines) |

---

### Task 1: Add Separator and Spinner (simplest components)

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add Separator and Spinner after PageHeader**

Append to UI.tsx:

```tsx
// ── Separator ──
export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px bg-zinc-100 dark:bg-zinc-800", className)} />
);

// ── Spinner ──
export const Spinner = ({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) => (
  <svg
    className={cn("animate-spin", size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', className)}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add Separator and Spinner components"
```

---

### Task 2: Add Avatar component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add Avatar after Spinner**

```tsx
// ── Avatar ──
export const Avatar = ({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const initial = name.split(' ').pop()?.charAt(0)?.toUpperCase() ?? '?';
  const sizes = {
    sm: 'w-8 h-8 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    md: 'w-10 h-10 rounded-xl text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
    lg: 'w-16 h-16 rounded-2xl text-2xl shadow-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
  };
  return (
    <div className={cn("flex items-center justify-center font-bold", sizes[size], className)}>
      {initial}
    </div>
  );
};
```

- [ ] **Step 2: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add Avatar component with size variants"
```

---

### Task 3: Add EmptyState and StatCard

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add EmptyState after Avatar**

```tsx
// ── EmptyState ──
export const EmptyState = ({ icon: Icon, title, description, action }: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {Icon && (
      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-zinc-300" />
      </div>
    )}
    <h3 className="text-lg font-bold mb-1 dark:text-zinc-100">{title}</h3>
    {description && <p className="text-zinc-500 text-sm mb-6">{description}</p>}
    {action}
  </div>
);
```

- [ ] **Step 2: Add StatCard after EmptyState**

```tsx
// ── StatCard ──
export const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, className }: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBg?: string;
  iconColor?: string;
  className?: string;
}) => (
  <Card className={cn("p-4", className)}>
    {Icon && (
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-xl", iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    )}
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
    <p className="text-xl font-bold tracking-tight dark:text-zinc-100 mt-1">{String(value)}</p>
  </Card>
);
```

- [ ] **Step 3: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add EmptyState and StatCard components"
```

---

### Task 4: Add DataTable component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add DataTable after StatCard**

This uses a subcomponent pattern with static properties on the main component.

```tsx
// ── DataTable ──
const DataTableRoot = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <table className={cn("w-full text-left border-collapse", className)}>
    {children}
  </table>
);

const DataTableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead>
    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
      {children}
    </tr>
  </thead>
);

const DataTableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
    {children}
  </tbody>
);

const DataTableRow = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors", className)} {...props}>
    {children}
  </tr>
);

const DataTableCell = ({ children, header, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { header?: boolean }) => {
  if (header) {
    return (
      <th className={cn("px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider", className)} {...(props as any)}>
        {children}
      </th>
    );
  }
  return (
    <td className={cn("px-6 py-4", className)} {...props}>
      {children}
    </td>
  );
};

export const DataTable = Object.assign(DataTableRoot, {
  Header: DataTableHeader,
  Body: DataTableBody,
  Row: DataTableRow,
  Cell: DataTableCell,
});
```

- [ ] **Step 2: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add DataTable component with subcomponent pattern"
```

---

### Task 5: Add Pagination component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add imports for Pagination**

At the top of UI.tsx, add `useTranslation` import and `ChevronLeft`/`ChevronRight` icons. Update line 4:

```tsx
import { X, Search, Check, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
```

Add after the React import (line 1):

```tsx
import { useTranslation } from 'react-i18next';
```

- [ ] **Step 2: Add Pagination after DataTable**

```tsx
// ── Pagination ──
export const Pagination = ({ currentPage, totalPages, total, itemsPerPage, onPageChange, className }: {
  currentPage: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const from = Math.min((currentPage - 1) * itemsPerPage + 1, total);
  const to = Math.min(currentPage * itemsPerPage, total);
  const maxButtons = 5;
  const startPage = Math.max(1, Math.min(currentPage - Math.floor(maxButtons / 2), totalPages - maxButtons + 1));
  const pages = Array.from({ length: Math.min(maxButtons, totalPages) }, (_, i) => startPage + i);

  if (totalPages <= 1 && total <= itemsPerPage) return null;

  return (
    <div className={cn("p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30", className)}>
      <p className="text-xs text-zinc-500">
        {t('common.showing')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{from}</span> {t('common.to')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{to}</span> {t('common.of')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{total}</span> {t('common.results')}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-8 h-8 text-xs font-bold rounded-lg transition-all",
                currentPage === page
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              )}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add Pagination component with i18n info text"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run type check and build**

```bash
cd sinaloka-platform && npm run lint && npm run build
```
Expected: Both PASS

- [ ] **Step 2: Verify all exports**

All 7 new components should be importable:
```tsx
import { DataTable, EmptyState, StatCard, Pagination, Avatar, Spinner, Separator } from '../components/UI';
```
