# Analisis Lengkap Sinaloka Platform v4

> **Tanggal:** 2026-03-22
> **Scope:** Seluruh halaman sinaloka-platform (admin dashboard)
> **Metode:** Analisis kode sumber per halaman menggunakan 13 parallel agents

---

## Daftar Isi

1. [Peta Halaman & Akses Role](#1-peta-halaman--akses-role)
2. [Analisis Per Halaman](#2-analisis-per-halaman)
   - [2.1 Login](#21-login)
   - [2.2 Dashboard](#22-dashboard)
   - [2.3 Students](#23-students)
   - [2.4 Tutors](#24-tutors)
   - [2.5 Classes](#25-classes)
   - [2.6 Schedules](#26-schedules)
   - [2.7 Enrollments](#27-enrollments)
   - [2.8 Registrations](#28-registrations)
   - [2.9 Attendance](#29-attendance)
   - [2.10 Finance Overview](#210-finance-overview)
   - [2.11 Student Payments](#211-student-payments)
   - [2.12 Tutor Payouts](#212-tutor-payouts)
   - [2.13 Operating Expenses](#213-operating-expenses)
   - [2.14 WhatsApp](#214-whatsapp)
   - [2.15 Settings](#215-settings)
   - [2.16 SuperAdmin: Institutions](#216-superadmin-institutions)
   - [2.17 SuperAdmin: Institution Detail](#217-superadmin-institution-detail)
   - [2.18 SuperAdmin: Users](#218-superadmin-users)
   - [2.19 SuperAdmin: Upgrade Requests](#219-superadmin-upgrade-requests)
   - [2.20 SuperAdmin: Subscriptions](#220-superadmin-subscriptions)
   - [2.21 SuperAdmin: Settlements](#221-superadmin-settlements)
3. [Business Flow yang Sudah Berjalan](#3-business-flow-yang-sudah-berjalan)
4. [Saran & Temuan](#4-saran--temuan)

---

## 1. Peta Halaman & Akses Role

| Halaman | Route | Admin | SuperAdmin | SuperAdmin (Impersonating) |
|---|---|---|---|---|
| Login | `/login` | Public | Public | - |
| Dashboard | `/` | Ya | - | Ya |
| Students | `/students` | Ya | - | Ya |
| Tutors | `/tutors` | Ya | - | Ya |
| Classes | `/classes` | Ya | - | Ya |
| Schedules | `/schedules` | Ya | - | Ya |
| Enrollments | `/enrollments` | Ya | - | Ya |
| Registrations | `/registrations` | Ya | - | Ya |
| Attendance | `/attendance` | Ya | - | Ya |
| Finance Overview | `/finance` | Ya | - | Ya |
| Student Payments | `/finance/payments` | Ya | - | Ya |
| Tutor Payouts | `/finance/payouts` | Ya | - | Ya |
| Operating Expenses | `/finance/expenses` | Ya | - | Ya |
| WhatsApp | `/whatsapp` | Ya | - | Ya |
| Settings (6 tabs) | `/settings` | Ya | - | Ya |
| Institutions | `/super/institutions` | - | Ya | - |
| Institution Detail | `/super/institutions/:id` | - | Ya | - |
| Create Institution | `/super/institutions/new` | - | Ya | - |
| Users | `/super/users` | - | Ya | - |
| Upgrade Requests | `/super/upgrade-requests` | - | Ya | - |
| Subscriptions | `/super/subscriptions` | - | Ya | - |
| Settlements | `/super/settlements` | - | Ya | - |

**Catatan akses:**
- `SUPER_ADMIN` tanpa impersonation selalu redirect ke `/super/institutions`
- `SUPER_ADMIN` bisa "Enter" institusi (impersonate) untuk akses semua halaman admin
- Saat impersonating, `ImpersonationBanner` ditampilkan di atas layout
- `mustChangePassword=true` memaksa redirect ke Settings > Security tab

---

## 2. Analisis Per Halaman

### 2.1 Login

**Route:** `/login`
**File:** `src/pages/Login.tsx`

#### Form Fields

| Field | Type | Validasi | Placeholder |
|---|---|---|---|
| Email | email input | HTML5 required + native email format | `admin@sinaloka.com` |
| Password | password (toggle visibility) | HTML5 required | `••••••••` |

#### Tombol

| Tombol | Aksi |
|---|---|
| Sign in / Masuk | Submit login, spinner saat loading |

#### Post-Login Redirect

| Role | Redirect |
|---|---|
| `SUPER_ADMIN` | `/super/institutions` |
| `ADMIN` / `TUTOR` | `/` (Dashboard) |
| Sudah login | Auto-redirect tanpa tampilkan form |

#### Error Handling
- Error dari server ditampilkan sebagai inline alert box di bawah password field
- Fallback: "Email atau kata sandi salah. Silakan coba lagi."
- Error reset setiap submit ulang

#### Auth Flow
1. `POST /api/auth/login` → dapat `access_token` + `refresh_token` → simpan `localStorage`
2. `GET /api/auth/me` → set user state + `mustChangePassword`
3. Token refresh otomatis via Axios interceptor pada 401
4. Concurrent 401 requests di-queue selama refresh berlangsung

#### Catatan
- Tidak ada "Forgot Password"
- Tidak ada `?redirect=` query param untuk kembali ke halaman sebelumnya
- Tidak ada social login atau register link
- i18n support: Bahasa Indonesia (default) dan English

---

### 2.2 Dashboard

**Route:** `/`
**File:** `src/pages/Dashboard.tsx`

#### Stats Cards (4)

| Card | Data | Format | Icon |
|---|---|---|---|
| Total Students | `stats.total_students` | Integer | Users (blue) |
| Active Tutors | `stats.active_tutors` | Integer | GraduationCap (emerald) |
| Attendance Rate | `stats.attendance_rate` | Percentage (N%) | ClipboardCheck (amber) |
| Monthly Revenue | `stats.monthly_revenue` | Short currency (Rp 1.5M) | TrendingUp (violet) |

#### Activity Feed
- Sumber: `GET /api/admin/dashboard/activity`
- Menampilkan 6 item terbaru (dari 20 yang dikembalikan API)
- Tipe: enrollment (UserPlus biru), payment (Receipt emerald), attendance (ClipboardCheck amber)
- Format: deskripsi + relative time ("5 menit lalu")
- ChevronRight icon dekoratif (tidak ada click handler)

#### Upcoming Sessions
- Sumber: `GET /api/admin/dashboard/upcoming-sessions`
- Menampilkan 5 sesi mendatang
- Format: subject name + start time + tutor name

#### Alert Chips (conditional)
- **Overdue payments** (amber): muncul jika `overdue_count > 0`, klik → `/finance/payments`
- **Upcoming sessions** (blue): muncul jika `upcoming_sessions > 0`, klik → `/schedules`

#### Quick Actions (Command Palette)
Dibuka via tombol Zap icon di header:
- Enroll New Student → `/enrollments`
- Record New Payment → `/finance/payments`
- Schedule Makeup Class → `/schedules`
- Add New Tutor → `/tutors`

#### Quick Links Card

| Link | Tujuan |
|---|---|
| View All Students | `/students` |
| Manage Finance | `/finance` |
| Attendance Records | `/attendance` |
| Schedule | `/schedules` |

#### API Endpoints

| Endpoint | Data |
|---|---|
| `GET /api/admin/dashboard/stats` | Stats cards |
| `GET /api/admin/dashboard/activity` | Activity feed |
| `GET /api/admin/dashboard/upcoming-sessions` | Upcoming sessions |
| `GET /api/admin/payments/overdue-summary` | Overdue alert |

#### Catatan
- Tidak ada chart/grafik (Recharts tidak digunakan di Dashboard)
- Command palette search field ada tapi tidak berfungsi (tidak ada `onChange`)
- Keyboard navigation hint ada tapi tidak implemented
- Tidak ada perbedaan tampilan berdasarkan role (semua elemen ditampilkan untuk ADMIN dan SUPER_ADMIN yang impersonate)

---

### 2.3 Students

**Route:** `/students`
**Files:** `src/pages/Students/index.tsx`, `StudentTable.tsx`, `StudentFilters.tsx`, `AddEditModal.tsx`, `DeleteModals.tsx`, `ImportModal.tsx`, `StudentDrawer.tsx`

#### Stats Cards (4)

| Card | Data | Catatan |
|---|---|---|
| Total Students | `meta.total` | Dari semua halaman |
| Active Students | Count ACTIVE + percentage | Dari halaman saat ini saja |
| Inactive Students | Count INACTIVE | Dari halaman saat ini saja |
| Total All Pages | `meta.total` | Sama dengan Total Students |

#### Tabel Kolom

| Kolom | Key | Konten |
|---|---|---|
| (checkbox) | - | Multi-select per row |
| Name | `name` (always visible) | Avatar initials + nama + truncated ID + overdue alert icon |
| Email | `email` (toggleable) | Email atau "—" |
| Grade | `grade` | e.g. "Kelas 10" |
| Parent | `parent` | Parent name + phone |
| Status | `status` | Badge: Active (green) / Inactive (default) |
| Actions | - | Dropdown menu |

#### Tombol Halaman

| Tombol | Aksi |
|---|---|
| Import | Buka ImportModal (upload CSV) |
| Export | Download CSV (`students_export_YYYY-MM-DD.csv`) |
| Add Student | Buka AddEditModal (form kosong) |

#### Form Add/Edit Student

| Field | Label | Type | Required | Validasi |
|---|---|---|---|---|
| `name` | Full Name | text | Ya | Tidak boleh kosong |
| `email` | Email Address | email | Tidak | Regex email jika diisi |
| `phone` | Phone Number | text | Tidak | - |
| `grade` | Grade | select grouped | Ya | Tidak boleh kosong |
| `status` | Status | select | Ya (default: ACTIVE) | ACTIVE / INACTIVE |
| `parent_name` | Parent Name | text | Ya | Tidak boleh kosong |
| `parent_phone` | Parent Phone | text | Ya | Tidak boleh kosong |
| `parent_email` | Parent Email | email | Tidak | Regex email jika diisi |

**Grade options (grouped):**
- SD: Kelas 1-6
- SMP: Kelas 7-9
- SMA: Kelas 10-12
- Lainnya... (custom free-text)

#### Aksi Per Row

| Aksi | Icon | Kondisi | Behavior |
|---|---|---|---|
| View/Edit | Eye | Selalu | Buka AddEditModal pre-filled |
| Invite Parent | UserPlus | `parent_email` ada | `POST /api/admin/parents/invite` |
| Delete | Trash2 | Selalu | Konfirmasi (ketik "delete") |

#### Bulk Actions
- Select multiple → floating bar muncul
- **Delete (N selected)** → bulk delete confirmation (ketik "delete")
- Bulk delete: `Promise.all` DELETE per student secara parallel

#### Import CSV
- Format: `name,email,phone,grade,status,parent_name,parent_phone,parent_email`
- Template downloadable (generated client-side)
- Upload: `POST /api/admin/students/import` (multipart/form-data)

#### Search & Filter
- **Search:** client-side match pada `name` dan `email` (case-insensitive)
- **Grade filter:** exact match, grouped dropdown
- **Status filter:** ACTIVE / INACTIVE
- **Column visibility:** toggle email column via Eye icon
- Active filter chips ditampilkan dengan X dismiss + "Clear All"

#### Pagination
- 20 items/page (fixed, server-side)
- Prev/Next + numbered page buttons (sliding window ±2)
- **Bug:** Filter change tidak reset page ke 1

#### Student Detail Drawer
- Avatar + name + grade + status + ID
- Contact Info: email, phone, enrolled date
- Parent/Guardian: avatar + name + "Primary Contact" + email + phone
- "Invite Parent" button jika `parent_email` ada

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/students` | List (page, limit) |
| POST | `/api/admin/students` | Create |
| PATCH | `/api/admin/students/:id` | Update |
| DELETE | `/api/admin/students/:id` | Delete |
| POST | `/api/admin/students/import` | Import CSV |
| GET | `/api/admin/students/export` | Export CSV (blob) |
| POST | `/api/admin/parents/invite` | Invite parent |
| GET | `/api/admin/payments/overdue-summary` | Overdue flagging |

---

### 2.4 Tutors

**Route:** `/tutors`
**File:** `src/pages/Tutors.tsx`

#### View Mode: Grid (default) | List

**Grid Card:**
- Avatar initials (size lg) + Name + Subject specialty (first 2)
- Status badge + Email + Experience (Ny) + Rating (star) + Subjects count

**List Table (6 kolom):** Tutor (avatar+name+email) | Subjects | Experience | Rating | Status | Actions

#### Status Badge Logic

| Kondisi | Badge | Warna |
|---|---|---|
| `user.is_active === false` | Pending Invite | Kuning |
| `is_verified === false` (active) | Unverified | Abu-abu |
| `is_verified === true` (active) | Verified | Hijau |

#### Search & Filter (semua client-side)

| Control | Type | Behavior |
|---|---|---|
| Search | text | Match `name` dan `subject.name` |
| Subject filter | select | Exact match |
| Sort | select | By Rating / Experience / Name |

**Catatan:** Backend mendukung `search`, `subject_id`, `is_verified`, `sort_by`, `sort_order` tapi platform hanya kirim `page` + `limit`. Semua filtering client-side pada 20 items per page.

#### Form Invite Tutor (Add)

| Field | Label | Type | Required |
|---|---|---|---|
| `name` | Full Name | text | Ya |
| `email` | Email Address | email | Ya |
| `subject_ids` | Subjects | MultiSelect | Ya (min 1) |
| `experience_years` | Years of Experience | number (0-50) | Tidak |

#### Form Edit Tutor (tambahan fields)

| Field | Label | Type | Required |
|---|---|---|---|
| `is_verified` | Verified Status | Switch | - |
| `bank_name` | Bank Name | text | Ya |
| `bank_account_number` | Account Number | text | Ya |
| `bank_account_holder` | Account Holder | text | Ya |
| `monthly_salary` | Monthly Salary | number | Tidak |

#### Aksi Per Tutor

**Pending Invite:**
- Resend Invite → `POST /api/admin/tutors/:id/resend-invite`
- Cancel Invite → `POST /api/admin/tutors/:id/cancel-invite` (konfirmasi dialog)

**Active Tutor:**
- Edit Profile → buka form edit
- Delete Tutor → konfirmasi dialog

#### Onboarding Flow
1. Admin submit invite → `POST /api/admin/tutors/invite`
2. Backend create tutor record (`is_active: false`)
3. Email invite terkirim dengan token link
4. Tutor visit link, set password + bank details
5. Status berubah ke Active (Unverified)

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/tutors` | List (page, limit) |
| POST | `/api/admin/tutors/invite` | Invite tutor |
| POST | `/api/admin/tutors/:id/resend-invite` | Resend invite |
| POST | `/api/admin/tutors/:id/cancel-invite` | Cancel invite |
| PATCH | `/api/admin/tutors/:id` | Update tutor |
| DELETE | `/api/admin/tutors/:id` | Delete tutor |

---

### 2.5 Classes

**Route:** `/classes`
**Files:** `src/pages/Classes/index.tsx`, `useClassesPage.ts`, `ClassTable.tsx`, `ClassFilters.tsx`, `ClassFormModal.tsx`, `ClassDetailDrawer.tsx`, `ClassDeleteModal.tsx`, `GenerateSessionsModal.tsx`

#### Stats Cards (3)

| Card | Icon | Value |
|---|---|---|
| Total Monthly Fee | DollarSign (indigo) | Sum fee semua kelas pada page saat ini |
| Total Classes | Users (emerald) | `meta.total` |
| Active Courses | BookOpen (amber) | Count status ACTIVE pada page saat ini |

#### View Mode: Table (default) | Timetable

**Table (7 kolom):**

| Kolom | Konten |
|---|---|
| Class Name | Nama + capacity label |
| Subject | Badge warna (hash dari nama) |
| Capacity | Progress bar enrolled/capacity + percentage |
| Tutor & Schedule | Tutor name + schedule days/times |
| Fee | Currency + "per session" |
| Status | Active (green) / Archived (gray) |
| Actions | 3-dot menu |

**Timetable:** Grid mingguan Mon-Sun, session blocks positioned per waktu, overlapping auto-split, klik block buka detail

#### Search & Filter

| Control | Type | Behavior |
|---|---|---|
| Search | text | Client-side match nama kelas / nama tutor |
| Subject | select | Match `subject.name`, dynamic dari `useSubjects()` |
| Active Only | switch | Hide non-ACTIVE |
| View toggle | icon buttons | Table / Timetable |

#### Form Create/Edit Class (2-column modal)

**Left column — Form fields:**

| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| `name` | Class Name | text | Ya | Placeholder: "e.g. Math Advanced" |
| `subject_id` | Subject | select | Ya | Dari `GET /api/admin/subjects` |
| `tutor_id` | Assign Tutor | select | Ya | Filtered per subject; disabled sampai subject dipilih |
| `status` | Status | select | - | ACTIVE / ARCHIVED, default ACTIVE |
| Schedule Days | Schedule | multi-toggle Mon-Sun | Min 1 hari | Per hari: start_time + end_time picker, default 14:00-15:30 |
| `capacity` | Capacity | number | Ya | Default 25, > 0 |
| `fee` | Fee | number | Ya | Label dinamis per billing mode: "Base Fee" / "Monthly Fee" / "Fee Per Session", default 500000 |
| `package_fee` | Package Fee | number | Tidak | Hanya muncul billing mode `package` |
| `tutor_fee_mode` | Tutor Fee Mode | select | - | FIXED_PER_SESSION / PER_STUDENT_ATTENDANCE / MONTHLY_SALARY |
| `tutor_fee` | Tutor Fee | number | Conditional | Muncul saat FIXED_PER_SESSION |
| `tutor_fee_per_student` | Tutor Fee Per Student | number | Conditional | Muncul saat PER_STUDENT_ATTENDANCE, > 0 |
| `room_id` | Room | select | Tidak | Dari academic settings, disabled jika belum ada room |

**Right column — Live Schedule Week Preview:** Menampilkan jadwal tutor existing + jadwal baru untuk deteksi konflik

**Conflict detection:** Client-side check overlap jadwal tutor sebelum submit. Jika overlap → toast error, submission blocked.

#### Class Detail Drawer (slide from right)

| Section | Konten |
|---|---|
| Header | Avatar + class name + subject badge + status badge |
| Quick Stats (3) | Enrolled (progress bar) / Fee / Room |
| Tutor | Avatar + name + email |
| Schedule | Day pills + time range per hari |
| Enrolled Students | List: avatar + name + grade + enrollment status |
| Generate Sessions | Button (hanya ACTIVE + ada schedules) |
| Actions | Edit Class + Delete Class |

#### Generate Sessions Modal
- Class info: nama + schedule pills
- Duration: number (1-365, default 30 hari)
- Date range preview: today → today + duration - 1
- Estimated session count (calculated client-side per matching day)
- Submit: `POST /api/admin/sessions/generate`

#### Delete Class Modal
- Warning box (merah) + ketik "delete" untuk konfirmasi

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/classes?page=&limit=` | List paginated (20/page) |
| GET | `/api/admin/classes?page=1&limit=100` | All classes (timetable view) |
| GET | `/api/admin/classes?tutor_id=&limit=100` | Tutor classes (conflict check) |
| GET | `/api/admin/classes/:id` | Detail (drawer) |
| POST | `/api/admin/classes` | Create |
| PATCH | `/api/admin/classes/:id` | Update |
| DELETE | `/api/admin/classes/:id` | Delete |
| POST | `/api/admin/sessions/generate` | Generate sessions |
| GET | `/api/admin/subjects` | Subjects list |
| GET | `/api/admin/subjects/:id/tutors` | Tutors per subject |
| GET | `/api/admin/settings/billing` | Billing mode (fee label) |
| GET | `/api/admin/settings/academic` | Rooms list |

---

### 2.6 Schedules

**Route:** `/schedules`
**Files:** `src/pages/Schedules/index.tsx`, `useSchedulesPage.ts`, `ScheduleFilters.tsx`, `ScheduleSessionModal.tsx`, `GenerateSessionsModal.tsx`, `SessionDetailDrawer.tsx`, `CalendarMonth.tsx`, `CalendarWeek.tsx`, `CalendarDay.tsx`

#### View Mode: Calendar (default) | List

#### Calendar Sub-views

**Month:**
- Grid 7 kolom, session pills per hari
- Pill: class name (truncated) + start time
- Warna per subject (Math=blue, Science=emerald, English=purple, lainnya=no color)
- CANCELLED: muted + line-through, COMPLETED: emerald border, RESCHEDULE_REQUESTED: amber

**Week:**
- Timeline grid Mon-Sun 08:00-21:00
- Session blocks positioned per start hour
- Block: class name + time range + tutor name
- Min-width 800px, scrollable

**Day:**
- Single-day timeline 08:00-21:00
- Session blocks like week view
- Min-width 400px

#### List Table (5 kolom)

| Kolom | Konten |
|---|---|
| Class / Subject | Class name (line-through jika cancelled) + subject badge |
| Tutor | Tutor name + User icon |
| Date / Time | Formatted date + start-end time |
| Status | COMPLETED (green) / CANCELLED (gray) / others (amber) |
| Actions | Dropdown menu |

#### Filter

| Filter | Type | Options |
|---|---|---|
| Date From | date input | Free date picker |
| Date To | date input | Free date picker |
| Class | select | "All Classes" + dari API |
| Status | select | All / SCHEDULED / COMPLETED / CANCELLED / RESCHEDULE_REQUESTED |

Semua filter sebagai query params ke API. Limit: 100 sessions, tidak ada pagination UI.

#### Aksi Per Session

| Aksi | Kondisi | Behavior |
|---|---|---|
| Mark Attendance | Tidak locked | Navigate ke `/attendance` dengan sessionId |
| Approve Reschedule | RESCHEDULE_REQUESTED | `PATCH /api/admin/sessions/:id/approve` |
| Cancel Session | Tidak CANCELLED | `DELETE /api/admin/sessions/:id` |

**Lock rule:** Session locked jika COMPLETED atau tanggal sudah lewat. Semua aksi diganti lock message.

#### Session Detail Drawer

| Section | Konten |
|---|---|
| Header | Avatar + class name + subject badge + status badge |
| Date & Time | Formatted date + time range |
| Tutor | Avatar + name + email |
| Session Content | Topic covered + summary (hanya COMPLETED) |
| Reschedule Info | Proposed date/time + reason + Approve/Reject buttons (hanya RESCHEDULE_REQUESTED) |
| Attendance | List students: avatar + name + grade + status badge (PRESENT/LATE/ABSENT/Pending) + homework badge |
| Actions | Mark Attendance / Cancel Session (conditional on lock) |

#### Create Session Modal

| Field | Type | Default |
|---|---|---|
| Class | select | - (required) |
| Date | date | Today |
| Start Time | select (48 slots, 30-min interval) | - |
| End Time | select (48 slots) | 11:30 |

#### Generate Sessions Modal

| Field | Type | Default |
|---|---|---|
| Class | select | - (required) |
| Date From | date | Today |
| Date To | date | Today + 30 days |

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/sessions` | List (date_from, date_to, class_id, status, limit) |
| GET | `/api/admin/sessions/:id` | Detail (drawer) |
| GET | `/api/admin/sessions/:id/students` | Enrolled students + attendance |
| POST | `/api/admin/sessions` | Create single session |
| DELETE | `/api/admin/sessions/:id` | Cancel session |
| POST | `/api/admin/sessions/generate` | Auto-generate sessions |
| PATCH | `/api/admin/sessions/:id/approve` | Approve/reject reschedule |
| GET | `/api/admin/classes?limit=100` | Class list for filter |

#### Catatan
- Tidak ada edit session flow (hook ada, UI belum)
- Attendance marking di halaman terpisah (`/attendance`)
- Subject color hanya 3 subject (Math, Science, English), sisanya fallback kosong

---

### 2.7 Enrollments

**Route:** `/enrollments`
**Files:** `src/pages/Enrollments/index.tsx`, `useEnrollmentsPage.ts`, `EnrollmentTable.tsx`, `NewEnrollmentModal.tsx`, `EditEnrollmentModal.tsx`, `BulkImportModal.tsx`, `BulkDeleteModal.tsx`

#### Tabel (7 kolom)

| Kolom | Konten |
|---|---|
| (checkbox) | Multi-select |
| Student | Avatar + name + truncated ID + overdue alert icon (amber) |
| Class | Class name |
| Enrollment Date | Formatted `enrolled_at` |
| Payment | Badge: NEW (zinc) / PAID (emerald) / PENDING (amber) / OVERDUE (red). "Send Reminder" CreditCard icon jika OVERDUE |
| Status | Badge: ACTIVE (emerald) / TRIAL (indigo) / WAITLISTED (zinc) / DROPPED (red) |
| Actions | Dropdown menu |

Rows dengan overdue students: `bg-amber-50/30`

#### Tombol Halaman

| Tombol | Aksi |
|---|---|
| Bulk Import | Buka BulkImportModal (CSV upload) |
| New Enrollment | Buka NewEnrollmentModal |
| Export CSV | Download CSV, respects active filters |

#### New Enrollment Modal (2-column)

**Kiri — Select Students:**
- Search input (client-side filter nama)
- Multi-select student list (scrollable, max 300px)
- Selected: indigo highlight + check icon

**Kanan — Select Class + Options:**
- Single-select class list (scrollable, max 220px)
- Enrollment Type: segmented toggle Active / Trial (default: Active)
- Auto Invoice: Switch (default: ON → set `payment_status: PENDING`)

Submit: `POST /api/admin/enrollments` per student (parallel via `Promise.all`)

#### Edit Enrollment Modal
- Status select dropdown (ACTIVE / TRIAL / WAITLISTED / DROPPED)
- Submit: `PATCH /api/admin/enrollments/:id`

#### Aksi Per Row

| Aksi | Kondisi | Behavior |
|---|---|---|
| Edit Enrollment | Selalu | Buka edit modal |
| Set Active | Status != ACTIVE | Immediate PATCH |
| Convert to Full | Status = TRIAL | PATCH → ACTIVE |
| Drop | Status != DROPPED | PATCH → DROPPED |
| Delete Record | Selalu | Konfirmasi dialog |

#### Bulk Actions (floating bar saat rows selected)
- **Change Status:** Dropdown langsung apply (ACTIVE/TRIAL/WAITLISTED/DROPPED) → `PATCH /api/admin/enrollments/bulk`
- **Delete:** Konfirmasi modal → `DELETE /api/admin/enrollments/bulk`

#### Bulk Import
- Format CSV: `student_id, class_id, status`
- Upload: `POST /api/admin/enrollments/import` (multipart/form-data)
- Response: `{ created, skipped, errors[] }`

#### Search & Filter
- **Search:** client-side match `student.name` dan `class.name`
- **Status filter:** dropdown All / ACTIVE / TRIAL / WAITLISTED / DROPPED (sent to API)
- `student_id` dan `class_id` filter ada di service tapi tidak ada UI widget

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/enrollments` | List (page, limit, status) |
| POST | `/api/admin/enrollments` | Create single |
| PATCH | `/api/admin/enrollments/:id` | Update status |
| DELETE | `/api/admin/enrollments/:id` | Delete single |
| POST | `/api/admin/enrollments/check-conflict` | Check conflict (hook ada, tidak dipanggil) |
| GET | `/api/admin/enrollments/export` | Export CSV |
| POST | `/api/admin/enrollments/import` | Bulk import |
| PATCH | `/api/admin/enrollments/bulk` | Bulk status update |
| DELETE | `/api/admin/enrollments/bulk` | Bulk delete |
| GET | `/api/admin/payments/overdue-summary` | Overdue flagging |

#### Catatan
- "Send Reminder" CreditCard button pada OVERDUE adalah **UI stub** — tidak wired ke API
- Limit hardcoded 100, pagination tidak fully exposed

---

### 2.8 Registrations

**Route:** `/registrations`
**File:** `src/pages/Registrations.tsx`

#### Filter Tabs

| Tab Group 1 (Type) | Tab Group 2 (Status) |
|---|---|
| All / Student / Tutor | All / Pending / Approved / Rejected |

Type dan status filter dikirim sebagai query params (server-side). Search client-side pada `name`.

#### Tabel (6 kolom)

| Kolom | Konten |
|---|---|
| Name | Bold nama |
| Student / Tutor | TypeBadge (biru=Student, hijau=Tutor) |
| Email / Phone | Fallback: email → phone → "—" |
| Date | Formatted `created_at` |
| Status | StatusBadge: PENDING (amber) / APPROVED (green) / REJECTED (red) |
| Actions | Approve + Reject buttons (hanya PENDING) |

#### Approve Flow

**Frontend:**
1. Klik "Approve" → ApproveModal (konfirmasi nama + email/phone)
2. Student: "Approve and add as active student?"
3. Tutor: "Approve and send invitation email?"
4. Submit: `PATCH /api/admin/registrations/:id/approve`

**Backend:**
- **Student:** Cek plan limit → DB transaction: create student record + update registration status
- **Tutor:** Cek plan limit → cek email duplikat → update status → kirim invitation email (48h expiry)

#### Reject Flow

1. Klik "Reject" → RejectModal (textarea opsional, max 500 chars)
2. Submit: `PATCH /api/admin/registrations/:id/reject` (body: `{ reason? }`)
3. **Tidak ada email ke registrant saat reject**

#### Sidebar Badge
- Live count pending registrations via `GET /api/admin/registrations/count` (stale time: 60 detik)

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/registrations` | List (type, status, page, limit) |
| GET | `/api/admin/registrations/count` | Pending count (sidebar badge) |
| GET | `/api/admin/registrations/:id` | Detail (hook ada, tidak dipakai) |
| PATCH | `/api/admin/registrations/:id/approve` | Approve |
| PATCH | `/api/admin/registrations/:id/reject` | Reject |

**Public endpoints (landing page):**
- `GET /api/register/:slug` — get institution registration config
- `POST /api/register/:slug/student` — submit student registration (rate limit: 5/hour)
- `POST /api/register/:slug/tutor` — submit tutor registration (rate limit: 5/hour)

#### Catatan
- Detail registration (grade, parent_name, parent_phone, parent_email, subject_names, experience_years) tersedia dari API tapi **tidak ditampilkan** di UI
- Tidak ada notifikasi ke registrant saat di-reject

---

### 2.9 Attendance

**Route:** `/attendance`
**File:** `src/pages/Attendance.tsx`

#### Layout: 2-Panel

**Panel Kiri (4 kolom):**
- Date navigator: Prev / Today / Next (single-day view)
- Session list: cards per session hari itu
  - Status badge + Time range + Class name + Tutor name
  - "Incomplete" indicator jika past date + still SCHEDULED
  - Selected session: inverted (dark background)

**Panel Kanan (8 kolom):**
- Session header: class name + status badge + tutor + date + time + "X/N present" counter
- Attendance table per enrolled student

#### Attendance Table (4 kolom)

| Kolom | Konten |
|---|---|
| Student | Nama siswa |
| Status | 3 pill buttons: **P** (Present/emerald), **A** (Absent/rose), **L** (Late/amber) |
| HW | Checkbox `homework_done` |
| Notes | Text input (w-32) |

Students tanpa `attendance_id`: "Pending", semua input disabled.

#### Keyboard Shortcuts
Focus row → tekan `P` / `A` / `L`

#### Bulk Action
- **"Mark All Present"** — set semua yang punya `attendance_id` ke PRESENT

#### Lock Rule
Editing disabled jika:
- Session status = COMPLETED, atau
- Session date sebelum hari ini

Action bar menampilkan lock icon + message saat locked.

#### Save Flow
- Semua perubahan disimpan lokal (`pendingChanges` state)
- Sticky bottom bar animasi slide-up: "Unsaved changes" + present/absent counts + **Discard** + **Save Attendance**
- Save: `Promise.all` PATCH per changed attendance record (parallel)
- On success: clear pending, toast success
- On failure: toast error, pending NOT cleared (bisa retry)

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/sessions?date_from=&date_to=&limit=100` | Sessions per hari |
| GET | `/api/admin/sessions/:id/students` | Enrolled students + attendance |
| GET | `/api/admin/attendance?session_id=` | Attendance records |
| PATCH | `/api/admin/attendance/:id` | Update single record (status, homework_done, notes) |

Setelah PATCH sukses, invalidate: `['attendance']`, `['session-students']`, `['dashboard', 'stats']`

#### Catatan
- Tidak ada filter per class/tutor — hanya filter date
- `useAttendanceSummary` hook imported tapi **tidak digunakan**
- Tidak ada attendance summary/stats di halaman ini (hanya live counter per session)

---

### 2.10 Finance Overview

**Route:** `/finance`
**File:** `src/pages/Finance/FinanceOverview.tsx`

#### Profit Flow Hero (4 animated stat cards)

| Card | Data | Warna |
|---|---|---|
| Total Revenue | `summary.total_revenue` + payment_count | Emerald |
| Total Payouts | `summary.total_payouts` + payout_count | Blue |
| Total Expenses | `summary.total_expenses` + expense_count | Amber |
| Net Profit | `summary.net_profit` (Revenue - Payouts - OpEx) | Emerald (profit) / Red (loss) |

#### Period Filter
- Tabs: This Month / This Quarter / Year to Date / Custom
- Custom: Date From + Date To inputs
- Semua data queries pass `{ period_start, period_end }`

#### Charts (2 BarChart via Recharts)

| Chart | Data Source | Axis |
|---|---|---|
| Revenue Summary | `summary.revenue_by_month` | X: month, Y: amount |
| Expense Monthly Trend | `expenseBreakdown.monthly_trend` | X: month, Y: amount |

#### Breakdown Cards (3-column grid)

**Revenue Breakdown (2 kolom):**
- By Class: list `{ class_name, amount }`
- By Payment Method: list `{ method, amount }` (translated)
- By Status: list `{ status, amount }` dengan Badge (PAID=success, PENDING=warning, else=error)

**Expense by Category (1 kolom):**
- List `{ category, amount }`

**Quick Nav:**
- Student Payments / Tutor Payouts / Operating Expenses links

#### Overdue Alert
- Banner jika `overdue_count > 0`: count + total amount + "View Details" → `/finance/payments`
- Receivables table: student avatar + name + overdue count + total debt + "Remind" button

#### Actions

| Tombol | Aksi |
|---|---|
| Generate Report | Buka ReportPreviewModal (3 types: Attendance, Finance, Student Progress) |
| Export Payments | Download CSV |
| Export Payouts | Download CSV |
| Export Expenses | Download CSV |

#### ReportPreviewModal

| Tab | Fields |
|---|---|
| Attendance | Date From, Date To, Class (opsional) |
| Finance | Date From, Date To |
| Student Progress | Student (select), Date From/To (opsional) |

Generate → inline PDF preview (iframe) + Download PDF button

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/reports/financial-summary` | Summary stats + revenue_by_month |
| GET | `/api/admin/reports/revenue-breakdown` | Revenue by class/method/status |
| GET | `/api/admin/reports/expense-breakdown` | Expense by category + monthly_trend |
| GET | `/api/admin/reports/export-csv?type=` | Export CSV (payments/payouts/expenses) |
| GET | `/api/admin/reports/attendance` | PDF report |
| GET | `/api/admin/reports/finance` | PDF report |
| GET | `/api/admin/reports/student-progress` | PDF report |
| GET | `/api/admin/payments/overdue-summary` | Overdue alert |

---

### 2.11 Student Payments

**Route:** `/finance/payments`
**File:** `src/pages/Finance/StudentPayments.tsx`

#### Stats Cards (4)

| Card | Data | Warna |
|---|---|---|
| Total Records | `meta.total` | Default |
| Overdue Count | `overdueSummary.overdue_count` | Orange |
| Overdue Amount | `overdueSummary.total_overdue_amount` | Rose/red |
| Flagged Students | `overdueSummary.flagged_students.length` | Amber |

#### Tabel (7 kolom)

| Kolom | Konten |
|---|---|
| (checkbox) | Multi-select |
| Invoice / Student | Payment ID (8 chars) + student name + "Auto" badge + invoice number |
| Class | `enrollment.class.name` |
| Due Date | Formatted date + "X days overdue" (rose jika past due) |
| Amount | Full currency format |
| Status | Badge: PAID (success) / OVERDUE (error) / PENDING (warning) |
| Actions | Icon buttons per row |

Pagination: 10 items/page.

#### Aksi Per Payment

| Aksi | Icon | Kondisi | Behavior |
|---|---|---|---|
| Record Payment | DollarSign | Non-PAID | Buka Record Payment modal |
| Send Reminder | Send | Non-PAID | `POST /api/admin/payments/:id/remind` (WhatsApp) |
| Send Invoice Link | Link | Non-PAID | `POST /api/payments/:id/checkout` → show link modal |
| Download Invoice | FileDown | `invoice_url` ada | Open URL |
| Generate Invoice | FileText | No `invoice_url` | `POST /api/admin/payments/:id/generate-invoice` |
| View Ledger | History | Selalu | Buka Ledger Drawer |
| Delete | Trash2 | Selalu | Konfirmasi dialog |

#### Record Payment Modal

| Field | Type | Default |
|---|---|---|
| Payment Amount | number | Pre-filled `payment.amount` |
| Discount | number | 0 |
| Payment Date | date | Today |
| Payment Method | select | TRANSFER / CASH / OTHER |
| Send Receipt | checkbox | True (UI only, not wired) |

"After Discount" preview updates live. Submit: `PATCH /api/admin/payments/:id` (status=PAID).

#### Batch Record
Select multiple → "Record N payments" button appears → modal with Date + Payment Method → `POST /api/admin/payments/batch-record`

#### Invoice Link Modal
After `POST /api/payments/:id/checkout`:
- Shows `redirect_url` as monospace string
- **Copy Link** + **Open Link** (new tab) buttons

#### Ledger Drawer (read-only)
Student name, class, amount, due date, paid date, method, invoice number, notes. "Export PDF" dan "Resend Receipt" coming soon.

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/payments?page=&limit=&status=` | List payments |
| PATCH | `/api/admin/payments/:id` | Record payment (update) |
| DELETE | `/api/admin/payments/:id` | Delete payment |
| GET | `/api/admin/payments/overdue-summary` | Overdue stats |
| POST | `/api/admin/payments/:id/generate-invoice` | Generate invoice PDF |
| POST | `/api/admin/payments/batch-record` | Batch mark as PAID |
| POST | `/api/admin/payments/:id/remind` | Send WhatsApp reminder |
| POST | `/api/payments/:id/checkout` | Midtrans checkout link |

---

### 2.12 Tutor Payouts

**Route:** `/finance/payouts`
**File:** `src/pages/Finance/TutorPayouts.tsx`

#### View Mode: List (default) | Reconciliation (per payout)

#### List Tabel (5 kolom)

| Kolom | Konten |
|---|---|
| Tutor | Name + bank info (bank_name + account_number) atau "No bank info" |
| Status | Badge: PAID (success) / PROCESSING (default) / PENDING (outline) |
| Date | Formatted payout date |
| Amount | Full currency |
| Action | "Reconcile" (non-PAID) / "View Slip" (PAID) + Delete (X icon) |

Search: client-side pada tutor name. Status filter: All / PENDING / PROCESSING / PAID. Pagination: 10/page.

#### Tombol Halaman

| Tombol | Aksi |
|---|---|
| Generate Salaries | `POST /api/admin/payouts/generate-salaries` |
| + New Payout | Buka Create Payout modal |

#### Create Payout Modal

| Field | Type | Notes |
|---|---|---|
| Tutor | select | Dari `GET /api/admin/tutors?limit=100` |
| Period Start | date | Untuk auto-calculation |
| Period End | date | Untuk auto-calculation |
| "Calculate" button | action | `GET /api/admin/payouts/calculate?tutor_id=&period_start=&period_end=` |
| Session Breakdown | read-only list | Per session: date + class name + tutor fee |
| Overlap Warning | amber alert | Jika `calculation.overlap_warning` |
| Amount | number | Pre-filled dari calculation, editable |
| Date | date | Default today |
| Description | text | Opsional |

Submit: `POST /api/admin/payouts` (status: PENDING)

#### Reconciliation View (full-page)

**Left panel — Payout Details:**
- Tutor name, Bank Account, Payout Date, Base Amount
- Period range, Description

**Left panel — Proof of Payment:**
- Drag-and-drop upload zone (image/PDF)
- Upload: `POST /api/uploads/proofs` → update payout `proof_url`

**Right panel — Payout Summary (dark bg):**
- Tutor avatar + name + bank info
- Base Amount (read-only)
- Bonus input (editable, disabled saat PAID)
- Deduction input (editable, disabled saat PAID)
- Formula: `Base + Bonus - Deduction`
- **Net Payout** (large, live-calculated)

**Right panel — Status Milestones:**
PENDING → PROCESSING → PAID (visual steps)

**Header Buttons:**

| Tombol | Kondisi | Aksi |
|---|---|---|
| Export Audit | Selalu | `GET /api/admin/payouts/:id/export-audit` → CSV download |
| Confirm & Generate Slip | Status != PAID | Set PAID + apply bonus/deduction |
| Download Payout Slip | PAID + `slip_url` ada | Open file |
| Generate Payout Slip | PAID + no `slip_url` | `POST /api/admin/payouts/:id/generate-slip` |

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/payouts?page=&limit=&status=` | List |
| GET | `/api/admin/payouts/:id` | Detail |
| POST | `/api/admin/payouts` | Create |
| PATCH | `/api/admin/payouts/:id` | Update (reconcile, confirm) |
| DELETE | `/api/admin/payouts/:id` | Delete |
| GET | `/api/admin/payouts/calculate` | Auto-calculate |
| POST | `/api/uploads/proofs` | Upload proof |
| POST | `/api/admin/payouts/:id/generate-slip` | Generate payout slip |
| GET | `/api/admin/payouts/:id/export-audit` | Export audit CSV |
| POST | `/api/admin/payouts/generate-salaries` | Generate salary payouts |

---

### 2.13 Operating Expenses

**Route:** `/finance/expenses`
**File:** `src/pages/Finance/OperatingExpenses.tsx`

#### Stats Cards (3)

| Card | Accent | Konten |
|---|---|---|
| Total Expenses | zinc | Sum amount page saat ini (client-side) + record count |
| Categories | indigo | Count active expense categories |
| Records Shown | emerald | `expenses.length` + progress bar % |

#### Tabel (5 kolom)

| Kolom | Konten |
|---|---|
| Date / ID | Formatted date + truncated ID (8 chars, monospace) |
| Category | Badge + "Recurring" indigo badge jika `is_recurring` |
| Description | Free text atau "-" |
| Amount | Right-aligned, bold |
| Actions | Receipt link + Edit + Delete |

Per-row actions:
- Receipt (ExternalLink) — buka URL (jika `receipt_url` ada)
- Edit (FileText) — buka Drawer edit mode
- Delete (Trash2) — konfirmasi dialog

#### Search & Filter
- **Search:** debounced 300ms, sent as `search` query param ke backend
- **Category:** dropdown, dynamic dari billing settings atau defaults (RENT, UTILITIES, SUPPLIES, MARKETING, OTHER)

#### Tombol Halaman

| Tombol | Aksi |
|---|---|
| Export | Placeholder — hanya toast |
| + Record Expense | Buka Drawer create mode |

#### Form (Drawer — Create/Edit)

| Field | Type | Required | Notes |
|---|---|---|---|
| Amount | number | Ya | - |
| Date | date | Ya | Default today |
| Category | select | - | Dari billing settings / defaults |
| Description | textarea (3 rows) | Tidak | - |
| Recurring | switch | - | Reveals frequency + end date |
| Frequency | Weekly/Monthly toggle | - | Muncul jika recurring ON |
| Recurrence End Date | date | Tidak | Muncul jika recurring ON |
| Receipt / Invoice | upload (drag-drop) | Tidak | image/* atau application/pdf |

Upload: `POST /api/uploads/receipts`

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/expenses?page=&limit=&category=&search=` | List |
| POST | `/api/admin/expenses` | Create |
| PATCH | `/api/admin/expenses/:id` | Update |
| DELETE | `/api/admin/expenses/:id` | Delete |
| POST | `/api/uploads/receipts` | Upload receipt |
| GET | `/api/admin/settings/billing` | Categories list |

#### Catatan
- "Total Expenses" dihitung client-side per page, bukan server aggregate
- Export button placeholder (tidak ada API call)

---

### 2.14 WhatsApp

**Route:** `/whatsapp`
**File:** `src/pages/WhatsApp.tsx`

#### Feature Gate
- Wrapped dalam `<FeatureLock feature="whatsappNotification">`
- Jika plan tidak include: opacity 50% + lock overlay + upgrade prompt
- Jika `FONNTE_TOKEN` tidak di-set: amber warning banner, tabs Payment Reminders dan Settings disabled

#### Tab 1: Messages (Log)

**Stats Cards (4):** Total Sent | Delivered | Read | Failed (scoped bulan ini)

**Tabel (6 kolom):**

| Kolom | Konten |
|---|---|
| Recipient | Phone number (E.164 format) |
| Template | Badge nama template |
| Status | PENDING (zinc) / SENT (blue) / DELIVERED (green) / READ (indigo) / FAILED (red) |
| Related To | payment / attendance / enrollment |
| Date | Formatted date |
| Error | Truncated error message (max 200px) |

**Filter:** Status | Date From | Date To | Related Type
**Pagination:** 20/page

**Detail Drawer (klik row):**
- Phone, Template (badge), Status (badge), Template parameters (chips), Error details (rose panel), Retry count, Related entity

#### Tab 2: Payment Reminders

- List PENDING/OVERDUE payments (searchable)
- "Send Reminder" button per payment → `POST /api/admin/whatsapp/payment-reminder/:paymentId`
- 24-hour dedup guard: jika sukses kirim < 24 jam lalu, skip

**Hardcoded template (Bahasa Indonesia):**
```
Assalamu'alaikum, Bapak/Ibu wali dari *{studentName}*.
Ini adalah pengingat pembayaran dari *{institutionName}*:
💰 Jumlah: Rp {amount}
📅 Jatuh tempo: {dueDate}
📋 Status: {statusLabel}
Mohon segera melakukan pembayaran. Terima kasih.
```

#### Tab 3: Settings

| Field | Type | Constraints |
|---|---|---|
| Auto-Reminders | Switch | on/off |
| Remind Days Before Due Date | number | min 1, max 7 |

Save: `PATCH /api/admin/whatsapp/settings`

#### Cron Job
- Daily 09:00 WIB (02:00 UTC)
- Auto-send: PENDING payments dalam `remindDays` window + OVERDUE payments
- Auto-retry: FAILED messages (retry_count < 3, last 24 hours)

#### API Endpoints

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/api/admin/whatsapp/stats` | Message stats (current month) |
| GET | `/api/admin/whatsapp/messages` | Message log (paginated) |
| GET | `/api/admin/whatsapp/settings` | Auto-reminder settings |
| PATCH | `/api/admin/whatsapp/settings` | Update settings |
| POST | `/api/admin/whatsapp/payment-reminder/:paymentId` | Manual send |
| POST | `/api/whatsapp/webhook` | Fonnte delivery callback (public) |

#### Catatan
- Hanya 1 template hardcoded (`payment_reminder`)
- Tidak ada free-text compose
- `attendance` dan `enrollment` message types ada di filter UI tapi belum ada send endpoint

---

### 2.15 Settings

**Route:** `/settings?tab=<id>`
**Files:** `src/pages/Settings/index.tsx`, `tabs/GeneralTab.tsx`, `tabs/BillingTab.tsx`, `tabs/AcademicTab.tsx`, `tabs/RegistrationTab.tsx`, `tabs/PlansTab.tsx`, `tabs/SecurityTab.tsx`

#### Tab Routing
- Default: `general`
- `mustChangePassword=true` → semua tabs disabled kecuali `security`, force redirect

---

#### Tab: General

| Field | Type | Default | Notes |
|---|---|---|---|
| Institution Name | text | Dari API | Required |
| Support Email | email | Dari API | Opsional |
| Phone | text | Dari API | Placeholder: +62 812 3456 7890 |
| Address | text | Dari API | Opsional |
| Timezone | select | Asia/Jakarta | WIB/WITA/WIT/Singapore/UTC |
| Default Language | select | id | ID / EN |

Save: ConfirmChangesModal (diff fields) → `PATCH /api/settings/general`. Jika language berubah, juga update i18n + localStorage.

---

#### Tab: Billing

**Section 1: Expense Categories**
- Badge chips list + X button per category
- Add: text input + "Add Category" button (trimmed, uppercased, no duplicates)

**Section 2: Bank Accounts**
- Card list: bank name + account number + account holder + trash icon
- Add form (toggle):
  - Bank Name (text, required)
  - Account Number (text, required)
  - Account Holder (text, required)
  - "Add Bank Account" / "Cancel"

Save: ConfirmChangesModal → `PATCH /api/settings/billing`

**Catatan:** `billing_mode`, `currency`, `invoice_prefix`, `late_payment_auto_lock`, `late_payment_threshold` ada di data model tapi TIDAK ada form UI di tab ini — dikelola SuperAdmin via BillingPaymentTab.

---

#### Tab: Academic

**Section 1: Working Days**
- 7 toggle buttons (Mon-Sun), min 1 harus aktif
- Save: ConfirmChangesModal → `PATCH /api/settings/academic`

**Section 2: Subject Categories**
- Badge list + X delete + Plus icon → inline input (auto-focus)
- Enter to add, Escape to cancel, duplicate check (case-insensitive)
- API CRUD: `POST /api/subjects` (create) | `DELETE /api/subjects/:id` (delete)

**Section 3: Grade Levels**
- Badge list (outline) + X delete + Plus → inline input
- Stored as JSON array dengan `{ id, name, order }`
- Save via `PATCH /api/settings/academic`

**Section 4: Room Management**

Tabel: Name | Type | Capacity | Status | Actions (Edit/Delete)

**Room Form Modal:**

| Field | Type | Options |
|---|---|---|
| Room Name | text | Required |
| Type | select | Classroom / Laboratory / Studio / Online |
| Capacity | number (min 1) | Hidden saat Type=Online |
| Status | select | Available / Maintenance / Unavailable |

Status badge: Available (green) / Maintenance (amber) / Unavailable (red)
Delete: ConfirmDialog (ketik konfirmasi)

---

#### Tab: Registration

| Control | Type | Behavior |
|---|---|---|
| Student Registration | toggle switch | Immediate save (no Save button) |
| Tutor Registration | toggle switch | Immediate save |
| Registration Link | read-only display | `sinaloka.com/register/{slug}` + "Salin" copy button |

API: `PATCH /api/settings/registration`

---

#### Tab: Plans

**SubscriptionStatusCard:**

| State | Warna | Konten |
|---|---|---|
| STARTER (no subscription) | zinc | "Free Plan - STARTER" + plan limits |
| ACTIVE (>7 hari) | emerald | Plan name + "AKTIF" + expiry date + days remaining |
| ACTIVE (<=7 hari) | amber | + "Perpanjang" button |
| GRACE_PERIOD | amber | + "Perpanjang" button |
| EXPIRED / CANCELLED | red | + "Upgrade Kembali" button |

**Pricing Cards (3):**

| Plan | Harga | Max Students | Max Tutors | WhatsApp | Adv. Reporting | Multi Branch |
|---|---|---|---|---|---|---|
| STARTER | Free | 30 | 5 | - | - | - |
| GROWTH | Paid | 200 | 20 | Ya | - | - |
| BUSINESS | Paid | Unlimited | Unlimited | Ya | Ya | Ya |

Action per card:
- Current plan → disabled "Current Plan"
- Higher plan → "Request Upgrade" → PaymentModal
- Lower plan → disabled, dimmed

**PaymentModal:**

| Field | Type | Notes |
|---|---|---|
| Payment Method | 2-button toggle | MIDTRANS (default) / MANUAL_TRANSFER |
| Proof URL | url input | Hanya muncul saat MANUAL_TRANSFER |

Submit:
- MIDTRANS → redirect ke `snap_redirect_url`
- MANUAL_TRANSFER → toast "Menunggu konfirmasi admin"

**InvoiceTable:** No. Invoice | Periode | Jumlah | Status (Lunas/Terkirim/Jatuh Tempo/Draft/Dibatalkan)

API:
- `GET /api/admin/plan` | `GET /api/subscription` | `GET /api/subscription/invoices` | `POST /api/subscription/pay`

---

#### Tab: Security

**Alert:** Amber banner jika `mustChangePassword=true`

| Field | Type | Validasi |
|---|---|---|
| Current Password | password (toggle) | Required |
| New Password | password (toggle) | Min 8, 1 uppercase, 1 digit |
| Confirm Password | password (toggle) | Must match new |

Live validation checklist: minLength / uppercase / digit

Submit: `POST /api/auth/change-password` → returns new tokens
- Jika `mustChangePassword`: redirect ke `/`
- Otherwise: fields reset, toast success

---

### 2.16 SuperAdmin: Institutions

**Route:** `/super/institutions`
**File:** `src/pages/SuperAdmin/Institutions.tsx`

#### Tabel (6 kolom)

| Kolom | Konten |
|---|---|
| Name | `name` (bold) + `slug` (monospace, gray) |
| Admins | List `users[].name` |
| Plan | Badge: STARTER (zinc) / GROWTH (blue) / BUSINESS (amber) |
| Status | Active (green) / Inactive (gray) |
| Created | Formatted date |
| Actions | Edit button + Enter button |

#### Tombol

| Tombol | Aksi |
|---|---|
| Create Institution | Navigate ke `/super/institutions/new` |
| Edit (per row) | Navigate ke `/super/institutions/:id` |
| Enter (per row) | Impersonate → navigate ke `/` |

#### Search & Pagination
- Text search → `search` query param (server-side)
- 20 items/page, prev/next + numbered buttons

#### API: `GET /api/admin/institutions?page=&limit=&search=`

---

### 2.17 SuperAdmin: Institution Detail

**Route:** `/super/institutions/:id`
**File:** `src/pages/SuperAdmin/InstitutionDetail.tsx`

#### Header
- Title: institution name + slug subtitle
- "Enter" button → impersonate

#### 5 Tabs

**Tab: General** — InstitutionForm (edit mode)

| Field | Type | Required |
|---|---|---|
| Name | text | Ya |
| Slug | read-only | - |
| Email | email | Tidak |
| Phone | text | Tidak |
| Address | text | Tidak |
| Timezone | select (WIB/WITA/WIT) | Tidak |
| Default Language | select (ID/EN) | Tidak |

Danger Zone: Deactivate/Activate (2-step inline confirm)

**Tab: Billing & Payment** — BillingPaymentTab

| Field | Type | Default | Notes |
|---|---|---|---|
| Billing Mode | 4-card selector | per_session | Manual/Per Sesi/Paket/Langganan |
| Currency | select | IDR | IDR/USD |
| Invoice Prefix | text | INV | Live preview |
| Auto-Lock Late Payment | switch | off | |
| Threshold (hari) | number | 7 | Min 1, max 90, muncul saat auto-lock ON |

Payment Gateway: static info card (Midtrans auto-connected)
Save: ConfirmChangesModal (diff detection) → `PATCH /api/settings/billing?institution_id=`

**Tab: Admins**
- Tabel: Name | Email
- "Add Admin" → modal: Name + Email + Password → `POST /api/admin/users`

**Tab: Overview**
- 4 stat cards: Students | Tutors | Admins | Active Classes
- API: `GET /api/admin/institutions/:id/summary`

**Tab: Plan**
- Current plan badge + usage stats (students/tutors count vs limit)
- Plan selector: STARTER/GROWTH/BUSINESS
- Downgrade warning jika usage exceeds new plan limits
- Save: `PATCH /api/admin/plan/institutions/:id`

---

### 2.18 SuperAdmin: Users

**Route:** `/super/users`
**File:** `src/pages/SuperAdmin/Users.tsx`

#### Tabel (7 kolom)

| Kolom | Konten |
|---|---|
| Name | Bold |
| Email | - |
| Role | Badge: ADMIN (blue) / TUTOR (purple) / PARENT (amber) / SUPER_ADMIN (red) |
| Institution | `institution.name` atau "—" |
| Status | Active (green) / Inactive (gray) |
| Last Login | Formatted date atau "Never logged in" |
| Actions | Edit button (ADMIN only) |

#### Filter

| Filter | Type | Options |
|---|---|---|
| Search | text | Name/email |
| Role | select | All / ADMIN / TUTOR / PARENT |
| Institution | select | Dynamic list (100 institutions) |
| Status | select | All / Active / Inactive |

Pagination: 20/page.

#### Create Admin Modal

| Field | Type | Required |
|---|---|---|
| Name | text | Ya |
| Email | email | Ya |
| Password | password | Ya |
| Institution | select | Ya |

Role hardcoded: ADMIN.

#### Edit User Modal (ADMIN only)

| Field | Type |
|---|---|
| Name | text |
| Email | email |
| Active | switch |

#### API Endpoints

| Method | Endpoint |
|---|---|
| GET | `/api/admin/users?page=&limit=&search=&role=&institution_id=&is_active=` |
| POST | `/api/admin/users` |
| PATCH | `/api/admin/users/:id` |
| GET | `/api/admin/institutions?limit=100` |

---

### 2.19 SuperAdmin: Upgrade Requests

**Route:** `/super/upgrade-requests`
**File:** `src/pages/SuperAdmin/UpgradeRequests.tsx`

#### Filter Tabs: ALL | PENDING | APPROVED | REJECTED

#### Tabel (6 kolom)

| Kolom | Konten |
|---|---|
| Name | Institution name |
| From → To | Two plan badges with arrow |
| Message | Truncated (line-clamp-2) |
| Status | PENDING (amber) / APPROVED (green) / REJECTED (red) |
| Created | Formatted date |
| Actions | "Approve / Reject" (PENDING only) |

#### Review Modal
- Current plan → Requested plan (badge visual)
- Institution name + Request message
- Review Notes (textarea, opsional)
- Buttons: Cancel / Reject (red) / Approve (filled)

#### API Endpoints

| Method | Endpoint |
|---|---|
| GET | `/api/admin/plan/upgrade-requests?status=` |
| PATCH | `/api/admin/plan/upgrade-requests/:id` |

---

### 2.20 SuperAdmin: Subscriptions

**Route:** `/super/subscriptions`
**File:** `src/pages/SuperAdmin/SubscriptionManagement.tsx`

#### Stats Cards

**Row 1 (4):** Starter count | Growth count | Business count | Expiring in 7 Days
**Row 2 (2):** Pending Payments | Revenue This Month

#### 3 Tabs

**Tab: Subscriptions**

| Kolom | Konten |
|---|---|
| Institution | Name |
| Plan | STARTER/GROWTH/BUSINESS badge |
| Status | ACTIVE (green) / GRACE_PERIOD (amber) / EXPIRED (red) / CANCELLED (zinc) |
| Expires At | Formatted date |
| Last Payment | Date atau "—" |
| Actions | "Override" button |

Override Modal: Plan Type + Expires At + Status + Notes (required)

**Tab: Pending Payments**

| Kolom | Konten |
|---|---|
| Institution | Name |
| Amount | Currency |
| Method | Raw string |
| Proof | Link (ExternalLink) atau "—" |
| Date | Formatted |
| Actions | Approve (green) + Reject (red) |

ConfirmPaymentModal: Amount + Method summary + Notes (opsional)

**Tab: Payment History**
Same table tanpa Actions, dengan Status column.

#### API Endpoints

| Method | Endpoint |
|---|---|
| GET | `/api/admin/subscriptions/stats` |
| GET | `/api/admin/subscriptions` |
| PATCH | `/api/admin/subscriptions/:id` |
| GET | `/api/admin/subscription-payments?status=` |
| PATCH | `/api/admin/subscription-payments/:id/confirm` |

---

### 2.21 SuperAdmin: Settlements

**Route:** `/super/settlements`
**File:** `src/pages/SuperAdmin/Settlements.tsx`

#### Summary Cards (3)

| Card | Data |
|---|---|
| Total Pending | IDR amount |
| Total Transferred | IDR amount |
| Total Platform Fee | IDR amount |

#### Toolbar
- Status filter: Semua Status / Pending / Transferred
- Item count display
- "Transfer N Item" button (muncul saat checkbox selected)

#### Tabel (9 kolom)

| Kolom | Konten |
|---|---|
| (checkbox) | Selectable jika PENDING |
| Tanggal | Formatted date |
| Institusi | Institution name |
| Siswa | Student name atau "—" |
| Jumlah | Gross amount (IDR) |
| Fee | Platform cost (IDR) |
| Transfer | Net transfer amount (IDR) |
| Status | PENDING (amber) / TRANSFERRED (green) |
| Aksi | "Transfer" button (PENDING) / transferred date (TRANSFERRED) |

Header checkbox: select/deselect all PENDING items.

#### Transfer Modal (single)

| Field | Type | Required |
|---|---|---|
| Tanggal Transfer | date | Ya (default today) |
| Catatan | textarea | Tidak |

Shows institution name + transfer amount.

#### Batch Transfer Modal

| Field | Type | Required |
|---|---|---|
| Tanggal Transfer | date | Ya (default today) |
| Catatan | textarea | Tidak |

Shows count of selected items.

#### API Endpoints

| Method | Endpoint |
|---|---|
| GET | `/api/admin/settlements/summary` |
| GET | `/api/admin/settlements?status=&page=&limit=` |
| PATCH | `/api/admin/settlements/:id/transfer` |
| PATCH | `/api/admin/settlements/batch-transfer` |

---

## 3. Business Flow yang Sudah Berjalan

### 3.1 Onboarding Institusi
```
SuperAdmin create institution
  → Set billing config (mode, currency, prefix)
  → Create first admin account
  → Admin login
  → Setup settings (general, academic, billing, registration)
```

### 3.2 Manajemen Siswa
```
Admin add student (manual / CSV import / Registration approval)
  → Student record aktif
  → Enroll ke class
  → Payment tracking dimulai
```

### 3.3 Manajemen Tutor
```
Admin invite tutor (email)
  → Email invite terkirim (token, 48h expiry)
  → Tutor accept + set password + bank details
  → Admin verify (opsional)
  → Assign ke class
```

### 3.4 Siklus Akademik
```
Admin setup subjects + rooms + grade levels
  → Create class (subject + tutor + schedule + fee + capacity)
  → Generate sessions (N hari ke depan)
  → Jadwal terisi di calendar
```

### 3.5 Enrollment
```
Admin enroll student ke class
  → Pilih Active atau Trial
  → Auto Invoice ON → payment status PENDING
  → Enrollment record aktif
```

### 3.6 Siklus Jadwal & Attendance
```
Sessions generated di calendar
  → Admin/Tutor mark attendance (Present/Absent/Late + homework + notes)
  → Save → Dashboard stats update
  → Tutor bisa request reschedule → Admin approve/reject
```

### 3.7 Registrasi Publik
```
Calon siswa/tutor isi form di landing page (sinaloka.com/register/{slug})
  → Registration record PENDING
  → Sidebar badge count update (polling 60s)
  → Admin review → Approve / Reject
  → Student: langsung create record
  → Tutor: kirim invitation email
```

### 3.8 Keuangan — Payments
```
Payment auto-generated dari enrollment (PENDING)
  → Admin record payment (manual: transfer/cash/other)
  → Atau: Admin send invoice link (Midtrans checkout)
  → Parent bayar via Midtrans → webhook update status
  → Generate invoice PDF
  → WhatsApp reminder (manual atau auto-cron)
```

### 3.9 Keuangan — Payouts
```
Admin calculate payout per tutor (berdasarkan sessions dalam period)
  → Create payout record (PENDING)
  → Reconcile: adjust bonus/deduction + upload proof
  → Confirm & Generate Slip → status PAID
  → Export audit trail CSV
```

### 3.10 Keuangan — Expenses
```
Admin record expense (amount, date, category, description)
  → Upload receipt (opsional)
  → Set recurring (weekly/monthly, opsional)
  → Track di expense table + dashboard stats
```

### 3.11 Keuangan — Reports
```
Admin pilih period (month/quarter/year/custom)
  → View: profit flow, revenue breakdown, expense breakdown, charts
  → Generate PDF report (attendance/finance/student progress)
  → Export CSV (payments/payouts/expenses)
```

### 3.12 Subscription & Billing
```
Admin request upgrade (STARTER → GROWTH → BUSINESS)
  → Pilih method: Midtrans (redirect) atau Manual Transfer (upload proof URL)
  → SuperAdmin review + approve/reject
  → Plan upgraded → new limits applied
  → Invoice history tracked
```

### 3.13 WhatsApp Notifications
```
Manual: Admin klik "Send Reminder" per payment
Auto: Cron daily 09:00 WIB
  → Fonnte API call → WhatsApp message terkirim
  → Delivery tracking via webhook (sent/delivered/read/failed)
  → Auto-retry failed (max 3x, 24h window)
```

### 3.14 Settlements (SuperAdmin)
```
Payment masuk via Midtrans
  → Settlement record created (gross_amount - platform_cost = transfer_amount)
  → SuperAdmin review → Transfer (single atau batch)
  → Record transferred_at + notes
```

---

## 4. Saran & Temuan

### 4.1 UX Bugs & Issues

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| 1 | Command Palette search tidak berfungsi — ada input tapi tidak ada `onChange` | Dashboard | Low |
| 2 | Keyboard navigation hint ada tapi tidak implemented | Dashboard | Low |
| 3 | Filter change tidak reset page ke 1 | Students | Medium |
| 4 | Tutor filtering semua client-side — search/filter hanya berlaku pada 20 items per page | Tutors | High |
| 5 | "Send Reminder" CreditCard button adalah UI stub, tidak wired ke API | Enrollments | Medium |
| 6 | Registration detail tidak ditampilkan (grade, parent info, experience tersedia tapi hidden) | Registrations | Medium |
| 7 | Session edit tidak ada UI (hook + DTO ready) | Schedules | Medium |
| 8 | "Revenue Analytics" button hanya show toast "Coming Soon" | Payments | Low |
| 9 | Expense Export button placeholder (tidak ada API call) | Expenses | Low |
| 10 | "Send Receipt" checkbox di Record Payment modal tidak wired | Payments | Low |
| 11 | Active/Inactive student counts dihitung per page, bukan total — misleading | Students | Medium |
| 12 | Expense "Total" dihitung client-side per page — misleading | Expenses | Medium |
| 13 | SuperAdmin impersonation di Dashboard menampilkan institution name dari JWT, bukan impersonated | Dashboard | Medium |
| 14 | Subject colors hanya 3 subject hardcoded (Math/Science/English) | Schedules | Low |
| 15 | `useAttendanceSummary` hook imported tapi tidak digunakan | Attendance | Low |
| 16 | Payment gateway settings endpoint ada tapi tidak ada tab UI | Settings | Low |

### 4.2 Missing Features — Prioritas Tinggi

| # | Feature | Alasan |
|---|---|---|
| 1 | **Forgot Password flow** | Saat ini tidak ada cara reset password kecuali admin |
| 2 | **Email notifikasi ke registrant saat reject** | User experience — registrant tidak tahu statusnya |
| 3 | **Registration detail view** | Data sudah ada tapi tidak ditampilkan, admin sulit review |
| 4 | **Server-side filtering pada Tutors** | Backend sudah support tapi UI kirim hanya page+limit |
| 5 | **Session edit UI** | Hook dan DTO ready, hanya perlu form |

### 4.3 Missing Features — Prioritas Sedang

| # | Feature | Alasan |
|---|---|---|
| 6 | **Notification center (in-app)** | Saat ini hanya WhatsApp, tidak ada in-app notifications |
| 7 | **Audit log** | Siapa melakukan apa, kapan — penting untuk akuntabilitas |
| 8 | **Dashboard charts** | Finance Overview sudah punya Recharts, Dashboard tidak |
| 9 | **Custom WhatsApp templates** | Saat ini hardcoded 1 template bahasa Indonesia |
| 10 | **Bulk operations pada Tutors** | Students dan Enrollments sudah punya, Tutors belum |
| 11 | **Student academic progress tracking** | Report endpoint ada tapi tidak ada UI input progress |
| 12 | **Attendance summary per class** | Hook `useAttendanceSummary` ada tapi tidak dipakai |

### 4.4 Missing Features — Prioritas Rendah

| # | Feature | Alasan |
|---|---|---|
| 13 | **Student/Tutor profile photos** | Saat ini hanya initials avatar |
| 14 | **Multi-branch support** | Tercantum di pricing card tapi belum implemented |
| 15 | **Advanced Reporting** | Tercantum di pricing card, report masih basic |
| 16 | **Redirect after login (`?redirect=`)** | UX improvement — kembali ke halaman sebelum login |
| 17 | **Payment gateway settings UI** | Endpoint ada, tab belum |
| 18 | **Enrollment conflict check UI** | `check-conflict` endpoint ada, tidak dipanggil |

### 4.5 Data Integrity Concerns

| # | Concern | Detail |
|---|---|---|
| 1 | Stats per-page bukan per-total | Students Active/Inactive dan Expense Total dihitung dari page saat ini |
| 2 | Impersonation identity leakage | Dashboard menampilkan institution name dari JWT, bukan dari impersonated institution |
| 3 | Subject colors hardcoded | Hanya 3 subject punya warna, lainnya tanpa warna — inkonsisten |
| 4 | Registration response shape mismatch | Backend mungkin sudah pakai `meta.total` tapi frontend masih baca `data.total` |
