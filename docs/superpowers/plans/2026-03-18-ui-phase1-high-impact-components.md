# Phase 1: High-Impact UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 reusable UI components (Select, DropdownMenu, Tabs, PageHeader) to the centralized component library.

**Architecture:** All 4 components are added to the existing `src/components/UI.tsx` file (currently 407 lines, will grow to ~600). Each component is self-contained with no dependencies on external libraries beyond what's already imported (React, motion, cn utility). Phase 1 only creates components — page migration happens in Phase 3.

**Tech Stack:** React, TypeScript, TailwindCSS v4, Framer Motion (motion/react)

**Spec:** `docs/superpowers/specs/2026-03-18-ui-phase1-high-impact-components-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/UI.tsx` | Add Select, DropdownMenu, Tabs, PageHeader (append after MultiSelect) |

---

### Task 1: Add Select Component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add the Select component after MultiSelect (after line 407)**

Append to the end of UI.tsx:

```tsx
// ── Select ──
function isOptionGroup(opt: any): opt is { label: string; options: { value: string; label: string; disabled?: boolean }[] } {
  return 'options' in opt;
}

export const Select = ({ value, onChange, options, placeholder, className, ...rest }: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  options: ({ value: string; label: string; disabled?: boolean } | { label: string; options: { value: string; label: string; disabled?: boolean }[] })[];
  placeholder?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      "h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 dark:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...rest}
  >
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map((opt, i) =>
      isOptionGroup(opt) ? (
        <optgroup key={i} label={opt.label}>
          {opt.options.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </optgroup>
      ) : (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      )
    )}
  </select>
);
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add Select component with optgroup support"
```

---

### Task 2: Add DropdownMenu Component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add the DropdownMenu component after Select**

Append to UI.tsx:

```tsx
// ── DropdownMenu ──
export function DropdownMenu({ trigger, items, align = 'right' }: {
  trigger: React.ReactNode;
  items: (
    | { label: string; icon?: React.ComponentType<{ size?: number }>; onClick: () => void; variant?: 'default' | 'danger'; className?: string; disabled?: boolean }
    | { separator: true }
    | { content: React.ReactNode }
  )[];
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1",
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, i) => {
              if ('separator' in item) {
                return <div key={i} className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />;
              }
              if ('content' in item) {
                return <div key={i}>{item.content}</div>;
              }
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => { if (!item.disabled) { item.onClick(); setIsOpen(false); } }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                    item.disabled && "opacity-50 cursor-not-allowed",
                    item.variant === 'danger'
                      ? "hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    item.className
                  )}
                >
                  {Icon && <Icon size={14} />}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add DropdownMenu component with animation and click-outside"
```

---

### Task 3: Add Tabs Component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add the Tabs component after DropdownMenu**

Append to UI.tsx:

```tsx
// ── Tabs ──
export const Tabs = ({ value, onChange, items, className }: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; disabled?: boolean }[];
  className?: string;
}) => (
  <div className={cn("flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg", className)}>
    {items.map(item => (
      <button
        key={item.value}
        type="button"
        disabled={item.disabled}
        onClick={() => !item.disabled && onChange(item.value)}
        className={cn(
          "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
          value === item.value
            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
          item.disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add Tabs component with controlled state and disabled support"
```

---

### Task 4: Add PageHeader Component

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Add the PageHeader component after Tabs**

Append to UI.tsx:

```tsx
// ── PageHeader ──
export const PageHeader = ({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">{title}</h2>
      {subtitle && <p className="text-zinc-500 text-sm">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add PageHeader component with title, subtitle, and actions slot"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run full type check**

```bash
cd sinaloka-platform && npm run lint
```
Expected: PASS

- [ ] **Step 2: Run build**

```bash
cd sinaloka-platform && npm run build
```
Expected: PASS — all 4 new components compile without errors

- [ ] **Step 3: Verify exports**

All 4 components should be importable:
```tsx
import { Select, DropdownMenu, Tabs, PageHeader } from '../components/UI';
```

No page changes needed — these components are now available for Phase 3 migration.
