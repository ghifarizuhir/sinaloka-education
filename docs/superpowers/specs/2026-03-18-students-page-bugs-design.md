# Students Page Bug Fixes — Design Spec

**Date:** 2026-03-18
**Scope:** sinaloka-platform Students page + sinaloka-backend student DTO
**Branch:** feat/parent-module

---

## Problem Statement

Three bugs found on the Students page (`/students`) in sinaloka-platform:

1. **Bug 1 (High) — Kelas dropdown mismatch in Add/Edit modals:** Dropdown is hardcoded with "Kelas 10", "Kelas 11", "Kelas 12" but actual student data uses "Grade 7", "Grade 8", "Grade 9". Editing a student overwrites their grade with an incorrect value.

2. **Bug 2 (Medium) — No validation error messages on Add Student form:** Clicking "Buat Siswa" with empty required fields silently blocks submission with no visible error feedback.

3. **Bug 3 (Low) — Kelas filter dropdown also hardcoded:** Same hardcoded values as Bug 1. Filtering by class never finds students because values don't match.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grade option source | Hardcoded Indonesian grade constant (Kelas 1-12) | Institution uses standard Indonesian school levels. No need for dynamic API. |
| Dropdown grouping | Grouped by SD / SMP / SMA | Matches Indonesian school system; easier to scan |
| New grade entry | "Lainnya..." option with free-text input | Handles edge cases (e.g., TK, gap year) |
| Validation approach | Frontend inline errors + backend DTO enforcement | Double validation for data integrity |
| Parent fields | Made required (both frontend + backend) | Business requirement — parent info is mandatory |
| Existing data | One-time migration: "Grade X" → "Kelas X" | Align existing data with new format |

---

## Solution

### 1. Grade Options Constant

Create a shared constant in `sinaloka-platform/src/lib/constants.ts`:

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

### 2. Dropdown UI (2 Code Locations)

There are 2 dropdown instances in `Students.tsx` to change:
- **Filter dropdown** (line ~357-366) — for filtering the student list
- **Form dropdown** (line ~808-816) — shared by both Add and Edit modals

Replace hardcoded `<select>` options with grouped `<optgroup>` structure:

```
┌──────────────────────┐
│ ── SD ──             │  (optgroup label, non-selectable)
│   Kelas 1            │
│   Kelas 2            │
│   ...                │
│   Kelas 6            │
│ ── SMP ──            │
│   Kelas 7            │
│   Kelas 8            │
│   Kelas 9            │
│ ── SMA ──            │
│   Kelas 10           │
│   Kelas 11           │
│   Kelas 12           │
│ ─────────────────    │
│   Lainnya...         │
└──────────────────────┘
```

**Filter dropdown** additionally has "Semua Kelas" as the default first option.

**Filter dropdown** does NOT include "Lainnya..." — only predefined grades + "Semua Kelas". Students with custom grades are visible in the unfiltered list.

**"Lainnya..." behavior (Add/Edit form only):**
- When selected, a text input appears below the dropdown
- User types a custom grade value
- The custom value is used as the `grade` field
- If "Lainnya..." is selected but the text input is empty, show validation error: "Kelas wajib diisi"

**Edit form:** Pre-selects the student's current grade. If the grade doesn't match any predefined option, auto-selects "Lainnya..." and shows the grade in the text input.

**Default grade on Add form:** Set to empty/placeholder ("Pilih kelas...") instead of the current hardcoded `'10th Grade'` (line 229 `openAddModal`).

### 3. Form Validation (Frontend)

Add inline validation on submit for the Add/Edit Student form:

| Field | Required | Validation Rule | Error Message (Indonesian) |
|-------|----------|----------------|---------------------------|
| Nama Lengkap | Yes | min 1 char | "Nama lengkap wajib diisi" |
| Alamat Email | No | valid email if filled | "Format email tidak valid" |
| Nomor Telepon | No | max 20 chars | — |
| Kelas | Yes | must select (or fill custom) | "Kelas wajib dipilih" |
| Status | Yes | default Aktif | — |
| Nama Orang Tua/Wali | Yes | min 1 char | "Nama orang tua wajib diisi" |
| Telepon Orang Tua/Wali | Yes | min 1 char, max 20 | "Telepon orang tua wajib diisi" |
| Email Orang Tua/Wali | No | valid email if filled | "Format email tidak valid" |

**UX behavior:**
- Red error text (`text-red-500 text-sm`) appears below each invalid field on submit
- Errors clear when the user starts typing/selecting in that field
- Submit is blocked until all required fields pass

### 4. Backend DTO Changes

Update `sinaloka-backend/src/modules/student/student.dto.ts`:

**CreateStudentSchema** (only file to edit — `UpdateStudentSchema` is derived via `.partial()`):
- `parent_name`: change from `z.string().max(255).optional().nullable()` to `z.string().min(1, 'Parent name is required').max(255)`
- `parent_phone`: change from `z.string().max(20).optional().nullable()` to `z.string().min(1, 'Parent phone is required').max(20)`

**Note:** `UpdateStudentSchema = CreateStudentSchema.partial()` — so these fields become optional on update (partial patch), but when provided must be non-empty. No separate changes needed for the update schema.

**Prisma schema:** The `parent_name` and `parent_phone` columns remain `String?` (nullable) in the database for backward compatibility with existing records. The DTO enforces non-null on new creates.

### 5. Data Migration

One-time script to update existing student grade values:

```sql
UPDATE students SET grade = REPLACE(grade, 'Grade ', 'Kelas ') WHERE grade LIKE 'Grade %';
```

Run via a tsx script with PrismaPg adapter (same pattern as the enrollment payment status fix).

---

## Files Changed

| File | Change |
|------|--------|
| `sinaloka-platform/src/lib/constants.ts` | **New** — `GRADE_GROUPS` and `ALL_GRADES` constants |
| `sinaloka-platform/src/pages/Students.tsx` | Replace 2 hardcoded dropdowns with grouped grade options; add "Lainnya..." logic; add inline validation errors; update CSV template examples to use "Kelas X"; fix default grade in `openAddModal()` |
| `sinaloka-backend/src/modules/student/student.dto.ts` | Make `parent_name` and `parent_phone` required in Create/Update schemas |
| One-time migration script | Update "Grade X" → "Kelas X" in existing student data |

---

## Additional Changes

- **CSV import template:** Update example rows in the import modal (lines ~158-160) from `10th Grade` / `11th Grade` to `Kelas 10` / `Kelas 11` format
- **i18n:** App is Indonesian-only; grade strings are used directly (no translation keys needed)

---

## Testing

- **Backend:** Update any existing Jest tests that create students without `parent_name`/`parent_phone` to include these now-required fields
- **Frontend:** Manual verification via browser — confirm all 3 bugs are resolved
- **Build check:** `npm run build` on both backend and platform must pass

---

## Known Limitation

The grade filter is client-side only (filters current page, not full dataset). This is a pre-existing limitation not addressed in this spec.

---

## Out of Scope

- No new backend API endpoints (grade list is a frontend constant)
- No changes to the Class model or class-related features
- No changes to the Import CSV parser (already accepts free-form grade)
- No refactoring of the Students page beyond these 3 bugs
- No Prisma schema migration for parent_name/parent_phone nullability
