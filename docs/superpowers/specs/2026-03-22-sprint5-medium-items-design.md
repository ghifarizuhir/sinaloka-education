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
- **Data:** New endpoint `GET /api/admin/dashboard/revenue-expenses` — menggabungkan revenue_by_month + expense monthly_trend dalam satu response, auto 6 bulan terakhir tanpa perlu period params
- **Response:** `{ data: [{ month: string, revenue: number, expenses: number }] }`
- **Backend logic:** Merge payment revenue dan expense data by month, fill missing months with 0
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

### Empty State

Jika data kosong (institusi baru, belum ada data), tampilkan placeholder: chart area dengan pesan "Belum ada data" / "No data yet" centered. Jangan render chart axis kosong.

### Backend Changes

- `dashboard.controller.ts` — 3 new endpoints: `GET /attendance-trend`, `GET /student-growth`, `GET /revenue-expenses`
- `dashboard.service.ts` — 3 new methods: `getAttendanceTrend(tenantId)`, `getStudentGrowth(tenantId)`, `getRevenueExpenses(tenantId)`
- All scoped by `tenantId`, return 6 months of data, no period params needed (auto-calculate last 6 months)
- Revenue-expenses endpoint merges data by month key, fills missing months with `0`

### Frontend Changes

- `useDashboard.ts` — 3 new hooks: `useDashboardAttendanceTrend()`, `useDashboardStudentGrowth()`, `useDashboardRevenueExpenses()`
- `dashboard.service.ts` — 3 new service methods
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
- DTOs: `BulkVerifyTutorDto`, `BulkDeleteTutorDto`, `BulkResendInviteDto`, `BulkCancelInviteDto` — all with `ids: string[]` array (max 100 via Zod validation)
- **Bulk verify:** `tutor.service.ts` — `bulkVerify(tenantId, ids, is_verified)` → `prisma.tutor.updateMany()`
- **Bulk delete:** `tutor.service.ts` — `bulkDelete(tenantId, ids)` → transaction: delete tutor_subjects → tutors → refresh tokens → users. Replicate plan-limit reset logic from single delete (`plan_limit_reached_at` recalculation after deletion).
- **Bulk resend invite:** Route through `invitation.service.ts` — `bulkResendInvite(tenantId, ids)` → loop over `resendInvite()` for each ID (existing single-item method)
- **Bulk cancel invite:** Route through `invitation.service.ts` — `bulkCancelInvite(tenantId, ids)` → loop over `cancelInvite()` for each ID. **Note:** `cancelInvite` is a full cascade delete (classes, sessions, payments, enrollments, invitation, tutor, user) — this is destructive, same weight as bulk delete.

### Frontend — Tutors Page

**Selection:**
- Checkbox di setiap tutor card (grid view) dan table row (list view)
- Select-all checkbox di header
- State: `selectedTutorIds: string[]`

**Floating Action Bar:**
- AnimatePresence animation (slide up from bottom, same as Enrollments)
- Shows: `{count} selected`
- Buttons:
  - **Verify** / **Unverify** — toggle based on majority selection state. Tie-break (50/50): default to "Verify"
  - **Resend Invite** — enabled only when selection includes pending tutors (`user.is_active === false`)
  - **Cancel Invite** — enabled only when selection includes pending tutors
  - **Delete** — always available, red variant
  - **X** — clear selection
- Smart disable: buttons grayed out when action doesn't apply to selected tutors

**Confirmation modals (required for destructive actions):**
- **Bulk delete:** modal with warning + count (same pattern as `BulkDeleteModal`)
- **Bulk cancel invite:** modal with warning — explain this is a full cascade delete, not just a status change
- **Verify/Unverify + Resend invite:** direct execute with toast notification on success (non-destructive)

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
- **Old avatar cleanup:** Not in scope — orphan files accepted as known gap for v1

### Backend Changes

**Upload endpoint for tutors:**
- Current `POST /api/uploads/:type` hanya allow ADMIN/SUPER_ADMIN
- Buat endpoint baru: `POST /api/tutors/profile/avatar` — scoped ke TUTOR role, hanya bisa upload avatar sendiri
- Endpoint ini handle upload + langsung update `user.avatar_url` dalam satu request
- Admin tetap pakai existing upload endpoint + PATCH tutor (sudah bisa)

**Upload type:**
- Add `avatars` to allowed upload types in `upload.service.ts`
- Storage path: `{baseDir}/{institutionId}/avatars/{uuid}.{ext}`
- Served via existing `GET /api/uploads/:institutionId/avatars/:filename`

**Tutor profile update — cross-model logic:**
- `PATCH /api/admin/tutors/:id` — add `avatar_url` to DTO. Service does `prisma.user.update({ data: { avatar_url } })` via tutor's `user_id` relation (same pattern as existing `name` update on user)
- `PATCH /api/tutors/profile` — add `avatar_url` to `UpdateTutorProfileSchema`. Service does `prisma.user.update({ data: { avatar_url } })` — note: `avatar_url` lives on `User` model, not `Tutor` model

**API response — include avatar_url:**
- Update `tutor.service.ts` `findAll` and `findOne` to include `avatar_url` in `user` select: `user: { select: { id, name, email, role, is_active, avatar_url } }`
- This ensures frontend gets `avatar_url` in all tutor API responses

**Crop output naming:**
- Frontend must export cropped blob as JPEG and set filename with `.jpg` extension in FormData (e.g., `avatar.jpg`) — required to pass `ALLOWED_EXT` validation in `upload.service.ts`

### Frontend — Avatar Component Upgrade

`sinaloka-platform/src/components/ui/avatar.tsx`:
- Add optional `src` prop
- If `src` is provided and valid → render `<img>` with `object-cover`, rounded
- Fallback to initials on image load error or missing `src`
- Keep existing `name` + `size` props
- Initials behavior unchanged (uses last name initial — existing behavior)

### Frontend — Platform (Admin)

**Tutor edit modal:**
1. Avatar rendered with new `src` prop (shows photo or initials)
2. Click avatar → hidden file input triggers
3. File selected → crop modal opens (react-easy-crop, circular, zoom/pan)
4. User confirms crop → canvas generates cropped blob (JPEG, max 500x500, filename: `avatar.jpg`)
5. Upload blob to `POST /api/uploads/avatars`
6. Save returned URL to tutor profile via existing PATCH endpoint

**All tutor displays:** Avatar component automatically shows photo when `avatar_url` is present — no changes needed per-location.

### Frontend — Tutors App

**Profile page:**
- Replace Picsum placeholder with real `user.avatar_url` from API response
- Map to `profile.avatar_url` in frontend type (align with API field name)
- Click avatar → same crop flow as platform
- Upload → `POST /api/tutors/profile/avatar` (dedicated tutor endpoint)

**Crop modal:**
- Shared pattern but separate implementation (different apps, no shared package)
- React-easy-crop with circular mask
- Output: JPEG blob, max 500x500px, filename `avatar.jpg`
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
  → canvas crops image to 500x500 JPEG blob (filename: avatar.jpg)
  → Platform: POST /api/uploads/avatars (FormData) + PATCH tutor
  → Tutors app: POST /api/tutors/profile/avatar (single request, upload + save)
  → avatar component re-renders with new photo
```

### Dependencies

- `react-easy-crop` — install in both sinaloka-platform and sinaloka-tutors

---

## Summary

| Item | Backend Changes | Frontend Changes | New Dependencies |
|------|----------------|-----------------|-----------------|
| Dashboard Charts | 3 new endpoints (no period params) | Dashboard.tsx + 3 hooks + 3 service methods + empty state | None |
| Bulk Tutors | 4 new endpoints + DTOs (2 via InvitationService) | Tutors.tsx selection + floating bar + 2 confirmation modals + 4 hooks + 4 service methods | None |
| Profile Photos | 1 new upload type + 1 new tutor avatar endpoint + profile update logic + findAll/findOne select update | Avatar component upgrade + crop modal + upload flow (2 apps) + type alignment | react-easy-crop |
