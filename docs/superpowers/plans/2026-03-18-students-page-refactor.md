# Students Page Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `Students.tsx` (1,161 lines) into 8 focused files in a `pages/Students/` directory with zero behavior changes.

**Architecture:** Extract sections of the monolithic page into sub-components and a custom hook. `index.tsx` orchestrates, `useStudentPage.ts` owns all state/handlers, and each sub-component is stateless (props in, callbacks out). Exception: `ImportModal.tsx` holds its own `fileInputRef` and `importFile` state.

**Tech Stack:** React, TypeScript, TailwindCSS, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-18-students-page-refactor-design.md`

**Strategy:** We create all 8 new files first (Tasks 1-8), then delete the original file (Task 9), then verify (Task 10). Each task creates one file by extracting code from `Students.tsx`. The original file is kept intact until all new files are ready — this means the project won't build during Tasks 1-8 (duplicate exports), which is fine since we verify at the end.

**Important — import paths:** Files inside `pages/Students/` are one level deeper than the original. Use `../../` for relative imports (e.g., `../../components/UI`, `../../lib/utils`). Imports using `@/src/` alias are unaffected.

---

## Task 1: Create `useStudentPage.ts` — the state + handlers hook

**Files:**
- Create: `sinaloka-platform/src/pages/Students/useStudentPage.ts`

This is the foundation — all other components depend on the return type of this hook.

- [ ] **Step 1: Create the hook file**

Create `sinaloka-platform/src/pages/Students/useStudentPage.ts`. Extract from `Students.tsx`:

1. **State declarations** (lines 61-89): All `useState` hooks except `importFile` (that goes to ImportModal)
2. **Query hooks** (lines 91-99): `useStudents`, `useOverdueSummary`, mutation hooks, `useInviteParent`
3. **Computed values** (lines 104-118): `filteredStudents` useMemo, `meta`
4. **Derived stats** (lines 322-324): `statsTotal`, `statsActive`, `statsInactive`
5. **`flaggedStudentIds`** (line 93): `new Set(overdueSummary?.flagged_students...)`
6. **Handler functions** (lines 120-320): All handlers EXCEPT `handleFileChange`, `handleImportSubmit`, `handleImportClick` (those stay with ImportModal)
7. **Include**: `handleDownloadTemplate`, `handleExportClick`, `openAddModal`, `handleEditClick`, `handleFormSubmit`, `handleDeleteStudent`, `confirmDeleteStudent`, `handleBulkDelete`, `confirmBulkDelete`, `toggleSelectAll`, `toggleSelect`, `removeFilter`

The hook signature:

```typescript
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent,
  useImportStudents, useExportStudents,
} from '@/src/hooks/useStudents';
import { useInviteParent } from '@/src/hooks/useParents';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { ALL_GRADES } from '../../lib/constants';
import type { Student } from '@/src/types/student';
import type { ScheduleDay } from '@/src/types/class';

export function useStudentPage() {
  const { t, i18n } = useTranslation();
  // ... all useState, hooks, handlers from Students.tsx ...

  return {
    // State
    page, setPage, limit, selectedIds, setSelectedIds, searchQuery, setSearchQuery,
    activeFilters, setActiveFilters, showAddModal, setShowAddModal,
    selectedStudent, setSelectedStudent, visibleColumns, setVisibleColumns,
    editingStudent, setEditingStudent, activeActionMenu, setActiveActionMenu,
    showImportModal, setShowImportModal,
    // Form state
    formName, setFormName, formEmail, setFormEmail, formPhone, setFormPhone,
    formGrade, setFormGrade, formStatus, setFormStatus,
    formParentName, setFormParentName, formParentPhone, setFormParentPhone,
    formParentEmail, setFormParentEmail, formCustomGrade, setFormCustomGrade,
    formErrors, setFormErrors,
    // Delete state
    deleteTarget, setDeleteTarget, deleteConfirmText, setDeleteConfirmText,
    bulkDeleteConfirm, setBulkDeleteConfirm,
    // Derived
    filteredStudents, meta, statsTotal, statsActive, statsInactive, flaggedStudentIds,
    isLoading, data,
    // Mutations (for isPending checks)
    createStudent, updateStudent, deleteStudent, importStudents, exportStudents, inviteParent,
    // Handlers
    openAddModal, handleEditClick, handleFormSubmit,
    handleDeleteStudent, confirmDeleteStudent, handleBulkDelete, confirmBulkDelete,
    handleExportClick, handleDownloadTemplate,
    toggleSelectAll, toggleSelect, removeFilter,
    // i18n
    t, i18n,
  };
}
```

Copy the full function bodies from `Students.tsx` lines 61-324. Do NOT modify any logic — pure extraction.

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/useStudentPage.ts
git commit -m "refactor(platform): extract useStudentPage hook from Students.tsx"
```

---

## Task 2: Create `StudentFilters.tsx`

**Files:**
- Create: `sinaloka-platform/src/pages/Students/StudentFilters.tsx`

- [ ] **Step 1: Create the component**

Extract the filters section from `Students.tsx` lines 384-464. The component receives filter state and callbacks as props:

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, X } from 'lucide-react';
import { Button, Badge, SearchInput } from '../../components/UI';
import { GRADE_GROUPS } from '../../lib/constants';

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilters: { grade?: string; status?: string };
  onFilterChange: (filters: { grade?: string; status?: string }) => void;
  onRemoveFilter: (key: 'grade' | 'status') => void;
  onClearAll: () => void;
  visibleColumns: string[];
  onToggleColumn: (column: string) => void;
  t: (key: string, options?: any) => string;
}

export function StudentFilters({ ... }: StudentFiltersProps) {
  // JSX from lines 384-464 of Students.tsx
}
```

Copy the JSX verbatim — search input, grade/status selects with optgroup, email toggle button, active filter chips.

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/StudentFilters.tsx
git commit -m "refactor(platform): extract StudentFilters from Students.tsx"
```

---

## Task 3: Create `StudentTable.tsx`

**Files:**
- Create: `sinaloka-platform/src/pages/Students/StudentTable.tsx`

- [ ] **Step 1: Create the component**

Extract the table from `Students.tsx` lines 473-625. This includes the thead, tbody with all columns, the action menu (MoreHorizontal with AnimatePresence dropdown), and the empty state.

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, Eye, Trash2, UserPlus, Search, AlertTriangle } from 'lucide-react';
import { Checkbox, Badge } from '../../components/UI';
import { cn } from '../../lib/utils';
import type { Student } from '@/src/types/student';

interface StudentTableProps {
  students: Student[];
  selectedIds: string[];
  flaggedStudentIds: Set<string>;
  visibleColumns: string[];
  activeActionMenu: string | null;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onRowClick: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onInviteParent: (student: Student) => void;
  onActionMenuToggle: (id: string | null) => void;
  t: (key: string, options?: any) => string;
}

export function StudentTable({ ... }: StudentTableProps) {
  // <table> JSX from lines 473-625
}
```

Include the action menu dropdown (Edit, Invite Parent, Delete) with its AnimatePresence animation. The `onInviteParent` callback handles the inline invite from the action menu.

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/StudentTable.tsx
git commit -m "refactor(platform): extract StudentTable from Students.tsx"
```

---

## Task 4: Create `StudentDrawer.tsx`

**Files:**
- Create: `sinaloka-platform/src/pages/Students/StudentDrawer.tsx`

- [ ] **Step 1: Create the component**

Extract the drawer from `Students.tsx` lines 710-798.

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Calendar, UserPlus } from 'lucide-react';
import { Card, Button, Badge, Drawer } from '../../components/UI';
import { formatDate } from '../../lib/utils';
import type { Student } from '@/src/types/student';

interface StudentDrawerProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteParent: (email: string, studentId: string) => void;
  inviteIsPending: boolean;
  t: (key: string, options?: any) => string;
  language: string;
}

export function StudentDrawer({ ... }: StudentDrawerProps) {
  // <Drawer> JSX from lines 710-798
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/StudentDrawer.tsx
git commit -m "refactor(platform): extract StudentDrawer from Students.tsx"
```

---

## Task 5: Create `AddEditModal.tsx`

**Files:**
- Create: `sinaloka-platform/src/pages/Students/AddEditModal.tsx`

- [ ] **Step 1: Create the component**

Extract the add/edit modal from `Students.tsx` lines 800-948. This is the largest sub-component (~150 lines) with the grade dropdown (optgroup + Lainnya), form validation display, and all form fields.

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Label, Button } from '../../components/UI';
import { GRADE_GROUPS } from '../../lib/constants';
import type { Student } from '@/src/types/student';

interface AddEditModalProps {
  isOpen: boolean;
  editingStudent: Student | null;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  // Form state
  formName: string; setFormName: (v: string) => void;
  formEmail: string; setFormEmail: (v: string) => void;
  formPhone: string; setFormPhone: (v: string) => void;
  formGrade: string; setFormGrade: (v: string) => void;
  formStatus: 'ACTIVE' | 'INACTIVE'; setFormStatus: (v: 'ACTIVE' | 'INACTIVE') => void;
  formParentName: string; setFormParentName: (v: string) => void;
  formParentPhone: string; setFormParentPhone: (v: string) => void;
  formParentEmail: string; setFormParentEmail: (v: string) => void;
  formCustomGrade: string; setFormCustomGrade: (v: string) => void;
  formErrors: Record<string, string>; setFormErrors: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  t: (key: string, options?: any) => string;
}

export function AddEditModal({ ... }: AddEditModalProps) {
  // <Modal> JSX from lines 800-948
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/AddEditModal.tsx
git commit -m "refactor(platform): extract AddEditModal from Students.tsx"
```

---

## Task 6: Create `DeleteModals.tsx`

**Files:**
- Create: `sinaloka-platform/src/pages/Students/DeleteModals.tsx`

- [ ] **Step 1: Create the component**

Extract both delete modals from `Students.tsx` lines 950-1046.

```typescript
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Modal, Input, Label, Button } from '../../components/UI';

interface DeleteModalsProps {
  // Single delete
  deleteTarget: { id: string; name: string } | null;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
  deleteIsPending: boolean;
  // Bulk delete
  bulkDeleteConfirm: boolean;
  selectedCount: number;
  onBulkClose: () => void;
  onBulkConfirm: () => void;
  // Shared
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  t: (key: string, options?: any) => string;
}

export function DeleteModals({ ... }: DeleteModalsProps) {
  // Two <Modal> blocks from lines 950-1046
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/DeleteModals.tsx
git commit -m "refactor(platform): extract DeleteModals from Students.tsx"
```

---

## Task 7: Create `ImportModal.tsx`

**Files:**
- Create: `sinaloka-platform/src/pages/Students/ImportModal.tsx`

- [ ] **Step 1: Create the component**

Extract the import modal from `Students.tsx` lines 1048-1158. This component holds its own local state (`importFile`, `fileInputRef`) since `useRef` must co-locate with the DOM element.

```typescript
import React, { useState, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Upload, Info, FileDown, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '../../components/UI';
import { cn } from '../../lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onDownloadTemplate: () => void;
  isPending: boolean;
  t: (key: string, options?: any) => string;
}

export function ImportModal({ isOpen, onClose, onImport, onDownloadTemplate, isPending, t }: ImportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!importFile) return;
    onImport(importFile);
    setImportFile(null);
  };

  const handleClose = () => {
    onClose();
    setImportFile(null);
  };

  return (
    // <Modal> JSX from lines 1048-1158
    // Replace handleImportSubmit with handleSubmit
    // Replace setShowImportModal(false) with handleClose
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/ImportModal.tsx
git commit -m "refactor(platform): extract ImportModal from Students.tsx"
```

---

## Task 8: Create `index.tsx` — the orchestrator

**Files:**
- Create: `sinaloka-platform/src/pages/Students/index.tsx`

- [ ] **Step 1: Create the main page file**

This is the slim orchestrator that imports all sub-components and wires them together using `useStudentPage()`.

```typescript
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Upload, Download, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge, Skeleton } from '../../components/UI';
import { cn } from '../../lib/utils';
import { useStudentPage } from './useStudentPage';
import { StudentFilters } from './StudentFilters';
import { StudentTable } from './StudentTable';
import { StudentDrawer } from './StudentDrawer';
import { AddEditModal } from './AddEditModal';
import { ImportModal } from './ImportModal';
import { DeleteModals } from './DeleteModals';

export const Students = () => {
  const page = useStudentPage();
  // Destructure everything needed from page

  return (
    <div className="space-y-6 pb-20">
      {/* Header — lines 329-348 */}
      {/* Stats Cards — lines 350-382 */}
      <StudentFilters ... />
      <Card>
        <StudentTable ... />
        {/* Pagination — lines 627-671 */}
      </Card>
      {/* Bulk Actions Floating Bar — lines 675-708 */}
      <StudentDrawer ... />
      <AddEditModal ... />
      <DeleteModals ... />
      <ImportModal ... />
    </div>
  );
};
```

Extract:
- Page header (lines 329-348)
- Stats cards (lines 350-382)
- Pagination footer (lines 627-671)
- Bulk actions floating bar (lines 675-708)
- Wire all sub-components with props from `useStudentPage()`

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students/index.tsx
git commit -m "refactor(platform): create Students/index.tsx orchestrator"
```

---

## Task 9: Delete original `Students.tsx`

**Files:**
- Delete: `sinaloka-platform/src/pages/Students.tsx`

- [ ] **Step 1: Delete the original file**

```bash
rm sinaloka-platform/src/pages/Students.tsx
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

Expected: No type errors. If there are errors, fix import mismatches.

- [ ] **Step 3: Build check**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A sinaloka-platform/src/pages/
git commit -m "refactor(platform): remove original Students.tsx, complete split into Students/"
```

---

## Task 10: Final verification

- [ ] **Step 1: Check file sizes**

```bash
wc -l sinaloka-platform/src/pages/Students/*.ts sinaloka-platform/src/pages/Students/*.tsx
```

Expected: No file exceeds ~200 lines. Total should be ~1,000-1,100 lines (slight overhead from props interfaces).

- [ ] **Step 2: Check for leftover references**

```bash
grep -r "pages/Students\.tsx" sinaloka-platform/src/ --include="*.ts" --include="*.tsx"
```

Expected: No results (all imports should resolve to `pages/Students/index.tsx` via directory import).

- [ ] **Step 3: Manual browser testing**

Open `http://localhost:3000/students` and verify:
1. Page loads with student list
2. Search filters students by name
3. Grade dropdown shows SD/SMP/SMA groups
4. Status filter works
5. Click row opens student detail drawer
6. Three-dot menu → Edit opens modal with pre-filled data
7. Three-dot menu → Delete opens confirmation
8. Add Student button opens empty form
9. Form validation shows red errors on empty submit
10. Import button opens modal with instructions
11. Download template works
12. Export CSV works
13. Bulk select + delete works
14. Pagination works
