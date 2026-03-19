---
phase: 01-academic-settings
plan: 03
subsystem: ui
tags: [react, tailwind, select, dropdown, i18n, classes]

# Dependency graph
requires:
  - phase: 01-academic-settings
    plan: 01
    provides: "Academic settings data pipeline and Room type/interface"
  - phase: 01-academic-settings
    plan: 02
    provides: "Academic settings tab with rooms CRUD, useAcademicSettings hook"
provides:
  - "Class form room field replaced with Select dropdown populated from institution rooms"
  - "Only Available-status rooms appear in the dropdown"
  - "Backward compatibility warning banner for classes with non-matching room values"
affects: [classes, academic-settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filter settings data by status before passing as dropdown options"
    - "Backward compatibility via mismatch detection when editing existing records"

key-files:
  created: []
  modified:
    - sinaloka-platform/src/pages/Classes/useClassesPage.ts
    - sinaloka-platform/src/pages/Classes/ClassFormModal.tsx

key-decisions:
  - "Room name string is written to Class.room field (backward compatible with free-text DB column)"
  - "Only rooms with status Available are shown in the dropdown"
  - "Yellow warning banner shown when editing a class whose room value does not match any settings room"

patterns-established:
  - "Settings-driven dropdowns: filter settings data by status, map to {value, label} options"

requirements-completed: [ACAD-05]

# Metrics
duration: 10min
completed: 2026-03-19
---

# Phase 01 Plan 03: Class Room Dropdown from Academic Settings Summary

**Class form room field replaced with a settings-driven Select dropdown showing only Available rooms, with backward-compatibility warning for mismatched existing values.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-19
- **Completed:** 2026-03-19
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 2

## Accomplishments

- `useClassesPage.ts` now calls `useAcademicSettings()` and computes `availableRooms` filtered to `status === 'Available'`
- `ClassFormModal.tsx` replaces the free-text `<Input id="room">` with a `<Select>` component whose options are built from `availableRooms`
- Yellow warning banner (`AlertTriangle` + amber styling) is shown when editing a class whose room value does not match any room in the settings list
- Empty-rooms edge case handled: Select is disabled and a helper text is shown when no Available rooms exist
- Human verification checkpoint was approved — feature confirmed working end-to-end

## Task Commits

1. **Task 1: Add available rooms to useClassesPage from academic settings** - `da80d16` (feat)
2. **Task 2: Replace room Input with Select dropdown in ClassFormModal** - `4d5a60f` (feat)
3. **Task 3: Verify Academic Settings and Class Form Room Dropdown** - human-verify (approved, no commit)

## Files Created/Modified

- `sinaloka-platform/src/pages/Classes/useClassesPage.ts` - Added `useAcademicSettings` import, hook call, `availableRooms` computed value (filtered to Available status), and `availableRooms` in return object
- `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx` - Replaced `<Input id="room">` with `<Select>`, added `roomOptions` mapping, `hasRoomMismatch` detection, backward-compat warning banner, and empty-rooms helper text

## Decisions Made

- Room name string is written to `Class.room` (the existing free-text DB column) via `setFormRoom(val)` — no schema migration needed
- `availableRooms` is filtered at the hook consumer level (not inside `useAcademicSettings`) to keep the hook generic
- Backward compatibility: when `editingClass.room` has a value that does not appear in settings rooms, a yellow warning is shown above the dropdown rather than blocking the user

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 01 (academic-settings) is now fully complete: data pipeline, Academic Settings UI, and Classes room dropdown all shipped
- Remaining concern from STATE.md: "Resend Receipt" backend capability — needs investigation before Phase 3 billing plan

---
*Phase: 01-academic-settings*
*Completed: 2026-03-19*
