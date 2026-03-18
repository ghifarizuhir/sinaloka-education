# Roadmap: Sinaloka Platform — Full Integration & Polish

## Overview

The admin platform has a working CRUD foundation but four Settings tabs are non-functional, scattered buttons across Finance and Attendance pages are placeholders, and some UI elements show mock data. This milestone works through those gaps in order of dependency: first establishing the backend API and frontend for Academic Settings (the heaviest coupled work), then completing remaining Settings tabs (Branding persistence and cleanup of Security/Integrations), then connecting all placeholder feature buttons across Finance and Attendance, and finally doing a quality sweep to confirm no placeholder or mock data remains anywhere.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Academic Settings** - Backend API + full frontend for rooms, subjects, grades, and working days — including rooms dropdown in Classes
- [ ] **Phase 2: Settings Completion** - Branding color persistence, Security tab cleanup, Integrations real status, Delete Institution guard
- [ ] **Phase 3: Feature Completion** - All Finance and Attendance placeholder buttons made functional
- [ ] **Phase 4: Quality Polish** - Full sweep to eliminate remaining placeholder buttons and mock data

## Phase Details

### Phase 1: Academic Settings
**Goal**: Admin can fully manage rooms, subject categories, grade levels, and working days through Settings, and Classes use those rooms
**Depends on**: Nothing (first phase)
**Requirements**: ACAD-01, ACAD-02, ACAD-03, ACAD-04, ACAD-05, ACAD-06
**Success Criteria** (what must be TRUE):
  1. Admin can create, edit, and delete rooms (including an "Online" type) in Settings Academic tab and the list persists after page refresh
  2. Admin can manage subject categories and grade levels in Settings Academic tab with changes surviving reload
  3. Admin can toggle working days (Mon–Sun) in Settings Academic tab and the configuration persists
  4. Class creation and edit forms show a room dropdown populated from the institution's saved rooms instead of a free-text field
  5. All academic settings are stored per-institution (multi-tenant) via backend API endpoints against the Institution.settings JSON blob
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Backend API + frontend data layer (types, service, hooks) for academic settings
- [ ] 01-02-PLAN.md — Academic tab UI: rooms CRUD modal, subject categories, grade levels, working days toggles
- [ ] 01-03-PLAN.md — Class form room dropdown replacing free-text input + human verification

### Phase 2: Settings Completion
**Goal**: All remaining Settings tabs either work correctly or are honestly represented — no fake toggles, no missing persistence
**Depends on**: Phase 1
**Requirements**: BRND-01, SETT-01, SETT-02, SETT-03
**Success Criteria** (what must be TRUE):
  1. Admin can pick a primary color in the Branding tab and it persists to the backend and is still set after a hard refresh
  2. Security tab does not show fake toggles — it is either removed or replaced with a "coming soon" state
  3. Integrations tab shows "connected" for WhatsApp when credentials exist in institution settings, and "not configured" otherwise
  4. "Delete Institution" button in General tab is hidden for non-SUPER_ADMIN users or triggers a proper confirmation dialog when shown
**Plans**: TBD

### Phase 3: Feature Completion
**Goal**: All Finance and Attendance buttons that exist in the UI do something useful — no more no-op clicks
**Depends on**: Phase 2
**Requirements**: FINA-01, FINA-02, FINA-03, FINA-04, FINA-05, ATTN-01
**Success Criteria** (what must be TRUE):
  1. "Revenue Analytics" button on Student Payments page shows a chart or summary view of real payment data
  2. "Export PDF" button in the payment ledger drawer downloads a PDF statement for the selected student
  3. "Resend Receipt" button in the payment ledger drawer sends a receipt notification to the parent (or is removed if the backend cannot support it)
  4. "Export" button on Operating Expenses page downloads a CSV of the current expense list
  5. "Filters" button on Operating Expenses page opens a filter panel allowing filtering by category, date range, or amount
  6. "View History" button on the Attendance page navigates to or displays attendance history for the selected session or class
**Plans**: TBD

### Phase 4: Quality Polish
**Goal**: The platform has zero non-functional buttons and zero hardcoded mock data anywhere
**Depends on**: Phase 3
**Requirements**: QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. Every button visible in the platform either performs its labeled action or is visually disabled with a tooltip or label explaining why
  2. No page or component renders hardcoded mock data — all displayed data originates from backend API responses
  3. A full manual walkthrough of all platform pages finds no broken, no-op, or placeholder UI elements
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Academic Settings | 0/3 | Planning complete | - |
| 2. Settings Completion | 0/TBD | Not started | - |
| 3. Feature Completion | 0/TBD | Not started | - |
| 4. Quality Polish | 0/TBD | Not started | - |
