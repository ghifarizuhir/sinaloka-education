# Phase 5A: shadcn/ui Foundation + Basic Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install shadcn/ui, configure the CSS variable theme system, and migrate 6 basic components (Button, Input, Label, Badge, Separator, Skeleton) to use shadcn's design patterns with cva and semantic colors.

**Architecture:** Run `npx shadcn@latest init` to bootstrap config, then update `src/index.css` with the full CSS variable theme. Rewrite each component file in `src/components/ui/` to use semantic color classes (`bg-primary`, `text-foreground`, `border-border`) and `class-variance-authority` (cva) for variants. External APIs stay identical — pages don't change.

**Tech Stack:** shadcn/ui, class-variance-authority (cva), tw-animate-css, Radix UI, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-18-ui-phase5-shadcn-migration-design.md`

---

## File Structure

| File | Change |
|---|---|
| `package.json` | New deps: `class-variance-authority`, `tw-animate-css`, `radix-ui` |
| `components.json` (new) | shadcn CLI config |
| `src/index.css` | CSS variables theme + `@theme inline` mapping |
| `src/components/ui/button.tsx` | Rewrite with cva + semantic colors |
| `src/components/ui/input.tsx` | Semantic border/ring colors |
| `src/components/ui/label.tsx` | Semantic text color |
| `src/components/ui/badge.tsx` | Rewrite with cva + semantic colors |
| `src/components/ui/separator.tsx` | Semantic bg color |
| `src/components/ui/skeleton.tsx` | Semantic bg-muted |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `sinaloka-platform/package.json`

- [ ] **Step 1: Install shadcn dependencies**

```bash
cd sinaloka-platform && npm install class-variance-authority tw-animate-css radix-ui
```

- [ ] **Step 2: Verify install succeeded**

```bash
ls node_modules/class-variance-authority && ls node_modules/tw-animate-css && echo "OK"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/package.json sinaloka-platform/package-lock.json
git commit -m "chore: install shadcn dependencies (cva, tw-animate-css, radix-ui)"
```

---

### Task 2: Create components.json

**Files:**
- Create: `sinaloka-platform/components.json`

- [ ] **Step 1: Create components.json in the sinaloka-platform directory**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/src/components",
    "utils": "@/src/lib/utils",
    "ui": "@/src/components/ui",
    "lib": "@/src/lib",
    "hooks": "@/src/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/components.json
git commit -m "chore: add shadcn components.json configuration"
```

---

### Task 3: Update CSS Theme

**Files:**
- Modify: `sinaloka-platform/src/index.css`

- [ ] **Step 1: Replace the entire index.css with shadcn CSS variable theme**

Keep the Google Fonts import and scrollbar styles. Replace everything else with the shadcn theme. The new file should be:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}

@layer components {
  .glass {
    @apply bg-background/80 backdrop-blur-md border border-border/20;
  }

  .sidebar-item-active {
    @apply bg-sidebar-accent text-sidebar-accent-foreground font-medium;
  }

  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .scrollbar-thin:hover {
    scrollbar-color: oklch(0.87 0 0) transparent;
  }
  .dark .scrollbar-thin:hover {
    scrollbar-color: oklch(0.37 0 0) transparent;
  }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: transparent; border-radius: 9999px; }
  .scrollbar-thin:hover::-webkit-scrollbar-thumb { background: oklch(0.87 0 0); }
  .dark .scrollbar-thin:hover::-webkit-scrollbar-thumb { background: oklch(0.37 0 0); }
}
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run lint && npm run build
```
Expected: Both PASS. The CSS variable classes (`bg-background`, `text-foreground`, etc.) are now available.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/index.css
git commit -m "feat(theme): replace custom CSS with shadcn CSS variable theme system"
```

---

### Task 4: Migrate Button Component

**Files:**
- Modify: `sinaloka-platform/src/components/ui/button.tsx`

- [ ] **Step 1: Rewrite button.tsx with cva**

Replace the entire file with:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-9 rounded-md px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
```

> Note: We keep `primary` as the default variant (not `default`) to match our existing API. We add `ghost`, `link`, `destructive` as new variants available for future use.

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/ui/button.tsx
git commit -m "refactor(button): migrate to cva with shadcn semantic colors"
```

---

### Task 5: Migrate Input and Label

**Files:**
- Modify: `sinaloka-platform/src/components/ui/input.tsx`
- Modify: `sinaloka-platform/src/components/ui/label.tsx`

- [ ] **Step 1: Rewrite input.tsx**

```tsx
import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

- [ ] **Step 2: Rewrite label.tsx**

```tsx
import * as React from 'react';
import { cn } from '../../lib/utils';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Label.displayName = 'Label';
```

- [ ] **Step 3: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/ui/input.tsx sinaloka-platform/src/components/ui/label.tsx
git commit -m "refactor(input,label): migrate to shadcn semantic colors with forwardRef"
```

---

### Task 6: Migrate Badge Component

**Files:**
- Modify: `sinaloka-platform/src/components/ui/badge.tsx`

- [ ] **Step 1: Rewrite badge.tsx with cva**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-[10px] uppercase tracking-wider font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
        error: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
        outline: 'border border-border text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { badgeVariants };
```

> Note: `success`, `warning`, `error` keep their semantic emerald/amber/red colors since shadcn's default doesn't include these. The `default` and `outline` variants use semantic variables.

- [ ] **Step 2: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/ui/badge.tsx
git commit -m "refactor(badge): migrate to cva with shadcn semantic colors"
```

---

### Task 7: Migrate Separator and Skeleton

**Files:**
- Modify: `sinaloka-platform/src/components/ui/separator.tsx`
- Modify: `sinaloka-platform/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Rewrite separator.tsx**

```tsx
import { cn } from '../../lib/utils';

export const Separator = ({ className }: { className?: string }) => (
  <div className={cn('h-px bg-border', className)} />
);
```

- [ ] **Step 2: Rewrite skeleton.tsx**

```tsx
import { cn } from '../../lib/utils';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />
);
```

- [ ] **Step 3: Verify and commit**

```bash
cd sinaloka-platform && npm run lint
git add sinaloka-platform/src/components/ui/separator.tsx sinaloka-platform/src/components/ui/skeleton.tsx
git commit -m "refactor(separator,skeleton): migrate to shadcn semantic colors"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run full type check**

```bash
cd sinaloka-platform && npm run lint
```
Expected: PASS

- [ ] **Step 2: Run production build**

```bash
cd sinaloka-platform && npm run build
```
Expected: PASS

- [ ] **Step 3: Visual verification (manual)**

Start dev server and check:
- Buttons render correctly (primary, secondary, outline variants)
- Inputs have proper border and focus ring
- Labels are readable
- Badges show correct variant colors
- Dark mode works on all migrated components
- No visual regressions on any page
