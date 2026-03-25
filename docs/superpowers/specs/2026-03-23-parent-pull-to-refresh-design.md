# Parent App Pull-to-Refresh + Stale Banner

## Context

When a tutor submits attendance or session data, a parent viewing the same data in the parent app doesn't see updates until they navigate away and back. This is confusing in live scenarios. Adding pull-to-refresh and a stale data indicator solves this without adding complexity like polling or SSE.

## Approach

Frontend-only changes to `ChildDetailPage` and `useChildDetail`. No backend changes needed.

## Changes

### `useChildDetail.ts` — add refresh tracking

- Add `lastFetchedAt: Date | null` state — shared across all tabs, set to `new Date()` after each successful fetch (including tab-switch fetches). A single shared timestamp is acceptable because any fetch proves the API connection is live, and per-tab tracking adds unnecessary complexity for this scope.
- Add `refresh()` function — re-fetches data for the currently active tab only. This is a deliberate design choice: pull-to-refresh updates the tab the user is looking at. Other tabs refresh on tab switch via the existing `useEffect`.
- Expose `lastFetchedAt` and `refresh` to consumers.

### `ChildDetailPage.tsx` — pull-to-refresh + stale banner

**Pull-to-refresh:**
- Custom touch event handler (touchstart/touchmove/touchend) attached to the content wrapper div
- Trigger: user swipes down >60px when `window.scrollY === 0` (not element `scrollTop` — the page uses window-level scrolling, no scoped overflow container)
- Visual feedback during pull: pull indicator above content with spinner + text ("Tarik untuk refresh" → "Lepas untuk refresh")
- Calls `refresh()` on release, shows brief loading state
- Disabled while already loading
- Note: `ChildDetailPage` is wrapped in Framer Motion's `AnimatePresence` in `App.tsx`. Touch handlers are attached directly on the inner content div (not the motion wrapper), so they do not interfere with Framer Motion's animation. Framer Motion only intercepts drag gestures when `drag` prop is set, which is not used here.

**Stale data banner:**
- Shown when `lastFetchedAt` is more than 5 minutes ago
- Text: "Diperbarui X menit lalu" + "Refresh" button
- Style: `bg-zinc-800 border border-zinc-700 rounded-lg` — subtle inline banner above data list
- Disappears after successful refresh
- Uses a 1-minute `setInterval` to update the "X menit lalu" text — cleanup via `useEffect` return to prevent memory leaks on unmount

### Scope

- Only `ChildDetailPage` — not DashboardPage or NotificationPage
- All 4 tabs benefit: Kehadiran, Sesi, Bayar, Kelas
- No new dependencies — pure React touch events

## Testing

- Build check (`npm run lint && npm run build`) for parent app
