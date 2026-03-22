# Sprint 5: Medium Items — Design Spec

> **Date:** 2026-03-22
> **Items:** Dashboard Charts, Bulk Operations Tutors, Profile Photos

---

## Item 1: Dashboard Charts

### Overview

Tambah 3 chart ke Dashboard page. Saat ini Dashboard hanya punya 4 KPI cards + activity feed tanpa visualisasi trend.

### Layout

**1 Large + 2 Small:** Revenue vs Expenses (grouped bar chart) besar di kiri (2/3 width), Attendance Rate Trend + Student Growth stack vertikal di kanan (1/3 width).

### Charts

#### Revenue vs Expenses (BarChart — grouped)
- **Type:** Recharts `BarChart` with 2 `Bar` series (revenue + expenses)
- **Data:** Reuse existing endpoints — `/api/admin/reports/financial-summary` (revenue_by_month) + `/api/admin/reports/expense-breakdown` (monthly_trend)
- **Period:** 6 months
- **Colors:** `--chart-1` (revenue), `--chart-4` (expenses)
- **Legend:** Show series labels

#### Attendance Rate Trend (LineChart)
- **Type:** Recharts `LineChart`
- **Data:** New endpoint `GET /api/admin/dashboard/attendance-trend`
- **Response:** `{ data: [{ month: string, rate: number }] }` — percentage per month, 6 months
- **Backend logic:** Group attendance records by month, calculate `(present / total) * 100`
- **Color:** `--chart-2`

#### Student Growth (LineChart)
- **Type:** Recharts `LineChart`
- **Data:** New endpoint `GET /api/admin/dashboard/student-growth`
- **Response:** `{ data: [{ month: string, count: number }] }` — cumulative student count per month, 6 months
- **Backend logic:** Group students by `created_at` month, calculate running total
- **Color:** `--chart-3`

### Backend Changes

- `dashboard.controller.ts` — 2 new endpoints: `GET /stats/attendance-trend`, `GET /stats/student-growth`
- `dashboard.service.ts` — 2 new methods: `getAttendanceTrend(tenantId)`, `getStudentGrowth(tenantId)`
- Both scoped by `tenantId`, return 6 months of data

### Frontend Changes

- `useDashboard.ts` — 2 new hooks: `useDashboardAttendanceTrend()`, `useDashboardStudentGrowth()`
- `dashboard.service.ts` — 2 new service methods
- `Dashboard.tsx` — Add chart section below KPI cards, above activity feed. Use `ResponsiveContainer` for all charts. Reuse existing Recharts styling from FinanceOverview (CartesianGrid, Tooltip, axis formatting).

---

## Item 2: Bulk Operations Tutors

### Overview

Tambah multi-select + bulk actions ke Tutors page. Pattern mengikuti Enrollments (backend bulk endpoints), bukan Students (client-side Promise.all).

### Backend Endpoints

All under `/api/admin/tutors/`:

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| PATCH | `/bulk` | `{ ids: string[], is_verified: boolean }` | `{ updated: number }` | Bulk verify/unverify |
| DELETE | `/bulk` | `{ ids: string[] }` (max 100) | `{ deleted: number }` | Bulk delete tutors + associated user records |
| POST | `/bulk/resend-invite` | `{ ids: string[] }` | `{ sent: number }` | Bulk resend invite emails |
| POST | `/bulk/cancel-invite` | `{ ids: string[] }` | `{ cancelled: number }` | Bulk cancel pending invites |

### Backend Implementation

- `tutor.controller.ts` — 4 new endpoints with `@Roles(Role.ADMIN, Role.SUPER_ADMIN)`
- `tutor.service.ts` — 4 new methods, all scoped by `tenantId`
- DTOs: `BulkVerifyTutorDto`, `BulkDeleteTutorDto`, `BulkResendInviteDto`, `BulkCancelInviteDto` — all with `ids: string[]` array (max 100 via Zod validation)
- Bulk delete runs in transaction: check for active sessions/classes first, delete tutor_subjects → tutors → users

### Frontend — Tutors Page

**Selection:**
- Checkbox di setiap tutor card (grid view) dan table row (list view)
- Select-all checkbox di header
- State: `selectedTutorIds: string[]`

**Floating Action Bar:**
- AnimatePresence animation (slide up from bottom, same as Enrollments)
- Shows: `{count} selected`
- Buttons:
  - **Verify** / **Unverify** — toggle based on majority selection state
  - **Resend Invite** — enabled only when selection includes pending tutors (`user.is_active === false`)
  - **Cancel Invite** — enabled only when selection includes pending tutors
  - **Delete** — always available, red variant
  - **X** — clear selection
- Smart disable: buttons grayed out when action doesn't apply to selected tutors

**Confirmation:**
- Bulk delete: modal with warning + count (same pattern as `BulkDeleteModal`)
- Other actions: direct execute with toast notification on success

### Frontend Service & Hooks

- `tutors.service.ts` — `bulkVerify()`, `bulkDelete()`, `bulkResendInvite()`, `bulkCancelInvite()`
- `useTutors.ts` — `useBulkVerifyTutor()`, `useBulkDeleteTutor()`, `useBulkResendInvite()`, `useBulkCancelInvite()` mutation hooks
- All invalidate tutor list query on success

---

## Item 3: Profile Photos (Tutor)

### Overview

Upload foto profil untuk tutors. Admin bisa upload via platform, tutor bisa upload sendiri via tutors app. Student photos di-skip untuk sekarang.

### Scope

- **Who can upload:** Admin (platform) + Tutor (tutors app)
- **Crop:** Client-side using `react-easy-crop` (circular crop, zoom support)
- **Student photos:** Skip — students don't have user accounts yet
- **Migration:** Not needed — `User.avatar_url` already exists in Prisma schema

### Backend Changes

**Upload type:**
- Add `avatars` to allowed upload types in `upload.service.ts`
- Storage path: `{baseDir}/{institutionId}/avatars/{uuid}.{ext}`
- Served via existing `GET /api/uploads/:institutionId/avatars/:filename`

**Tutor profile update:**
- `PATCH /api/admin/tutors/:id` — already exists, add logic to update related `user.avatar_url` when avatar is provided
- `PATCH /api/tutors/profile` — tutor self-update, add `avatar_url` to allowed fields

### Frontend — Avatar Component Upgrade

`sinaloka-platform/src/components/ui/avatar.tsx`:
- Add optional `src` prop
- If `src` is provided and valid → render `<img>` with `object-cover`
- Fallback to initials on image load error or missing `src`
- Keep existing `name` + `size` props

### Frontend — Platform (Admin)

**Tutor edit modal:**
1. Avatar rendered with new `src` prop (shows photo or initials)
2. Click avatar → hidden file input triggers
3. File selected → crop modal opens (react-easy-crop, circular, zoom/pan)
4. User confirms crop → canvas generates cropped blob (JPEG, max 500x500)
5. Upload blob to `POST /api/uploads/avatars`
6. Save returned URL to tutor profile via existing PATCH endpoint

**All tutor displays:** Avatar component automatically shows photo when `avatar_url` is present — no changes needed per-location.

### Frontend — Tutors App

**Profile page:**
- Replace Picsum placeholder with real `avatar_url` from API
- Click avatar → same crop flow as platform
- Upload → `PATCH /api/tutors/profile` with new avatar_url

**Crop modal:**
- Shared pattern but separate implementation (different apps, no shared package)
- React-easy-crop with circular mask
- Output: JPEG blob, max 500x500px
- Preview before upload

### Crop Flow (Both Apps)

```
User clicks avatar
  → file input opens (accept: image/jpeg, image/png)
  → file selected
  → crop modal appears (react-easy-crop)
    - circular mask
    - zoom slider
    - pan/drag
  → user clicks "Save" / "Simpan"
  → canvas crops image to 500x500 JPEG blob
  → POST /api/uploads/avatars (FormData)
  → response: { url: string }
  → PATCH profile with avatar_url = url
  → avatar component re-renders with new photo
```

### Dependencies

- `react-easy-crop` — install in both sinaloka-platform and sinaloka-tutors

---

## Summary

| Item | Backend Changes | Frontend Changes | New Dependencies |
|------|----------------|-----------------|-----------------|
| Dashboard Charts | 2 new endpoints | Dashboard.tsx + 2 hooks + 2 service methods | None |
| Bulk Tutors | 4 new endpoints + DTOs | Tutors.tsx selection + floating bar + modals + 4 hooks + 4 service methods | None |
| Profile Photos | 1 new upload type + profile update logic | Avatar component upgrade + crop modal + upload flow (2 apps) | react-easy-crop |
