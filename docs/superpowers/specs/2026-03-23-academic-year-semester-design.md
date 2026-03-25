# Academic Year & Semester System

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Besar (new module, schema change, multi-app impact)

## Problem

Sinaloka currently has no concept of academic periods. Classes are perpetual (no temporal boundary), enrollments never expire, and there's no structured way to organize classes by semester. In tutoring institutions (bimbel), each semester brings new curriculum — even if the class name and subject are the same, it's effectively a new class. Admins need a way to:

1. Define academic years and semesters with flexible dates
2. Associate classes to a semester
3. Roll-over classes from one semester to the next (copy structure, not enrollments)
4. Auto-archive old semester classes when a new semester begins

## Design Decisions

- **Approach chosen:** Academic Period as lightweight entity (2 new models + 1 FK on Class)
- **Why not global context switch:** Too invasive — would require every query to be semester-aware. Over-engineering for current needs.
- **Why not flat tags:** No structure, no enforcement, no roll-over capability.
- **Nullable FK:** `semester_id` on Class is nullable for backward compatibility. Existing classes continue to work without modification.

## Data Model

### New Models

```prisma
model AcademicYear {
  id              String             @id @default(uuid())
  institution_id  String
  name            String             // e.g. "2025/2026"
  start_date      DateTime
  end_date        DateTime
  status          AcademicYearStatus @default(ACTIVE)
  created_at      DateTime           @default(now())
  updated_at      DateTime           @updatedAt

  institution     Institution        @relation(fields: [institution_id], references: [id])
  semesters       Semester[]

  @@unique([institution_id, name])
  @@index([institution_id])
  @@map("academic_years")
}

enum AcademicYearStatus {
  ACTIVE
  ARCHIVED
}

model Semester {
  id               String         @id @default(uuid())
  institution_id   String
  academic_year_id String
  name             String         // e.g. "Ganjil", "Genap"
  start_date       DateTime
  end_date         DateTime
  status           SemesterStatus @default(ACTIVE)
  created_at       DateTime       @default(now())
  updated_at       DateTime       @updatedAt

  institution      Institution    @relation(fields: [institution_id], references: [id])
  academic_year    AcademicYear   @relation(fields: [academic_year_id], references: [id])
  classes          Class[]

  @@unique([academic_year_id, name])
  @@index([institution_id])
  @@index([academic_year_id])
  @@map("semesters")
}

enum SemesterStatus {
  ACTIVE
  ARCHIVED
}
```

### Changes to Existing Models

```prisma
model Class {
  // ... existing fields unchanged
  semester_id  String?    // nullable for backward compat
  semester     Semester?  @relation(fields: [semester_id], references: [id])
}
```

## Backend API

### New Module: `academic-year`

Single module handling both AcademicYear and Semester (nested resource pattern).

#### Academic Year Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/academic-years` | Create academic year |
| GET | `/api/admin/academic-years` | List (filter by status) |
| GET | `/api/admin/academic-years/:id` | Detail with semesters |
| PATCH | `/api/admin/academic-years/:id` | Update |
| DELETE | `/api/admin/academic-years/:id` | Delete (blocked if has semesters) |

#### Semester Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/academic-years/:id/semesters` | Create semester |
| PATCH | `/api/admin/semesters/:id` | Update semester |
| DELETE | `/api/admin/semesters/:id` | Delete (blocked if has classes) |
| PATCH | `/api/admin/semesters/:id/archive` | Archive semester + auto-archive classes |

#### Roll-over Endpoint

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/semesters/:id/roll-over` | Copy classes from source semester to this (target) semester |
| GET | `/api/admin/semesters/:id` | Semester detail with class list |

**Roll-over request body:**
```json
{
  "source_semester_id": "string",
  "class_ids": ["string"]  // optional — omit to copy all
}
```

Note: `:id` in the roll-over URL is the **target** semester. `source_semester_id` in the body identifies where to copy from.

**What gets copied:** Class fields (name, subject_id, tutor_id, fee, capacity, room, tutor_fee, tutor_fee_mode, tutor_fee_per_student, package_fee) AND associated ClassSchedule records (day, start_time, end_time)
**What does NOT get copied:** enrollment, session, attendance, payments

### Changes to Existing Modules

**Class module:**
- `CreateClassDto`: add optional `semester_id`
- `ClassQuerySchema`: add optional `semester_id` filter
- List endpoint: no default semester filtering — frontend handles this

### Archive Flow

When `PATCH /api/admin/semesters/:id/archive` is called:
1. Set semester status → `ARCHIVED`
2. Set all classes in that semester → `ARCHIVED`
3. Enrollments remain unchanged (cold data — frontend should filter out enrollments in archived classes from active counts/views)
4. Check if all semesters in the academic year are ARCHIVED → if yes, auto-archive the academic year

### Role Access

| Role | Access |
|------|--------|
| ADMIN | Full CRUD on academic years & semesters |
| SUPER_ADMIN | Full CRUD (scoped by institution or cross-institution) |
| TUTOR | Read-only (see active semester, their classes) |
| PARENT | No direct access |

## Frontend (Platform)

### New Pages

**Academic Year Page** (sidebar menu, near Settings):
- List academic years with status badge (ACTIVE/ARCHIVED)
- Click → detail page with semester list
- Create/edit form: name, start date, end date
- Create/edit semester form: name, start date, end date
- "Archive Semester" button with confirmation dialog

**Roll-over Flow:**
- Button on semester page: "Roll-over dari semester sebelumnya"
- Modal: select source semester → preview classes to copy → confirm
- After roll-over: redirect to class list for the new semester

### Changes to Existing Pages

**Classes Page:**
- Add semester dropdown filter above class list (default: active semester)
- Create class form: add semester dropdown (default: active semester)
- Classes without semester (legacy data) visible under "Tanpa Semester" filter option

**No changes to:**
- Session, Attendance, Enrollment pages (already scoped to Class)
- Dashboard (continues using date ranges)
- Tutor app (no changes for this phase)
- Parent app (no changes for this phase)

### Informational Display

Active semester shown as small info badge in sidebar or header — informational only, not a context switch.

## Migration & Backward Compatibility

### Strategy: Zero Breaking Change

- `semester_id` on Class is nullable → existing classes remain valid
- All existing queries unchanged — semester is an additive filter
- No data transformation required for existing data

### Adoption Path

Organic adoption — admins start using it when ready:
1. Create first academic year
2. Create semester(s)
3. New classes created with semester
4. Legacy classes can optionally be assigned to a semester

### Edge Cases

| Case | Handling |
|------|----------|
| Delete academic year with semesters | Blocked — must delete/archive semesters first |
| Delete semester with classes | Blocked — must archive first |
| Semester date overlap in same institution | Allowed — intensive programs may overlap |
| Semester dates outside academic year range | Allowed — institutions have flexibility to set dates as needed |
| Class without semester | Functions normally, appears under "Tanpa Semester" filter |
| Roll-over class with inactive tutor | Copy proceeds, tutor stays assigned — admin adjusts manually |

## Out of Scope

- Curriculum/materi tracking per semester
- Auto-generate sessions based on semester dates
- Cross-semester reporting/comparison
- Tutor app semester awareness
- Parent app semester awareness
- Forced onboarding / migration wizard
