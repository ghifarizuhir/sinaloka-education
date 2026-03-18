# Required Bank Info + Subject-Class Mapping — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** sinaloka-backend, sinaloka-platform, sinaloka-tutors

## Problem

1. **Bank info is optional everywhere** — tutors can exist without bank details, making payouts impossible. Bank info should be required when editing tutor profiles (admin), accepting invitations (tutor self-registration), and updating profiles (tutor app). It remains optional at invite time since the admin may not have these details yet.

2. **No subject-class integrity** — tutor subjects are stored as a freeform `String[]`, class subjects are freeform strings, and there's no validation that a class's subject matches the assigned tutor's specialization. A dedicated subjects table with proper relations is needed.

## Part 1: Required Bank Info

### Scope

Make `bank_name`, `bank_account_number`, `bank_account_holder` required in 3 flows:

| Flow | App | DTO | Current | Target |
|------|-----|-----|---------|--------|
| Admin edit tutor | sinaloka-platform | `UpdateTutorSchema` | optional | required |
| Tutor accept invitation | sinaloka-tutors | `AcceptInviteSchema` | optional | required |
| Tutor update profile | sinaloka-tutors | `UpdateTutorProfileSchema` | optional | required |

**NOT** required at invite time (`InviteTutorSchema` stays as-is).

### Database

No schema change. Columns remain `String?` in Prisma since they are nullable at invite time. Enforcement happens at the DTO validation layer.

### Backend Changes

**File: `sinaloka-backend/src/modules/tutor/tutor.dto.ts`**

`UpdateTutorSchema`:
- `bank_name`: `z.string().max(255)` → required (remove `.optional()`)
- `bank_account_number`: `z.string().max(50)` → required (remove `.optional()`)
- `bank_account_holder`: `z.string().max(255)` → required (remove `.optional()`)

`UpdateTutorProfileSchema`:
- `bank_name`: `z.string().max(255)` → required (remove `.optional()`)
- `bank_account_number`: `z.string().max(50)` → required (remove `.optional()`)
- `bank_account_holder`: `z.string().max(255)` → required (remove `.optional()`)

**File: `sinaloka-backend/src/modules/invitation/invitation.dto.ts`**

`AcceptInviteSchema`:
- `bank_name`: `z.string().max(255)` → required (remove `.optional()`)
- `bank_account_number`: `z.string().max(50)` → required (remove `.optional()`)
- `bank_account_holder`: `z.string().max(255)` → required (remove `.optional()`)

### Frontend Changes

**File: `sinaloka-platform/src/pages/Tutors.tsx` (TutorForm, edit mode)**
- Add `required` attribute to bank_name, bank_account_number, bank_account_holder inputs
- Add visual required indicator (asterisk or similar per existing patterns)

**File: `sinaloka-tutors/src/pages/AcceptInvitePage.tsx`**
- Change section label from "Info Bank (Opsional)" to "Info Bank"
- Add `required` attribute to all 3 bank inputs
- Add frontend validation: all 3 bank fields must be non-empty before submit

**File: `sinaloka-tutors/src/pages/ProfileEditPage.tsx`**
- Add `required` attribute to all 3 bank inputs
- Add frontend validation: all 3 bank fields must be non-empty before submit

### Acceptance Criteria

- Admin cannot save tutor edit without filling all 3 bank fields
- Tutor cannot accept invitation without filling all 3 bank fields
- Tutor cannot save profile without filling all 3 bank fields
- Admin can still invite a tutor without bank info (invite flow unchanged)
- Backend returns validation error if bank fields are missing in update/accept

---

## Part 2: Subject Table + Tutor-Subject Mapping + Class-Subject FK

### New Database Models

**`subject` table:**

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid |
| name | String | required |
| institution_id | UUID | FK to institution |
| created_at | DateTime | default now() |
| updated_at | DateTime | @updatedAt |

Unique constraint: `(name, institution_id)` — no duplicate subjects per institution.

**`tutor_subject` join table:**

| Column | Type | Constraints |
|--------|------|-------------|
| tutor_id | UUID | FK to tutor, composite PK |
| subject_id | UUID | FK to subject, composite PK |

### Schema Changes to Existing Models

**Tutor model:**
- Remove: `subjects String[]`
- Add: `tutor_subjects TutorSubject[]` relation

**Class model:**
- Remove: `subject String`
- Add: `subject_id UUID` (FK to subject)
- Add: `subject Subject` relation

### Data Migration

1. Collect all unique subject strings from existing `tutor.subjects[]` arrays and `class.subject` strings, grouped by `institution_id`
2. Insert unique subjects into `subject` table
3. Create `tutor_subject` records by matching old tutor `subjects[]` strings to new subject IDs
4. Set `class.subject_id` by matching old `class.subject` string to new subject IDs
5. Drop old `tutor.subjects` column and `class.subject` column

### New Backend Module: Subject

**File structure:** `sinaloka-backend/src/modules/subject/`
- `subject.module.ts`
- `subject.controller.ts`
- `subject.service.ts`
- `subject.dto.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/subjects` | Authenticated | List all subjects for current institution |
| POST | `/api/admin/subjects` | ADMIN | Create a new subject |
| PATCH | `/api/admin/subjects/:id` | ADMIN | Update a subject |
| DELETE | `/api/admin/subjects/:id` | ADMIN | Delete a subject (only if no classes/tutors reference it) |
| GET | `/api/subjects/:id/tutors` | Authenticated | List verified tutors who teach this subject |

**DTOs:**
- `CreateSubjectSchema`: `{ name: z.string().min(1).max(100) }`
- `UpdateSubjectSchema`: `{ name: z.string().min(1).max(100).optional() }`

### Backend Changes to Existing Modules

**Tutor module:**
- `tutor.dto.ts`: `CreateTutorSchema.subjects` changes from `z.array(z.string())` to `z.array(z.string().uuid())` (subject IDs)
- `tutor.dto.ts`: `UpdateTutorSchema.subjects` same change
- `tutor.dto.ts`: `InviteTutorSchema.subjects` same change
- `tutor.service.ts`: create/update tutor uses `tutor_subject` join table instead of `subjects` array
- `tutor.service.ts`: `findAll` subject filter uses join table query instead of array `has`

**Class module:**
- `class.dto.ts`: `CreateClassSchema.subject` changes from `z.string()` to `z.string().uuid()` renamed to `subject_id`
- `class.dto.ts`: `UpdateClassSchema` same change
- `class.service.ts`: validate that `subject_id` exists in the institution
- `class.service.ts`: validate that the selected tutor teaches the given subject (check `tutor_subject` join table)
- `class.service.ts`: include subject relation in responses

### Frontend Changes (sinaloka-platform)

**Class form (`src/pages/Classes.tsx`):**
- Subject dropdown: fetch from `GET /api/subjects` instead of hardcoded list
- Tutor dropdown: when subject is selected, fetch from `GET /api/subjects/:id/tutors` (verified tutors only)
- Tutor dropdown: disabled until subject is selected
- Clear tutor selection when subject changes

**Tutor form (`src/pages/Tutors.tsx`):**
- Subjects field: change from free-text comma-separated input to multi-select from `GET /api/subjects`
- Display selected subjects as tags/chips

**New hooks:**
- `useSubjects()` — fetch subjects list
- `useSubjectTutors(subjectId)` — fetch tutors for a subject

**Types:**
- Add `Subject` type: `{ id: string, name: string, institution_id: string }`
- Update `Tutor` type: remove `subjects: string[]`, add `tutor_subjects: { subject: Subject }[]`
- Update `Class` type: remove `subject: string`, add `subject_id: string, subject: Subject`

### Frontend Changes (sinaloka-tutors)

- Update any displays of tutor subjects to read from the new `tutor_subjects` relation instead of the old `subjects[]` array
- AcceptInvitePage: no subject selection needed (set during invite by admin)

### Acceptance Criteria

- Subjects are managed as a dedicated entity per institution
- Unique constraint prevents duplicate subject names within an institution
- Tutor-subject is a proper many-to-many relation
- Class-subject is a proper FK relation
- Class form: subject-first flow — select subject, then pick from tutors who teach it
- Class creation validates tutor teaches the selected subject
- Tutor form: multi-select subjects from the subjects table
- Data migration preserves all existing tutor-subject and class-subject associations
- Deleting a subject is blocked if any class or tutor references it

## What's NOT Changing

- Invite flow: bank info stays optional at invite time
- Tutor invitation email flow
- Class scheduling, fees, enrollment logic
- Parent module
- Authentication/authorization model

## Testing

- Backend: unit tests for new subject CRUD, updated tutor/class validation
- Backend: test subject-tutor validation on class creation
- Backend: test bank info required validation on update/accept endpoints
- Frontend: verify class form subject→tutor flow
- Frontend: verify tutor form multi-select subjects
- Frontend: verify bank info required on all 3 edit forms
- Migration: verify existing data is preserved correctly
