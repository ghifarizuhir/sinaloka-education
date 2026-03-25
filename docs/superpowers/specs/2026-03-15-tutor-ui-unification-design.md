# Tutor UI Unification with Platform Design System

**Date:** 2026-03-15
**Status:** Approved

## Overview

Unify the sinaloka-tutors frontend UI with the sinaloka-platform design language so both apps feel like one product ("Sinaloka"), while the tutor app retains its mobile-first layout and lime accent color.

## Guiding Principles

- **Platform is the source of truth** — the tutors app adopts the platform's design tokens, typography, and component patterns.
- **Dark-only** — the tutors app stays dark (mobile-optimized), but uses the platform's zinc scale instead of stone/black.
- **Lime accent stays** — lime-400 is the tutor app's brand identity within Sinaloka (like Gmail's red within Google).
- **No functional changes** — all pages, hooks, API integration, and behavior remain identical.

## Changes

### 1. Font

**Before:** System font (no import)
**After:** Inter (400, 500, 600, 700) from Google Fonts — same as platform

Add to `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Add to `index.css`:
```css
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

### 2. Color Palette

Replace stone scale with zinc scale throughout:

| Before (Stone/Black) | After (Zinc) | Usage |
|---|---|---|
| `bg-black` | `bg-zinc-950` | Page background |
| `bg-stone-900` | `bg-zinc-900` | Cards, inputs, nav |
| `bg-stone-800` | `bg-zinc-800` | Hover states, secondary bg |
| `border-stone-800` | `border-zinc-800` | Card/input borders |
| `border-stone-700` | `border-zinc-700` | Secondary borders |
| `text-stone-500` | `text-zinc-500` | Muted text |
| `text-stone-400` | `text-zinc-400` | Secondary text |
| `text-stone-600` | `text-zinc-600` | Tertiary text |
| `bg-stone-900/50` | `bg-zinc-900/50` | Translucent bg |
| `bg-stone-900/80` | `bg-zinc-900/80` | Nav backdrop |
| `bg-stone-800` | `bg-zinc-800` | Buttons, toggles |

Lime-400 accent colors stay unchanged.

### 3. Typography Style

Replace aggressive italic/uppercase/black-weight with platform's clean hierarchy:

| Element | Before | After |
|---|---|---|
| Page titles | `text-2xl font-black tracking-tighter uppercase italic` | `text-2xl font-bold tracking-tight` |
| Section headings | `text-lg font-black uppercase italic tracking-tighter` | `text-lg font-semibold` |
| Card titles | `font-black uppercase italic tracking-tighter` | `font-semibold` |
| Body text | `font-bold uppercase tracking-tighter` | `font-medium` |
| Small labels | `text-[10px] font-black uppercase tracking-widest` | `text-[10px] font-bold uppercase tracking-wider` |
| Button text | `font-black uppercase italic tracking-tighter` | `font-semibold` |
| Stats numbers | `font-black tracking-tighter` | `font-bold tracking-tight` |

**Keep uppercase** only for: small labels (`text-[10px]`), filter buttons, badge text, nav labels.
**Remove italic** from all text.

### 4. Border Radius

| Element | Before | After |
|---|---|---|
| Cards | `rounded-[32px]` or `rounded-[24px]` | `rounded-xl` (12px) |
| Buttons | `rounded-[24px]` or `rounded-2xl` | `rounded-lg` (8px) |
| Inputs | `rounded-2xl` | `rounded-lg` (8px) |
| Filter pills | `rounded-full` | `rounded-full` (stays) |
| Bottom nav | (no radius) | (stays) |
| Modals | `rounded-[40px]` | `rounded-xl` (12px) |
| Avatar | `rounded-[40px]` | `rounded-2xl` (16px) |
| Stat cards | `rounded-[32px]` | `rounded-xl` (12px) |
| Attendance P/A/L buttons | `rounded-lg` | `rounded-lg` (stays) |

### 5. Shadows

Add subtle shadows to cards (matching platform):

| Element | Before | After |
|---|---|---|
| Cards | No shadow | `shadow-sm` |
| Modals | No shadow | `shadow-xl` |
| Bottom nav | No shadow | (stays — has backdrop-blur) |

### 6. Background

**Before:** Black with two large glow blobs (lime + purple gradient circles with blur-[120px])
**After:** Solid `bg-zinc-950` — remove the glow blobs entirely. Clean, matching platform dark mode.

### 7. Component Adjustments

**Login page:**
- Same form structure, but adopt zinc palette and Inter font
- Reduce button border-radius to `rounded-lg`
- Keep lime-400 submit button

**Bottom nav:**
- `bg-stone-900/80` → `bg-zinc-900/80`
- `border-stone-800` → `border-zinc-800`
- `text-stone-500` → `text-zinc-500`
- Active: `text-lime-400` stays
- Label: keep `text-[10px] font-bold uppercase` (small label pattern)

**Toast notification:**
- Keep lime-400 background
- Remove italic from text
- `font-black uppercase italic tracking-tighter` → `font-semibold`

**Schedule card actions (Absen Murid, Atur Ulang, Cancel):**
- `rounded-2xl` → `rounded-lg`
- Keep lime-400 for primary action

**Proof modal:**
- `rounded-[40px]` → `rounded-xl`
- `font-black uppercase italic tracking-tighter` → `font-semibold`

## Files to Modify

- `sinaloka-tutors/index.html` — add Inter font import
- `sinaloka-tutors/src/index.css` — add `@theme` font config
- `sinaloka-tutors/src/App.tsx` — all color/typography/radius changes
- `sinaloka-tutors/src/components/BottomNav.tsx` — zinc colors
- `sinaloka-tutors/src/components/ScheduleCard.tsx` — zinc colors, radius, typography
- `sinaloka-tutors/src/components/PayoutCard.tsx` — zinc colors, radius, typography
- `sinaloka-tutors/src/pages/LoginPage.tsx` — zinc colors, radius, typography

## Files NOT Modified

- All hooks (`useSchedule`, `usePayouts`, `useAttendance`, `useAuth`)
- API client (`api/client.ts`)
- Mappers (`mappers/index.ts`)
- AuthContext (`contexts/AuthContext.tsx`)
- Types (`types.ts`)
- Vite config, package.json (no new dependencies — Inter loaded via CDN)

## What Stays The Same

- Bottom navigation layout (mobile-first)
- All page structure and content
- Lime-400 accent color
- All functionality, hooks, and API integration
- Animation patterns (motion library)
- Filter pills with `rounded-full`
- Attendance P/A/L button sizing and colors
