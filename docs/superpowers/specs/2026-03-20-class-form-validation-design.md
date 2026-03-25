# Class Form Validation + Reusable Form Error Pattern

**Date:** 2026-03-20
**Scope:** Approach B — fix Class form + establish shared pattern for other forms

## Problem

The "Tambah Kelas" (Create Class) form in sinaloka-platform fails silently when the backend rejects the payload. The user sees a generic "Gagal membuat kelas" toast with no indication of which field is wrong. The specific trigger: selecting `PER_STUDENT_ATTENDANCE` tutor fee mode but leaving the per-student fee field empty sends `tutor_fee_per_student: 0`, which the backend Zod schema rejects (`> 0` required).

More broadly, the platform has no consistent pattern for form validation. Some forms (Students) use inline `formErrors` state, most use only generic toast errors, and none read the backend's field-level Zod error responses.

## Design

### 0. Backend: Forward Zod field errors in HTTP response

**File:** `sinaloka-backend/src/common/filters/http-exception.filter.ts`

**Problem:** The `ZodValidationPipe` throws `BadRequestException({ message: 'Validation failed', errors: [...] })`, but the `HttpExceptionFilter` only forwards `statusCode`, `error`, `message`, and `requestId` — the `errors` array is stripped from the response. The frontend cannot read field-level errors.

**Fix:** When the exception response object contains an `errors` key, include it in the JSON response:

```typescript
const body: Record<string, unknown> = { statusCode, error, message, requestId };
if (typeof exceptionResponse === 'object') {
  const resp = exceptionResponse as Record<string, unknown>;
  if (Array.isArray(resp['errors'])) {
    body.errors = resp['errors'];
  }
}
response.status(statusCode).json(body);
```

This is backward-compatible — existing responses without `errors` are unchanged.

### 1. `useFormErrors` hook

**File:** `sinaloka-platform/src/hooks/useFormErrors.ts`

Manages a `Record<string, string>` of field-to-error-message mappings.

```typescript
type ValidationRule = [condition: boolean, field: string, message: string];

interface UseFormErrors {
  errors: Record<string, string>;
  setError: (field: string, message: string) => void;
  setErrors: (errMap: Record<string, string>) => void;
  clearError: (field: string) => void;
  clearAll: () => void;
  hasErrors: boolean;               // derived boolean, not a function
  validate: (rules: ValidationRule[]) => boolean;
}
```

**`validate(rules)`:** Clears all existing errors first, then iterates all rules without short-circuiting — every failing condition sets its error so all field errors display simultaneously. Returns `true` if all rules pass, `false` otherwise. The clear-before-run behavior is intentional: `validate()` is designed to be called once per submit with all rules, not accumulated across multiple calls.

### 2. `mapBackendErrors` utility

**File:** `sinaloka-platform/src/lib/form-errors.ts`

```typescript
function mapBackendErrors(err: unknown): Record<string, string> | null
```

Reads `err.response.data.errors` (array of `{ field, message }`). Returns a `Record<string, string>` if the array is present and non-empty, or `null` for any other case (network errors, non-validation errors, missing `errors` field). The `null` return signals the caller to fall back to a generic toast.

### 3. Class form validation rules

**File:** `sinaloka-platform/src/pages/Classes/useClassesPage.ts` — `handleFormSubmit()`

Replace existing toast-based checks with `validate()`:

| Field | Condition | i18n key |
|-------|-----------|----------|
| `name` | empty after trim | `classes.validation.nameRequired` |
| `subject_id` | empty | `classes.validation.subjectRequired` |
| `tutor_id` | empty | `classes.validation.tutorRequired` |
| `schedules` | length === 0 | `classes.validation.scheduleDayRequired` |
| `capacity` | <= 0 or NaN | `classes.validation.capacityRequired` |
| `fee` | NaN or negative | `classes.validation.feeRequired` |
| `tutor_fee` | NaN when mode is `FIXED_PER_SESSION` (0 is valid per backend `min(0)`) | `classes.validation.tutorFeeRequired` |
| `tutor_fee_per_student` | empty/0/NaN when mode is `PER_STUDENT_ATTENDANCE` | `classes.validation.perStudentFeeRequired` |

Note: `tutor_fee` backend schema is `z.number().min(0)` — unconditionally required but 0 is valid. When mode is `MONTHLY_SALARY` or `PER_STUDENT_ATTENDANCE`, the UI hides the tutor_fee input. The payload builder already sends `Number(formTutorFee)` which produces `0` from the empty default — this is valid. Frontend validation only enforces tutor_fee is filled when its input is visible (`FIXED_PER_SESSION` mode).

The tutor schedule conflict check remains as-is (toast-based, since it's a cross-entity check not a field error).

Mutation `onError` handlers updated to use `mapBackendErrors`:
```typescript
onError: (err) => {
  const fieldErrors = mapBackendErrors(err);
  if (fieldErrors) {
    formErrors.setErrors(fieldErrors);
  } else {
    toast.error(t('classes.toast.createError'));
  }
}
```

### 4. ClassFormModal inline errors

**File:** `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx`

- Accept `errors: Record<string, string>` and `clearError: (field: string) => void` as new props
- Render `<p className="text-red-500 text-sm mt-1">` below each validated field when its error key is present
- Each field's `onChange` calls `clearError(fieldName)` so errors clear as the user types/selects

### 5. Wire props through index.tsx

**File:** `sinaloka-platform/src/pages/Classes/index.tsx`

Thread `formErrors.errors` and `formErrors.clearError` from the page hook through to `ClassFormModal` as props, alongside the existing prop drilling pattern.

### 6. Clear errors on modal open/close

**File:** `sinaloka-platform/src/pages/Classes/useClassesPage.ts`

Call `formErrors.clearAll()` in both `openAddModal()` and `openEditModal()` to prevent stale errors from a previous failed submission persisting when the modal is re-opened.

### 7. i18n keys

**Files:** `sinaloka-platform/src/locales/id.json`, `sinaloka-platform/src/locales/en.json`

Add `classes.validation.*` keys for all validation messages in both languages.

## Files touched

| File | Action |
|------|--------|
| `sinaloka-backend/src/common/filters/http-exception.filter.ts` | **Edit** — forward `errors` array in response |
| `sinaloka-platform/src/hooks/useFormErrors.ts` | **Create** — reusable hook |
| `sinaloka-platform/src/lib/form-errors.ts` | **Create** — backend error mapper |
| `sinaloka-platform/src/pages/Classes/useClassesPage.ts` | **Edit** — integrate useFormErrors, add validation, update onError, clearAll on modal open |
| `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx` | **Edit** — accept errors/clearError props, render inline errors |
| `sinaloka-platform/src/pages/Classes/index.tsx` | **Edit** — thread errors/clearError props to ClassFormModal |
| `sinaloka-platform/src/locales/id.json` | **Edit** — add validation keys |
| `sinaloka-platform/src/locales/en.json` | **Edit** — add validation keys |

## Out of scope

- Migrating other forms (Students, Tutors, etc.) to the new pattern — they can adopt it incrementally
- Sharing Zod schemas between frontend and backend
