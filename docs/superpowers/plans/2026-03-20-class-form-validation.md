# Class Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive frontend validation to the Class form and surface backend Zod errors as inline field messages.

**Architecture:** A reusable `useFormErrors` hook manages field-level error state. A `mapBackendErrors` utility converts backend Zod validation responses to the same shape. The backend `HttpExceptionFilter` is updated to forward the `errors` array. The Class form is the first consumer — other forms can adopt the pattern incrementally.

**Tech Stack:** React hooks, NestJS exception filter, i18n (react-i18next), Zod (backend only)

**Spec:** `docs/superpowers/specs/2026-03-20-class-form-validation-design.md`

---

### Task 1: Backend — Forward `errors` array in HttpExceptionFilter

**Files:**
- Modify: `sinaloka-backend/src/common/filters/http-exception.filter.ts:55-60`

- [ ] **Step 1: Update the filter to include `errors` in response**

In `http-exception.filter.ts`, the `exceptionResponse` variable is scoped inside the `if (exception instanceof HttpException)` block (line 29) and is not accessible at the `response.status(...).json(...)` call on line 55. To forward the `errors` array, add a variable in the outer scope and extract errors inside the existing `typeof exceptionResponse === 'object'` branch.

**Add after line 25** (`let error: string;`):
```typescript
    let errors: unknown[] | undefined;
```

**Add inside the `typeof exceptionResponse === 'object'` branch** (after line 37, `error = (resp['error'] as string) || exception.name;`):
```typescript
        if (Array.isArray(resp['errors'])) {
          errors = resp['errors'];
        }
```

**Replace lines 55-60** (the `response.status(...).json(...)` block):
```typescript
    const body: Record<string, unknown> = { statusCode, error, message, requestId };
    if (errors) {
      body.errors = errors;
    }
    response.status(statusCode).json(body);
```

- [ ] **Step 2: Verify with backend build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/common/filters/http-exception.filter.ts
git commit -m "fix(backend): forward Zod field errors in HTTP exception response"
```

---

### Task 2: Create `useFormErrors` hook

**Files:**
- Create: `sinaloka-platform/src/hooks/useFormErrors.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useState, useCallback, useMemo } from 'react';

export type ValidationRule = [condition: boolean, field: string, message: string];

export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const setMultiple = useCallback((errMap: Record<string, string>) => {
    setErrors(errMap);
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const validate = useCallback((rules: ValidationRule[]): boolean => {
    const newErrors: Record<string, string> = {};
    for (const [condition, field, message] of rules) {
      if (condition) {
        newErrors[field] = message;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  return { errors, setError, setErrors: setMultiple, clearError, clearAll, hasErrors, validate };
}
```

- [ ] **Step 2: Verify with type check**

Run: `cd sinaloka-platform && npx tsc --noEmit --skipLibCheck 2>&1 | grep useFormErrors || echo "No errors"`
Expected: No errors related to `useFormErrors`.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/hooks/useFormErrors.ts
git commit -m "feat(platform): add reusable useFormErrors hook"
```

---

### Task 3: Create `mapBackendErrors` utility

**Files:**
- Create: `sinaloka-platform/src/lib/form-errors.ts`

- [ ] **Step 1: Create the utility file**

```typescript
interface BackendFieldError {
  field: string;
  message: string;
}

/**
 * Extracts field-level validation errors from a backend error response.
 * Returns a Record<field, message> if structured errors are present, or null otherwise.
 *
 * Backend shape (from ZodValidationPipe + HttpExceptionFilter):
 *   { statusCode: 400, message: "Validation failed", errors: [{ field, message }] }
 */
export function mapBackendErrors(err: unknown): Record<string, string> | null {
  const data = (err as any)?.response?.data;
  if (!data || !Array.isArray(data.errors) || data.errors.length === 0) {
    return null;
  }

  const result: Record<string, string> = {};
  for (const item of data.errors as BackendFieldError[]) {
    if (item.field && item.message) {
      result[item.field] = item.message;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/lib/form-errors.ts
git commit -m "feat(platform): add mapBackendErrors utility for field-level error extraction"
```

---

### Task 4: Add i18n validation keys

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add validation keys to `id.json`**

Inside the `"classes"` object, after the `"toast"` block (around line 457), add a new `"validation"` block:

```json
    "validation": {
      "nameRequired": "Nama kelas wajib diisi",
      "subjectRequired": "Mata pelajaran wajib dipilih",
      "tutorRequired": "Tutor wajib dipilih",
      "scheduleDayRequired": "Minimal satu hari jadwal harus dipilih",
      "capacityRequired": "Kapasitas harus lebih dari 0",
      "feeRequired": "Biaya tidak boleh kosong",
      "tutorFeeRequired": "Biaya tutor wajib diisi",
      "perStudentFeeRequired": "Biaya per murid wajib diisi dan lebih dari 0"
    },
```

- [ ] **Step 2: Add validation keys to `en.json`**

Add the same block in English inside the `"classes"` object:

```json
    "validation": {
      "nameRequired": "Class name is required",
      "subjectRequired": "Subject is required",
      "tutorRequired": "Tutor is required",
      "scheduleDayRequired": "At least one schedule day is required",
      "capacityRequired": "Capacity must be greater than 0",
      "feeRequired": "Fee is required",
      "tutorFeeRequired": "Tutor fee is required",
      "perStudentFeeRequired": "Per-student fee is required and must be greater than 0"
    },
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/id.json sinaloka-platform/src/locales/en.json
git commit -m "feat(platform): add class form validation i18n keys"
```

---

### Task 5: Integrate `useFormErrors` into `useClassesPage`

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes/useClassesPage.ts`

- [ ] **Step 1: Import the hook and utility**

Add at the top of the file:

```typescript
import { useFormErrors } from '@/src/hooks/useFormErrors';
import { mapBackendErrors } from '@/src/lib/form-errors';
```

- [ ] **Step 2: Initialize the hook inside `useClassesPage`**

After the existing form state declarations (around line 65), add:

```typescript
const formErrors = useFormErrors();
```

- [ ] **Step 3: Add `formErrors.clearAll()` to modal open functions**

In `openAddModal()` (line ~122), add `formErrors.clearAll();` as the first line.
In `openEditModal()` (line ~139), add `formErrors.clearAll();` as the first line.

- [ ] **Step 4: Replace existing validation in `handleFormSubmit`**

Replace lines 164-194 (the existing validation checks and conflict detection) with:

```typescript
  const handleFormSubmit = () => {
    const isValid = formErrors.validate([
      [!formName.trim(), 'name', t('classes.validation.nameRequired')],
      [!formSubjectId, 'subject_id', t('classes.validation.subjectRequired')],
      [!formTutorId, 'tutor_id', t('classes.validation.tutorRequired')],
      [formSchedules.length === 0, 'schedules', t('classes.validation.scheduleDayRequired')],
      [!formCapacity || Number(formCapacity) <= 0 || isNaN(Number(formCapacity)), 'capacity', t('classes.validation.capacityRequired')],
      [isNaN(Number(formFee)) || Number(formFee) < 0, 'fee', t('classes.validation.feeRequired')],
      [formTutorFeeMode === 'FIXED_PER_SESSION' && (formTutorFee === '' || isNaN(Number(formTutorFee))), 'tutor_fee', t('classes.validation.tutorFeeRequired')],
      [formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' && (!formTutorFeePerStudent || Number(formTutorFeePerStudent) <= 0 || isNaN(Number(formTutorFeePerStudent))), 'tutor_fee_per_student', t('classes.validation.perStudentFeeRequired')],
    ]);

    if (!isValid) return;

    // Tutor schedule conflict check (toast-based, cross-entity)
    const otherClasses = tutorClasses.filter(c => c.id !== editingClass?.id);
    for (const schedule of formSchedules) {
      for (const cls of otherClasses) {
        for (const s of cls.schedules) {
          if (
            s.day === schedule.day &&
            schedule.start_time < s.end_time &&
            s.start_time < schedule.end_time
          ) {
            toast.error(t('classes.toast.scheduleConflict', {
              day: schedule.day.slice(0, 3),
              time: `${schedule.start_time}-${schedule.end_time}`,
              className: cls.name,
              conflictTime: `${s.start_time}-${s.end_time}`,
            }));
            return;
          }
        }
      }
    }

    const payload: CreateClassDto = {
      name: formName,
      subject_id: formSubjectId,
      tutor_id: formTutorId,
      capacity: Number(formCapacity),
      fee: Number(formFee),
      schedules: formSchedules.map(s => ({ day: s.day, start_time: s.start_time, end_time: s.end_time })),
      room: formRoom || undefined,
      package_fee: formPackageFee ? Number(formPackageFee) : null,
      tutor_fee: Number(formTutorFee),
      tutor_fee_mode: formTutorFeeMode,
      tutor_fee_per_student: formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' ? Number(formTutorFeePerStudent) : null,
      status: formStatus,
    };

    if (editingClass) {
      updateClass.mutate(
        { id: editingClass.id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('classes.toast.updated'));
            setShowModal(false);
            setEditingClass(null);
          },
          onError: (err) => {
            const fieldErrors = mapBackendErrors(err);
            if (fieldErrors) {
              formErrors.setErrors(fieldErrors);
            } else {
              toast.error(t('classes.toast.updateError'));
            }
          },
        }
      );
    } else {
      createClass.mutate(payload, {
        onSuccess: () => {
          toast.success(t('classes.toast.created'));
          setShowModal(false);
        },
        onError: (err) => {
          const fieldErrors = mapBackendErrors(err);
          if (fieldErrors) {
            formErrors.setErrors(fieldErrors);
          } else {
            toast.error(t('classes.toast.createError'));
          }
        },
      });
    }
  };
```

Note: This replaces the entire `handleFormSubmit` function (lines 164-232 in the original file). The `onError` handlers are already included here, so Step 5 below is already done — skip it.

- [ ] **Step 5: Update mutation `onError` handlers**

Replace the `createClass.mutate` onError (line ~229):

```typescript
onError: (err) => {
  const fieldErrors = mapBackendErrors(err);
  if (fieldErrors) {
    formErrors.setErrors(fieldErrors);
  } else {
    toast.error(t('classes.toast.createError'));
  }
},
```

Replace the `updateClass.mutate` onError (line ~220):

```typescript
onError: (err) => {
  const fieldErrors = mapBackendErrors(err);
  if (fieldErrors) {
    formErrors.setErrors(fieldErrors);
  } else {
    toast.error(t('classes.toast.updateError'));
  }
},
```

- [ ] **Step 6: Export `formErrors` from the return object**

Add `formErrors` to the return object (around line 287):

```typescript
return {
  // ... existing keys ...
  formErrors,
};
```

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Classes/useClassesPage.ts
git commit -m "feat(platform): integrate useFormErrors into class form submission"
```

---

### Task 6: Wire `formErrors` props through `index.tsx`

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes/index.tsx:125-164`

- [ ] **Step 1: Add errors and clearError props to ClassFormModal**

In `index.tsx`, add two new props to the `<ClassFormModal>` component (after `handleFormSubmit` on line 163):

```tsx
        errors={state.formErrors.errors}
        clearError={state.formErrors.clearError}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/pages/Classes/index.tsx
git commit -m "feat(platform): wire formErrors props to ClassFormModal"
```

---

### Task 7: Render inline errors in `ClassFormModal`

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx`

- [ ] **Step 1: Add new props to the interface**

Add to `ClassFormModalProps` (around line 56):

```typescript
  errors: Record<string, string>;
  clearError: (field: string) => void;
```

- [ ] **Step 2: Destructure new props**

Add `errors` and `clearError` to the destructured props in the component function (around line 98).

- [ ] **Step 3: Create an inline error helper component**

Add inside the component, before the `return`:

```typescript
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-red-500 text-sm mt-1">{errors[field]}</p> : null;
```

- [ ] **Step 4: Add `FieldError` below each validated field and clear on change**

For each field, add `<FieldError field="..." />` after the input and wrap the existing `onChange` to also call `clearError`:

**Class name** (after the Input around line 124):
```tsx
<Input
  id="class-name"
  placeholder={t('classes.form.classNamePlaceholder')}
  value={formName}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormName(e.target.value); clearError('name'); }}
/>
<FieldError field="name" />
```

**Subject** (after the Select around line 133):
```tsx
<Select
  className="w-full"
  value={formSubjectId}
  onChange={(val) => { setFormSubjectId(val); setFormTutorId(''); clearError('subject_id'); }}
  options={...}
  placeholder={...}
/>
<FieldError field="subject_id" />
```

**Tutor** (after the Select around line 148):
```tsx
<Select
  className="w-full"
  value={formTutorId}
  onChange={(val) => { setFormTutorId(val); clearError('tutor_id'); }}
  ...
/>
<FieldError field="tutor_id" />
```

**Schedule days** (after the schedule day buttons section, around line 215):
```tsx
<FieldError field="schedules" />
```

**Capacity** (after the Input around line 225):
```tsx
<Input
  id="capacity"
  type="number"
  placeholder="25"
  value={formCapacity}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormCapacity(e.target.value); clearError('capacity'); }}
/>
<FieldError field="capacity" />
```

**Fee** (after the fee Input around line 241):
```tsx
<Input
  id="fee"
  type="number"
  placeholder="500000"
  value={formFee}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormFee(e.target.value); clearError('fee'); }}
/>
<FieldError field="fee" />
```

**Tutor fee** (inside the `FIXED_PER_SESSION` conditional, after the Input around line 278):
```tsx
<Input
  type="number"
  placeholder="200000"
  required
  value={formTutorFee}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormTutorFee(e.target.value); clearError('tutor_fee'); }}
/>
<FieldError field="tutor_fee" />
```

**Tutor fee per student** (inside the `PER_STUDENT_ATTENDANCE` conditional, after the Input around line 290):
```tsx
<Input
  type="number"
  placeholder="30000"
  required
  value={formTutorFeePerStudent}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormTutorFeePerStudent(e.target.value); clearError('tutor_fee_per_student'); }}
/>
<FieldError field="tutor_fee_per_student" />
```

- [ ] **Step 5: Verify build passes**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Classes/ClassFormModal.tsx
git commit -m "feat(platform): render inline validation errors in ClassFormModal"
```

---

### Task 8: Manual smoke test

- [ ] **Step 1: Run dev server**

Run: `cd sinaloka-platform && npm run dev`

- [ ] **Step 2: Test validation**

1. Open Classes page → click "Tambah Kelas"
2. Leave all fields empty → click "Tambah Kelas" button
3. Verify: inline red error messages appear below each required field
4. Fill in name → verify the name error disappears immediately
5. Select "Per Murid Hadir" mode → leave per-student fee empty → submit
6. Verify: inline error appears under the per-student fee field
7. Fill in all fields correctly → submit
8. Verify: class is created successfully

- [ ] **Step 3: Test backend error fallback**

1. If possible, trigger a backend validation error that the frontend doesn't catch (e.g., duplicate schedule days)
2. Verify: field-level errors from the backend appear inline, not as a generic toast
