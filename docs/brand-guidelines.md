# Sinaloka Brand Guidelines

> Official brand identity and design system documentation for the Sinaloka tutoring platform.

---

## 1. Brand Identity

### Brand Name
**Sinaloka** — a multi-tenant tutoring institution management platform.

### Brand Personality
- **Trustworthy** — reliable management of student data, payments, and schedules
- **Warm** — approachable, friendly, education-focused
- **Modern** — clean, minimal, current design sensibilities
- **Professional** — suitable for institutions, not toy-like

### Brand Voice
- Clear, concise, supportive
- Indonesian-first with English localization
- Avoid jargon — speak to educators, not developers

---

## 2. Logo

### Primary Logo
- Teal rounded square with white diamond rotated 45°
- Logotype: "Sinaloka" in Plus Jakarta Sans 800 weight

### Logo Construction
```
┌──────────┐
│  ◇       │  Sinaloka
│  (teal)  │
└──────────┘
```

### Logo Colors
| Element | Light Mode | Dark Mode |
|---|---|---|
| Logo mark background | `--primary` (Teal) | `--primary` (Teal, brighter) |
| Logo diamond | White | Card background |
| Logotype text | Foreground | Foreground |

### Clear Space
Minimum clear space around the logo equals the height of the diamond mark.

### Don'ts
- Don't rotate the logo
- Don't change the logo colors outside the brand palette
- Don't add drop shadows or effects
- Don't stretch or distort

---

## 3. Colors

### Primary Palette

| Name | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Primary (Teal)** | `oklch(0.555 0.155 180)` | `oklch(0.680 0.155 180)` | Buttons, links, active states, brand accent |
| **Primary Foreground** | `oklch(0.985 0.01 180)` | `oklch(0.155 0.030 180)` | Text on primary backgrounds |

### Neutral Palette (Warm)

| Name | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Background** | `oklch(0.995 0.002 90)` | `oklch(0.155 0.012 260)` | Page background |
| **Foreground** | `oklch(0.185 0.015 260)` | `oklch(0.975 0.005 90)` | Primary text |
| **Card** | `oklch(1 0 0)` | `oklch(0.205 0.012 260)` | Card backgrounds |
| **Muted** | `oklch(0.960 0.006 90)` | `oklch(0.265 0.010 260)` | Subtle backgrounds, disabled states |
| **Muted Foreground** | `oklch(0.520 0.012 260)` | `oklch(0.650 0.010 260)` | Secondary text, labels, placeholders |
| **Secondary** | `oklch(0.965 0.008 90)` | `oklch(0.265 0.010 260)` | Secondary buttons, tags |
| **Accent** | `oklch(0.955 0.020 180)` | `oklch(0.280 0.025 180)` | Hover states (teal-tinted) |
| **Border** | `oklch(0.915 0.006 90)` | `oklch(1 0 0 / 8%)` | Borders, dividers |
| **Input** | `oklch(0.905 0.008 90)` | `oklch(1 0 0 / 12%)` | Form input borders |

**Key design decision**: All neutrals have a slight warm undertone (chroma 0.002–0.015) instead of pure gray. This makes the interface feel friendlier and more suitable for an education context.

### Semantic Status Colors

| Name | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Success** | `oklch(0.565 0.155 160)` (Emerald) | `oklch(0.680 0.155 160)` | Paid, active, present, completed |
| **Warning** | `oklch(0.750 0.170 75)` (Amber) | `oklch(0.780 0.150 75)` | Pending, overdue soon, late |
| **Info** | `oklch(0.546 0.245 262)` (Blue) | `oklch(0.650 0.200 262)` | Information, tips, links |
| **Destructive** | `oklch(0.577 0.245 27)` (Red) | `oklch(0.704 0.191 22)` | Delete, cancel, errors, overdue |

### Chart Palette

| Variable | Color | Usage |
|---|---|---|
| `--chart-1` | Teal | Revenue, primary metric |
| `--chart-2` | Emerald | Attendance, growth |
| `--chart-3` | Blue | Sessions, information |
| `--chart-4` | Amber | Expenses, warnings |
| `--chart-5` | Pink | Payouts, tertiary |

### Color Usage Rules

1. **Primary teal** is reserved for interactive elements: buttons, links, focus rings, active states, progress bars
2. **Never use black** for primary buttons — always use `--primary` (teal)
3. **Semantic colors** must be consistent: emerald = success, amber = warning, red = destructive
4. **Dark mode** uses brighter primary (`0.680` vs `0.555`) for readability
5. **Accent** has a teal tint — hover states subtly reinforce the brand

---

## 4. Typography

### Font Family

| Role | Font | Weight Range | Fallbacks |
|---|---|---|---|
| **Display & Body** | Plus Jakarta Sans | 400–800 | ui-sans-serif, system-ui, sans-serif |
| **Monospace** | JetBrains Mono | 400–500 | ui-monospace, SFMono-Regular, monospace |

### Why Plus Jakarta Sans?
- **Indonesian origin** — designed by Tokotype, a Jakarta-based foundry
- **Rounded terminals** — friendlier and warmer than geometric sans-serifs
- **Excellent readability** — clear at small sizes for dashboard data
- **Modern** — contemporary feel without being trendy

### Type Scale

| Element | Size | Weight | Tracking | Class |
|---|---|---|---|---|
| Page title | 24px (text-2xl) | 700 (bold) | -0.025em (tracking-tight) | `text-2xl font-bold tracking-tight` |
| Card heading | 18px (text-lg) | 700 (bold) | — | `text-lg font-bold` |
| Section label | 10px | 700 (bold) | 0.1em (tracking-widest) | `text-[10px] font-bold uppercase tracking-widest` |
| Body text | 14px (text-sm) | 400/500 | — | `text-sm` |
| Small text | 12px (text-xs) | 400/500 | — | `text-xs` |
| Tiny label | 10px | 600/700 | 0.05em+ | `text-[10px] font-semibold` |

### Typography Rules

1. **Headings** use `font-bold` (700) with `tracking-tight`
2. **Section labels** use `text-[10px] uppercase tracking-widest font-bold text-muted-foreground`
3. **Body text** uses `text-sm` (14px) — never smaller than 12px for readable content
4. **Numbers** in tables use `tabular-nums` for alignment
5. **Never use Inter, Roboto, or Arial** — Plus Jakarta Sans is the only sans-serif

---

## 5. Spacing & Layout

### Spacing Scale
Based on Tailwind's default 4px scale:
- **4px** (`p-1`) — icon padding
- **8px** (`p-2`, `gap-2`) — tight spacing
- **12px** (`p-3`, `gap-3`) — standard component padding
- **16px** (`p-4`, `gap-4`) — card padding, section gaps
- **24px** (`p-6`, `gap-6`) — large card padding
- **32px** (`p-8`, `gap-8`) — page padding, major section gaps

### Border Radius
| Element | Radius | Class |
|---|---|---|
| Buttons, inputs | 0.5rem | `rounded-lg` |
| Cards | 0.75rem | `rounded-xl` |
| Modals, hero sections | 1.5rem | `rounded-2xl` / `rounded-3xl` |
| Avatars (small) | full | `rounded-full` |
| Avatars (large) | 1rem | `rounded-2xl` |
| Badges | full | `rounded-full` |

### Layout Grid
- Max content width: `max-w-7xl` (1280px)
- Page padding: `p-8`
- Sidebar: 256px (`w-64`) or 80px minimized (`w-20`)
- Card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`

---

## 6. Components

### Buttons

| Variant | Appearance | Usage |
|---|---|---|
| `primary` | Teal background, white text | Primary actions (Save, Add, Submit) |
| `secondary` | Light warm background, dark text | Secondary actions |
| `outline` | Border only, transparent background | Tertiary actions (Cancel, Filter) |
| `ghost` | No border, no background | Minimal actions (View All, Links) |
| `destructive` | Red background, white text | Dangerous actions (Delete, Remove) |
| `link` | Underline on hover, teal text | Inline links |

### Badges

| Variant | Color | Usage |
|---|---|---|
| `default` | Secondary bg | Neutral status |
| `success` | Emerald | Active, Paid, Present, Completed |
| `warning` | Amber | Pending, Late, Overdue soon |
| `error` | Red | Overdue, Failed, Absent |
| `outline` | Border only | Tags, labels |

### Cards
- Background: `bg-card`
- Border: `border-border`
- Shadow: `shadow-sm`
- Border radius: `rounded-xl`
- Padding: `p-6` (default) or `p-4`/`p-5` for compact

### Icons
- Library: **Lucide React**
- Default size: 16px (`size={16}`) for inline, 18-20px for buttons
- Color: `text-muted-foreground` for inactive, `text-primary` for active/brand
- Stroke width: default (2px)

---

## 7. Motion & Animation

### Principles
- **Purposeful** — animation should communicate state changes, not decorate
- **Orchestrated** — stagger entrance animations by 0.06–0.1s per element
- **Fast** — transitions under 300ms, entrances under 500ms
- **Subtle** — small transforms (8–16px translate, 0.95–1.0 scale)

### Library
- **Framer Motion** (`motion/react`) for React components
- **tw-animate-css** for CSS utility animations
- **CSS transitions** for hover/focus states

### Standard Animations

| Pattern | Duration | Easing | Properties |
|---|---|---|---|
| Page section entrance | 400-500ms | ease-out | opacity 0→1, y 12→0 |
| Card stagger | 80ms delay per item | ease-out | opacity 0→1, y 16→0 |
| Modal enter | 200ms | spring | opacity, scale 0.95→1, y 20→0 |
| Drawer slide | spring (damping 25, stiffness 200) | spring | x 100%→0 |
| Dropdown | 150ms | ease-out | opacity, scale 0.95→1, y -4→0 |
| Hover icon scale | — | transition-transform | scale 1→1.1 |
| Hover chevron | — | transition-all | translate-x 0→0.5 |

---

## 8. Dark Mode

### Principles
- **Warm dark** — background has slight blue undertone (`oklch(0.155 0.012 260)`), not pure black
- **Brighter primary** — teal increases lightness in dark mode (0.555→0.680) for visibility
- **Reduced contrast borders** — `oklch(1 0 0 / 8%)` instead of solid gray
- **Card elevation** — cards are slightly lighter than background to create depth

### Implementation
- Class-based via `.dark` on `<html>` element
- Toggle in header with Sun/Moon icon
- All components use CSS variables — dark mode is automatic
- Semantic colors (`bg-primary`, `text-foreground`) handle both modes

---

## 9. Sidebar

### Active State
- Background: `bg-sidebar-accent` (teal-tinted)
- Icon: `text-primary` (teal) — the brand color reinforcement
- Text: `text-foreground`

### Inactive State
- Icon & text: `text-muted-foreground`
- Hover: `hover:bg-accent hover:text-foreground`

### Section Labels
- `text-[10px] uppercase tracking-widest font-bold text-muted-foreground`

### Logo
- Teal rounded square (`bg-primary`) with white diamond (`bg-card`)
- Brand name: `font-bold text-xl tracking-tight`

---

## 10. Accessibility

### Color Contrast
- All text meets WCAG AA contrast ratios
- Primary teal on white: ~4.7:1 (passes AA)
- Muted foreground on background: ~4.5:1 (passes AA)
- Dark mode primary: brighter teal for adequate contrast

### Focus States
- `focus-visible:ring-2 focus-visible:ring-ring` (teal ring)
- Only visible on keyboard navigation (not mouse clicks)
- Ring offset: 2px from element

### Interactive Elements
- Minimum touch target: 36px (h-9) for buttons
- Disabled state: `opacity-50 cursor-not-allowed pointer-events-none`
- All overlays (Modal, Drawer, DropdownMenu) support Escape key to close

---

## 11. CSS Variables Reference

All design tokens are defined as CSS custom properties in `src/index.css`. Components use Tailwind utility classes that map to these variables via `@theme inline`.

```
bg-background     → var(--background)
bg-primary        → var(--primary)
text-foreground   → var(--foreground)
text-muted-foreground → var(--muted-foreground)
border-border     → var(--border)
border-input      → var(--input)
ring-ring         → var(--ring)
bg-success        → var(--success)
bg-warning        → var(--warning)
bg-info           → var(--info)
bg-destructive    → var(--destructive)
```

To modify the theme, edit the `:root` and `.dark` sections in `src/index.css`. All components will update automatically.
