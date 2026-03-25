# Dashboard Redesign: Institution Overview + Redundancy Cleanup

## Problem

The admin dashboard wastes space with a decorative hero welcome section that adds no value for 1-3 admins who see it daily. Additionally, key metrics (revenue, tutors, sessions) are duplicated across 3 locations: the bento stats grid, the Revenue/Sessions cards, and the sidebar Metrics Summary.

## Solution

Replace the hero with a compact, functional **Institution Overview Card** that combines identity, greeting, alerts, and quick actions. Remove all redundant data displays so each metric appears in exactly one place. Add an **Upcoming Sessions** list to the sidebar to replace the removed Metrics Summary.

## Design

### New Dashboard Structure

```
┌─────────────────────────────────────────────────┐
│ 1. Institution Overview Card                     │
│    [Avatar + Name + Greeting]  [Quick Actions]   │
│    [⚠ 3 overdue]  [📅 5 upcoming sessions]        │
├──────────┬──────────┬───────────┬───────────────┤
│ 2. Bento Stats Grid (unchanged)                  │
│ Students │  Tutors  │ Attendance│   Revenue     │
├──────────┴──────────┴───────┬───┴───────────────┤
│ 3. Activity Feed (2/3)      │ 4. Sidebar (1/3)  │
│    Enrollments, payments,   │  Upcoming Sessions │
│    attendance events        │  Quick Links       │
└─────────────────────────────┴───────────────────┘
```

### 1. Institution Overview Card

Two-row card replacing both the hero greeting and the overdue alert banner.

**Row 1 — Identity + Actions:**
- Left side: institution initial avatar (first letter, gradient bg) + institution name + time-based greeting ("Good morning, Ahmad")
- Right side: Quick Actions button (triggers existing command palette)

**Row 2 — Contextual Alert Chips:**
- Dynamic chips, only rendered when actionable:
  - **Overdue payments** (amber): "N payments overdue" — clickable, navigates to `/finance/payments`. Data from existing `useOverdueSummary()` hook.
  - **Upcoming sessions** (blue): "N upcoming sessions" — clickable, navigates to `/schedules`. Count from existing `stats.upcoming_sessions` (already returned by `getStats()`).
- If nothing is actionable, row 2 does not render — card collapses to identity row only.

**Data sources:**
- Institution name: `AuthContext` (`user.institution.name`). Falls back to a generic label when `user.institution` is null (e.g. SUPER_ADMIN without tenant scope).
- Greeting: reuse existing `getGreeting()` helper — consume only the `.key` property; the `.icon` and `.gradient` properties become unused after hero removal and can be cleaned up.
- Overdue count: existing `useOverdueSummary()` hook
- Upcoming sessions count: existing `stats.upcoming_sessions` from `useDashboardStats()` (no new endpoint needed for the chip count)

### 2. Bento Stats Grid

No changes. The 4 stat cards (Total Students, Active Tutors, Attendance Rate, Monthly Revenue) remain as the single source of truth for these metrics.

### 3. Activity Feed

Stays in the 2/3 left column. The Revenue Card and Sessions Card that previously sat above it are removed. Content unchanged: enrollment, payment, and attendance events with time-ago timestamps and "View All" button.

### 4. Sidebar

Two cards in the 1/3 right column:

**Upcoming Sessions (new):**
- Header: "Upcoming Sessions" with "View All" link to `/schedules`
- Shows next 5 scheduled sessions sorted by date/time ascending
- Each row displays: subject name, time, tutor name
- Empty state: "No sessions scheduled"

**Quick Links (existing, unchanged):**
- 4 navigation shortcuts: Students, Finance, Attendance, Schedules

### 5. Command Palette

No changes. Same modal, same actions. Trigger moves from the deleted hero to the institution overview card.

## Removals

| Component | Lines in Dashboard.tsx | Reason |
|-----------|----------------------|--------|
| Hero greeting section | 99-146 | Replaced by institution overview card |
| Overdue alert banner | 148-172 | Absorbed into institution card chips |
| Revenue Card | 241-256 | Redundant with bento grid |
| Sessions Card | 258-274 | Redundant with bento grid |
| Sidebar Metrics Summary | 361-382 | Redundant with bento grid |

**Unused imports to clean up:** `Sun`, `Moon`, `Sunset` (hero gradient icons), `BookOpen` (sessions card icon). `CreditCard` may still be needed for Quick Links.

## Backend Changes

### New Endpoint: `GET /api/admin/dashboard/upcoming-sessions`

Returns next 5 scheduled sessions with detail.

**Response shape:**
```typescript
interface UpcomingSession {
  id: string;
  date: string;        // ISO date
  start_time: string;  // e.g. "10:00"
  subject_name: string;
  tutor_name: string;
  class_name: string;
}
```

**Query:**
- Filter: `status = 'SCHEDULED'`, `date >= now()`
- Order: `date ASC`
- Limit: 5
- Scoped by `tenantId` (institution isolation)

**Implementation:** Add `getUpcomingSessions(institutionId: string)` method to `DashboardService`. Add route to `DashboardController`.

### Frontend Changes

**New hook:** `useDashboardUpcomingSessions()` in `src/hooks/useDashboard.ts`

**New service method:** `getUpcomingSessions()` in `src/services/dashboard.service.ts` calling `GET /api/admin/dashboard/upcoming-sessions`

**New type:** `UpcomingSession` in `src/types/dashboard.ts`

## Testing

**Backend:**
- Unit test for `DashboardService.getUpcomingSessions()` — verifies correct filtering, ordering, limit, and tenant scoping

**Frontend:**
- Update existing dashboard mock data to include upcoming sessions
- Verify institution overview card renders with/without alert chips
- Verify upcoming sessions sidebar renders with data and empty state

## Out of Scope

- Pending enrollments chip (can be added later)
- Institution logo upload (uses first-letter avatar for now)
- Institution vitals display (timezone, currency — stays in Settings only)
