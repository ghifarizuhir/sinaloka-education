---
phase: 01-academic-settings
plan: 01
subsystem: api
tags: [nestjs, zod, tanstack-query, typescript, settings, academic]

requires: []
provides:
  - "GET /api/settings/academic endpoint with Indonesian grade level defaults"
  - "PATCH /api/settings/academic endpoint with Zod validation"
  - "AcademicSettings, Room, SubjectCategory, GradeLevel TypeScript interfaces"
  - "useAcademicSettings and useUpdateAcademicSettings TanStack Query hooks"
affects: [01-02-PLAN, 01-03-PLAN]

tech-stack:
  added: []
  patterns:
    - "Academic settings stored in Institution.settings JSON blob alongside billing"
    - "Spread-merge pattern preserves sibling settings keys on update"

key-files:
  created:
    - sinaloka-backend/src/modules/settings/settings.service.spec.ts
  modified:
    - sinaloka-backend/src/modules/settings/settings.service.ts
    - sinaloka-backend/src/modules/settings/settings.dto.ts
    - sinaloka-backend/src/modules/settings/settings.controller.ts
    - sinaloka-platform/src/types/settings.ts
    - sinaloka-platform/src/services/settings.service.ts
    - sinaloka-platform/src/hooks/useSettings.ts

key-decisions:
  - "13 Indonesian grade levels as defaults (SD 1-6, SMP 7-9, SMA 10-12, Universitas)"
  - "Mon-Sat (days 1-6) as default working days"

patterns-established:
  - "Academic settings follow exact same get/update pattern as billing settings"
  - "Settings merge via spread operator to preserve sibling keys"

requirements-completed: [ACAD-06]

duration: 4min
completed: 2026-03-19
---

# Phase 01 Plan 01: Academic Settings Data Pipeline Summary

**Backend GET/PATCH /api/settings/academic endpoints with Zod validation, 13 Indonesian grade level defaults, and frontend TanStack Query hooks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T00:39:39Z
- **Completed:** 2026-03-19T00:43:13Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Unit tests for academic settings service covering defaults, merging, NotFoundException, and billing coexistence
- Backend GET/PATCH endpoints for academic settings with Zod schema validation
- Frontend TypeScript types, API service methods, and TanStack Query hooks with cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 0: Create settings.service.spec.ts** - `7dbbe11` (test)
2. **Task 1: Add backend academic settings endpoints** - `239a2d0` (feat)
3. **Task 2: Add frontend types, service, and hooks** - `da84fa5` (feat)
4. **Linter formatting** - `5b2f840` (style)

## Files Created/Modified
- `sinaloka-backend/src/modules/settings/settings.service.spec.ts` - 6 unit tests for getAcademic/updateAcademic
- `sinaloka-backend/src/modules/settings/settings.dto.ts` - UpdateAcademicSettingsSchema with Room, SubjectCategory, GradeLevel Zod schemas
- `sinaloka-backend/src/modules/settings/settings.service.ts` - ACADEMIC_DEFAULTS constant, getAcademic/updateAcademic methods
- `sinaloka-backend/src/modules/settings/settings.controller.ts` - GET/PATCH /academic endpoints
- `sinaloka-platform/src/types/settings.ts` - AcademicSettings, Room, SubjectCategory, GradeLevel interfaces
- `sinaloka-platform/src/services/settings.service.ts` - getAcademic/updateAcademic API methods
- `sinaloka-platform/src/hooks/useSettings.ts` - useAcademicSettings/useUpdateAcademicSettings hooks

## Decisions Made
- 13 Indonesian grade levels as defaults (SD 1-6, SMP 7-9, SMA 10-12, Universitas) matching local education system
- Working days default to Mon-Sat (days 1-6) as typical for Indonesian tutoring institutions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Academic settings data pipeline complete, Plan 02 (Academic Tab UI) can consume these hooks directly
- Plan 03 (Class form dropdown) can use the same hooks to populate room/subject/grade dropdowns

---
*Phase: 01-academic-settings*
*Completed: 2026-03-19*
