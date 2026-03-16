# Classes Page Fixes — Design Spec

## Overview

Five fixes for the sinaloka-platform Classes page (`src/pages/Classes.tsx`): a string-concatenation bug in Total Monthly Fee, missing tutor names in the table, a proper delete confirmation modal, click-based action menu, and a detail sidebar drawer.

## 1. Fix: Total Monthly Fee String Concatenation

### Root Cause

Prisma schema defines `fee` as `Decimal`. Prisma returns `Decimal` fields as **strings**. The frontend type (`types/class.ts`) declares `fee: number`, but the actual API response contains `"500000"` (a string). JavaScript's `+` operator concatenates strings instead of adding numbers:

```
0 + "500000" + "450000" + "500000" → "0500000450000500000"
```

### Fix

**Backend** (`class.service.ts` → `findAll`): Map `fee` to `Number` in the response so the API contract matches the frontend type.

```typescript
data: data.map(c => ({ ...c, fee: Number(c.fee) })),
```

Apply the same transform in `findOne`, `create`, and `update` — all methods that return a raw Prisma class record must map `fee` to `Number` for API contract consistency.

**Frontend** (defensive): Also convert in the `totalRevenue` reduce in case the backend hasn't been deployed yet:

```typescript
classes.reduce((sum, c) => sum + Number(c.fee), 0)
```

## 2. Fix: Tutor Name Not Showing in Table

### Root Cause

Backend `findAll` in `class.service.ts` runs `prisma.class.findMany()` **without** `include`. The `tutor` relation is never loaded, so the API returns `tutor_id` but no `tutor` object. The frontend renders `cls.tutor?.name ?? '—'` which always falls back to `'—'`.

### Fix

**Backend** (`class.service.ts` → `findAll`): Add Prisma include and flatten:

```typescript
this.prisma.class.findMany({
  where,
  skip,
  take: limit,
  orderBy: { [sort_by]: sort_order },
  include: {
    tutor: {
      include: { user: { select: { id: true, name: true } } },
    },
  },
})
```

Then map the response to flatten tutor for the frontend:

```typescript
data: data.map(c => ({
  ...c,
  fee: Number(c.fee),
  tutor: c.tutor ? { id: c.tutor.id, name: c.tutor.user.name } : null,
})),
```

**Backend** (`class.service.ts` → `findOne`): Same include + flatten, since the drawer will use this endpoint.

## 3. Delete Confirmation Modal (Standard SaaS Pattern)

Replace browser `confirm()` with a modal matching the Students page pattern.

### New State

```typescript
const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
const [deleteConfirmText, setDeleteConfirmText] = useState('');
```

### Modal Structure

Uses existing `Modal` component. Content:
1. Rose-colored warning box with `Trash2` icon
2. "This action cannot be undone" message
3. Specific warning: "This will permanently delete **{class name}** and all associated data including enrollments, sessions, and attendance records."
4. Text input — user must type "delete" to enable the button
5. Cancel + Delete buttons (delete disabled until text matches, shows loading state)

### Handlers

Following the Students page naming convention — `handleDeleteClass` opens the modal, `confirmDeleteClass` executes the mutation:

```typescript
const handleDeleteClass = (cls: Class) => {
  setDeleteTarget(cls);
  setActiveActionMenu(null); // close action menu
};

const confirmDeleteClass = () => {
  if (!deleteTarget) return;
  deleteClass.mutate(deleteTarget.id, {
    onSuccess: () => {
      toast.success(t('classes.toast.deleted'));
      setDeleteTarget(null);
      setDeleteConfirmText('');
    },
    onError: () => toast.error(t('classes.toast.deleteError')),
  });
};
```

The 3-dots menu "Delete Class" button calls `handleDeleteClass(cls)`. The modal's Delete button calls `confirmDeleteClass()`.

HTML-containing translation keys (`permanentDelete`, `typeDelete`) must be rendered with `dangerouslySetInnerHTML`, matching the Students page pattern.

### Translation Keys

**en.json** — add under `classes`:
```json
"delete": {
  "cannotUndo": "This action cannot be undone.",
  "permanentDelete": "This will permanently delete <strong>{{name}}</strong> and all associated data including enrollments, sessions, and attendance records.",
  "typeDelete": "Type <strong>delete</strong> to confirm"
},
"modal": {
  ...existing keys,
  "deleteTitle": "Delete Class",
  "deleteClass": "Delete Class"
}
```

**id.json** — add under `classes`:
```json
"delete": {
  "cannotUndo": "Tindakan ini tidak dapat dibatalkan.",
  "permanentDelete": "Ini akan menghapus <strong>{{name}}</strong> secara permanen beserta semua data terkait termasuk pendaftaran, sesi, dan catatan kehadiran.",
  "typeDelete": "Ketik <strong>delete</strong> untuk mengonfirmasi"
},
"modal": {
  ...existing keys,
  "deleteTitle": "Hapus Kelas",
  "deleteClass": "Hapus Kelas"
}
```

## 4. Action Menu: Click Instead of Hover

### Current

CSS `group-hover/menu` — menu appears on mouse hover. This causes accidental opens when cursor passes over.

### Fix

Replace with click-based state management (same pattern as Students page):

```typescript
const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
```

Menu button `onClick` toggles `activeActionMenu` to `cls.id` or `null`. A transparent backdrop overlay closes the menu on outside click. Use `AnimatePresence` + `motion.div` for open/close animation (scale 0.95 → 1, opacity fade).

The table row `onClick` for opening the drawer must not trigger when the action menu is clicked. Use `stopPropagation` on the action menu `<td>` (same pattern as Students page). Also call `setActiveActionMenu(null)` when the drawer opens to ensure both don't show simultaneously.

Add `cursor-pointer` to table rows to indicate clickability.

## 5. Sidebar Drawer (Detailed Class View)

### Trigger

Clicking a table row opens the drawer. Uses existing `Drawer` component from `components/UI.tsx`.

### State

```typescript
const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
```

Row click sets `selectedClassId`. The drawer calls `useClass(selectedClassId)` to fetch detail. While loading, show the already-available data from the list (name, subject, fee, schedule, tutor name) immediately, and show a loading spinner only for the enrollments section.

### Backend Changes

Extend `findOne` in `class.service.ts` to include:

```typescript
const classRecord = await this.prisma.class.findFirst({
  where: { id, institution_id: institutionId },
  include: {
    tutor: {
      include: { user: { select: { id: true, name: true, email: true } } },
    },
    enrollments: {
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      include: {
        student: { select: { id: true, name: true, grade: true, status: true } },
      },
      orderBy: { created_at: 'desc' },
    },
  },
});
```

Return flattened response:

```typescript
return {
  ...classRecord,
  fee: Number(classRecord.fee),
  tutor: classRecord.tutor
    ? { id: classRecord.tutor.id, name: classRecord.tutor.user.name, email: classRecord.tutor.user.email }
    : null,
  enrolled_count: classRecord.enrollments.length, // derive from included enrollments, remove separate count query
  enrollments: classRecord.enrollments.map(e => ({
    id: e.id,
    status: e.status,
    student: e.student,
  })),
};
```

### Frontend Type

Add to `types/class.ts`:

```typescript
export interface ClassDetail extends Class {
  enrolled_count: number;
  enrollments: {
    id: string;
    status: string;
    student: { id: string; name: string; grade: string | null; status: string };
  }[];
}
```

Update `useClass` return type and `classesService.getById` to use `ClassDetail`.

### Drawer Layout

Following the Students drawer pattern:

1. **Header section** — Large class name, subject badge (colored), status badge
2. **Quick stats row** — Three info cards:
   - Enrolled: `{enrolled_count}/{capacity}` with progress bar
   - Fee: formatted currency
   - Room: room name or "—"
3. **Tutor section** — Section header "Tutor", card with tutor name and email
4. **Schedule section** — Section header "Schedule", day badges + time range
5. **Enrolled students section** — Section header "Enrolled Students ({count})", list of student cards with name, grade, and status badge. Empty state if none.
6. **Action buttons** — Edit + Delete buttons at bottom. Delete opens the delete confirmation modal on top of the drawer (z-index handles this naturally since Modal is z-50). On successful delete, both the modal and drawer close (`setDeleteTarget(null)` + `setSelectedClassId(null)`).

### Translation Keys

**en.json** — add under `classes`:
```json
"drawer": {
  "title": "Class Details",
  "enrolled": "Enrolled",
  "fee": "Fee",
  "room": "Room",
  "perSession": "per session",
  "noRoom": "No room assigned",
  "tutor": "Tutor",
  "schedule": "Schedule",
  "enrolledStudents": "Enrolled Students",
  "noStudents": "No students enrolled yet",
  "editClass": "Edit Class",
  "deleteClass": "Delete Class"
}
```

**id.json** — add under `classes`:
```json
"drawer": {
  "title": "Detail Kelas",
  "enrolled": "Terdaftar",
  "fee": "Biaya",
  "room": "Ruangan",
  "perSession": "per sesi",
  "noRoom": "Belum ada ruangan",
  "tutor": "Tutor",
  "schedule": "Jadwal",
  "enrolledStudents": "Siswa Terdaftar",
  "noStudents": "Belum ada siswa terdaftar",
  "editClass": "Edit Kelas",
  "deleteClass": "Hapus Kelas"
}
```

## Files Changed

### Backend
| File | Change |
|------|--------|
| `sinaloka-backend/src/modules/class/class.service.ts` | Add tutor include to `findAll`, extend `findOne` with tutor + enrollments include, map `fee` to Number in all methods (`findAll`, `findOne`, `create`, `update`) |

### Frontend
| File | Change |
|------|--------|
| `sinaloka-platform/src/pages/Classes.tsx` | Delete modal, click-based action menu, drawer, defensive Number(fee) |
| `sinaloka-platform/src/types/class.ts` | Add `ClassDetail` interface |
| `sinaloka-platform/src/hooks/useClasses.ts` | Update `useClass` return type |
| `sinaloka-platform/src/services/classes.service.ts` | Update `getById` response type |
| `sinaloka-platform/src/locales/en.json` | Add `classes.delete`, `classes.drawer`, `classes.modal.deleteTitle`, `classes.modal.deleteClass` |
| `sinaloka-platform/src/locales/id.json` | Same keys, Indonesian translations |
