# Tutor UI Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify sinaloka-tutors UI with sinaloka-platform's design system — Inter font, zinc palette, clean typography, platform-standard border radius.

**Architecture:** Pure CSS/styling refactor across 7 files. No logic, hook, or API changes. Global find-and-replace of stone→zinc, font-black→font-bold/font-semibold, rounded-[32px]→rounded-xl, and removal of italic/uppercase from headings.

**Tech Stack:** Tailwind CSS, React (styling changes only)

**Spec:** `docs/superpowers/specs/2026-03-15-tutor-ui-unification-design.md`

---

## Chunk 1: Global Setup (Font + CSS)

### Task 1: Add Inter font and theme config

**Files:**
- Modify: `sinaloka-tutors/index.html`
- Modify: `sinaloka-tutors/src/index.css`

- [ ] **Step 1: Add Inter font import to index.html**

In `sinaloka-tutors/index.html`, add inside `<head>` before the closing `</head>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Also change the title from `My Google AI Studio App` to `Sinaloka Tutor`.

- [ ] **Step 2: Add font theme config to index.css**

In `sinaloka-tutors/src/index.css`, replace the entire content with:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-tutors/index.html sinaloka-tutors/src/index.css
git commit -m "style(tutors): add Inter font and Tailwind theme config"
```

---

## Chunk 2: Component Files

### Task 2: Update BottomNav.tsx

**Files:**
- Modify: `sinaloka-tutors/src/components/BottomNav.tsx`

- [ ] **Step 1: Apply all styling changes**

All replacements in `BottomNav.tsx`:

| Find | Replace |
|---|---|
| `bg-stone-900/80` | `bg-zinc-900/80` |
| `border-stone-800` | `border-zinc-800` |
| `text-stone-500` | `text-zinc-500` |
| `font-black uppercase tracking-tighter` (nav label) | `font-bold uppercase tracking-wider` |

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/components/BottomNav.tsx
git commit -m "style(tutors): unify BottomNav with platform zinc palette"
```

---

### Task 3: Update ScheduleCard.tsx

**Files:**
- Modify: `sinaloka-tutors/src/components/ScheduleCard.tsx`

- [ ] **Step 1: Apply all styling changes**

All replacements in `ScheduleCard.tsx`:

| Find | Replace |
|---|---|
| `bg-stone-900` | `bg-zinc-900` |
| `border-stone-800` | `border-zinc-800` |
| `border-stone-700` | `border-zinc-700` |
| `bg-stone-800` | `bg-zinc-800` |
| `text-stone-400` | `text-zinc-400` |
| `text-stone-500` | `text-zinc-500` |
| `hover:bg-stone-700` | `hover:bg-zinc-700` |
| `hover:text-white` | `hover:text-white` (no change) |
| `rounded-[24px]` | `rounded-xl` |
| `rounded-2xl` (action buttons) | `rounded-lg` |
| `font-black uppercase italic tracking-tighter` (subject h3) | `font-semibold` |
| `font-black uppercase tracking-widest` (badge) | `font-bold uppercase tracking-wider` |
| `font-black uppercase tracking-widest` (attendance done) | `font-bold uppercase tracking-wider` |
| `font-black uppercase tracking-tighter` (action button labels) | `font-bold uppercase tracking-wider` |
| `bg-stone-800/50 border border-stone-700` | `bg-zinc-800/50 border border-zinc-700` |

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/components/ScheduleCard.tsx
git commit -m "style(tutors): unify ScheduleCard with platform design system"
```

---

### Task 4: Update PayoutCard.tsx

**Files:**
- Modify: `sinaloka-tutors/src/components/PayoutCard.tsx`

- [ ] **Step 1: Apply all styling changes**

All replacements in `PayoutCard.tsx`:

| Find | Replace |
|---|---|
| `bg-stone-900` | `bg-zinc-900` |
| `border-stone-800` | `border-zinc-800` |
| `text-stone-500` | `text-zinc-500` |
| `bg-stone-800` | `bg-zinc-800` |
| `hover:bg-stone-700` | `hover:bg-zinc-700` |
| `rounded-[24px]` | `rounded-xl` |
| `font-black tracking-tighter` (amount) | `font-bold tracking-tight` |
| `font-black uppercase tracking-widest` (status, date) | `font-bold uppercase tracking-wider` |
| `font-black uppercase tracking-widest` (proof button) | `font-semibold uppercase tracking-wider` |

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/components/PayoutCard.tsx
git commit -m "style(tutors): unify PayoutCard with platform design system"
```

---

### Task 5: Update LoginPage.tsx

**Files:**
- Modify: `sinaloka-tutors/src/pages/LoginPage.tsx`

- [ ] **Step 1: Apply all styling changes**

All replacements in `LoginPage.tsx`:

| Find | Replace |
|---|---|
| `bg-black` | `bg-zinc-950` |
| `bg-stone-900` | `bg-zinc-900` |
| `border-stone-800` | `border-zinc-800` |
| `text-stone-500` | `text-zinc-500` |
| Remove background glow div entirely (the `<div className="fixed top-0 left-0...">` with the two inner blur divs) | (delete) |
| `font-black tracking-tighter uppercase italic` (title) | `font-bold tracking-tight` |
| `font-bold uppercase tracking-widest` (subtitle) | `font-medium uppercase tracking-wider` |
| `font-black uppercase tracking-widest` (labels) | `font-bold uppercase tracking-wider` |
| `rounded-2xl` (inputs, error) | `rounded-lg` |
| `rounded-[24px]` (submit button) | `rounded-lg` |
| `font-black ... uppercase italic tracking-tighter` (submit button) | `font-semibold` |
| `shadow-[0_10px_30px_rgba(163,230,53,0.2)]` (button shadow) | `shadow-sm` |
| `py-5` (submit button) | `py-4` |

- [ ] **Step 2: Commit**

```bash
git add sinaloka-tutors/src/pages/LoginPage.tsx
git commit -m "style(tutors): unify LoginPage with platform design system"
```

---

## Chunk 3: App.tsx (largest file)

### Task 6: Update App.tsx

**Files:**
- Modify: `sinaloka-tutors/src/App.tsx`

This is the largest file (645 lines). Apply changes systematically by section.

- [ ] **Step 1: Global color replacements (all occurrences)**

Replace all occurrences throughout the file:

| Find | Replace |
|---|---|
| `bg-black` | `bg-zinc-950` |
| `bg-stone-900` | `bg-zinc-900` |
| `bg-stone-800` | `bg-zinc-800` |
| `border-stone-800` | `border-zinc-800` |
| `border-stone-700` | `border-zinc-700` |
| `text-stone-500` | `text-zinc-500` |
| `text-stone-400` | `text-zinc-400` |
| `text-stone-600` | `text-zinc-600` |
| `hover:bg-stone-800` | `hover:bg-zinc-800` |
| `hover:bg-stone-700` | `hover:bg-zinc-700` |
| `border-black` | `border-zinc-950` |
| `bg-stone-900/50` | `bg-zinc-900/50` |

- [ ] **Step 2: Remove background glow blobs**

Remove the entire background glow div from the return JSX (the `{/* Background Glow */}` section with the two blur divs). Replace with nothing — the `bg-zinc-950` on the parent provides the background.

- [ ] **Step 3: Typography — page titles and headings**

Replace these patterns:

| Context | Find | Replace |
|---|---|---|
| Dashboard greeting | `text-2xl font-black tracking-tighter uppercase italic` | `text-2xl font-bold tracking-tight` |
| Schedule page title | `text-3xl font-black tracking-tighter uppercase italic mb-2` | `text-3xl font-bold tracking-tight mb-2` |
| Payouts page title | `text-3xl font-black tracking-tighter uppercase italic mb-2` | `text-3xl font-bold tracking-tight mb-2` |
| Profile name | `text-3xl font-black tracking-tighter uppercase italic mb-1` | `text-3xl font-bold tracking-tight mb-1` |
| Section heading "Jadwal Hari Ini" | `text-lg font-black uppercase italic tracking-tighter` | `text-lg font-semibold` |
| Attendance subject title | `text-xl font-black tracking-tighter uppercase italic leading-none mb-1` | `text-xl font-semibold leading-none mb-1` |
| Attendance count | `text-2xl font-black tracking-tighter leading-none` | `text-2xl font-bold tracking-tight leading-none` |
| Modal title "Bukti Transfer" | `text-lg font-black uppercase italic tracking-tighter` | `text-lg font-semibold` |

- [ ] **Step 4: Typography — labels and small text**

Replace `font-black` patterns in labels/badges:

| Context | Find | Replace |
|---|---|---|
| Small labels (`text-[10px]`) | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |
| Stats labels | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |
| "Quick Actions" heading | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |
| Quick action buttons | `font-black uppercase tracking-tighter` | `font-bold uppercase tracking-wider` |
| Profile subject | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |
| Profile rating | `font-black` | `font-bold` |
| Profile "Verified" | `font-black tracking-tighter uppercase italic` | `font-bold` |
| Menu items | `font-black uppercase tracking-tighter` | `font-semibold` |
| Stat numbers | `font-black tracking-tighter` | `font-bold tracking-tight` |
| Filter buttons | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |
| "Lihat Semua" link | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |
| "Mark All Present" | `font-black uppercase tracking-widest` | `font-bold uppercase tracking-wider` |

- [ ] **Step 5: Typography — student names and body**

| Find | Replace |
|---|---|
| `font-black uppercase italic tracking-tighter` (student names in attendance) | `font-semibold` |
| `font-black uppercase tracking-widest` (HW Done label) | `font-bold uppercase tracking-wider` |

- [ ] **Step 6: Border radius**

| Find | Replace |
|---|---|
| `rounded-[32px]` (stat cards, quick actions box, payouts summary) | `rounded-xl` |
| `rounded-[24px]` (student cards, empty states, menu buttons, finalize button) | `rounded-xl` |
| `rounded-[40px]` (proof modal, avatar) | `rounded-xl` (modal), `rounded-2xl` (avatar) |
| `rounded-3xl` (textarea) | `rounded-lg` |
| `rounded-2xl` (inputs, buttons, attachment upload) | `rounded-lg` |

Note: `rounded-full` on filter pills and notification toast stays.

- [ ] **Step 7: Shadows**

Add `shadow-sm` to card containers. The proof modal already has `shadow-2xl` on the image.

- [ ] **Step 8: Toast notification**

Replace the toast's:
- `font-black uppercase italic tracking-tighter` → `font-semibold`

- [ ] **Step 9: Proof modal download button**

Replace:
- `font-black ... uppercase italic tracking-tighter` → `font-semibold`
- `rounded-2xl` → `rounded-lg`

- [ ] **Step 10: Empty state text**

Replace `italic` in empty state messages with regular style (remove `italic` class).

- [ ] **Step 11: Verify build**

Run: `cd /home/zet/Project/sinaloka/sinaloka-tutors && npx vite build`
Expected: Build succeeds

- [ ] **Step 12: Commit**

```bash
git add sinaloka-tutors/src/App.tsx
git commit -m "style(tutors): unify App.tsx with platform design system - zinc palette, Inter typography, standard radius"
```

---

## Chunk 4: Verification

### Task 7: Run Playwright e2e tests

- [ ] **Step 1: Run full test suite**

```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npx playwright test
```

Expected: All 9 tests pass (styling changes don't affect functionality, but some selectors may need updating if text content changed).

- [ ] **Step 2: Fix any selector issues**

If tests fail due to text changes (e.g., `getByText` matching different text), update the test selectors in the relevant `e2e/*.spec.ts` files.

- [ ] **Step 3: Visual verification**

Start the dev server and verify in browser:
```bash
cd /home/zet/Project/sinaloka/sinaloka-tutors && npm run dev
```

Open `http://localhost:5173` and check:
- Login page: Inter font, zinc colors, rounded-lg inputs/button, no glow background
- Dashboard: Clean headings (no italic/uppercase), zinc cards with shadow-sm, rounded-xl stat cards
- Schedule: Filter pills, session cards with rounded-xl
- Payouts: Clean typography, zinc cards
- Profile: rounded-2xl avatar, clean text, zinc menu items
- Attendance: Clean student cards, rounded-lg buttons
