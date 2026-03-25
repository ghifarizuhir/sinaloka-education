# Wire Settings Subject Categories to Real Subjects Table

## Problem

The Settings Academic tab has a "Subject Categories" section where admins add/remove subjects. These are stored as labels in the `institutions.settings` JSON blob (`subject_categories`). However, tutors and classes use the real `subjects` database table. The two systems are completely disconnected — subjects added in Settings never appear when assigning subjects to tutors or classes.

## Solution

Rewire the Settings Academic tab's Subject Categories section to read from and write to the real `subjects` table via existing API endpoints (`GET /api/subjects`, `POST /api/admin/subjects`, `DELETE /api/admin/subjects/:id`). No backend changes needed — all endpoints already exist. Frontend-only fix.

## What Changes

### Frontend (sinaloka-platform)

**`src/pages/Settings/useSettingsPage.ts`:**
- Remove `subjectCategories` local state and its handlers (`handleAddSubjectCategory`, `handleRemoveSubjectCategory`)
- Remove `subject_categories` from the academic settings save payload
- Add calls to existing subject endpoints for add/delete

**`src/pages/Settings/tabs/AcademicTab.tsx`:**
- Receive subjects from the `useSubjects()` hook (already exists at `src/hooks/useSubjects.ts`) instead of from settings state
- Wire add button to `POST /api/admin/subjects` (create real Subject record)
- Wire remove button to `DELETE /api/admin/subjects/:id` (delete real Subject record)
- UI appearance stays identical (badges with add/remove)

**New hooks needed (or inline mutations):**
- `useCreateSubject()` — calls `POST /api/admin/subjects` with `{ name }`, invalidates `['subjects']` query
- `useDeleteSubject()` — calls `DELETE /api/admin/subjects/:id`, invalidates `['subjects']` query

### Backend

No changes. The following endpoints already exist and are functional:
- `GET /api/subjects` — list all subjects for the institution (used by Tutors/Classes pages)
- `POST /api/admin/subjects` — create a subject (ADMIN/SUPER_ADMIN only)
- `DELETE /api/admin/subjects/:id` — delete a subject (ADMIN/SUPER_ADMIN only)

### Data Migration

None needed. Existing `subject_categories` in the JSON blob are orphaned labels never consumed by any other part of the system. They remain in the JSON but are no longer read or displayed. The `subject_categories` field in the academic settings DTO can be left as-is or removed — it's inert either way.

## What Stays the Same

- UI look and feel (badges with X to remove, input to add)
- Position in Settings → Academic tab
- Grade Levels section (still uses settings JSON)
- Working Days section (still uses settings JSON)
- Room Management section (still uses settings JSON)
- All backend endpoints (no changes)

## Out of Scope

- Subject editing/renaming (not in current UI)
- Subject ordering (not in current UI)
- Removing `subject_categories` from the settings DTO (cleanup, not urgent)
