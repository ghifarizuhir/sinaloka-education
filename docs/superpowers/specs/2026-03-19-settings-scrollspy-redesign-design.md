# Settings Page Scroll-Spy Redesign

## Overview

Redesign the Settings page from a vertical sidebar tab-switcher to a single scrollable page with a sticky horizontal underline tab bar and scroll-spy behavior. All three sections (General, Billing, Academic) render simultaneously instead of one-at-a-time.

## Motivation

The current 3-tab layout hides content behind clicks. The total content volume across all three tabs is moderate — it fits comfortably in a single scroll. A scroll-spy pattern lets users see everything without tab-switching, with the nav bar serving as both a quick-jump shortcut and a "you are here" indicator.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Single scrollable page | Content volume doesn't justify tab switching |
| Nav style | Horizontal underline tabs | Clean, familiar (GitHub/Vercel pattern) |
| Sticky behavior | Only tab bar sticks | Page title + subtitle scroll away; slim sticky bar maximizes content area |
| Implementation approach | Minimal refactor | Reuse existing tab components as-is, only change `index.tsx` and add one hook |

## Architecture

### Files Changed

**`sinaloka-platform/src/pages/Settings/index.tsx`** — primary changes:

- Remove `activeTab` state and `renderTabContent()` switch statement
- Replace vertical sidebar nav (`lg:w-64 flex-col`) with horizontal underline tab bar
- Render all 3 tab components stacked vertically, each wrapped in a `<section id="general|billing|academic">`
- Tab bar uses `sticky top-0 z-10` with matching background color (white in light, zinc-950 in dark)
- Each tab link calls `document.getElementById(id).scrollIntoView({ behavior: 'smooth' })` on click
- Active tab determined by `useScrollSpy` hook
- Mobile: tab bar is horizontal with `overflow-x-auto` if needed

**`sinaloka-platform/src/pages/Settings/useScrollSpy.ts`** — new hook:

```typescript
function useScrollSpy(sectionIds: string[]): string
```

- Creates an `IntersectionObserver` watching all section elements
- Threshold: `0.3` (section is "active" when 30% visible in viewport)
- `rootMargin`: negative top margin matching sticky bar height so detection accounts for the bar
- Returns the `id` of the currently intersecting section (defaults to first section)
- Cleans up observer on unmount

**`sinaloka-platform/src/pages/Settings/useSettingsPage.ts`** — minor change:

- Remove `activeTab` and `setActiveTab` state (no longer needed)
- Everything else unchanged

### Files Unchanged

- `tabs/GeneralTab.tsx` — renders as-is, now always visible
- `tabs/BillingTab.tsx` — renders as-is, now always visible
- `tabs/AcademicTab.tsx` — renders as-is, now always visible
- All backend files — zero API changes
- `hooks/useSettings.ts` — query hooks unchanged
- `services/settings.service.ts` — unchanged
- `types/settings.ts` — unchanged

## Layout Structure

```
┌──────────────────────────────────────────┐
│ Settings                                  │  ← scrolls away
│ Manage your institution preferences       │
├──────────────────────────────────────────┤
│ General ─── Billing ─── Academic          │  ← sticky top-0
│ ━━━━━━━━                                  │    (underline = active)
├──────────────────────────────────────────┤
│                                           │
│  <section id="general">                   │
│    <GeneralTab ... />                     │
│  </section>                               │
│                                           │
│  <section id="billing">                   │
│    <BillingTab ... />                     │
│  </section>                               │
│                                           │
│  <section id="academic">                  │
│    <AcademicTab ... />                    │
│  </section>                               │
│                                           │
└──────────────────────────────────────────┘
```

## Behavior

1. **Page load** — all 3 sections visible, "General" tab underlined
2. **Scroll down** — underline moves to whichever section enters the viewport (IntersectionObserver)
3. **Click tab** — smooth-scroll to target section via `scrollIntoView`, tab underline updates
4. **Save buttons** — each section retains its own Save button, calling its own API endpoint independently
5. **Mobile** — tab bar stays horizontal, sections stack vertically (no layout change needed since they already stack)

## Scroll-Spy Details

- `IntersectionObserver` with `threshold: 0.3` watches all 3 `<section>` elements
- `rootMargin` uses a negative top value of `-128px` (app header 64px + tab bar 64px) so the observer correctly identifies which section is below both bars
- When multiple sections intersect (transition), the topmost one wins
- If no section intersects (edge case), defaults to the first section

## Data Flow

No changes to data flow. All 3 sections fetch their data independently via existing TanStack Query hooks (`useGeneralSettings`, `useBillingSettings`, `useAcademicSettings`). Since all sections now render on mount, all 3 queries fire on page load instead of lazily. This is acceptable — the queries are lightweight GET requests.

## Styling

- Tab bar: `flex gap-7 border-b border-zinc-200 dark:border-zinc-800`
- Active tab: `border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold`
- Inactive tab: `text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300`
- Sticky bar: `sticky top-16 z-10 bg-white dark:bg-zinc-950` (top-16 clears the app header)
- Icons: kept from current tabs (Building2, CreditCard, GraduationCap) at 16px alongside text
- Sections: `scroll-mt-32` (8rem / 128px) to offset for app header (4rem) + tab bar (4rem)
- rootMargin, scroll-mt, and sticky top must all account for the app header height

## Testing

- Existing unit tests unaffected (tab components render the same)
- E2E: no existing Playwright tests target the Settings page — no selector updates needed
