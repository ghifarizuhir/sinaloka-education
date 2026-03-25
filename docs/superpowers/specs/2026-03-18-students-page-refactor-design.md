# Students Page Refactor — Design Spec

**Date:** 2026-03-18
**Scope:** Split `sinaloka-platform/src/pages/Students.tsx` (1,161 lines) into a directory of focused files
**Type:** Pure refactor — no behavior changes

---

## Problem Statement

`Students.tsx` is 1,161 lines containing a table, 5 modals, 1 drawer, 25+ useState hooks, filters, bulk operations, import/export, and form validation — all in a single file. This makes it difficult to:
- Find the code for a specific feature (e.g., the import modal)
- Modify one feature without reading 1,000+ unrelated lines
- Review PRs that touch this file (every change shows in the same diff)

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Students.tsx only | Establish pattern on one page first, replicate to others later |
| Structure | Directory per page (`pages/Students/`) | Co-locates all page-specific files; scales when applied to other pages |
| State management | Single `useStudentPage.ts` hook | Keeps state centralized; sub-components are stateless props-in/callbacks-out |
| Component pattern | Stateless sub-components | Each file has one responsibility; can be modified independently |

---

## Solution

### File Structure

```
pages/Students/
  index.tsx              — Main page: stats cards, pagination, composition of sub-components
  useStudentPage.ts      — Custom hook: all state (25+ useState), handlers, queries
  StudentTable.tsx       — Table with checkboxes, columns, row click, action menus
  StudentDrawer.tsx      — Side panel: student profile, contact info, parent invite
  AddEditModal.tsx       — Add/Edit form: name, email, phone, grade dropdown, parent fields, validation
  ImportModal.tsx        — CSV import: instructions, template download, file upload, submit
  DeleteModals.tsx       — Single delete + bulk delete confirmation modals
  StudentFilters.tsx     — Search bar, grade/status dropdowns, active filter chips, column toggle
```

### Data Flow

```
index.tsx (orchestrator)
  ├── useStudentPage.ts → returns all state + handlers
  │
  ├── StudentFilters     → props: searchQuery, activeFilters, visibleColumns, onChange callbacks
  ├── StudentTable       → props: students, selectedIds, flaggedStudentIds, onSelect, onRowClick, onEdit, onDelete, onInviteParent
  ├── StudentDrawer      → props: student, isOpen, onClose, onInviteParent
  ├── AddEditModal       → props: isOpen, editingStudent, onClose, formState, formErrors, onSubmit
  ├── ImportModal        → props: isOpen, onClose, onImport
  └── DeleteModals       → props: deleteTarget, bulkDeleteConfirm, confirmText, onConfirm, onClose
```

All state lives in `useStudentPage.ts`. Sub-components are stateless — they receive data via props and fire callbacks for user actions.

**Exception:** `ImportModal.tsx` holds its own local state for `importFile` and `fileInputRef` because `useRef` must co-locate with the DOM element it references. The modal manages file selection internally and exposes only an `onImport(file)` callback to the parent.

### File Responsibilities

**`index.tsx` (~120 lines)**
- Page header (title, Import/Export/Add buttons)
- Stats cards (total, active, inactive, all pages)
- Renders `StudentFilters`, `StudentTable`, floating bulk action bar, `StudentDrawer`, `AddEditModal`, `ImportModal`, `DeleteModals`
- Pagination controls
- Imports and calls `useStudentPage()` to get all state/handlers

**`useStudentPage.ts` (~130 lines)**
- All `useState` declarations (form fields, filters, modals, selection, etc.)
- `useStudents`, `useCreateStudent`, `useUpdateStudent`, `useDeleteStudent`, `useImportStudents`, `useExportStudents`, `useInviteParent`, `useOverdueSummary` query hooks
- `filteredStudents` useMemo
- Derived values: `statsTotal`, `statsActive`, `statsInactive`, `flaggedStudentIds`
- Handler functions: `openAddModal`, `handleEditClick`, `handleFormSubmit`, `handleDeleteStudent`, `confirmDeleteStudent`, `handleBulkDelete`, `confirmBulkDelete`, `handleExportClick`, `handleImportSubmit`, `handleDownloadTemplate`, `toggleSelectAll`, `toggleSelect`, `removeFilter`
- Returns a flat object of all state + handlers + derived values for `index.tsx` to destructure

**`StudentTable.tsx` (~180 lines)**
- `<table>` with thead/tbody
- Checkbox column (select all + per-row)
- Name column with avatar, ID badge, overdue warning
- Optional email column
- Grade column
- Parent/guardian column
- Status badge column
- Action menu (three-dot) with Edit, Invite Parent, Delete options
- Empty state when no students match filters

**`StudentDrawer.tsx` (~100 lines)**
- `<Drawer>` wrapper
- Student avatar, name, grade, status badge, ID
- Contact info section (email, phone, enrolled date)
- Parent/guardian section with invite button

**`AddEditModal.tsx` (~200 lines)**
- `<Modal>` wrapper
- Form fields: name, email, phone, grade (grouped optgroup + Lainnya), status, parent name/phone/email
- Inline validation error display (`formErrors` prop)
- Cancel + Submit buttons
- Handles both create and edit mode via `editingStudent` prop

**`ImportModal.tsx` (~120 lines)**
- `<Modal>` wrapper
- Import instructions
- Download template button (calls `onDownloadTemplate` prop) + CSV format preview
- File upload area (drag/click) — manages `importFile` state and `fileInputRef` locally
- Cancel + Import buttons
- Uses `Trans` component from `react-i18next` (not just `useTranslation`)
- This is the one component with local state (file selection), since `useRef` must co-locate with the rendered `<input>` element

**`DeleteModals.tsx` (~100 lines)**
- Single delete confirmation modal (type "delete" to confirm)
- Bulk delete confirmation modal (type "delete" to confirm)
- Both share the same pattern: warning message, text input confirmation, cancel + delete buttons

**`StudentFilters.tsx` (~80 lines)**
- Search input
- Grade dropdown (grouped SD/SMP/SMA)
- Status dropdown (Active/Inactive)
- Email column visibility toggle button
- Active filter chips with remove buttons + clear all

### Routing

No router changes needed. The current route imports `Students` from `pages/Students` — this resolves to `pages/Students/index.tsx` automatically via Node/Vite module resolution.

### What Moves Where

| Section in Students.tsx | New file |
|-------------------------|----------|
| Imports | Distributed to each file that needs them |
| Component declaration + all `useState` hooks | `useStudentPage.ts` |
| Form state (formName, formEmail, ..., formErrors) | `useStudentPage.ts` |
| Query hooks (useStudents, useCreateStudent, etc.) | `useStudentPage.ts` |
| `filteredStudents` useMemo | `useStudentPage.ts` |
| `flaggedStudentIds`, `statsTotal/Active/Inactive` | `useStudentPage.ts` |
| All handler functions (openAddModal through confirmBulkDelete) | `useStudentPage.ts` |
| `handleDownloadTemplate`, `handleExportClick` | `useStudentPage.ts` |
| `fileInputRef`, `handleFileChange`, `handleImportSubmit` | `ImportModal.tsx` (local state) |
| Page header + stats cards | `index.tsx` |
| Search bar, dropdowns, filter chips, column toggle | `StudentFilters.tsx` |
| `<table>` with rows, checkboxes, action menus | `StudentTable.tsx` |
| Pagination controls | `index.tsx` |
| Bulk actions floating bar | `index.tsx` |
| `<Drawer>` student detail | `StudentDrawer.tsx` |
| Add/Edit Student `<Modal>` | `AddEditModal.tsx` |
| Delete + Bulk Delete `<Modal>`s | `DeleteModals.tsx` |
| Import Students `<Modal>` | `ImportModal.tsx` |

### Import Path Note

Files inside `pages/Students/` are one level deeper than the original `pages/Students.tsx`. Relative imports need an extra `../`:
- `'../components/UI'` → `'../../components/UI'`
- `'../lib/utils'` → `'../../lib/utils'`
- `'../lib/constants'` → `'../../lib/constants'`

Imports using the `@/src/` alias are unaffected since they use absolute paths.

---

## Files Changed

| File | Action |
|------|--------|
| `sinaloka-platform/src/pages/Students.tsx` | **Delete** |
| `sinaloka-platform/src/pages/Students/index.tsx` | **Create** |
| `sinaloka-platform/src/pages/Students/useStudentPage.ts` | **Create** |
| `sinaloka-platform/src/pages/Students/StudentTable.tsx` | **Create** |
| `sinaloka-platform/src/pages/Students/StudentDrawer.tsx` | **Create** |
| `sinaloka-platform/src/pages/Students/AddEditModal.tsx` | **Create** |
| `sinaloka-platform/src/pages/Students/ImportModal.tsx` | **Create** |
| `sinaloka-platform/src/pages/Students/DeleteModals.tsx` | **Create** |
| `sinaloka-platform/src/pages/Students/StudentFilters.tsx` | **Create** |

---

## Testing

- **No behavior changes** — purely structural refactor
- **Build check:** `npm run lint && npm run build` must pass
- **Manual check:** Open `/students` page and verify all features work:
  - Search, filter by grade/status, clear filters
  - Add student (with validation errors), edit student
  - Delete student (single + bulk)
  - Import modal (open, download template, close)
  - Export CSV
  - Student detail drawer (click row)
  - Pagination

---

## Future Work

After this pattern is validated, apply the same split to:
- `Classes.tsx` (1,123 lines) → `pages/Classes/`
- `Schedules.tsx` (893 lines) → `pages/Schedules/`
- `Enrollments.tsx` (849 lines) → `pages/Enrollments/`
- `Settings.tsx` (731 lines) → `pages/Settings/`

---

## Out of Scope

- No splitting of other pages (Classes, Schedules, etc.) in this spec
- No changes to shared components (`components/UI/`, etc.)
- No changes to hooks (`hooks/useStudents.ts` stays as-is)
- No behavior, styling, or feature changes
