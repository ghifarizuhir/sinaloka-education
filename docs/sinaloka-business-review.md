# Sinaloka Business Review

> Updated: 2026-03-17 (previous: 2026-03-15)

## 1. Overview

Sinaloka is a **multi-tenant educational institution management platform** targeting Indonesian tutoring centers (bimbel), private schools, and tuition institutions. It operates as a SaaS-style system with four applications sharing one backend:

| App | Target User | Purpose |
|-----|------------|---------|
| **sinaloka-backend** | API server | NestJS + PostgreSQL + Prisma backend |
| **sinaloka-platform** | Institution admins/owners | Full management dashboard |
| **sinaloka-tutors** | Tutors | Mobile-first schedule & attendance app |
| **sinaloka-parent** | Parents | Mobile-first child monitoring app |

### Tech Stack

- **Backend**: NestJS 11, PostgreSQL, Prisma ORM, JWT auth, Zod validation, PDFKit, Resend (email), WhatsApp Cloud API, csv-stringify, @nestjs/schedule (cron)
- **Platform (Admin)**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, React Query, React Router 7, Framer Motion, Recharts, react-i18next, Sonner (toasts), Lucide icons
- **Tutors App**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Axios, Framer Motion, `@google/genai`
- **Parent App**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Axios, Motion (Framer Motion)

---

## 2. Existing Features

### 2.1 Academic Management

- **Student Management** — Full CRUD with parent contact info (name, phone, email), free-text grade field (UI defaults: 10th-12th), active/inactive status, server-side pagination (20/page), search by name/email, filter by grade/status, sort by name/grade/enrolled_at/created_at. CSV bulk import with row-level error reporting and template download. CSV export with filters. Multi-select with bulk delete. Overdue payment flagging (amber indicator). Parent invite integration from student detail. Column visibility toggle for email.
- **Tutor Management** — Profiles with subjects (array), experience years (0-30), admin-set rating (0-5), verification status, bank details (name/number/holder) for payouts. Invitation-based onboarding: admin invites via email → tutor sets password → account activates. Resend/cancel invite supported. Grid and list view modes. Filter by subject/verified status. Self-service profile endpoint (tutors can update own availability and bank details). No CSV import/export or bulk operations.
- **Class Management** — Name, subject, capacity, three fee tiers (per-session `fee`, `package_fee`, `tutor_fee`), recurring schedule (Mon-Sun with HH:mm start/end validation), room assignment, tutor assignment (dropdown), active/archived status. Detail drawer shows enrolled students list and capacity utilization. Stats overview cards (total monthly fee, class counts). No CSV import/export or bulk operations. **Bug**: `package_fee` and `tutor_fee` are accepted in create DTO but silently dropped during creation (only persisted on update).
- **Enrollment Lifecycle** — Statuses: ACTIVE, TRIAL, WAITLISTED, DROPPED. No enforced state machine — any status can transition to any other via edit. UI provides guided transitions (Convert to Full for trials, Drop for active). Automatic schedule conflict detection on creation (day + time overlap check, rejects with ConflictException). Auto-payment generation on enrollment via InvoiceGeneratorService (package billing mode). Multi-student enrollment modal with class selection and ACTIVE/TRIAL toggle. Unique constraint prevents duplicate student-class pairs. Overdue student flagging (amber row highlight).
- **Bulk Operations** — Students: multi-select bulk delete, CSV import (with validation), CSV export (filtered), import template download. Enrollments: multi-student selection for batch enrollment. **Stubs**: Enrollment CSV import (UI modal exists, no backend endpoint), enrollment CSV export (button exists, no mutation wired), enrollment multi-select checkboxes (visual only, no bulk actions).

### 2.2 Operations & Scheduling

- **Session Management** — Full CRUD with 4-state workflow: SCHEDULED → COMPLETED (admin update or tutor complete), SCHEDULED → CANCELLED (admin/tutor cancel), SCHEDULED → RESCHEDULE_REQUESTED (tutor request), RESCHEDULE_REQUESTED → SCHEDULED (admin approve/reject). Auto-generation from class schedule over date range with duplicate detection (date string comparison). Tutor fee auto-captured to session on completion (`tutor_fee_amount` copied from class).
- **Calendar Views** — Month view (fully implemented, color-coded session chips by subject), day view (hourly timeline 8:00-21:00), and list view (table with filters). **Week view is a placeholder** (shows "coming soon" message). Date navigation with prev/next and "Today" button. Filters: date range, class, status. Session detail drawer with attendance list, reschedule info, and action buttons.
- **Tutor Reschedule Workflow** — Full end-to-end: tutor submits proposed date/time/reason (max 500 chars, required) → session becomes RESCHEDULE_REQUESTED → admin sees amber badge → approves (updates session date/time to proposed values) or rejects (clears proposed values, reverts to SCHEDULED). Tutor ownership verified at service level.
- **Attendance Tracking** — Platform: session-based with P/A/L toggle buttons, keyboard shortcuts (P/A/L keys for focused row), homework completion checkbox, per-student notes (max 500 chars), "Mark All Present" bulk action, pending changes tracking with sticky save bar (discard/save), incomplete session flagging (past SCHEDULED sessions get red indicator). Tutor app: similar features but **lacks per-student notes input**. Batch creation with duplicate prevention (ConflictException on existing session+student pairs). **Critical**: Attendance marking (PRESENT/LATE) automatically triggers `InvoiceGeneratorService.generatePerSessionPayment()` — creates a payment record per attended session.
- **Session Documentation** — `topic_covered` (max 500, required for tutor completion, optional for admin), `session_summary` (max 2000, always optional). Displayed in session detail drawer (platform) and session detail page (tutor app).

### 2.3 Financial Management

- **Student Payments** — Status tracking: PENDING → OVERDUE (auto, when due_date passes via `refreshOverdueStatus()` on every list query) → PAID (manual via Record Payment modal). Payment methods: CASH, TRANSFER, OTHER. Invoice number auto-generation (sequential per month, format: `{prefix}{YYYYMM}-{NNN}` with serializable transaction isolation). PDF invoice generation: bilingual (id/en based on institution language), A4 format, institution branding with logo, bank account payment instructions from billing settings, stored to filesystem. Overdue summary endpoint with per-student debt aggregation and threshold-based flagging. **Stubs**: batch payment recording ("Coming Soon"), send reminder button (toast only), receipt upload (no backend endpoint).
- **Tutor Payouts** — Status workflow: PENDING → PROCESSING → PAID (manual transitions). Session-based calculation: sums `tutor_fee_amount` from COMPLETED sessions in period, with session-by-session breakdown and overlap detection warning. Reconciliation UI with bonus/deduction adjustments and net payout formula display. **Stubs**: proof of payment upload (UI exists, not connected to backend), export audit button (non-functional), payout slip download (non-functional).
- **Expense Tracking** — Custom string categories (no longer enum; defaults: RENT, UTILITIES, SUPPLIES, MARKETING, OTHER, configurable via billing settings). Date-based filtering. **Stubs**: receipt upload (no backend endpoint), recurring expense toggle (no backend support), search input (not wired to query). **Issue**: frontend hardcodes category list instead of reading from billing settings.
- **Finance Dashboard** — 4 KPI cards (total revenue, payouts, expenses, net profit with formula tooltip). Period selector: This Month, This Quarter, Year to Date (no custom range). Revenue by Month bar chart (6-month). Revenue breakdown: by class (table), by payment method (table), by status (badge cards). Expense breakdown: by category (table), monthly trend bar chart. Receivables table with overdue students. CSV export dropdown for payments/payouts/expenses. Report preview modal with in-browser PDF display.
- **PDF Reports** — 3 types: Attendance report (filterable by class/student, table format), Finance report (income/payouts/expenses/net profit summary), Student Progress report (attendance rate, homework rate, session-by-session detail with topic and notes). All generated via PDFKit with auto page-break. Reports are English-only (invoices are bilingual).
- **Billing Configuration** — 4 billing modes: manual (default), per_session (auto-payment per attended session), package (auto-payment per enrollment), subscription (UI only, no backend). Currency: IDR/USD. Invoice prefix customization. Late payment auto-lock with threshold. Custom expense categories. Bank account management for invoice instructions. All stored in `institution.settings.billing` JSON.

### 2.4 Dashboard & Analytics

- **KPI Cards** — Total students, active tutors (verified only), attendance rate %, monthly revenue (formatted with currency shorthand), upcoming sessions (7-day lookahead)
- **Overdue Alert Banner** — Conditional alert when overdue payments exist, showing count + total amount with link to payments page
- **Activity Feed** — Last 20 enrollments, payments, attendance records with icons, descriptions, relative timestamps, and category labels
- **Quick Actions** — Dropdown: quick enroll, record payment, add makeup class. Links: view all students, manage finance, attendance records
- **Command Palette** — Modal triggered by button/Cmd+K with search input, 4 quick actions (Enroll Student, Record Payment, Schedule Makeup, Add Tutor), keyboard shortcut hints. Full i18n support.

### 2.5 Tutor App (Mobile-First)

- **Dashboard** — Welcome greeting with first name, 2 stat cards (pending payout amount, today's class count), "Jadwal Hari Ini" section showing up to 2 upcoming sessions with "Lihat Semua" link
- **Schedule Management** — Filter by upcoming/completed/cancelled (toggleable buttons). Session cards with subject, status badge, date (Indonesian locale), time range, room. Action buttons: "Absen Murid" (Attendance), "Atur Ulang" (Reschedule), "Cancel" for upcoming sessions. "Absensi Selesai" indicator when attendance complete.
- **Self-Service Attendance** — Batch submission: P/A/L toggle per student, homework checkbox, topic covered (required for completion), session summary (optional), "Finalize & Close" triggers batch attendance creation + session completion. No per-student notes input (admin-only feature).
- **Payout History** — Total earnings, pending vs paid breakdown, transaction history with payout cards showing status, amount, proof URL viewer
- **Session Detail** — Read-only view of completed/cancelled sessions: status, date, time, topic, summary, attendance summary grid (present/late/absent counts), student list with status icons and homework badges
- **UI**: Hardcoded Indonesian language (no i18n framework). Uses plain Axios with custom hooks (not React Query).

### 2.6 Parent App (Mobile-First)

- **Auth Flow** — Admin invites parent via email + linked student IDs → parent receives invite link with token → registers (name + password) → auto-login. 72-hour invite token expiry. Auto-links additional students matching parent's email. Standard login for subsequent visits.
- **Dashboard** — Greeting with parent's first name, 2 KPI cards (children count, pending payment count), children list via ChildCard components (name, grade, attendance rate, enrollment count, next session, pending/overdue indicators)
- **Child Detail** — 4-tab view: Kehadiran (attendance records with summary stats), Sesi (sessions with status/topic/dates), Bayar (payments with status/amount/due date), Kelas (enrolled classes with schedule/tutor/fee)
- **Architecture** — Mobile-first dark theme (zinc-950 bg, lime-400 accent), state-based routing (no React Router), Motion page transitions with AnimatePresence, bottom navigation (Dashboard/Children/Profile), in-memory access token with localStorage refresh token, auto-refresh on 401 with dedup
- **Backend** — Dedicated parent module with `ParentStudentGuard` enforcing parent-child ownership on all endpoints. PARENT role in JWT payload. 6 parent-facing endpoints for children, attendance, sessions, payments, enrollments.

### 2.7 WhatsApp Integration

- **WhatsApp Cloud API** — Full Meta Graph API v21.0 integration (NOT a stub). Template message sending, webhook verification (hub challenge), webhook status tracking (PENDING → SENT → DELIVERED → READ → FAILED), HMAC SHA-256 signature verification.
- **Payment Reminders** — Manual send per payment + automated daily cron job at 09:00 WIB (02:00 UTC). Cron queries all institutions, finds PENDING payments due within N days or OVERDUE payments, sends reminders, retries FAILED messages (up to 3 retries). 24-hour deduplication prevents duplicate reminders. Phone normalization for Indonesian formats (0xxx → +62xxx).
- **Admin Dashboard** — 3-tab WhatsApp page: Messages (stats cards + filterable message table with detail drawer), Payment Reminders (list PENDING/OVERDUE payments with per-payment send button), Settings (auto-reminders toggle, remind days before 1-7). Not-configured warning banner.
- **Current Limitation** — Only `payment_reminder` template implemented. No attendance notifications, schedule change alerts, enrollment confirmations, or general messaging.

### 2.8 SuperAdmin & Institution Management

- **Institution Management** — Full CRUD for SUPER_ADMIN: list with search/pagination/status badges, create with optional first admin (atomic transaction), edit (name/address/phone/email/timezone/language), deactivation (delete disabled — must deactivate). Summary endpoint: student/tutor/admin/active class counts. Slug auto-generated from name.
- **Cross-Institution User Management** — List users across institutions with filters (role/institution/status). Create/edit admin users with institution assignment. Only ADMIN-role users editable from this view.
- **Impersonation** — SuperAdmin clicks "Enter" on institution → stores institution context in sessionStorage → all API calls scoped via `?institution_id=` query param. ImpersonationBanner component shown. Exit clears context. Not true identity impersonation (retains SUPER_ADMIN role).
- **Institution Security** — `is_active` flag checked on login and token refresh; inactive institutions block all user access.

### 2.9 Settings & Configuration

- **General Settings** — Institution name, email, phone, address, timezone (Asia/Jakarta, Singapore, Makassar, Jayapura, UTC), default language (id/en). Connected to backend.
- **Billing Settings** — Billing mode (manual/per_session/package/subscription), currency (IDR/USD), invoice prefix, late payment auto-lock with threshold, custom expense categories (add/remove tags), bank accounts (add/remove with name/number/holder). Connected to backend.
- **UI-Only Tabs** — Branding (logo upload, primary color, custom domain), Academic (working days, subject categories, grade levels, room management), Security (2FA, password policy), Integrations (WhatsApp, Midtrans, SendGrid, Google Calendar status cards). These tabs have no backend support.

### 2.10 Internationalization (i18n)

- **Platform** — Full i18n via react-i18next with Indonesian (id, default) and English (en) locales. ~50KB per locale file covering 20 sections (common, nav, layout, login, dashboard, students, tutors, classes, schedules, whatsapp, enrollments, attendance, finance, payments, payouts, expenses, settings, superAdmin, notFound, report). Language persisted to localStorage + institution settings. Auto-applied from institution's `default_language` on login.
- **Invoice PDFs** — Bilingual labels (id/en) based on institution language setting.
- **Tutor App** — No i18n framework. Hardcoded mix of Indonesian and English.
- **Parent App** — No i18n framework. Hardcoded Indonesian.
- **PDF Reports** — English-only (non-invoice reports).

### 2.11 Platform Architecture

- **Multi-Tenancy** — Institution-based data isolation via TenantInterceptor. SUPER_ADMIN can scope via `?institution_id=` query param. ADMIN/TUTOR/PARENT forced from JWT payload. All service methods filter by `tenantId`.
- **Role-Based Access** — 4 roles: SUPER_ADMIN (cross-institution), ADMIN (institution-scoped), TUTOR (self-service only), PARENT (child-scoped via ParentStudentGuard)
- **Authentication** — JWT with refresh token rotation, bcrypt (salt rounds 10) password hashing, forgot/reset password via Resend email (1-hour token expiry, forces re-login on all devices), parent registration via invite tokens (72-hour expiry). Access token: 15m default. Refresh token: 7d default. Email enumeration prevention on forgot password.
- **Email Service** — Resend provider with 2 templates: tutor invitation (Indonesian, 48-hour token) and password reset (Indonesian, 1-hour token). Inline HTML templates.
- **Invitation System** — Tutor invitations: admin invites → creates inactive user + tutor + invitation record → email sent → tutor accepts via token → sets password → activates. Statuses: PENDING, ACCEPTED, EXPIRED, CANCELLED. Parent invitations: admin invites with student IDs → token URL shared → parent registers → auto-linked. 72-hour expiry, no email notification (manual share).
- **Upload Module** — Local filesystem storage (`UPLOAD_DIR`), organized as `<institution_id>/<type>/<uuid>.<ext>`. Allowed: .jpg, .jpeg, .png, .pdf. Max: 5MB. Path traversal protection. Tenant-scoped file serving.
- **UI/UX** — Dark mode toggle (localStorage), responsive design with breakpoints, Framer Motion animations (staggered fade-in, scale + fade modals, page transitions), Sonner toasts, loading skeletons, sticky save bars, Lucide icons

---

## 3. Data Model Summary

```
Institution
├── Users (SUPER_ADMIN, ADMIN, TUTOR, PARENT)
├── Students
│   ├── Enrollments → Class
│   │   └── Payments (with invoice generation)
│   ├── Attendance (per session, triggers per-session billing)
│   └── ParentStudent → Parent
├── Tutors
│   ├── Classes → Sessions (tutor_fee captured on completion)
│   ├── Payouts (calculated from session fees)
│   └── Invitation
├── Parents
│   ├── ParentStudent → Student
│   └── ParentInvite
├── Expenses (custom string categories)
├── WhatsappMessages (template-based, status-tracked)
├── Settings (JSON in institution.settings)
└── Security
    ├── RefreshTokens (rotation-based)
    └── PasswordResetTokens (1-hour expiry)
```

**Key Entities**: Institution, User, Student, Tutor, Class, Enrollment, Session, Attendance, Payment, Payout, Expense, Parent, ParentStudent, ParentInvite, Invitation, WhatsappMessage, RefreshToken, PasswordResetToken

---

## 4. Revenue Model Assessment

### Current Model

B2B SaaS for tutoring institutions. Revenue is generated through class enrollment fees managed via the platform. Payments support three billing modes: manual tracking, auto per-session billing (triggered on attendance), and package billing (triggered on enrollment). Invoice PDF generation with bilingual support.

### Potential Revenue Streams

| Stream | Model | Notes |
|--------|-------|-------|
| SaaS Subscription | Per-institution monthly fee | Current implicit model |
| Transaction Fee | % of each student payment | Requires payment gateway integration |
| Marketplace Commission | % of tutor earnings | Requires marketplace features |
| Premium Features | Tiered plans (Basic/Pro/Enterprise) | Analytics, API access, white-label |
| Payment Processing | Spread on gateway fees | Common in EdTech platforms |

---

## 5. Gap Analysis & Improvement Opportunities

### ~~5.1 No Student/Parent Portal~~ — RESOLVED

~~There is no app for students or parents.~~

**Status**: The `sinaloka-parent` app is now fully implemented as a mobile-first SPA. Parents can view children's attendance, sessions, payments, and enrollments. Invite-based onboarding with dedicated backend module and ParentStudentGuard for ownership enforcement.

**Remaining gaps**: No online payment capability within the parent app (view-only). No tutor-parent communication. No student self-service portal.

### 5.2 No Online Payment Integration — HIGH PRIORITY

Payments are tracked manually (CASH, TRANSFER, OTHER). No payment gateway is integrated (e.g., Midtrans, Xendit, GoPay, OVO, Dana). Billing settings support multiple modes and bank account configuration, but actual collection is manual.

**Business Impact**: Manual payment tracking is error-prone and labor-intensive. Auto-collection via Indonesian e-wallets and virtual accounts would reduce late payments, improve cash flow predictability, and unlock transaction-fee revenue.

### ~~5.3 No Notifications / Messaging System~~ — PARTIALLY RESOLVED

~~No SMS, WhatsApp, email, or push notifications. The UI has WhatsApp reminder buttons but they are non-functional stubs.~~

**Status**: WhatsApp Cloud API integration is fully functional via Meta Graph API v21.0. Payment reminders work both manually and via automated daily cron job. Message history dashboard with stats, filtering, and retry logic. Email service exists for tutor invitations and password resets via Resend.

**Remaining gaps**: Only `payment_reminder` WhatsApp template implemented (no attendance, schedule, enrollment notifications). No SMS fallback. No push notifications. No general messaging capability. Email is limited to transactional (invitations + password reset).

### 5.4 No Student Learning Outcomes / Progress Tracking — MEDIUM PRIORITY

Only attendance rate and homework completion are tracked. Missing:
- Test scores and grades
- Learning objectives and curriculum progress
- Tutor feedback on student performance
- Report cards for parents

**Business Impact**: Learning outcomes are the core value proposition of tutoring. Without measurable progress, parents cannot assess the value of continued enrollment, increasing churn risk.

### 5.5 No Online/Hybrid Class Support — MEDIUM PRIORITY

The platform assumes all sessions are in-person (room-based). Missing:
- Video conferencing integration (Zoom, Google Meet)
- Online class links per session
- Digital whiteboard or content sharing

**Business Impact**: Hybrid tutoring is now an industry expectation. Competitors offering online options capture students who cannot attend in-person, expanding addressable market.

### 5.6 No Marketing / Lead Management — MEDIUM PRIORITY

Missing:
- Public landing page with trial class booking
- Lead capture and inquiry forms
- Referral program tracking
- Conversion funnel analytics (lead → trial → enrolled)

**Business Impact**: Student acquisition currently depends entirely on offline channels. A self-service discovery and trial mechanism would reduce customer acquisition cost and enable growth tracking.

### ~~5.7 No Subscription / Recurring Billing~~ — PARTIALLY RESOLVED

~~Fees are per-enrollment, not subscription-based.~~

**Status**: Three billing modes are now implemented — manual, per_session (auto-generates payment per attended session), and package (auto-generates single payment per enrollment). Invoice auto-numbering with bilingual PDF generation. Late payment threshold flagging. Custom expense categories. Bank account management for payment instructions.

**Remaining gaps**: Subscription billing mode exists in settings UI but has no backend implementation. No monthly auto-billing cycles. No discount management or promo codes.

### ~~5.8 No Advanced Analytics / Business Intelligence~~ — PARTIALLY RESOLVED

~~Dashboard has basic KPIs but lacks trend visualization.~~

**Status**: Finance Overview now includes revenue by month bar chart (6-month), revenue breakdown by class/payment method/status, expense breakdown by category with monthly trend chart, CSV export for all financial data, and receivables tracking with overdue flagging.

**Remaining gaps**: No student retention/churn analysis. No tutor utilization rates. No class profitability analysis. No cohort analysis. No custom date range picker (only preset periods). Week calendar view is a placeholder.

### 5.9 No Tutor Marketplace / Discovery — LOW-MEDIUM PRIORITY

Tutors are institution-bound. Missing:
- Public tutor profiles for discovery
- Subject/location-based search
- Student reviews and ratings (only admin-set ratings exist currently)

**Business Impact**: A marketplace model could be a future revenue stream — connecting independent tutors with students for a platform commission.

### 5.10 Local File Storage — TECHNICAL DEBT

Uploads are stored on the local filesystem (`UPLOAD_DIR`), not cloud storage (S3, GCS, or equivalent). Invoice PDFs, uploaded files stored at `<institution_id>/<type>/<uuid>.<ext>`.

**Business Impact**: Will not scale in production deployment, creates data loss risk, and prevents CDN-based performance optimization.

### 5.11 Unused AI Integration — UNTAPPED POTENTIAL

The tutor app has `@google/genai` (Gemini) installed but no visible AI features are implemented.

**Opportunity**: AI-powered lesson planning, automated student progress summaries, attendance pattern insights, or personalized learning recommendations could significantly differentiate the platform.

### ~~5.12 No Multi-Language Support~~ — RESOLVED (Platform)

~~UI text is a mix of English and Indonesian with no i18n framework.~~

**Status**: Platform app has full i18n via react-i18next with Indonesian and English locales (~50KB each, 20 sections). Invoice PDFs are bilingual. Language configurable per institution.

**Remaining gaps**: Tutor app has no i18n (hardcoded Indonesian/English mix). Parent app has no i18n (hardcoded Indonesian). PDF reports (non-invoice) are English-only.

### 5.13 UI Stubs & Non-Functional Features — TECHNICAL DEBT (NEW)

Multiple UI elements exist without backend support:
- **Expense receipt upload** — file picker UI, no upload endpoint
- **Payout proof upload** — reconciliation UI, not connected to backend
- **Enrollment CSV import** — modal with format guide, no backend endpoint
- **Enrollment CSV export** — button exists, no mutation wired
- **Enrollment multi-select** — checkboxes work, no bulk actions
- **Batch payment recording** — shows "Coming Soon"
- **Recurring expense toggle** — no backend support
- **Expense search input** — not wired to query
- **Settings tabs** (Branding, Academic, Security, Integrations) — UI mockups only
- **Subscription billing mode** — listed in settings, no backend logic
- **Revenue analytics button** (payments page) — shows "Coming Soon"

**Business Impact**: These stubs create user confusion and should either be completed or removed to maintain trust in the platform's functionality.

### 5.14 Known Bugs — TECHNICAL DEBT (NEW)

1. **Class create drops `package_fee` and `tutor_fee`** — DTO accepts these fields but `ClassService.create()` doesn't persist them. Only works on update.
2. **Class table shows 0 enrolled** — list endpoint doesn't return enrollment counts (only detail endpoint does).

---

## 6. Competitive Positioning

### Strengths

- Comprehensive feature set covering the full institution management lifecycle across 4 apps
- Multi-tenant architecture ready for horizontal scaling with institution deactivation controls
- Separate tutor AND parent apps demonstrate awareness of distinct user personas
- Modern tech stack with strong developer experience (React 19, NestJS 11, Prisma, TypeScript 5.8)
- Clean role-based separation: SuperAdmin, Admin, Tutor, Parent
- Automated billing modes (per-session and package) with invoice generation
- WhatsApp Cloud API integration for payment reminders with automated cron
- Full i18n support on admin platform (Indonesian + English)
- SuperAdmin with institution management and impersonation
- Bulk operations and CSV workflows reduce manual data entry

### Weaknesses

- No online payment gateway integration (manual collection only)
- No measurable learning outcome tracking
- Multiple UI stubs without backend support (creates user confusion)
- Tutor and parent apps lack i18n
- Local file storage not production-ready
- Some WhatsApp templates missing (only payment reminders)
- No SMS or push notification fallback
- Week calendar view not implemented

---

## 7. Recommended Priority Roadmap

| Priority | Initiative | Expected Impact |
|----------|-----------|-----------------|
| **P0** | Online payment gateway (Midtrans/Xendit) + parent app payment flow | Unlocks self-service payments, reduces admin burden, enables transaction-fee revenue |
| **P0** | Complete or remove UI stubs (enrollment import, receipt uploads, batch payments) | Eliminates user confusion, builds platform trust |
| **P1** | Expand WhatsApp templates (attendance, schedule changes, enrollment confirmations) | Reduces no-shows, improves parent communication beyond payment reminders |
| **P1** | Student progress tracking (scores, feedback, report cards) | Strengthens value proposition, reduces churn |
| **P1** | Fix known bugs (class fee persistence, enrollment count display) | Data integrity and UX reliability |
| **P2** | Online/hybrid class support | Expands addressable market |
| **P2** | Lead management and public trial booking | Reduces customer acquisition cost |
| **P2** | Subscription billing mode implementation | Completes billing feature set |
| **P2** | Tutor & parent app i18n | Consistent multilingual experience |
| **P3** | Cloud file storage migration | Production readiness |
| **P3** | Advanced analytics (churn, utilization, profitability, cohort) | Data-driven decisions |
| **P3** | AI-powered features (lesson planning, progress summaries) | Market differentiation |
| **P3** | Tutor marketplace | New revenue stream |
