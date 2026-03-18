# Subject Table + Tutor-Subject Mapping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated subjects table, replace tutor `subjects String[]` with a many-to-many join table, replace class `subject` string with a FK to subjects, and enforce subject-tutor validation on class creation/update.

**Architecture:** New Prisma models (subject, tutor_subject), staged data migration, new Subject NestJS module with CRUD endpoints, updated tutor/class DTOs and services, frontend changes to use dynamic subject dropdowns with subject-first class creation flow.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Zod, React, TanStack Query, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-tutor-bank-required-subject-mapping-design.md` (Part 2)

---

### Task 1: Add Prisma schema — subject model, tutor_subject join, class FK

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add subject model**

Add after existing models in `prisma/schema.prisma`:

```prisma
model Subject {
  id              String   @id @default(uuid())
  name            String
  institution_id  String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  tutor_subjects  TutorSubject[]
  classes         Class[]

  @@unique([name, institution_id])
  @@map("subjects")
}

model TutorSubject {
  tutor_id   String
  subject_id String

  tutor   Tutor   @relation(fields: [tutor_id], references: [id], onDelete: Cascade)
  subject Subject @relation(fields: [subject_id], references: [id], onDelete: Restrict)

  @@id([tutor_id, subject_id])
  @@map("tutor_subjects")
}
```

- [ ] **Step 2: Update Tutor model**

In the Tutor model, find:
```prisma
  subjects          String[]
```
Replace with:
```prisma
  tutor_subjects    TutorSubject[]
```

Keep the existing `classes Class[]` relation.

- [ ] **Step 3: Update Class model**

In the Class model, find:
```prisma
  subject           String
```
Replace with:
```prisma
  subject_id        String?
  subject           Subject? @relation(fields: [subject_id], references: [id])
```

Note: `subject_id` starts nullable for migration. Task 3 will make it NOT NULL after data is populated.

- [ ] **Step 4: Add Subject relation to Institution model**

In the Institution model, add:
```prisma
  subjects          Subject[]
```

- [ ] **Step 5: Create migration**

Run: `cd sinaloka-backend && npx prisma migrate dev --name add_subject_table_and_relations`
Expected: Migration created and applied

- [ ] **Step 6: Regenerate Prisma client**

Run: `cd sinaloka-backend && npm run prisma:generate`
Expected: Client regenerated

- [ ] **Step 7: Commit**

```bash
git add sinaloka-backend/prisma/
git commit -m "feat(backend): add subject table, tutor_subject join table, class subject_id FK"
```

---

### Task 2: Data migration script

**Files:**
- Create: `sinaloka-backend/prisma/migrations/manual/migrate-subjects.ts`

- [ ] **Step 1: Write migration script**

Create `sinaloka-backend/prisma/migrations/manual/migrate-subjects.ts`:

```typescript
import { PrismaClient } from '../../../generated/prisma/client';

const prisma = new PrismaClient();

function titleCase(str: string): string {
  return str.trim().replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

async function main() {
  // 1. Collect unique subjects from tutors and classes, grouped by institution
  const tutors = await prisma.$queryRaw<Array<{ institution_id: string; subjects: string[] }>>`
    SELECT institution_id, subjects FROM tutors WHERE array_length(subjects, 1) > 0
  `;

  const classes = await prisma.$queryRaw<Array<{ institution_id: string; subject: string }>>`
    SELECT DISTINCT institution_id, subject FROM classes WHERE subject IS NOT NULL AND subject != ''
  `;

  // 2. Build unique subject set per institution
  const subjectMap = new Map<string, Set<string>>();

  for (const t of tutors) {
    if (!subjectMap.has(t.institution_id)) subjectMap.set(t.institution_id, new Set());
    for (const s of t.subjects) {
      subjectMap.get(t.institution_id)!.add(titleCase(s));
    }
  }

  for (const c of classes) {
    if (!subjectMap.has(c.institution_id)) subjectMap.set(c.institution_id, new Set());
    subjectMap.get(c.institution_id)!.add(titleCase(c.subject));
  }

  // 3. Insert subjects
  const subjectIdMap = new Map<string, string>(); // "institution_id:name" -> subject.id

  for (const [instId, names] of subjectMap) {
    for (const name of names) {
      const subject = await prisma.subject.upsert({
        where: { name_institution_id: { name, institution_id: instId } },
        create: { name, institution_id: instId },
        update: {},
      });
      subjectIdMap.set(`${instId}:${name}`, subject.id);
    }
  }

  // 4. Create tutor_subject records
  const allTutors = await prisma.$queryRaw<Array<{ id: string; institution_id: string; subjects: string[] }>>`
    SELECT id, institution_id, subjects FROM tutors WHERE array_length(subjects, 1) > 0
  `;

  for (const t of allTutors) {
    for (const s of t.subjects) {
      const subjectId = subjectIdMap.get(`${t.institution_id}:${titleCase(s)}`);
      if (subjectId) {
        await prisma.tutorSubject.upsert({
          where: { tutor_id_subject_id: { tutor_id: t.id, subject_id: subjectId } },
          create: { tutor_id: t.id, subject_id: subjectId },
          update: {},
        });
      }
    }
  }

  // 5. Set class.subject_id
  const allClasses = await prisma.$queryRaw<Array<{ id: string; institution_id: string; subject: string }>>`
    SELECT id, institution_id, subject FROM classes WHERE subject IS NOT NULL AND subject != ''
  `;

  for (const c of allClasses) {
    const subjectId = subjectIdMap.get(`${c.institution_id}:${titleCase(c.subject)}`);
    if (subjectId) {
      await prisma.class.update({
        where: { id: c.id },
        data: { subject_id: subjectId },
      });
    }
  }

  console.log(`Migrated ${subjectIdMap.size} subjects, ${allTutors.length} tutors, ${allClasses.length} classes`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run migration script**

Run: `cd sinaloka-backend && npx tsx prisma/migrations/manual/migrate-subjects.ts`
Expected: Outputs count of migrated records

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/prisma/migrations/manual/
git commit -m "feat(backend): add data migration script for subjects"
```

---

### Task 3: Finalize schema — make class.subject_id NOT NULL, drop old columns

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Make subject_id required and drop old columns**

In `prisma/schema.prisma`, update Class model:
```prisma
  subject_id        String
  subject           Subject @relation(fields: [subject_id], references: [id])
```

Remove the `subjects String[]` field from Tutor model if not already done.

- [ ] **Step 2: Create migration**

Run: `cd sinaloka-backend && npx prisma migrate dev --name make_subject_id_required_drop_old_columns`
Expected: Migration created and applied

- [ ] **Step 3: Regenerate Prisma client**

Run: `cd sinaloka-backend && npm run prisma:generate`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/prisma/
git commit -m "feat(backend): make class.subject_id NOT NULL, drop old subject columns"
```

---

### Task 4: Create Subject module (CRUD + tutors-by-subject endpoint)

**Files:**
- Create: `sinaloka-backend/src/modules/subject/subject.module.ts`
- Create: `sinaloka-backend/src/modules/subject/subject.controller.ts`
- Create: `sinaloka-backend/src/modules/subject/subject.service.ts`
- Create: `sinaloka-backend/src/modules/subject/subject.dto.ts`

- [ ] **Step 1: Create subject.dto.ts**

Create `sinaloka-backend/src/modules/subject/subject.dto.ts`:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export class CreateSubjectDto extends createZodDto(CreateSubjectSchema) {}
export class UpdateSubjectDto extends createZodDto(UpdateSubjectSchema) {}
```

- [ ] **Step 2: Create subject.service.ts**

Create `sinaloka-backend/src/modules/subject/subject.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.subject.findMany({
      where: { institution_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, data: { name: string }) {
    const existing = await this.prisma.subject.findUnique({
      where: { name_institution_id: { name: data.name, institution_id: tenantId } },
    });
    if (existing) throw new ConflictException('Subject already exists');
    return this.prisma.subject.create({
      data: { name: data.name, institution_id: tenantId },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string }) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    if (data.name) {
      const existing = await this.prisma.subject.findUnique({
        where: { name_institution_id: { name: data.name, institution_id: tenantId } },
      });
      if (existing && existing.id !== id) throw new ConflictException('Subject name already exists');
    }
    return this.prisma.subject.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const classCount = await this.prisma.class.count({ where: { subject_id: id } });
    const tutorCount = await this.prisma.tutorSubject.count({ where: { subject_id: id } });
    if (classCount > 0 || tutorCount > 0) {
      throw new BadRequestException('Cannot delete subject: still referenced by classes or tutors');
    }

    return this.prisma.subject.delete({ where: { id } });
  }

  async findTutorsBySubject(tenantId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, institution_id: tenantId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    return this.prisma.tutor.findMany({
      where: {
        institution_id: tenantId,
        is_verified: true,
        tutor_subjects: { some: { subject_id: subjectId } },
      },
      include: { tutor_subjects: { include: { subject: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
```

- [ ] **Step 3: Create subject.controller.ts**

Create `sinaloka-backend/src/modules/subject/subject.controller.ts` following existing controller patterns (use `@Roles`, `@CurrentUser`, `request.tenantId` for multi-tenancy). Include all 5 endpoints from the spec.

- [ ] **Step 4: Create subject.module.ts**

Create `sinaloka-backend/src/modules/subject/subject.module.ts` and register it in the app module.

- [ ] **Step 5: Verify backend compiles**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/subject/
git commit -m "feat(backend): add subject module with CRUD and tutors-by-subject endpoint"
```

---

### Task 5: Update Tutor DTOs and service for subject_ids

**Files:**
- Modify: `sinaloka-backend/src/modules/tutor/tutor.dto.ts:7,18`
- Modify: `sinaloka-backend/src/modules/tutor/tutor.service.ts`
- Modify: `sinaloka-backend/src/modules/invitation/invitation.dto.ts:6`

- [ ] **Step 1: Update tutor DTOs — subjects → subject_ids**

In `sinaloka-backend/src/modules/tutor/tutor.dto.ts`:

Line 7 (`CreateTutorSchema`), change:
```typescript
  subjects: z.array(z.string().min(1)).min(1),
```
To:
```typescript
  subject_ids: z.array(z.string().uuid()).min(1),
```

Line 18 (`UpdateTutorSchema`), change:
```typescript
  subjects: z.array(z.string().min(1)).min(1).optional(),
```
To:
```typescript
  subject_ids: z.array(z.string().uuid()).min(1).optional(),
```

In `sinaloka-backend/src/modules/invitation/invitation.dto.ts`:

Line 6 (`InviteTutorSchema`), change:
```typescript
  subjects: z.array(z.string().min(1)).min(1),
```
To:
```typescript
  subject_ids: z.array(z.string().uuid()).min(1),
```

- [ ] **Step 2: Update tutor.service.ts create method**

In `tutor.service.ts`, update the `create()` method to use the `tutor_subject` join table instead of `subjects` array. After creating the tutor, create tutor_subject records:

```typescript
// Replace subjects: data.subjects with:
// After tutor creation in the transaction:
if (data.subject_ids?.length) {
  await tx.tutorSubject.createMany({
    data: data.subject_ids.map(sid => ({ tutor_id: tutor.id, subject_id: sid })),
  });
}
```

- [ ] **Step 3: Update tutor.service.ts update method**

Update the `update()` method to handle `subject_ids`:

```typescript
// Replace subjects handling with:
if (data.subject_ids) {
  await this.prisma.tutorSubject.deleteMany({ where: { tutor_id: id } });
  await this.prisma.tutorSubject.createMany({
    data: data.subject_ids.map(sid => ({ tutor_id: id, subject_id: sid })),
  });
}
```

- [ ] **Step 4: Update tutor.service.ts findAll subject filter**

Replace the `subjects: { has: subject }` filter with:

```typescript
if (subject) {
  where.tutor_subjects = { some: { subject_id: subject } };
}
```

- [ ] **Step 5: Update tutor includes to return tutor_subjects with subject**

In all find queries, include:
```typescript
include: { tutor_subjects: { include: { subject: true } } }
```

- [ ] **Step 6: Update invitation service**

In `invitation.service.ts`, update the invite method to use `subject_ids` with the join table instead of `subjects` array.

- [ ] **Step 7: Verify backend compiles**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add sinaloka-backend/src/modules/tutor/ sinaloka-backend/src/modules/invitation/
git commit -m "feat(backend): update tutor module to use subject_ids with join table"
```

---

### Task 6: Update Class DTOs and service for subject_id FK

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.dto.ts:20,50,84`
- Modify: `sinaloka-backend/src/modules/class/class.service.ts`

- [ ] **Step 1: Update class DTOs**

In `sinaloka-backend/src/modules/class/class.dto.ts`:

Line 20 (`CreateClassSchema`), change:
```typescript
  subject: z.string().min(1, 'Subject is required').max(100),
```
To:
```typescript
  subject_id: z.string().uuid('Valid subject is required'),
```

Line 50 (`UpdateClassSchema`), change:
```typescript
  subject: z.string().min(1).max(100).optional(),
```
To:
```typescript
  subject_id: z.string().uuid().optional(),
```

Around line 84 (`ClassQuerySchema`), update sort_by enum:
```typescript
  sort_by: z.enum(['name', 'subject_name', 'capacity', 'created_at']).default('created_at'),
```

Update subject filter field to accept UUID:
```typescript
  subject: z.string().uuid().optional(),
```
Rename to `subject_id` if the param name changes, or keep as query param name and map internally.

- [ ] **Step 2: Update class.service.ts create method**

Add validation before creating:
```typescript
// Validate subject exists in institution
const subject = await this.prisma.subject.findFirst({
  where: { id: data.subject_id, institution_id: tenantId },
});
if (!subject) throw new NotFoundException('Subject not found');

// Validate tutor teaches this subject
const tutorSubject = await this.prisma.tutorSubject.findUnique({
  where: { tutor_id_subject_id: { tutor_id: data.tutor_id, subject_id: data.subject_id } },
});
if (!tutorSubject) throw new BadRequestException('Tutor does not teach this subject');
```

Replace `subject: data.subject` with `subject_id: data.subject_id` in the create call.

- [ ] **Step 3: Update class.service.ts update method**

Add tutor-subject consistency validation for partial updates:
```typescript
// Get current class
const currentClass = await this.prisma.class.findFirst({ where: { id, institution_id: tenantId } });

const effectiveTutorId = data.tutor_id ?? currentClass.tutor_id;
const effectiveSubjectId = data.subject_id ?? currentClass.subject_id;

// If either changed, validate the combination
if (data.tutor_id || data.subject_id) {
  const tutorSubject = await this.prisma.tutorSubject.findUnique({
    where: { tutor_id_subject_id: { tutor_id: effectiveTutorId, subject_id: effectiveSubjectId } },
  });
  if (!tutorSubject) throw new BadRequestException('Tutor does not teach this subject');
}
```

- [ ] **Step 4: Update class.service.ts findAll**

Update filter: `where.subject = subject` → `where.subject_id = subjectId`

Update sort: handle `'subject_name'` sort by ordering via relation:
```typescript
if (sort_by === 'subject_name') {
  orderBy = { subject: { name: sort_order } };
}
```

Include subject relation in responses:
```typescript
include: { subject: true, tutor: true }
```

- [ ] **Step 5: Verify backend compiles**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/class/
git commit -m "feat(backend): update class module to use subject_id FK with tutor-subject validation"
```

---

### Task 7: Frontend types, hooks, and services for subjects

**Files:**
- Create: `sinaloka-platform/src/types/subject.ts`
- Modify: `sinaloka-platform/src/types/tutor.ts`
- Modify: `sinaloka-platform/src/types/class.ts`
- Create: `sinaloka-platform/src/hooks/useSubjects.ts`
- Modify: `sinaloka-platform/src/services/` (add subject API calls)

- [ ] **Step 1: Create Subject type**

Create `sinaloka-platform/src/types/subject.ts`:
```typescript
export interface Subject {
  id: string;
  name: string;
  institution_id: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Update Tutor type**

In `sinaloka-platform/src/types/tutor.ts`, replace:
```typescript
  subjects: string[];
```
With:
```typescript
  tutor_subjects: { subject: { id: string; name: string } }[];
```

Update `CreateTutorDto` — replace `subjects: string[]` with `subject_ids: string[]`.
Update `UpdateTutorDto` — replace `subjects?: string[]` with `subject_ids?: string[]`.

- [ ] **Step 3: Update Class type**

In `sinaloka-platform/src/types/class.ts`, replace `subject: string` with:
```typescript
  subject_id: string;
  subject: { id: string; name: string };
```

- [ ] **Step 4: Create useSubjects hook**

Create `sinaloka-platform/src/hooks/useSubjects.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { Subject } from '../types/subject';

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data;
    },
  });
}

export function useSubjectTutors(subjectId: string | null) {
  return useQuery({
    queryKey: ['subjects', subjectId, 'tutors'],
    queryFn: async () => {
      const { data } = await api.get(`/subjects/${subjectId}/tutors`);
      return data;
    },
    enabled: !!subjectId,
  });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors (may have errors in pages that reference old types — those are fixed in Tasks 8-9)

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/types/ sinaloka-platform/src/hooks/useSubjects.ts
git commit -m "feat(platform): add subject types, hooks, and update tutor/class types"
```

---

### Task 8: Update platform Tutors page for multi-select subjects

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Update TutorForm subjects field**

Replace the free-text comma-separated subjects input with a multi-select that fetches from `GET /api/subjects`. The form should:
- Fetch subjects with `useSubjects()`
- Store selected subject IDs in form state
- Display as checkboxes, tags, or a multi-select dropdown
- Submit `subject_ids: string[]` instead of `subjects: string`

- [ ] **Step 2: Update tutor card/list subject display**

Replace references to `tutor.subjects` with `tutor.tutor_subjects.map(ts => ts.subject.name)` throughout the page (grid cards, list view, filter logic).

- [ ] **Step 3: Update subject filter dropdown**

The filter dropdown should populate from subjects extracted from `tutor.tutor_subjects` instead of the old `tutor.subjects` array.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "feat(platform): update tutor page for multi-select subjects from subjects table"
```

---

### Task 9: Update platform Classes page for subject-first flow

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

- [ ] **Step 1: Replace SUBJECT_COLORS with hash-based color function**

Remove the hardcoded `SUBJECT_COLORS` object (lines 48-53). Replace with a hash-based function:
```typescript
function getSubjectColor(name: string): string {
  const colors = [
    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
```

- [ ] **Step 2: Update class form — subject dropdown from API**

Replace the hardcoded subject `<select>` options with dynamic options from `useSubjects()`. The subject dropdown should be populated with all subjects for the institution.

- [ ] **Step 3: Update class form — tutor dropdown filtered by subject**

Use `useSubjectTutors(selectedSubjectId)` to populate the tutor dropdown. The tutor dropdown should:
- Be disabled until a subject is selected
- Show only verified tutors who teach the selected subject
- Clear the tutor selection when the subject changes

- [ ] **Step 4: Update form submission**

Change `subject: formSubject` to `subject_id: formSubjectId` in the create/update API call.

- [ ] **Step 5: Update class list display**

Replace references to `class.subject` (string) with `class.subject.name` throughout the page (table cells, filter logic, badges).

- [ ] **Step 6: Update class list filter dropdown**

Populate the subject filter dropdown from `useSubjects()` instead of extracting from loaded class data. Filter by `subject_id`.

- [ ] **Step 7: Update class list sort**

If the sort uses `'subject'`, update to `'subject_name'` to match the updated backend enum.

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 9: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(platform): update classes page for subject-first flow with dynamic subjects"
```

---

### Task 10: Update sinaloka-tutors subject displays

**Files:**
- Modify: `sinaloka-tutors/src/pages/ProfilePage.tsx`
- Modify: any other pages in sinaloka-tutors that display tutor subjects

- [ ] **Step 1: Update ProfilePage subject display**

Replace any reference to `tutor.subject` or `tutor.subjects` with data from the `tutor_subjects` relation.

- [ ] **Step 2: Update type definitions in sinaloka-tutors**

Update the TutorProfile type to include `tutor_subjects` instead of `subject`/`subjects`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-tutors/
git commit -m "feat(tutors): update subject displays to use tutor_subjects relation"
```

---

### Task 11: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 2: Run platform build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run tutors build**

Run: `cd sinaloka-tutors && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run backend tests**

Run: `cd sinaloka-backend && npm run test -- --ci`
Expected: All tests pass
