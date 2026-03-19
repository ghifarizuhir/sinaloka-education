---
phase: 01-academic-settings
verified: 2026-03-19T03:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Verify room CRUD persists after page refresh"
    expected: "Room created via modal appears in table after page reload; edited changes are retained; deleted room is gone"
    why_human: "Cannot run the live app in this environment; persistence requires an actual backend + DB round-trip"
  - test: "Verify working days toggle + save persists"
    expected: "Toggling days and clicking Save Working Days, then refreshing, shows the saved selection"
    why_human: "Requires live interaction and page reload"
  - test: "Verify Online room type hides capacity field"
    expected: "When room type is changed to Online in the modal, the Capacity input field disappears"
    why_human: "Conditional render requires visual browser verification"
  - test: "Verify grade levels default to Indonesian list on first load"
    expected: "On an institution with no stored academic settings, grade levels section shows SD 1 through Universitas (13 entries)"
    why_human: "Requires a fresh institution with null settings and a live UI"
  - test: "Verify class form room dropdown shows only Available rooms"
    expected: "Rooms with status Maintenance or Unavailable do not appear in the class form room dropdown"
    why_human: "Requires live rooms data in the DB with mixed statuses"
  - test: "Verify backward compat warning banner in class form"
    expected: "When editing a class whose room field contains a free-text value not matching any settings room, a yellow warning banner appears above the dropdown"
    why_human: "Requires an existing class record with a legacy free-text room value"
---

# Phase 01: Academic Settings Verification Report

**Phase Goal:** Admin can fully manage rooms, subject categories, grade levels, and working days through Settings, and Classes use those rooms
**Verified:** 2026-03-19T03:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | GET /api/settings/academic returns academic settings with rooms, subject_categories, grade_levels, working_days | VERIFIED | `settings.controller.ts:52-55` calls `settingsService.getAcademic`; service returns `{ ...ACADEMIC_DEFAULTS, ...stored }` |
| 2 | PATCH /api/settings/academic updates academic settings without overwriting billing | VERIFIED | `settings.service.ts:134-156` spreads `...currentSettings` to preserve sibling keys; unit test "preserves billing settings" passes |
| 3 | Frontend hooks useAcademicSettings and useUpdateAcademicSettings exist and call correct endpoints | VERIFIED | `useSettings.ts:38-51` — both hooks defined, queryKey `['settings', 'academic']`, queryFn `settingsService.getAcademic` |
| 4 | Admin can create, edit, delete rooms via modal form with Name, Type, Capacity, Status fields | VERIFIED | `AcademicTab.tsx:277-327` — full Modal with all four fields; `useSettingsPage.ts:175-209` — handleSaveRoom and handleDeleteRoom mutate via updateAcademic |
| 5 | Online room type automatically nulls capacity (capacity field hidden) | VERIFIED | `AcademicTab.tsx:301` — `{roomFormType !== 'Online' && ...}` conditionally renders capacity field; `useSettingsPage.ts:176` — `const capacity = roomFormType === 'Online' ? null : ...` |
| 6 | Admin can manage subject categories as badges with add/remove | VERIFIED | `AcademicTab.tsx:106-135` — badge map with X buttons calling `handleRemoveSubjectCategory`; inline Input on Plus click; `useSettingsPage.ts:215-241` — handlers persist via updateAcademic |
| 7 | Admin can manage grade levels as badges with add/remove | VERIFIED | `AcademicTab.tsx:150-179` — identical badge pattern; `useSettingsPage.ts:247-273` — handleAddGrade/handleRemoveGrade |
| 8 | Admin can toggle working days Mon-Sun and save them | VERIFIED | `AcademicTab.tsx:63-89` — DAYS constant with aria-pressed toggles, Save Working Days button; `useSettingsPage.ts:276-289` — handleToggleWorkingDay/handleSaveWorkingDays |
| 9 | Class form shows room Select dropdown instead of free-text Input | VERIFIED | `ClassFormModal.tsx:100-316` — roomOptions built from availableRooms, Select component rendered; no `<Input id="room"` found |
| 10 | Only Available rooms appear in class form dropdown; backward compat warning shown for mismatched values | VERIFIED | `useClassesPage.ts:74` — `.filter(r => r.status === 'Available')`; `ClassFormModal.tsx:105` — `hasRoomMismatch` detection; `ClassFormModal.tsx:302-305` — warning banner rendered when mismatch |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `sinaloka-backend/src/modules/settings/settings.service.ts` | getAcademic and updateAcademic methods | VERIFIED | Lines 120-156 — both methods present with ACADEMIC_DEFAULTS, spread-merge pattern |
| `sinaloka-backend/src/modules/settings/settings.service.spec.ts` | Unit tests for getAcademic and updateAcademic including billing coexistence | VERIFIED | 6 tests, all pass — defaults, merging, NotFoundException, billing preservation, academic merge, NotFoundException on update |
| `sinaloka-backend/src/modules/settings/settings.dto.ts` | UpdateAcademicSettingsSchema Zod validation | VERIFIED | Lines 49-82 — RoomSchema, SubjectCategorySchema, GradeLevelSchema, UpdateAcademicSettingsSchema all exported |
| `sinaloka-backend/src/modules/settings/settings.controller.ts` | GET /academic and PATCH /academic endpoints | VERIFIED | Lines 52-64 — both decorated endpoints calling settingsService methods |
| `sinaloka-platform/src/types/settings.ts` | AcademicSettings, Room, SubjectCategory, GradeLevel TypeScript interfaces | VERIFIED | Lines 46-81 — RoomType, RoomStatus, Room, SubjectCategory, GradeLevel, AcademicSettings, UpdateAcademicSettingsDto all exported |
| `sinaloka-platform/src/services/settings.service.ts` | getAcademic and updateAcademic API calls | VERIFIED | Lines 13-16 — both methods calling `/api/settings/academic` via typed axios |
| `sinaloka-platform/src/hooks/useSettings.ts` | useAcademicSettings and useUpdateAcademicSettings hooks | VERIFIED | Lines 38-51 — both hooks exported with correct queryKey and queryFn |
| `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` | Academic settings state management, room modal state, save handlers | VERIFIED | Lines 132-289 — full state block: API integration, room CRUD handlers, category/grade handlers, working day handlers |
| `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx` | Interactive Academic tab with room table, modal, categories, grades, working days | VERIFIED | 343 lines — no mock data, all sections wired to props from useSettingsPage |
| `sinaloka-platform/src/pages/Classes/useClassesPage.ts` | Available rooms data from academic settings hook | VERIFIED | Line 72 — `useAcademicSettings()` called; line 74 — `availableRooms` filtered; line 364 — returned |
| `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx` | Room Select dropdown, backward compatibility warning | VERIFIED | roomOptions built, Select rendered, hasRoomMismatch detection, warning banner, disabled state for empty rooms |
| `sinaloka-platform/src/locales/en.json` | i18n keys for academic settings | VERIFIED | Keys confirmed: addRoom, roomSaved, saveWorkingDays, noRooms, categorySaved, gradeSaved, selectRoom |
| `sinaloka-platform/src/locales/id.json` | Indonesian translations for academic settings | VERIFIED | Matching Indonesian keys confirmed at same line positions |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `settings.controller.ts` | `settings.service.ts` | `this.settingsService.getAcademic` | WIRED | `controller.ts:54` calls `settingsService.getAcademic(user.institutionId!)` |
| `settings.controller.ts` | `settings.service.ts` | `this.settingsService.updateAcademic` | WIRED | `controller.ts:63` calls `settingsService.updateAcademic(user.institutionId!, dto)` |
| `useSettingsPage.ts` | `useSettings.ts` | `useAcademicSettings()` | WIRED | `useSettingsPage.ts:5` imports; line 133 calls `useAcademicSettings()` |
| `useSettingsPage.ts` | `useSettings.ts` | `useUpdateAcademicSettings()` | WIRED | `useSettingsPage.ts:5` imports; line 134 calls `useUpdateAcademicSettings()` |
| `AcademicTab.tsx` | `useSettingsPage.ts` | Props via `AcademicTabProps` | WIRED | `AcademicTab.tsx:12-25` — `AcademicTabProps` picks 26 named items from `SettingsPageState` |
| `useClassesPage.ts` | `useSettings.ts` | `useAcademicSettings()` | WIRED | `useClassesPage.ts:12` imports; line 72 calls hook; line 74 derives `availableRooms` |
| `ClassFormModal.tsx` | `useClassesPage.ts` | `availableRooms` prop | WIRED | `ClassFormModal.tsx:55` declares prop; `Classes/index.tsx:161` passes `state.availableRooms` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ACAD-01 | 01-02-PLAN | Admin can create, edit, and delete rooms with backend persistence (including Online type) | SATISFIED | Room modal with full CRUD in AcademicTab + useSettingsPage; Online type nulls capacity; all wired to PATCH /api/settings/academic |
| ACAD-02 | 01-02-PLAN | Admin can manage subject categories with backend persistence | SATISFIED | Badge list with add/remove in AcademicTab; handleAddSubjectCategory/handleRemoveSubjectCategory persist via updateAcademic |
| ACAD-03 | 01-02-PLAN | Admin can manage grade levels with backend persistence | SATISFIED | Badge list with add/remove in AcademicTab; handleAddGrade/handleRemoveGrade persist via updateAcademic |
| ACAD-04 | 01-02-PLAN | Admin can configure working days (Mon-Sun toggles) with backend persistence | SATISFIED | DAYS constant with aria-pressed buttons + Save Working Days button in AcademicTab; handleToggleWorkingDay/handleSaveWorkingDays in useSettingsPage |
| ACAD-05 | 01-03-PLAN | Class form shows room dropdown populated from institution's rooms (replacing free-text) | SATISFIED | ClassFormModal uses Select with roomOptions from availableRooms; no `<Input id="room">` present; backward compat warning banner implemented |
| ACAD-06 | 01-01-PLAN | Backend API endpoints for academic settings CRUD stored in Institution.settings JSON blob | SATISFIED | GET + PATCH /api/settings/academic in controller; spread-merge pattern in service; Zod schema validates all four fields; 6 unit tests pass |

No orphaned requirements found — all ACAD-01 through ACAD-06 are claimed by plans and implemented.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No anti-patterns found in phase-modified files |

Checks performed:
- No TODO/FIXME/HACK comments in settings or classes files modified by this phase
- No mock data arrays in AcademicTab (no `['Science', 'Mathematics', ...]` or `['Elementary', ...]`)
- No mock room data in useSettingsPage (no `{ id: 'R1', ... }`)
- No empty return stubs in service methods
- No `console.log`-only handlers
- No hardcoded `text-zinc-` classes remaining in AcademicTab (all migrated to semantic tokens)

Note: Backend `tsc --noEmit` reports errors in `class.service.spec.ts`, `enrollment.service.spec.ts`, `expense.service.spec.ts`, `session.service.spec.ts`, and `payout.controller.spec.ts`. These are in pre-existing test files unrelated to this phase and were present before Phase 01 work began. Zero errors exist in the settings module files.

---

### Human Verification Required

#### 1. Room CRUD persistence across page reload

**Test:** Create a new room via the Add Room modal (Name: "Room A", Type: Classroom, Capacity: 20, Status: Available). Save it. Hard-reload the page (Ctrl+Shift+R). Check that Room A still appears in the table.
**Expected:** Room A is present after reload, confirming the PATCH /api/settings/academic call wrote to the DB and GET returns it.
**Why human:** Requires a running backend with a real PostgreSQL DB; cannot simulate the full network + persistence cycle with grep/file checks.

#### 2. Working days toggle + save persists

**Test:** Navigate to Settings > Academic tab. Toggle off Saturday (Sat button). Click Save Working Days. Refresh the page.
**Expected:** The Sat button is still inactive after reload, confirming the saved working_days does not include 6.
**Why human:** Requires live app interaction and page reload to confirm persistence.

#### 3. Online room type hides capacity field in modal

**Test:** Open the Add Room modal. Change Type to Online.
**Expected:** The Capacity input field disappears immediately when Online is selected.
**Why human:** Conditional render requires a browser; cannot verify React state-driven conditional from static code analysis alone (though the code at AcademicTab.tsx:301 is correct).

#### 4. Grade levels default to Indonesian list on first load

**Test:** On an institution that has never saved academic settings, navigate to Settings > Academic tab.
**Expected:** Grade Levels section shows 13 badges: SD 1, SD 2, SD 3, SD 4, SD 5, SD 6, SMP 7, SMP 8, SMP 9, SMA 10, SMA 11, SMA 12, Universitas.
**Why human:** Requires a DB with an institution that has `settings = null` or no `academic` key.

#### 5. Class form room dropdown filters by Available status

**Test:** Ensure at least one room has status Available and one has Maintenance. Open a class creation form.
**Expected:** Only the Available room appears in the dropdown; the Maintenance room is absent.
**Why human:** Requires live rooms data in the DB with mixed statuses; Plan 03 human-verify checkpoint was approved by the user per 01-03-SUMMARY.md.

#### 6. Backward compatibility warning banner

**Test:** Find or create a class whose `room` field contains a free-text string (e.g., "Main Hall") that does not match any room name in Settings. Open that class's edit form.
**Expected:** A yellow warning banner appears above the room dropdown referencing the old value "Main Hall".
**Why human:** Requires an existing DB record with a legacy free-text room value.

---

### Summary

Phase 01 goal is fully achieved. All six requirements (ACAD-01 through ACAD-06) are implemented and wired end-to-end:

- **Plan 01 (ACAD-06):** Backend GET/PATCH /api/settings/academic endpoints with Zod validation, ACADEMIC_DEFAULTS including 13 Indonesian grade levels, billing coexistence via spread-merge, 6 passing unit tests, and frontend types/service/hooks.

- **Plan 02 (ACAD-01 through ACAD-04):** AcademicTab fully rewritten — room CRUD via Modal + ConfirmDialog, subject categories and grade levels as badge lists with inline add inputs, working day toggles with Save button. useSettingsPage manages all state from API. All hardcoded mock data removed. All zinc color classes migrated to semantic tokens. i18n complete in both en.json and id.json.

- **Plan 03 (ACAD-05):** ClassFormModal room field replaced from free-text Input to Select dropdown populated from `availableRooms` (filtered to Available status). Backward compatibility warning banner implemented. useClassesPage wired to useAcademicSettings. The human verification checkpoint in Plan 03 was completed and approved per the summary.

The frontend platform builds without errors (`vite build` succeeds). Backend settings module has zero TypeScript errors. Backend unit tests (6/6) pass. No anti-patterns detected in phase-modified files.

---

_Verified: 2026-03-19T03:00:00Z_
_Verifier: Claude (gsd-verifier)_
