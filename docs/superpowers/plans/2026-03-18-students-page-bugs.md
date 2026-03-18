# Students Page Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 bugs on the Students page: hardcoded grade dropdowns, missing form validation, and hardcoded grade filter.

**Architecture:** Add a frontend grade constant (Kelas 1-12, grouped SD/SMP/SMA), replace all hardcoded dropdowns, add inline form validation with error messages, update backend DTO to require parent fields, and migrate existing data from "Grade X" to "Kelas X".

**Tech Stack:** React + Vite + TailwindCSS (frontend), NestJS + Zod (backend), PostgreSQL + Prisma (database)

**Spec:** `docs/superpowers/specs/2026-03-18-students-page-bugs-design.md`

---

## Task 1: Backend DTO — Make parent fields required

**Files:**
- Modify: `sinaloka-backend/src/modules/student/student.dto.ts:11-12`

- [ ] **Step 1: Update CreateStudentSchema**

In `sinaloka-backend/src/modules/student/student.dto.ts`, change lines 11-12 from:

```typescript
  parent_name: z.string().max(255).optional().nullable(),
  parent_phone: z.string().max(20).optional().nullable(),
```

to:

```typescript
  parent_name: z.string().min(1, 'Parent name is required').max(255),
  parent_phone: z.string().min(1, 'Parent phone is required').max(20),
```

Note: `UpdateStudentSchema = CreateStudentSchema.partial()` on line 18 — no changes needed there. Fields become optional on update but non-empty when provided.

- [ ] **Step 2: Run backend tests**

Run: `cd sinaloka-backend && npm run test -- --ci`
Expected: All tests pass (existing specs already include parent_name/parent_phone values)

- [ ] **Step 3: Run backend build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/student/student.dto.ts
git commit -m "fix(backend): make parent_name and parent_phone required in student DTO"
```

---

## Task 2: Frontend — Create grade constants

**Files:**
- Create: `sinaloka-platform/src/lib/constants.ts`

- [ ] **Step 1: Create the constants file**

Create `sinaloka-platform/src/lib/constants.ts`:

```typescript
export const GRADE_GROUPS = [
  {
    label: 'SD',
    options: [
      { value: 'Kelas 1', label: 'Kelas 1' },
      { value: 'Kelas 2', label: 'Kelas 2' },
      { value: 'Kelas 3', label: 'Kelas 3' },
      { value: 'Kelas 4', label: 'Kelas 4' },
      { value: 'Kelas 5', label: 'Kelas 5' },
      { value: 'Kelas 6', label: 'Kelas 6' },
    ],
  },
  {
    label: 'SMP',
    options: [
      { value: 'Kelas 7', label: 'Kelas 7' },
      { value: 'Kelas 8', label: 'Kelas 8' },
      { value: 'Kelas 9', label: 'Kelas 9' },
    ],
  },
  {
    label: 'SMA',
    options: [
      { value: 'Kelas 10', label: 'Kelas 10' },
      { value: 'Kelas 11', label: 'Kelas 11' },
      { value: 'Kelas 12', label: 'Kelas 12' },
    ],
  },
];

export const ALL_GRADES = GRADE_GROUPS.flatMap(g => g.options);
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/lib/constants.ts
git commit -m "feat(platform): add Indonesian grade constants (Kelas 1-12, grouped SD/SMP/SMA)"
```

---

## Task 3: Frontend — Replace filter dropdown with grouped grades

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx:357-366`

- [ ] **Step 1: Add import**

At the top of `Students.tsx`, add after the existing imports (around line 40):

```typescript
import { GRADE_GROUPS, ALL_GRADES } from '../lib/constants';
```

(We import both `GRADE_GROUPS` and `ALL_GRADES` now — `ALL_GRADES` is used in Task 4 for detecting custom grades.)

- [ ] **Step 2: Replace filter dropdown**

Replace lines 357-366 (the grade filter `<select>`) from:

```tsx
<select
  className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
  onChange={(e) => setActiveFilters(prev => ({ ...prev, grade: e.target.value || undefined }))}
  value={activeFilters.grade || ''}
>
  <option value="">{t('students.filter.allGrades')}</option>
  <option value="10th Grade">{t('students.filter.10thGrade')}</option>
  <option value="11th Grade">{t('students.filter.11thGrade')}</option>
  <option value="12th Grade">{t('students.filter.12thGrade')}</option>
</select>
```

with:

```tsx
<select
  className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
  onChange={(e) => setActiveFilters(prev => ({ ...prev, grade: e.target.value || undefined }))}
  value={activeFilters.grade || ''}
>
  <option value="">{t('students.filter.allGrades')}</option>
  {GRADE_GROUPS.map(group => (
    <optgroup key={group.label} label={group.label}>
      {group.options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </optgroup>
  ))}
</select>
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Students.tsx
git commit -m "fix(platform): replace hardcoded grade filter with grouped Kelas 1-12"
```

---

## Task 4: Frontend — Replace form dropdown with grouped grades + "Lainnya..."

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx:69-77,224-234,237-248,808-816`

- [ ] **Step 1: Add custom grade state**

After line 77 (`formParentEmail` state), add:

```typescript
const [formCustomGrade, setFormCustomGrade] = useState('');
```

- [ ] **Step 2: Fix default grade in openAddModal**

In `openAddModal()` (line 224-234), change line 229 from:

```typescript
setFormGrade('10th Grade');
```

to:

```typescript
setFormGrade('');
```

Also add after `setFormParentEmail('');` (line 233):

```typescript
setFormCustomGrade('');
```

- [ ] **Step 3: Handle custom grade in handleEditClick**

In `handleEditClick()` (line 237-248), after `setFormGrade(student.grade);` (line 242), add logic to detect custom grades:

```typescript
const isStandardGrade = ALL_GRADES.some(g => g.value === student.grade);
if (!isStandardGrade && student.grade) {
  setFormGrade('__custom__');
  setFormCustomGrade(student.grade);
} else {
  setFormCustomGrade('');
}
```

`ALL_GRADES` was already imported in Task 3, Step 1.

- [ ] **Step 4: Replace form grade dropdown**

Replace lines 806-816 (the grade `<select>` block in the form) from:

```tsx
<div className="space-y-1.5">
  <Label>{t('students.form.grade')}</Label>
  <select
    className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
    value={formGrade}
    onChange={(e) => setFormGrade(e.target.value)}
  >
    <option value="10th Grade">{t('students.filter.10thGrade')}</option>
    <option value="11th Grade">{t('students.filter.11thGrade')}</option>
    <option value="12th Grade">{t('students.filter.12thGrade')}</option>
  </select>
</div>
```

with:

```tsx
<div className="space-y-1.5">
  <Label>{t('students.form.grade')}</Label>
  <select
    className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
    value={formGrade}
    onChange={(e) => {
      setFormGrade(e.target.value);
      if (e.target.value !== '__custom__') setFormCustomGrade('');
    }}
  >
    <option value="" disabled>Pilih kelas...</option>
    {GRADE_GROUPS.map(group => (
      <optgroup key={group.label} label={group.label}>
        {group.options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </optgroup>
    ))}
    <option value="__custom__">Lainnya...</option>
  </select>
  {formGrade === '__custom__' && (
    <Input
      placeholder="Masukkan kelas..."
      value={formCustomGrade}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCustomGrade(e.target.value)}
      className="mt-1.5"
    />
  )}
</div>
```

- [ ] **Step 5: Update handleFormSubmit to resolve custom grade**

In `handleFormSubmit()` (line 250-283), change line 255 from:

```typescript
grade: formGrade,
```

to:

```typescript
grade: formGrade === '__custom__' ? formCustomGrade : formGrade,
```

- [ ] **Step 6: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Students.tsx
git commit -m "fix(platform): replace form grade dropdown with grouped Kelas 1-12 + Lainnya option"
```

---

## Task 5: Frontend — Add inline form validation

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx` (form state, submit handler, JSX)

- [ ] **Step 1: Add validation error state**

After the `formCustomGrade` state (added in Task 4), add:

```typescript
const [formErrors, setFormErrors] = useState<Record<string, string>>({});
```

- [ ] **Step 2: Clear errors in openAddModal and handleEditClick**

In `openAddModal()`, add after `setFormCustomGrade('');`:

```typescript
setFormErrors({});
```

In `handleEditClick()`, add at the end (before `setShowAddModal(true);`):

```typescript
setFormErrors({});
```

- [ ] **Step 3: Add validation logic to handleFormSubmit**

Replace the beginning of `handleFormSubmit()` (search for `const handleFormSubmit`; line numbers may have shifted from Task 4 edits). Change from:

```typescript
const handleFormSubmit = () => {
    const payload = {
      name: formName,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      grade: formGrade,
      status: formStatus,
      parent_name: formParentName || undefined,
      parent_phone: formParentPhone || undefined,
      parent_email: formParentEmail || undefined,
    };
```

to:

```typescript
const handleFormSubmit = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Nama lengkap wajib diisi';
    const resolvedGrade = formGrade === '__custom__' ? formCustomGrade : formGrade;
    if (!resolvedGrade.trim()) {
      errors.grade = formGrade === '__custom__' ? 'Kelas wajib diisi' : 'Kelas wajib dipilih';
    }
    if (!formParentName.trim()) errors.parent_name = 'Nama orang tua wajib diisi';
    if (!formParentPhone.trim()) errors.parent_phone = 'Telepon orang tua wajib diisi';
    if (formEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      errors.email = 'Format email tidak valid';
    }
    if (formParentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formParentEmail)) {
      errors.parent_email = 'Format email tidak valid';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const payload = {
      name: formName,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      grade: resolvedGrade,
      status: formStatus,
      parent_name: formParentName,       // no longer `|| undefined` — validated as required above
      parent_phone: formParentPhone,     // no longer `|| undefined` — validated as required above
      parent_email: formParentEmail || undefined,
    };
```

- [ ] **Step 4: Add error display below each form field**

Add red error text below each relevant field. The pattern is to add this after each `</Input>` or `</select>`:

```tsx
{formErrors.FIELD_KEY && (
  <p className="text-red-500 text-sm mt-1">{formErrors.FIELD_KEY}</p>
)}
```

Fields to add error display for:

1. **Nama Lengkap** (after the Input on ~line 782): key `name`
2. **Alamat Email** (after the Input on ~line 792): key `email`
3. **Kelas** (after the custom grade Input in the new JSX from Task 4): key `grade`
4. **Nama Orang Tua/Wali** (after the Input on ~line 836): key `parent_name`
5. **Telepon Orang Tua/Wali** (after the Input on ~line 845): key `parent_phone`
6. **Email Orang Tua/Wali** (after the Input on ~line 855): key `parent_email`

Also add `onChange` handlers to clear errors when user types. For each Input, update the onChange to also clear the error. Example for the name field:

```tsx
onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
  setFormName(e.target.value);
  if (formErrors.name) setFormErrors(prev => { const { name, ...rest } = prev; return rest; });
}}
```

Apply the same pattern for: `email`, `parent_name`, `parent_phone`, `parent_email`.

For the grade dropdown onChange (already updated in Task 4), add error clearing:

```tsx
onChange={(e) => {
  setFormGrade(e.target.value);
  if (e.target.value !== '__custom__') setFormCustomGrade('');
  if (formErrors.grade) setFormErrors(prev => { const { grade, ...rest } = prev; return rest; });
}}
```

- [ ] **Step 5: Update submit button disabled condition**

Change line 869 from:

```tsx
disabled={createStudent.isPending || updateStudent.isPending || !formName}
```

to:

```tsx
disabled={createStudent.isPending || updateStudent.isPending}
```

(Validation is now handled by `handleFormSubmit`, not the disabled attribute.)

- [ ] **Step 6: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Students.tsx
git commit -m "fix(platform): add inline validation errors for student add/edit form"
```

---

## Task 6: Frontend — Update CSV template examples

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx:159-160`

- [ ] **Step 1: Update CSV template grade values**

Change lines 159-160 from:

```typescript
const example1 = 'Rina Pelajar,rina@example.com,08121234567,10th Grade,ACTIVE,Budi Pelajar,08129876543,budi@example.com';
const example2 = 'Dimas Pelajar,,08131234567,11th Grade,ACTIVE,Siti Pelajar,08139876543,';
```

to:

```typescript
const example1 = 'Rina Pelajar,rina@example.com,08121234567,Kelas 10,ACTIVE,Budi Pelajar,08129876543,budi@example.com';
const example2 = 'Dimas Pelajar,,08131234567,Kelas 11,ACTIVE,Siti Pelajar,08139876543,';
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Students.tsx
git commit -m "fix(platform): update CSV template to use Indonesian grade format (Kelas X)"
```

---

## Task 7: Data migration — Update existing grade values + seed

**Files:**
- Modify: `sinaloka-backend/prisma/seed.ts:143`
- Run: one-time migration script (not committed)

- [ ] **Step 1: Update seed file**

In `sinaloka-backend/prisma/seed.ts`, change line 143 from:

```typescript
grade: `Grade ${(i % 3) + 7}`,
```

to:

```typescript
grade: `Kelas ${(i % 3) + 7}`,
```

- [ ] **Step 2: Run data migration**

Run:

```bash
cd sinaloka-backend && export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sinaloka" && npx prisma db execute --stdin <<'SQL'
UPDATE students SET grade = REPLACE(grade, 'Grade ', 'Kelas ') WHERE grade LIKE 'Grade %';
SQL
```

If `prisma db execute` is not available, use a tsx script:

```bash
cd sinaloka-backend && export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sinaloka" && npx tsx -e "
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  const result = await prisma.\$executeRawUnsafe(\"UPDATE students SET grade = REPLACE(grade, 'Grade ', 'Kelas ') WHERE grade LIKE 'Grade %'\");
  console.log('Updated', result, 'rows');
  await prisma.\$disconnect();
}
main();
"
```

Expected: Output like "Updated 5 rows"

- [ ] **Step 3: Commit seed update**

```bash
git add sinaloka-backend/prisma/seed.ts
git commit -m "fix(backend): update seed to use Indonesian grade format (Kelas X)"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run backend build + tests**

```bash
cd sinaloka-backend && npm run build && npm run test -- --ci
```

Expected: All pass

- [ ] **Step 2: Run frontend build**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Manual browser testing**

Open `http://localhost:3000/students` and verify:

1. **Filter dropdown** shows grouped Kelas 1-12 (SD/SMP/SMA) + "Semua Kelas"
2. **Add Student modal** shows grouped Kelas 1-12 + "Lainnya..." + placeholder "Pilih kelas..."
3. **Edit Student modal** pre-selects the correct grade (e.g., "Kelas 7")
4. **Submitting empty form** shows inline red error messages under required fields
5. **Error messages clear** when user starts typing
6. **"Lainnya..."** shows a text input when selected
7. **CSV template download** shows "Kelas 10" / "Kelas 11" in examples
8. **Filter by grade** correctly filters students (e.g., "Kelas 7" shows Fajar and Rina)
