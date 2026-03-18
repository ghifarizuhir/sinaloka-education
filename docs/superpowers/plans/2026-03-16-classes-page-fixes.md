# Classes Page Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five issues on the Classes page: fee string concatenation bug, missing tutor names, delete confirmation modal, click-based action menu, and class detail sidebar drawer.

**Architecture:** Backend changes first (fee mapping + tutor include + findOne enrichment), then frontend fixes in order of dependency (types → hooks/services → translations → page component).

**Tech Stack:** NestJS, Prisma, React, TanStack Query, Framer Motion, react-i18next, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-16-classes-page-fixes-design.md`

---

## Chunk 1: Backend — Fix fee mapping and tutor include

### Task 1: Fix `findAll` — include tutor relation and map fee to Number

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.ts:31-70`
- Modify: `sinaloka-backend/src/modules/class/class.service.spec.ts:29-44,101-181`

- [ ] **Step 1: Update the test mock to include tutor relation data**

In `class.service.spec.ts`, update `mockClass` (line 29) to include the nested tutor structure that Prisma will now return:

```typescript
const mockClass = {
  id: 'class-1',
  institution_id: 'inst-1',
  tutor_id: 'tutor-1',
  name: 'Math 101',
  subject: 'Mathematics',
  capacity: 30,
  fee: '500000', // Decimal comes as string from Prisma
  schedule_days: ['Monday', 'Wednesday'],
  schedule_start_time: '14:00',
  schedule_end_time: '15:30',
  room: 'Room A',
  status: 'ACTIVE',
  created_at: new Date(),
  updated_at: new Date(),
  tutor: {
    id: 'tutor-1',
    user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
  },
};
```

- [ ] **Step 2: Update the `findAll` test to verify tutor include and fee mapping**

Update the "should return paginated classes" test (line 102):

```typescript
it('should return paginated classes with tutor and numeric fee', async () => {
  prisma.class.findMany.mockResolvedValue([mockClass]);
  prisma.class.count.mockResolvedValue(1);

  const result = await service.findAll('inst-1', {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  expect(result.data).toHaveLength(1);
  expect(result.data[0].fee).toBe(500000); // number, not string
  expect(result.data[0].tutor).toEqual({ id: 'tutor-1', name: 'John Doe' });
  expect(result.meta.total).toBe(1);
  expect(prisma.class.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ institution_id: 'inst-1' }),
      include: {
        tutor: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),
  );
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=class.service`
Expected: FAIL — `findAll` doesn't include tutor and doesn't map fee

- [ ] **Step 4: Implement `findAll` changes in class.service.ts**

Replace the `findAll` method body (lines 56-69):

```typescript
const [data, total] = await Promise.all([
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
  }),
  this.prisma.class.count({ where }),
]);

return {
  data: data.map((c) => ({
    ...c,
    fee: Number(c.fee),
    tutor: c.tutor ? { id: c.tutor.id, name: c.tutor.user.name } : null,
  })),
  meta: buildPaginationMeta(total, page, limit),
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=class.service`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.service.ts sinaloka-backend/src/modules/class/class.service.spec.ts
git commit -m "fix(backend): include tutor relation and map fee to Number in findAll"
```

### Task 2: Fix `findOne` — include tutor + enrollments, map fee, remove separate count query

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.ts:72-92`
- Modify: `sinaloka-backend/src/modules/class/class.service.spec.ts:184-210`

- [ ] **Step 1: Update the test for `findOne` to expect enriched response**

Replace the `findOne` describe block tests. The `findOne` method now uses `class.findFirst` with `include` for enrollments (no separate `enrollment.count` query), so remove `enrollment.count` from the prisma mock type and `beforeEach`:

```typescript
// Remove the enrollment mock entirely from the type and beforeEach — it's no longer used
```

Add a mock for findOne's enriched response:

```typescript
const mockClassWithRelations = {
  ...mockClass,
  enrollments: [
    {
      id: 'enr-1',
      status: 'ACTIVE',
      created_at: new Date(),
      student: { id: 'student-1', name: 'Alice', grade: '10', status: 'ACTIVE' },
    },
  ],
};
```

Update the `findOne` test:

```typescript
describe('findOne', () => {
  it('should return a class with tutor, enrollments and numeric fee', async () => {
    prisma.class.findFirst.mockResolvedValue(mockClassWithRelations);

    const result = await service.findOne('inst-1', 'class-1');

    expect(result.fee).toBe(500000);
    expect(result.tutor).toEqual({ id: 'tutor-1', name: 'John Doe', email: 'john@example.com' });
    expect(result.enrolled_count).toBe(1);
    expect(result.enrollments).toHaveLength(1);
    expect(result.enrollments[0].student.name).toBe('Alice');
    expect(prisma.class.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'class-1', institution_id: 'inst-1' },
        include: expect.objectContaining({
          tutor: expect.any(Object),
          enrollments: expect.any(Object),
        }),
      }),
    );
  });

  it('should throw NotFoundException if class not found', async () => {
    prisma.class.findFirst.mockResolvedValue(null);

    await expect(service.findOne('inst-1', 'nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=class.service`
Expected: FAIL — `findOne` doesn't include tutor/enrollments

- [ ] **Step 3: Implement `findOne` changes in class.service.ts**

Replace the entire `findOne` method (lines 72-92):

```typescript
async findOne(institutionId: string, id: string) {
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

  if (!classRecord) {
    throw new NotFoundException(`Class with ID "${id}" not found`);
  }

  return {
    ...classRecord,
    fee: Number(classRecord.fee),
    tutor: classRecord.tutor
      ? { id: classRecord.tutor.id, name: classRecord.tutor.user.name, email: classRecord.tutor.user.email }
      : null,
    enrolled_count: classRecord.enrollments.length,
    enrollments: classRecord.enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      student: e.student,
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=class.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.service.ts sinaloka-backend/src/modules/class/class.service.spec.ts
git commit -m "fix(backend): enrich findOne with tutor, enrollments, and numeric fee"
```

### Task 3: Fix `create` and `update` — map fee to Number in return values

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.ts:13-29,94-107`
- Modify: `sinaloka-backend/src/modules/class/class.service.spec.ts:71-99,212-238`

- [ ] **Step 1: Update the `create` test to expect numeric fee**

```typescript
describe('create', () => {
  it('should create a class with institution scoping and numeric fee', async () => {
    prisma.class.create.mockResolvedValue(mockClass);

    const result = await service.create('inst-1', {
      tutor_id: 'tutor-1',
      name: 'Math 101',
      subject: 'Mathematics',
      capacity: 30,
      fee: 500000,
      schedule_days: ['Monday', 'Wednesday'],
      schedule_start_time: '14:00',
      schedule_end_time: '15:30',
      room: 'Room A',
      status: 'ACTIVE',
    });

    expect(result.fee).toBe(500000); // number, not string
    expect(prisma.class.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          institution_id: 'inst-1',
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Update the `update` test to expect numeric fee**

```typescript
describe('update', () => {
  it('should update a class and return numeric fee', async () => {
    prisma.class.findFirst.mockResolvedValue(mockClass);
    prisma.class.update.mockResolvedValue({
      ...mockClass,
      name: 'Updated Math',
    });

    const result = await service.update('inst-1', 'class-1', {
      name: 'Updated Math',
    });

    expect(result.name).toBe('Updated Math');
    expect(result.fee).toBe(500000); // number, not string
  });

  it('should throw NotFoundException if class not found', async () => {
    prisma.class.findFirst.mockResolvedValue(null);

    await expect(
      service.update('inst-1', 'nonexistent', { name: 'New Name' }),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=class.service`
Expected: FAIL — create/update return string fee

- [ ] **Step 4: Implement fee mapping in `create` and `update`**

In `create` method (line 13), wrap the return:

```typescript
async create(institutionId: string, dto: CreateClassDto) {
  const record = await this.prisma.class.create({
    data: {
      institution_id: institutionId,
      tutor_id: dto.tutor_id,
      name: dto.name,
      subject: dto.subject,
      capacity: dto.capacity,
      fee: dto.fee,
      schedule_days: dto.schedule_days,
      schedule_start_time: dto.schedule_start_time,
      schedule_end_time: dto.schedule_end_time,
      room: dto.room ?? null,
      status: dto.status ?? 'ACTIVE',
    },
  });
  return { ...record, fee: Number(record.fee) };
}
```

In `update` method (line 94):

```typescript
async update(institutionId: string, id: string, dto: UpdateClassDto) {
  const existing = await this.prisma.class.findFirst({
    where: { id, institution_id: institutionId },
  });

  if (!existing) {
    throw new NotFoundException(`Class with ID "${id}" not found`);
  }

  const record = await this.prisma.class.update({
    where: { id },
    data: dto,
  });
  return { ...record, fee: Number(record.fee) };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=class.service`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.service.ts sinaloka-backend/src/modules/class/class.service.spec.ts
git commit -m "fix(backend): map fee to Number in create and update returns"
```

---

## Chunk 2: Frontend — Types, services, hooks, translations

### Task 4: Add `ClassDetail` type and update service/hook types

**Files:**
- Modify: `sinaloka-platform/src/types/class.ts`
- Modify: `sinaloka-platform/src/services/classes.service.ts`
- Modify: `sinaloka-platform/src/hooks/useClasses.ts`

- [ ] **Step 1: Add `ClassDetail` interface to `types/class.ts`**

Append after line 41 (after `ClassQueryParams`):

```typescript
export interface ClassDetail extends Class {
  enrolled_count: number;
  enrollments: {
    id: string;
    status: string;
    student: { id: string; name: string; grade: string; status: string };
  }[];
  tutor?: { id: string; name: string; email?: string };
}
```

- [ ] **Step 2: Update `classesService.getById` return type**

In `services/classes.service.ts`, update the import (line 3) and `getById` (line 8-9):

```typescript
import type { Class, ClassDetail, CreateClassDto, UpdateClassDto, ClassQueryParams } from '@/src/types/class';
```

```typescript
getById: (id: string) =>
  api.get<ClassDetail>(`/api/admin/classes/${id}`).then((r) => r.data),
```

- [ ] **Step 3: Update `useClass` hook to accept `string | null`**

In `hooks/useClasses.ts` (line 8-9):

```typescript
export function useClass(id: string | null) {
  return useQuery({ queryKey: ['classes', id], queryFn: () => classesService.getById(id!), enabled: !!id });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/class.ts sinaloka-platform/src/services/classes.service.ts sinaloka-platform/src/hooks/useClasses.ts
git commit -m "feat(platform): add ClassDetail type and update service/hook for drawer"
```

### Task 5: Add translation keys for delete modal and drawer

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add keys to `en.json`**

Inside the `"classes"` object, add `"delete"` and `"drawer"` blocks after the existing `"confirm"` block, and add `"deleteTitle"` and `"deleteClass"` to the existing `"modal"` block:

Add after `"confirm": { ... }`:

```json
"delete": {
  "cannotUndo": "This action cannot be undone.",
  "permanentDelete": "This will permanently delete <strong>{{name}}</strong> and all associated data including enrollments, sessions, and attendance records.",
  "typeDelete": "Type <strong>delete</strong> to confirm"
},
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

Add to existing `"modal"` block:

```json
"deleteTitle": "Delete Class",
"deleteClass": "Delete Class"
```

- [ ] **Step 2: Add matching keys to `id.json`**

Same structure, Indonesian translations:

Add after `"confirm": { ... }`:

```json
"delete": {
  "cannotUndo": "Tindakan ini tidak dapat dibatalkan.",
  "permanentDelete": "Ini akan menghapus <strong>{{name}}</strong> secara permanen beserta semua data terkait termasuk pendaftaran, sesi, dan catatan kehadiran.",
  "typeDelete": "Ketik <strong>delete</strong> untuk mengonfirmasi"
},
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

Add to existing `"modal"` block:

```json
"deleteTitle": "Hapus Kelas",
"deleteClass": "Hapus Kelas"
```

- [ ] **Step 3: Verify JSON is valid**

Run: `cd sinaloka-platform && node -e "require('./src/locales/en.json'); require('./src/locales/id.json'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add translation keys for classes delete modal and drawer"
```

---

## Chunk 3: Frontend — Classes.tsx page component changes

### Task 6: Fix fee string concatenation (defensive frontend fix)

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx:97-99`

- [ ] **Step 1: Update `totalRevenue` to use `Number()`**

Change line 98:

```typescript
const totalRevenue = useMemo(() => {
  return classes.reduce((sum, c) => sum + Number(c.fee), 0);
}, [classes]);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "fix(platform): defensive Number() cast for fee in totalRevenue calculation"
```

### Task 7: Replace hover action menu with click-based menu

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx:1-2,52-60,183-189,304-379`

- [ ] **Step 1: Add imports and state**

Add `motion` and `AnimatePresence` imports. Add `Trash2` to lucide imports (line 3-18). Add new state variables after line 60 (note: `Drawer` import is deferred to Task 9 to avoid unused import lint warnings):

```typescript
import { motion, AnimatePresence } from 'motion/react';
```

Add `Trash2` to the lucide-react import list.

Add state after `showOnlyAvailable` (line 60):

```typescript
const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
const [deleteConfirmText, setDeleteConfirmText] = useState('');
const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
```

- [ ] **Step 2: Replace `handleDeleteClass` with two handlers**

Replace the current `handleDeleteClass` (lines 183-189):

```typescript
const handleDeleteClass = (cls: Class) => {
  setDeleteTarget(cls);
  setActiveActionMenu(null);
};

const confirmDeleteClass = () => {
  if (!deleteTarget) return;
  deleteClass.mutate(deleteTarget.id, {
    onSuccess: () => {
      toast.success(t('classes.toast.deleted'));
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setSelectedClassId(null); // close drawer if open
    },
    onError: () => toast.error(t('classes.toast.deleteError')),
  });
};
```

- [ ] **Step 3: Replace the hover-based action menu in the table row**

Replace the `<tr>` tag (line 305) to add cursor-pointer and row click handler:

```tsx
<tr
  key={cls.id}
  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
  onClick={() => {
    setSelectedClassId(cls.id);
    setActiveActionMenu(null);
  }}
>
```

Replace the action menu `<td>` (lines 358-378) with click-based version:

```tsx
<td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
  <div className="relative">
    <button
      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
      onClick={() => setActiveActionMenu(activeActionMenu === cls.id ? null : cls.id)}
    >
      <MoreHorizontal size={18} />
    </button>
    <AnimatePresence>
      {activeActionMenu === cls.id && (
        <>
          <div className="fixed inset-0 z-[5]" onClick={() => setActiveActionMenu(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1"
          >
            <button
              onClick={() => { openEditModal(cls); setActiveActionMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {t('classes.menu.editClassDetails')}
            </button>
            <button
              onClick={() => handleDeleteClass(cls)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-red-500"
            >
              {t('classes.menu.deleteClass')}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </div>
</td>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(platform): replace hover action menu with click-based menu on Classes page"
```

### Task 8: Add delete confirmation modal

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx` (after the create/edit Modal, before closing `</div>`)

- [ ] **Step 1: Add the delete confirmation modal**

Insert after the create/edit `</Modal>` (after line 597) and before the closing `</div>`:

```tsx
{/* Delete Confirmation Modal */}
<Modal
  isOpen={!!deleteTarget}
  onClose={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
  title={t('classes.modal.deleteTitle')}
>
  {deleteTarget && (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('classes.delete.cannotUndo')}</p>
            <p className="text-sm text-rose-700 dark:text-rose-300 mt-1" dangerouslySetInnerHTML={{ __html: t('classes.delete.permanentDelete', { name: deleteTarget.name }) }} />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="delete-confirm" dangerouslySetInnerHTML={{ __html: t('classes.delete.typeDelete') }} />
        <Input
          id="delete-confirm"
          placeholder="delete"
          value={deleteConfirmText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmText(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 justify-center"
          onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
          onClick={confirmDeleteClass}
          disabled={deleteConfirmText !== 'delete' || deleteClass.isPending}
        >
          {deleteClass.isPending ? t('common.deleting') : t('classes.modal.deleteClass')}
        </Button>
      </div>
    </div>
  )}
</Modal>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(platform): add delete confirmation modal to Classes page"
```

### Task 9: Add class detail sidebar drawer

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

- [ ] **Step 1: Add `Drawer` import, `useClass` hook import, and hook call**

Add `Drawer` to the UI imports (line 24):

```typescript
import {
  Card,
  Button,
  Badge,
  Modal,
  Drawer,
  Input,
  Label,
  SearchInput,
  Progress,
  Switch,
  Skeleton
} from '../components/UI';
```

Add to the hooks imports (line 34-38):

```typescript
import {
  useClasses,
  useClass,
  useCreateClass,
  useUpdateClass,
  useDeleteClass
} from '@/src/hooks/useClasses';
```

Add after the `deleteClass` hook call (after line 78):

```typescript
const classDetail = useClass(selectedClassId);
const selectedClass = filteredClasses.find((c) => c.id === selectedClassId) ?? null;
```

- [ ] **Step 2: Add the Drawer component**

Insert after the delete confirmation `</Modal>` and before the final closing `</div>`:

```tsx
{/* Class Detail Drawer */}
<Drawer
  isOpen={!!selectedClassId}
  onClose={() => setSelectedClassId(null)}
  title={t('classes.drawer.title')}
>
  {selectedClass && (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-2xl font-bold mb-3 shadow-lg">
          {selectedClass.name.charAt(0)}
        </div>
        <h3 className="text-xl font-bold dark:text-zinc-100">{selectedClass.name}</h3>
        <div className="mt-3 flex gap-2">
          <span className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-md border',
            SUBJECT_COLORS[selectedClass.subject] || 'bg-zinc-50 text-zinc-500 border-zinc-100'
          )}>
            {selectedClass.subject.toUpperCase()}
          </span>
          <Badge variant={selectedClass.status === 'ACTIVE' ? 'success' : 'default'}>
            {selectedClass.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.enrolled')}</p>
          <p className="text-lg font-bold dark:text-zinc-100">
            {classDetail.data?.enrolled_count ?? 0}/{selectedClass.capacity}
          </p>
          <Progress value={classDetail.data?.enrolled_count ?? 0} max={selectedClass.capacity} />
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.fee')}</p>
          <p className="text-lg font-bold dark:text-zinc-100">{formatCurrency(Number(selectedClass.fee), i18n.language)}</p>
          <p className="text-[10px] text-zinc-400">{t('classes.drawer.perSession')}</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.room')}</p>
          <p className="text-lg font-bold dark:text-zinc-100">{selectedClass.room ?? '—'}</p>
          {!selectedClass.room && <p className="text-[10px] text-zinc-400">{t('classes.drawer.noRoom')}</p>}
        </div>
      </div>

      {/* Tutor Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('classes.drawer.tutor')}</h4>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
            {(selectedClass.tutor?.name ?? '?').charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold dark:text-zinc-200">{selectedClass.tutor?.name ?? '—'}</p>
            {classDetail.data?.tutor?.email && (
              <p className="text-xs text-zinc-500">{classDetail.data.tutor.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('classes.drawer.schedule')}</h4>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedClass.schedule_days.map((day) => (
              <span key={day} className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold">
                {day.slice(0, 3)}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Clock size={14} />
            {selectedClass.schedule_start_time} - {selectedClass.schedule_end_time}
          </div>
        </div>
      </div>

      {/* Enrolled Students Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {t('classes.drawer.enrolledStudents')} ({classDetail.data?.enrolled_count ?? 0})
        </h4>
        {classDetail.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : classDetail.data?.enrollments?.length ? (
          <div className="space-y-2">
            {classDetail.data.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                    {enrollment.student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-zinc-200">{enrollment.student.name}</p>
                    {enrollment.student.grade && (
                      <p className="text-[10px] text-zinc-400">{enrollment.student.grade}</p>
                    )}
                  </div>
                </div>
                <Badge variant={enrollment.status === 'ACTIVE' ? 'success' : 'default'}>
                  {enrollment.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">{t('classes.drawer.noStudents')}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          variant="outline"
          className="flex-1 justify-center"
          onClick={() => { openEditModal(selectedClass); setSelectedClassId(null); }}
        >
          {t('classes.drawer.editClass')}
        </Button>
        <Button
          className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
          onClick={() => handleDeleteClass(selectedClass)}
        >
          {t('classes.drawer.deleteClass')}
        </Button>
      </div>
    </div>
  )}
</Drawer>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 4: Manual smoke test**

Run backend and frontend dev servers:
- `cd sinaloka-backend && npm run start:dev`
- `cd sinaloka-platform && npm run dev`

Verify:
1. Total Monthly Fee shows correct sum (e.g., `Rp 1.500.000` not concatenated string)
2. Tutor names appear in table rows
3. Clicking 3-dots icon opens menu (hover no longer triggers it)
4. Clicking "Delete Class" in menu opens confirmation modal with type-to-confirm
5. Clicking a table row opens the drawer with class details, tutor info, schedule, enrolled students
6. Drawer Edit button opens edit modal
7. Drawer Delete button opens delete modal on top of drawer
8. Toggle language (id/en) and verify all new strings are translated

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(platform): add class detail sidebar drawer to Classes page"
```
