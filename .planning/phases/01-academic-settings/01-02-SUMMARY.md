---
phase: 01-academic-settings
plan: 02
subsystem: ui
tags: [react, tanstack-query, i18n, modal, crud, settings, academic]

requires:
  - phase: 01-academic-settings/01
    provides: "useAcademicSettings/useUpdateAcademicSettings hooks, AcademicSettings types, backend GET/PATCH endpoints"
provides:
  - "Interactive Academic tab with room CRUD modal, subject category badges, grade level badges, working day toggles"
  - "Full i18n coverage for academic settings in en.json and id.json"
  - "Room modal form state management in useSettingsPage"
affects: [01-03-PLAN]

tech-stack:
  added: []
  patterns:
    - "Room CRUD via optimistic mutation with modal form pattern"
    - "Badge list add/remove with inline input toggle pattern"
    - "Working day toggles with explicit save button"

key-files:
  created: []
  modified:
    - sinaloka-platform/src/pages/Settings/useSettingsPage.ts
    - sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx
    - sinaloka-platform/src/pages/Settings/index.tsx
    - sinaloka-platform/src/locales/en.json
    - sinaloka-platform/src/locales/id.json

key-decisions:
  - "Renamed academic category handlers to handleAddSubjectCategory/handleRemoveSubjectCategory to avoid naming collision with existing billing handleAddCategory/handleRemoveCategory"
  - "Used Pencil icon instead of ExternalLink for room edit action (more intuitive)"

patterns-established:
  - "Modal CRUD pattern: parent hook manages form state, child component renders Modal with form fields"
  - "Badge list pattern: inline Input appears on Plus click, Enter commits, Escape cancels"

requirements-completed: [ACAD-01, ACAD-02, ACAD-03, ACAD-04]

duration: 5min
completed: 2026-03-19
---

# Phase 01 Plan 02: Academic Tab UI Summary

**Interactive Academic tab with room CRUD modal, subject category/grade level badge management, and working day toggles backed by real API data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T00:45:35Z
- **Completed:** 2026-03-19T00:50:50Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Replaced all hardcoded mock data in Academic tab with real API-backed state via useAcademicSettings
- Room management with full create/edit/delete via Modal and ConfirmDialog components
- Subject category and grade level badge lists with inline add/remove functionality
- Working day toggles with explicit save button, all persisting to backend
- Complete i18n coverage (20+ new keys) in both English and Indonesian locales
- Migrated all hardcoded zinc color classes to semantic design tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend useSettingsPage with academic settings state and handlers** - `3f54b5c` (feat)
2. **Task 2: Rewrite AcademicTab with real data, room modal, badges, working days** - `47c3525` (feat)
3. **Task 3: Add i18n keys for academic settings** - `eec179f` (feat)

## Files Created/Modified
- `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` - Academic settings state, room modal form state, CRUD handlers for rooms/categories/grades/working days
- `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx` - Complete rewrite with Modal, ConfirmDialog, EmptyState, badge lists, working day toggles
- `sinaloka-platform/src/pages/Settings/index.tsx` - Updated AcademicTab prop passing
- `sinaloka-platform/src/locales/en.json` - 20+ new academic settings keys and 2 class form keys
- `sinaloka-platform/src/locales/id.json` - Matching Indonesian translations

## Decisions Made
- Renamed academic category handlers to `handleAddSubjectCategory`/`handleRemoveSubjectCategory` to avoid collision with existing billing expense category handlers that already use `handleAddCategory`/`handleRemoveCategory`
- Used Pencil icon instead of ExternalLink for room edit button (better UX semantics)
- Modal children already wrapped in p-6 by Modal component, so no double padding needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed academic category handlers to avoid naming collision**
- **Found during:** Task 1 (useSettingsPage state management)
- **Issue:** Plan specified `handleAddCategory`/`handleRemoveCategory` for academic subject categories, but those names already exist for billing expense categories
- **Fix:** Used `handleAddSubjectCategory`/`handleRemoveSubjectCategory` instead
- **Files modified:** useSettingsPage.ts, AcademicTab.tsx
- **Verification:** TypeScript compiles without errors, no naming ambiguity
- **Committed in:** 3f54b5c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary rename to avoid JavaScript runtime collision. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Academic tab fully interactive, Plan 03 (Class form room dropdown) can proceed
- All hooks and types from Plan 01 consumed successfully
- Room data available for Plan 03 to populate class form room dropdown

---
*Phase: 01-academic-settings*
*Completed: 2026-03-19*
