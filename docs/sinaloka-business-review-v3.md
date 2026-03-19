# SINALOKA — Business Review v3.0

**Education Ecosystem Platform**
**Maret 2026 — Post-Development Sprint Update**

---

## 1. Status Update dari v2.0

Business Review v2.0 menetapkan visi pergeseran dari tutoring management system ke education ecosystem platform. Sejak saat itu, development sprint intensif telah dilakukan. Dokumen ini meng-update status fitur yang **sudah terbangun** di codebase per Maret 2026.

### Perubahan Signifikan dari v2.0

| Area | Status di v2.0 | Status Sekarang (v3.0) |
|------|----------------|------------------------|
| Parent Portal | "P0 KRITIS — belum ada" | **Terbangun** — sinaloka-parent sudah live dengan dashboard, child monitoring, attendance/sessions/payments/enrollments view |
| WhatsApp Notification | "Stub — tinggal diaktifkan" | **Terbangun** — WhatsApp Cloud API (Meta Graph API v21.0) terintegrasi penuh: payment reminder, status tracking, auto-reminder cron, settings UI |
| Billing Modes | "Manual payment tracking" | **Terbangun** — 4 billing modes (manual, per_session, package, subscription), auto-invoice generation, batch payment recording |
| Tutor Invite System | Tidak disebutkan | **Terbangun** — Full invite flow: admin invite → email → token validation → password setup → account activation |
| Password Reset | Tidak disebutkan | **Terbangun** — Forgot password flow dengan email token di semua 3 apps |
| Settings Page | Tidak disebutkan | **Terbangun** — 3 section settings (General, Billing, Academic) dengan scroll-spy UI |
| Reporting & Analytics | "Dashboard KPI sudah ada" | **Terbangun** — PDF reports (attendance, finance, student progress), financial summary API, revenue/expense breakdown, CSV export |
| Recurring Expenses | "P3" | **Terbangun** — Recurring expense system dengan auto-generation (weekly/monthly) |
| Auto Payout System | Tidak disebutkan | **Terbangun** — 3 payout modes (fixed per session, per student attendance, monthly salary) + monthly salary cron |
| SuperAdmin Panel | Tidak disebutkan | **Terbangun** — Institution management, impersonation, admin user management |
| Internationalization | Tidak disebutkan | **Terbangun** — Bilingual (Bahasa Indonesia / English) di platform admin |

---

## 2. Fitur Lengkap yang Sudah Terbangun

### 2.1 Backend (sinaloka-backend)

**22 modul** dengan 100+ API endpoint, multi-tenant architecture, JWT auth dengan refresh token rotation.

#### Manajemen Akademik

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **Student** | 7 endpoints | CRUD, CSV import/export (bulk up to 500 rows), validasi per-row, filter & search, pagination |
| **Tutor** | 10 endpoints | CRUD, invite flow, subject assignment, profile self-service, bank info, verification status |
| **Class** | 5 endpoints | CRUD dengan capacity, fee, tutor fee mode (3 modes), weekly schedules, room assignment |
| **Subject** | 5 endpoints | CRUD per institution, deletion protection (if referenced), tutor-by-subject lookup |
| **Enrollment** | 10 endpoints | Full lifecycle (TRIAL→ACTIVE→WAITLISTED→DROPPED), conflict detection, auto-payment generation, CSV import/export, bulk update/delete |

#### Operasional & Penjadwalan

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **Session** | 12 endpoints | CRUD, bulk generation dari class schedules, reschedule workflow (tutor request → admin approve/reject), session completion dengan auto-payout, tutor schedule view |
| **Attendance** | 5 endpoints | Batch create (tutor), per-session view (admin), summary aggregation, auto-invoice trigger on present/late |

#### Keuangan

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **Payment** | 10 endpoints | CRUD, auto-overdue detection, batch record, subscription generation, overdue summary, invoice PDF generation, payment reminder trigger |
| **Payout** | 9 endpoints | CRUD, session-based calculation, monthly salary auto-generation (cron), payout slip PDF, audit CSV export, tutor self-service view |
| **Expense** | 6 endpoints | CRUD, free-text categories, recurring expenses (weekly/monthly) with auto-generation, receipt upload |
| **Invoice Generator** | Service | Auto-generates payments based on billing mode: per_session (on attendance), package (on enrollment) |

#### Reporting & Analytics

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **Dashboard** | 3 endpoints | Stats (students, tutors, monthly revenue, attendance rate, upcoming sessions), activity feed (20 items), upcoming sessions list (5 items) |
| **Report** | 7 endpoints | PDF reports (attendance, finance, student progress) with bilingual support, financial summary with 6-month trend, revenue/expense breakdown, CSV export |

#### Settings & Configuration

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **Settings** | 6 endpoints | General (name, email, phone, timezone, language), Billing (mode, currency, invoice prefix, late payment rules, expense categories, bank accounts), Academic (rooms, subject categories, grade levels, working days) |

#### Komunikasi

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **WhatsApp** | 6 endpoints + webhook | Meta Cloud API v21.0, template messages (payment_reminder), status tracking (sent/delivered/read/failed), auto-reminder cron, phone normalization (E.164), 24h dedup, configurable settings |
| **Email** | Service only | Password reset emails |

#### Auth & User Management

| Modul | Endpoint | Fitur |
|-------|----------|-------|
| **Auth** | 8 endpoints | Login, refresh token rotation, logout, profile, forgot/reset password, parent registration via invite |
| **User** | 5 endpoints | CRUD untuk system users (SUPER_ADMIN/ADMIN/TUTOR), scoped per institution |
| **Institution** | 6 endpoints | SUPER_ADMIN-only institution CRUD, auto-slug generation, summary stats, admin creation in transaction |
| **Invitation** | 2 public endpoints | Tutor invite token validation dan acceptance (72h expiry) |
| **Parent** | 12 endpoints | Admin: invite, list, link/unlink students. Parent: children dashboard, per-child attendance/sessions/payments/enrollments |

#### Infrastructure

| Modul | Fitur |
|-------|-------|
| **Upload** | Local filesystem storage (receipts, proofs, logos), 5MB limit, tenant-scoped access |
| **Multi-tenancy** | TenantInterceptor, institution_id JWT payload, SUPER_ADMIN cross-tenant |
| **RBAC** | 4 roles: SUPER_ADMIN, ADMIN, TUTOR, PARENT |

### 2.2 Platform Admin (sinaloka-platform)

**19 halaman** dengan dark mode, i18n (EN/ID), Framer Motion animations.

| Halaman | Fitur Utama |
|---------|-------------|
| **Dashboard** | Hero greeting (time-based), bento stats grid, overdue alert, activity feed, upcoming sessions, command palette, quick actions |
| **Students** | Table + search + filters, add/edit modal, CSV import, detail drawer |
| **Tutors** | Grid/list toggle, invite modal, edit modal, resend/cancel invite, subject filter |
| **Classes** | Stats overview, timetable view, CRUD, generate sessions modal |
| **Schedules** | 4 calendar views (month/week/day/list), color-coded by subject, session detail drawer |
| **Enrollments** | Stats cards, CRUD, conflict check, CSV import, bulk operations |
| **Attendance** | Date navigation, per-session attendance panel, keyboard shortcuts (P/A/L), homework tracking, sticky save bar |
| **Finance Overview** | Period selector (month/quarter/YTD/custom), profit flow equation, revenue/expense charts, breakdown views, CSV export, report generation |
| **Student Payments** | Status filters, record payment drawer, batch record, invoice generation, overdue summary |
| **Tutor Payouts** | List/reconciliation toggle, create with session calculation, proof upload, slip generation, monthly salary auto-gen |
| **Expenses** | Category filter, recurring toggle, receipt upload, dynamic categories from settings |
| **Settings** | Scroll-spy horizontal nav: General, Billing, Academic sections |
| **WhatsApp** | Stats overview, message log with filters, payment reminder sender, auto-reminder settings |
| **SuperAdmin: Institutions** | Table, search, create, impersonation |
| **SuperAdmin: Institution Detail** | 3 tabs: General, Admins, Overview stats |
| **SuperAdmin: Users** | System-wide user management |

### 2.3 Tutor App (sinaloka-tutors)

**4 auth routes + 4 tab views + 3 overlay views**, mobile-first design.

| View | Fitur |
|------|-------|
| **Auth** | Login, forgot password, reset password, accept invite |
| **Dashboard** | Greeting, pending payout, today's sessions, schedule cards with actions |
| **Schedule** | Full schedule with status filter, reschedule request, cancel, complete session |
| **Attendance** | Batch student attendance (P/A/L), homework checkbox, topic & summary (required), validation |
| **Payouts** | Total earnings summary (pending/paid), payout history, proof viewer |
| **Profile** | Avatar, subjects, rating, verified badge, edit profile, bank details |

### 2.4 Parent App (sinaloka-parent)

**4 auth screens + 3 tabs + child detail overlay**, mobile-first dengan Framer Motion transitions.

| View | Fitur |
|------|-------|
| **Auth** | Login, forgot password, reset password, register via invite token |
| **Dashboard** | Greeting, children count, billing status, child cards (attendance rate, pending payments) |
| **Children** | List semua anak dengan grade dan attendance rate |
| **Child Detail** | 4 sub-tabs: Kehadiran (attendance history + stats), Sesi (past/upcoming), Bayar (payment history), Kelas (enrollment list) |
| **Profile** | Name, email, logout |

---

## 3. Database Schema (20 Models)

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| Institution | Multi-tenant root, settings JSON | → Users, Students, Tutors, Classes |
| User | Auth identity, 4 roles | → Institution, RefreshToken, PasswordResetToken |
| Student | Learner profile | → Enrollments, Attendance, Payments, ParentStudent |
| Tutor | Instructor profile + bank info | → User, Classes, TutorSubject, Payouts, Invitation |
| Parent | Parent profile | → User, ParentStudent |
| ParentStudent | Parent-child link (M:N) | → Parent, Student |
| ParentInvite | Invite token for parent onboarding | → Institution |
| Invitation | Tutor invite flow | → Tutor, Institution |
| Class | Course offering | → Tutor, Subject, ClassSchedule, Sessions, Enrollments |
| ClassSchedule | Weekly recurring slots | → Class |
| Subject | Discipline per institution | → TutorSubject, Classes |
| TutorSubject | Tutor teaches subject (M:N) | → Tutor, Subject |
| Enrollment | Student-class link + lifecycle | → Student, Class, Payments |
| Session | Actual class occurrence | → Class, Attendance |
| Attendance | Per-session student record | → Session, Student |
| Payment | Student billing record | → Student, Enrollment, Institution |
| Payout | Tutor payment record | → Tutor, Institution |
| Expense | Operational cost | → Institution |
| WhatsappMessage | WA Cloud API outbox | → Institution |
| RefreshToken | JWT rotation | → User |
| PasswordResetToken | Password reset flow | → User |

---

## 4. Gap Analysis Update — v2 vs v3

### Gap yang Sudah Ditutup

| Gap dari v2.0 | Prioritas v2 | Status v3.0 |
|---------------|-------------|-------------|
| Parent / Student Portal | P0 KRITIS | **SELESAI** — sinaloka-parent live |
| Notifikasi WhatsApp | P0 KRITIS | **SELESAI** — WhatsApp Cloud API integrated |
| Recurring Billing & Package Pricing | P3 | **SELESAI** — 4 billing modes + auto-invoice |
| PDF Reports | P2 (implisit) | **SELESAI** — 3 jenis report + bilingual |
| Advanced Analytics | P2 | **SEBAGIAN** — Financial summary, revenue/expense breakdown, monthly trends (6 bulan) |

### Gap yang Masih Terbuka

| Gap | Prioritas | Catatan |
|-----|-----------|---------|
| **Online Payment Gateway (Midtrans/Xendit)** | P0 KRITIS | Belum terintegrasi. Payment tracking sudah lengkap tapi masih manual record. Ini blocker utama untuk revenue. |
| **Student Learning Outcomes / Progress Tracking** | P1 | Attendance dan session data sudah lengkap, tapi belum ada assessment/nilai/rapor murid |
| **Tutor Competency Assessment & Verified Badge** | P1 | Tutor `is_verified` field ada tapi di-set manual oleh admin. Belum ada assessment system |
| **AI Gap Analysis (Gemini)** | P1 | @google/genai terpasang di tutor app, belum aktif |
| **Online/Hybrid Class Support** | P2 | Zoom/Meet integration belum ada |
| **Lead Management & Public Trial Booking** | P2 | Belum ada public landing page per institusi |
| **Cloud Storage Migration** | P3 Tech Debt | Masih local filesystem. Harus migrasi ke S3/GCS sebelum production |
| **Tutor Marketplace** | P3 Long-term | Menunggu verified tutor system |

---

## 5. Arsitektur & Tech Stack (Current)

| Layer | Teknologi | Status |
|-------|-----------|--------|
| Backend | NestJS 11, PostgreSQL, Prisma ORM, JWT + Refresh Token, Zod, PDFKit | Production-ready |
| Platform (Admin) | React 19, TypeScript 5.8, Vite 6, TailwindCSS v4, TanStack Query, React Router, Framer Motion, Recharts, i18n | Production-ready |
| Tutor App | React 19, TypeScript 5.8, Vite 6, TailwindCSS v4, Axios, Framer Motion | Production-ready |
| Parent App | React 19, TypeScript 5.8, Vite 6, TailwindCSS v4, Axios, Framer Motion | Production-ready |
| Communication | WhatsApp Cloud API (Meta Graph v21.0), SMTP Email | Operational |
| Testing | Jest (backend unit), Playwright (platform E2E), smoke + dark/light mode | CI-integrated |
| CI/CD | GitHub Actions (per-app workflows), path-based triggers, security audit | Automated |
| Storage | Local filesystem (UPLOAD_DIR) | Needs migration |
| AI (planned) | Google Gemini API (@google/genai installed) | Not yet active |

---

## 6. Metrik Codebase

| Metrik | Angka |
|--------|-------|
| Backend modules | 22 |
| API endpoints | 100+ |
| Prisma models | 20 |
| Frontend apps | 3 (platform, tutors, parent) |
| Platform pages | 19 |
| Tutor app views | 11 (4 auth + 4 tabs + 3 overlays) |
| Parent app views | 8 (4 auth + 3 tabs + 1 detail overlay) |
| Backend unit test suites | Per-module (Jest) |
| E2E test suites | Playwright (smoke, light mode, dark mode) |
| Supported languages | 2 (ID, EN) |
| Roles | 4 (SUPER_ADMIN, ADMIN, TUTOR, PARENT) |

---

## 7. Roadmap Update — Prioritas Berikutnya

Berdasarkan gap analysis v3, prioritas development berikutnya:

### Immediate (Fase Berikutnya)

1. **Payment Gateway Integration (Midtrans/Xendit)** — Blocker utama untuk revenue. Infrastructure payment tracking sudah siap, tinggal connect gateway.
2. **Onboarding Wizard** — First-time setup flow untuk institusi baru agar bisa langsung produktif.
3. **Cloud Storage Migration** — Migrasi dari local filesystem ke S3/GCS sebelum user volume meningkat.

### Near-term (Fase 2)

4. **Student Assessment / Bank Soal** — Mulai dengan kurasi manual soal eksakta SMA. Core differentiator.
5. **Tutor Competency Assessment** — Ujian kompetensi per mata pelajaran, verified badge system.
6. **Lead Management** — Public landing page per institusi + trial booking.

### Medium-term (Fase 3)

7. **AI Insight Engine (Gemini)** — Activate @google/genai untuk gap analysis murid.
8. **Online/Hybrid Class** — Zoom/Meet integration.
9. **Advanced Analytics** — Retention analysis, class profitability, trend forecasting.

---

## 8. Kesimpulan

Sejak Business Review v2.0, **3 gap kritikal dari 5 sudah ditutup**: Parent Portal, WhatsApp Notification, dan Billing Modes. Codebase sekarang memiliki **22 backend modul, 100+ API endpoint, dan 3 frontend app** yang production-ready.

**Gap terbesar yang tersisa:** Payment Gateway integration — satu-satunya blocker untuk mulai menerima revenue.

**Kekuatan kompetitif tetap valid:**
- Satu-satunya platform yang membangun verified tutor + AI assessment di atas management infrastructure
- Multi-tenant architecture sudah proven (20 Prisma models, 4 roles, tenant isolation)
- Full ecosystem (admin + tutor + parent) sudah terbangun — kompetitor langsung masih fokus di 1-2 user persona

**Next milestone:** Payment gateway integration → onboarding wizard → first paying customer.

---

*Dokumen ini diperbarui setiap akhir fase. Versi ini: v3.0 — Maret 2026.*
*Solo Founder · Bootstrapped · Claude Code sebagai leverage utama development*
