# Student Attendance History — Design Spec

## Overview

Add per-student attendance history accessible from a new Student Detail page. Remove the non-functional "View History" stub button from the Attendance page.

## Motivation

Admin bimbel needs to track individual student attendance patterns for:
- Parent communication (data-backed attendance reports)
- Student retention (detect at-risk students with declining attendance)
- Operational decisions (enrollment evaluation)

Currently attendance data exists but is only viewable per-session. There is no way to see a student's attendance history across sessions/classes.

## Scope

1. **Remove** "View History" stub button from `Attendance.tsx`
2. **New backend endpoint** for student attendance history
3. **New Student Detail page** (`/students/:id`) with tabs
4. **Add "Lihat Detail" button** in existing `StudentDrawer`

## Backend

### New Endpoint

```
GET /api/admin/students/:id/attendance?date_from=&date_to=
```

**Auth:** ADMIN, SUPER_ADMIN (existing `RolesGuard`)

**Query params:**
- `date_from` (required) — ISO date string
- `date_to` (required) — ISO date string

**Response:**
```json
{
  "summary": {
    "total_sessions": 12,
    "present": 9,
    "absent": 2,
    "late": 1,
    "attendance_rate": 83.3
  },
  "records": [
    {
      "id": "att-uuid",
      "session_id": "sess-uuid",
      "status": "PRESENT",
      "homework_done": true,
      "notes": null,
      "session": {
        "date": "2026-03-20",
        "start_time": "10:00",
        "end_time": "11:30",
        "status": "COMPLETED",
        "class": {
          "id": "cls-uuid",
          "name": "Matematika Kelas 9"
        }
      }
    }
  ]
}
```

**Validation:**
- New Zod DTO: `StudentAttendanceQuerySchema` with `date_from` (string, ISO date) and `date_to` (string, ISO date)
- Return 404 if student doesn't exist or doesn't belong to tenant

**Implementation:**
- Route added in `student.controller.ts` (admin routes, since path is `/api/admin/students/:id/attendance`)
- New service method in `attendance.service.ts`: `findByStudent(studentId, tenantId, dateFrom, dateTo)`
- Query: `attendance` table JOIN `session` + `class`, filter by `student_id` + `institution_id` + date range
- Records sorted by `session.date` DESC
- Summary computed server-side: `attendance_rate = (present + late) / total * 100` (consistent with existing `getSummary`)
- `total_sessions` = count of attendance records in range (one per session the student was enrolled in)

## Frontend

### Remove Stub

Delete the "View History" button from `Attendance.tsx` (the `<Button variant="outline">` with `<History>` icon in PageHeader actions).

### Student Detail Page

**Route:** `/students/:id`
**File:** `src/pages/Students/StudentDetail.tsx`

**Layout:**
```
PageHeader (← back button | Student Name | Status Badge)
├── Tabs: "Profile" | "Attendance"
│
├── Tab: Profile
│   └── Contact info + Parent info (existing drawer content, re-laid for full width)
│
└── Tab: Attendance
    ├── Month Picker (◀ Maret 2026 ▶)
    ├── Summary Cards (4-col grid):
    │   ├── Attendance Rate (%)
    │   ├── Present (count)
    │   ├── Absent (count)
    │   └── Late (count)
    └── Session Table:
        ├── Columns: Date | Class | Time | Status | Homework | Notes
        └── Sorted by date DESC
```

**Default period:** Current month. User can navigate months with prev/next buttons.

**Route registration:** Add `<Route path="/students/:id" element={<StudentDetail />} />` in `App.tsx`.

**Profile tab:** Extract contact info and parent info from `StudentDrawer.tsx` into shared components (`StudentContactInfo`, `StudentParentInfo`) reusable by both drawer and detail page.

**Empty state:** Attendance tab shows "Belum ada data kehadiran untuk bulan ini" with calendar icon when no records exist for the selected month.

### Student Drawer Update

Add "Lihat Detail" button at bottom of existing `StudentDrawer` → `navigate(/students/${id})`.

### Data Fetching

- `useStudentDetail(id)` — existing `GET /api/admin/students/:id`
- `useStudentAttendance(id, dateFrom, dateTo)` — new endpoint

### Navigation

- Drawer → "Lihat Detail" → `/students/:id`
- Student table row click → still opens drawer (no behavior change)
- PageHeader back button → `/students`

## Out of Scope

- Calendar heatmap visualization
- Attendance history in parent app (future)
- Audit trail (who edited attendance records)
- Trend charts
- Export/PDF attendance report
