# Phase 1: Academic Settings - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend API + full frontend for managing rooms, subject categories, grade levels, and working days in the Settings Academic tab. Rooms from Settings replace the free-text input in the Class creation/edit form with a dropdown. All settings stored in Institution.settings JSON blob (no Prisma schema migration).

</domain>

<decisions>
## Implementation Decisions

### Room Management UX
- Modal form for CRUD (consistent with Classes/Students pattern, not inline editing)
- Room fields: Name, Type, Capacity, Status
- Room types: Fixed list — Classroom, Laboratory, Studio, Online
- Online type automatically has unlimited capacity (no max students field)
- Status values: Available, Maintenance, Unavailable
- Status controls visibility in Class form dropdown

### Room → Classes Link
- Class form room field is a **required dropdown** populated from institution's settings rooms
- Only rooms with status "Available" appear in the dropdown
- Existing classes with free-text room values: show as-is until admin edits the class, then force dropdown selection. Old free-text value shown as warning.
- Backend: Class `room` field stays as `String?` in Prisma — dropdown writes the room name string (backward compatible)

### Subject Categories
- Categories are **required** for subjects — every subject must belong to a category
- Categories shown as headers/filters in subject lists
- Admin can create/edit/delete categories
- Stored in Institution.settings JSON blob under an `academic.subject_categories` key

### Grade Levels
- Grades apply to **both** students and classes — students have a grade, classes are tagged with target grade levels
- Grade format: preset Indonesian levels as defaults (SD 1-6, SMP 7-9, SMA 10-12, Universitas) but admin can add/rename/reorder
- Stored in Institution.settings JSON blob under an `academic.grade_levels` key

### Working Days
- Admin can toggle each day Mon-Sun
- Working days **enforce** session generation — sessions can only be created on enabled days
- Changing working days only affects future generation — already-generated sessions on now-disabled days are kept
- Stored in Institution.settings JSON blob under an `academic.working_days` key (array of enabled day numbers)

### Claude's Discretion
- Exact layout/spacing of Academic tab sections
- Default working days preset (likely Mon-Sat based on Indonesian tutoring norms)
- How to display the "old free-text room" warning on existing classes
- Error handling for deleting a room that's currently assigned to classes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Settings Pattern
- `.planning/codebase/ARCHITECTURE.md` — Settings service pattern, Institution.settings JSON blob storage
- `sinaloka-backend/src/modules/settings/settings.service.ts` — Existing billing settings CRUD pattern to follow
- `sinaloka-backend/src/modules/settings/settings.dto.ts` — Existing DTO pattern for settings validation
- `sinaloka-backend/src/modules/settings/settings.controller.ts` — Existing endpoint structure

### Frontend Settings Pattern
- `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` — Current page hook with mock room data (lines 132-136)
- `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx` — Current mock UI to be connected
- `sinaloka-platform/src/services/settings.service.ts` — Existing settings API calls
- `sinaloka-platform/src/hooks/useSettings.ts` — Existing settings hooks

### Class Form Integration
- `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx` — Room field currently free-text (lines 289-297)
- `sinaloka-platform/src/pages/Classes/useClassesPage.ts` — formRoom state (line 64, 145, 201)
- `sinaloka-backend/src/modules/class/class.dto.ts` — Room field in CreateClassSchema/UpdateClassSchema
- `sinaloka-backend/prisma/schema.prisma` — Class model `room: String?` (line 261)

### Existing Patterns
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, service/hook/page hook pattern
- `.planning/codebase/STRUCTURE.md` — Directory layout, where to add new files

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BillingTab` in Settings: existing pattern for settings JSON blob CRUD — follow this for academic settings
- `Modal` component (`src/components/ui/modal.tsx`): use for room CRUD form
- `useSettings` hook: extend with academic settings queries/mutations
- `settingsService`: extend with academic endpoints
- `Select` component (`src/components/ui/select.tsx`): use for room dropdown in Class form

### Established Patterns
- Settings JSON blob: `Institution.settings` stores billing config as `settings.billing` — academic should be `settings.academic`
- Backend settings controller: GET/PATCH pattern for each settings section
- Frontend settings page hook: manages all tab state centrally in `useSettingsPage.ts`
- TanStack Query: cache invalidation on mutation success (`qc.invalidateQueries`)

### Integration Points
- Backend: Add academic GET/PATCH endpoints to existing `SettingsController`
- Backend: Add Zod schemas for academic settings to `settings.dto.ts`
- Frontend: Add academic API calls to `settings.service.ts`
- Frontend: Add academic hooks to `useSettings.ts`
- Frontend: Replace `rooms` mock data in `useSettingsPage.ts` with API-fetched data
- Frontend: Replace `ClassFormModal` room Input with Select populated from settings
- Frontend: Replace hardcoded subject categories and grade levels in `AcademicTab.tsx`

</code_context>

<specifics>
## Specific Ideas

- Room types are a fixed list: Classroom, Laboratory, Studio, Online
- Indonesian grade level defaults: SD (1-6), SMP (7-9), SMA (10-12), Universitas
- "Online" room type has unlimited capacity — capacity field hidden or auto-set when type is Online
- Working days should default to Mon-Sat (common for Indonesian tutoring institutions)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-academic-settings*
*Context gathered: 2026-03-19*
