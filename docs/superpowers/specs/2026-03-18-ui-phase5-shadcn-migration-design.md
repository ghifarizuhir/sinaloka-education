# Phase 5: shadcn/ui Migration Design

**Date**: 2026-03-18
**Scope**: sinaloka-platform — migrate 27 component files in `src/components/ui/` to shadcn/ui
**Goal**: Replace custom component internals with shadcn/ui primitives (Radix UI) for a polished, accessible, production-grade design system. Pages don't change — only component files.
**Parent**: `docs/superpowers/specs/2026-03-18-ui-component-centralization-roadmap.md`

---

## Current State

- **27 component files** + 1 barrel export + 1 shared hook in `src/components/ui/`
- **TailwindCSS v4** with `@tailwindcss/vite` plugin
- **Custom zinc-based styling** using direct Tailwind utility classes (e.g., `bg-zinc-900`, `dark:bg-zinc-100`)
- **No shadcn/ui installed** — no `components.json`, no Radix dependencies, no CSS variables
- **Framer Motion** used for Modal, ConfirmDialog, Drawer animations
- **Class-based dark mode** via `.dark` on `<html>`

## Target State

- **shadcn/ui CLI configured** with `components.json`
- **CSS variable theme system** using oklch colors (zinc palette)
- **Radix UI primitives** for accessible interactive components
- **Semantic color classes** (`bg-background`, `text-foreground`, `bg-primary`) instead of hardcoded zinc values
- **class-variance-authority (cva)** for component variant management
- **tw-animate-css** for animation utilities
- **Framer Motion kept** for page transitions and custom animations (shadcn-compatible)

---

## Installation & Configuration

### Dependencies to install

```bash
npm install shadcn class-variance-authority tw-animate-css radix-ui
```

> Note: `clsx`, `tailwind-merge`, and `lucide-react` are already installed.

### `components.json` (project root)

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

### CSS Variables (`src/index.css`)

Replace current TailwindCSS v4 `@theme` block with shadcn's CSS variable system. Keep existing custom styles (scrollbar, fonts).

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
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
  --popover-foreground: oklch(0.985 0 0);
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
    @apply bg-background text-foreground;
  }
}
```

### `cn()` utility update

The existing `cn()` in `src/lib/utils.ts` already uses `clsx` + `tailwind-merge` — same as shadcn. No change needed.

---

## Sub-project Decomposition

### 5A: Foundation Setup + Basic Components

**Goal**: Install shadcn, configure theme, migrate simplest components.

**Changes**:
1. Install dependencies: `shadcn`, `class-variance-authority`, `tw-animate-css`, `radix-ui`
2. Create `components.json`
3. Update `src/index.css` with CSS variables
4. Migrate components (use `npx shadcn@latest add <name>` then customize to preserve our API):
   - `button.tsx` — use cva for variants, semantic colors (`bg-primary`, `bg-secondary`, `bg-destructive`)
   - `input.tsx` — semantic border/ring colors
   - `label.tsx` — direct replacement
   - `separator.tsx` — Radix Separator primitive
   - `skeleton.tsx` — semantic `bg-muted` instead of `bg-zinc-100`
   - `badge.tsx` — cva for variants with semantic colors

**API preservation**: All props interfaces stay the same. Pages don't change.

### 5B: Form Controls

**Goal**: Migrate interactive form components to Radix primitives.

**Components**:
- `checkbox.tsx` — Radix Checkbox (adds proper ARIA, indeterminate support)
- `switch.tsx` — Radix Switch (adds proper ARIA, label association)
- `select.tsx` — Keep native `<select>` for now (Radix Select is complex; swap in 5B-next if desired)
- `slider.tsx` — Radix Slider (adds proper ARIA, range support)
- `progress.tsx` — Radix Progress (adds proper ARIA)

**API changes**: Minimal. Radix Checkbox uses `onCheckedChange` instead of `onChange` — our wrapper translates this internally so the external API stays `onChange(checked: boolean)`.

### 5C: Overlays

**Goal**: Migrate overlay components to Radix Dialog/Sheet/DropdownMenu.

**Components**:
- `modal.tsx` → Radix Dialog (replaces Framer Motion for enter/exit, adds focus trap, ARIA)
- `confirm-dialog.tsx` → Radix AlertDialog (non-dismissable on overlay click)
- `drawer.tsx` → Radix Dialog with sheet variant (side panel)
- `dropdown-menu.tsx` → Radix DropdownMenu (replaces manual click-outside, adds keyboard navigation)

**API changes**:
- Modal: `isOpen`/`onClose` → internally maps to Radix `open`/`onOpenChange`
- DropdownMenu: items array API preserved as a wrapper around Radix DropdownMenu primitives
- Framer Motion removed from these components (Radix handles animations via CSS/tw-animate-css)

**`use-overlay-close.ts`**: Can be removed after this phase — Radix handles Escape key internally.

### 5D: Composite Components

**Goal**: Migrate composite components that combine Radix primitives with custom logic.

**Components**:
- `tabs.tsx` — Radix Tabs (adds keyboard arrow navigation, proper ARIA)
- `multi-select.tsx` — Keep custom (no shadcn equivalent). Update styling to use semantic colors.
- `pagination.tsx` — Update styling to semantic colors. No Radix needed.
- `password-input.tsx` — Update to use new Input + semantic styling
- `search-input.tsx` — Update to use new Input + semantic styling

**API changes**: None. All wrappers preserve existing props.

### 5E: App-Specific Components

**Goal**: Update styling of app-specific components to use CSS variables. No Radix needed.

**Components**:
- `card.tsx` — `bg-card text-card-foreground border-border` instead of hardcoded zinc
- `avatar.tsx` — Update colors to semantic variables
- `data-table.tsx` — `bg-muted/50`, `border-border`, `text-muted-foreground` for headers
- `page-header.tsx` — `text-foreground` instead of `dark:text-zinc-100`
- `empty-state.tsx` — `bg-muted`, `text-muted-foreground`
- `stat-card.tsx` — Uses Card internally, inherits new styling
- `spinner.tsx` — No change needed (uses `currentColor`)

---

## Migration Strategy

### Class mapping (hardcoded → semantic)

| Current | shadcn Semantic |
|---|---|
| `bg-white dark:bg-zinc-900` | `bg-card` or `bg-background` |
| `bg-zinc-950 dark:bg-zinc-100` (inverted) | `bg-primary` |
| `text-white dark:text-zinc-900` | `text-primary-foreground` |
| `text-zinc-900 dark:text-zinc-100` | `text-foreground` |
| `text-zinc-500 dark:text-zinc-400` | `text-muted-foreground` |
| `bg-zinc-100 dark:bg-zinc-800` | `bg-muted` or `bg-secondary` |
| `border-zinc-100 dark:border-zinc-800` | `border-border` |
| `border-zinc-200 dark:border-zinc-800` | `border-input` |
| `bg-zinc-50 dark:bg-zinc-900` | `bg-muted` |
| `bg-rose-600` | `bg-destructive` |
| `text-rose-600` | `text-destructive` |
| `focus-visible:ring-zinc-950` | `focus-visible:ring-ring` |

### What stays the same

- **Lucide icons** — shadcn uses them too
- **Sonner toasts** — shadcn recommends Sonner
- **Framer Motion** — kept for page transitions (removed from overlays)
- **`cn()` utility** — identical to shadcn's
- **Component file structure** — already matches shadcn convention (`src/components/ui/`)
- **Barrel export** — `UI.tsx` re-export shim continues to work

### What changes

- **CSS**: `index.css` gets CSS variables + `@theme inline` mapping
- **Dependencies**: Add `radix-ui`, `class-variance-authority`, `tw-animate-css`
- **Component internals**: Swap to Radix primitives and semantic color classes
- **Animations**: Overlays move from Framer Motion to CSS animations (tw-animate-css)

---

## Files Changed Per Sub-project

| Sub-project | Files |
|---|---|
| **5A** | `package.json`, `components.json` (new), `src/index.css`, `button.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`, `skeleton.tsx`, `badge.tsx` |
| **5B** | `checkbox.tsx`, `switch.tsx`, `slider.tsx`, `progress.tsx` |
| **5C** | `modal.tsx`, `confirm-dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `use-overlay-close.ts` (remove) |
| **5D** | `tabs.tsx`, `multi-select.tsx`, `pagination.tsx`, `password-input.tsx`, `search-input.tsx` |
| **5E** | `card.tsx`, `avatar.tsx`, `data-table.tsx`, `page-header.tsx`, `empty-state.tsx`, `stat-card.tsx` |

**No page files changed** in any sub-project. The `UI.tsx` re-export + barrel export ensure backward compatibility.

---

## Out of Scope

- Layout components (Layout.tsx, SuperAdminLayout.tsx) — separate effort
- Feature components (ClassTimetable, WeekCalendar, etc.) — not part of UI library
- New shadcn components not in our library (Accordion, Collapsible, etc.) — add as needed later
- `sinaloka-tutors` and `sinaloka-parent` apps — they have their own UI
