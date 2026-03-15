# Sinaloka Business Review

> Generated: 2026-03-15

## 1. Overview

Sinaloka is a **multi-tenant educational institution management platform** targeting Indonesian tutoring centers (bimbel), private schools, and tuition institutions. It operates as a SaaS-style system with three applications:

| App | Target User | Purpose |
|-----|------------|---------|
| **sinaloka-backend** | API server | NestJS + PostgreSQL + Prisma backend |
| **sinaloka-platform** | Institution admins/owners | Full management dashboard |
| **sinaloka-tutors** | Tutors | Mobile-first schedule & attendance app |

### Tech Stack

- **Backend**: NestJS 11, PostgreSQL, Prisma ORM, JWT auth, Zod validation, PDFKit
- **Platform (Admin)**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, React Query, React Router 7, Framer Motion
- **Tutors App**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Axios, Framer Motion, `@google/genai`

---

## 2. Existing Features

### 2.1 Academic Management

- **Student Management** — CRUD with parent contact info, grade levels (10th-12th), active/inactive status, CSV bulk import/export
- **Tutor Management** — Profiles with subjects, experience years, rating (0-5), verification status, bank details for payouts
- **Class Management** — Capacity, per-enrollment fee, recurring schedule (Mon-Sun), room assignment, tutor assignment, active/archived status
- **Enrollment Lifecycle** — Statuses: TRIAL → ACTIVE → WAITLISTED → DROPPED. Includes schedule conflict detection before enrollment and auto-payment record creation
- **Bulk Operations** — Multi-select students for enrollment, bulk delete, CSV import for students and enrollments

### 2.2 Operations & Scheduling

- **Session Auto-Generation** — Create recurring sessions from class schedule over a date range, skipping duplicates
- **Calendar Views** — Month, week, and day modes with list view alternative
- **Tutor Reschedule Workflow** — Tutor requests reschedule (with reason + proposed date/time) → admin approves or rejects
- **Attendance Tracking** — Session-based with keyboard shortcuts (P/A/L keys), homework completion checkbox, per-student notes, "Mark All Present" bulk action, incomplete session flagging
- **Session Documentation** — Topic covered (required) and session summary recorded by tutor on completion

### 2.3 Financial Management

- **Student Payments** — Status tracking (PENDING → PAID → OVERDUE), payment methods (CASH, TRANSFER, OTHER), due date and paid date tracking
- **Tutor Payouts** — Status workflow (PENDING → PROCESSING → PAID), payment proof URL upload, bank details per tutor
- **Expense Tracking** — Categories: RENT, UTILITIES, SUPPLIES, MARKETING, OTHER. Receipt URL attachment supported
- **Finance Dashboard** — Revenue (sum of paid payments) vs. payouts vs. expenses = net profit. Date range filtering (month, quarter, YTD, custom)
- **PDF Reports** — Attendance report, finance report (income/outgo/net profit), individual student progress report (attendance rate, homework rate, session notes)

### 2.4 Dashboard & Analytics

- **KPI Cards** — Total students, active tutors, attendance rate %, monthly revenue, upcoming sessions (7-day lookahead)
- **Activity Feed** — Last 20 enrollments, payments, attendance records sorted by recency
- **Quick Actions** — Quick enroll, record payment, schedule make-up session
- **Command Palette** — Keyboard-driven quick navigation

### 2.5 Tutor App (Mobile-First)

- **Dashboard** — Welcome greeting, pending payout amount, today's class count, next 2 upcoming classes preview
- **Schedule Management** — Filter by upcoming/completed/cancelled, per-class actions (attend, reschedule, cancel)
- **Self-Service Attendance** — Batch submission for all students in a session, homework tracking, topic & summary notes
- **Payout History** — Pending vs. paid breakdown, transaction history, transfer proof image viewer
- **Profile** — Avatar, name, subject, rating display, verification badge, payment method & account settings

### 2.6 Platform Architecture

- **Multi-Tenancy** — Institution-based data isolation via TenantInterceptor
- **Role-Based Access** — SUPER_ADMIN (cross-institution), ADMIN (institution-scoped), TUTOR (self-service only)
- **Authentication** — JWT with refresh token rotation, bcrypt password hashing, last login tracking
- **UI/UX** — Dark mode toggle, responsive design, Framer Motion animations, toast notifications, loading skeletons, sticky save bars

---

## 3. Data Model Summary

```
Institution
├── Users (SUPER_ADMIN, ADMIN, TUTOR)
├── Students
│   ├── Enrollments → Class
│   │   └── Payments
│   └── Attendance (per session)
├── Tutors
│   ├── Classes → Sessions
│   └── Payouts
└── Expenses
```

**Key Entities**: Institution, User, Student, Tutor, Class, Enrollment, Session, Attendance, Payment, Payout, Expense, RefreshToken

---

## 4. Revenue Model Assessment

### Current Model

B2B SaaS for tutoring institutions. Revenue is generated through class enrollment fees managed via the platform. Payments are tracked manually (no automated collection).

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

### 5.1 No Student/Parent Portal — HIGH PRIORITY

There is no app for students or parents. Parents cannot:
- View their child's attendance or progress
- See upcoming class schedules
- Pay online or view invoices
- Communicate with tutors

**Business Impact**: A parent portal increases retention, reduces admin workload (fewer phone calls), and enables self-service payments. This is the most critical missing piece for user experience and revenue growth.

### 5.2 No Online Payment Integration — HIGH PRIORITY

Payments are tracked manually (CASH, TRANSFER, OTHER). No payment gateway is integrated (e.g., Midtrans, Xendit, GoPay, OVO, Dana).

**Business Impact**: Manual payment tracking is error-prone and labor-intensive. Auto-collection via Indonesian e-wallets and virtual accounts would reduce late payments, improve cash flow predictability, and unlock transaction-fee revenue.

### 5.3 No Notifications / Messaging System — HIGH PRIORITY

No SMS, WhatsApp, email, or push notifications. The UI has WhatsApp reminder buttons but they are non-functional stubs.

**Business Impact**: Payment reminders, class cancellation alerts, and schedule notifications are essential for reducing no-shows and late payments. WhatsApp is the dominant communication channel in Indonesia.

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

### 5.7 No Subscription / Recurring Billing — MEDIUM PRIORITY

Fees are per-enrollment, not subscription-based. Missing:
- Monthly auto-billing cycles
- Package pricing (e.g., 10 sessions for Rp X)
- Discount management and promo codes

**Business Impact**: Recurring billing improves revenue predictability and reduces churn from missed manual payments. Package pricing creates upsell opportunities.

### 5.8 No Advanced Analytics / Business Intelligence — MEDIUM PRIORITY

Dashboard has basic KPIs but lacks:
- Revenue trend charts over time
- Student retention and churn analysis
- Tutor utilization rates
- Class profitability analysis
- Cohort analysis

**Business Impact**: Data-driven decisions require historical trends and comparisons, not just point-in-time snapshots. Institution owners need to understand which classes, tutors, and subjects drive the most value.

### 5.9 No Tutor Marketplace / Discovery — LOW-MEDIUM PRIORITY

Tutors are institution-bound. Missing:
- Public tutor profiles for discovery
- Subject/location-based search
- Student reviews and ratings (only admin-set ratings exist currently)

**Business Impact**: A marketplace model could be a future revenue stream — connecting independent tutors with students for a platform commission.

### 5.10 Local File Storage — TECHNICAL DEBT

Uploads are stored on the local filesystem, not cloud storage (S3, GCS, or equivalent).

**Business Impact**: Will not scale in production deployment, creates data loss risk, and prevents CDN-based performance optimization.

### 5.11 Unused AI Integration — UNTAPPED POTENTIAL

The tutor app has `@google/genai` (Gemini) installed but no visible AI features are implemented.

**Opportunity**: AI-powered lesson planning, automated student progress summaries, attendance pattern insights, or personalized learning recommendations could significantly differentiate the platform.

### 5.12 No Multi-Language Support — LOW PRIORITY

UI text is a mix of English and Indonesian with no i18n framework.

**Business Impact**: Required if expanding beyond Indonesia or serving international schools. Low priority for current domestic-focused operations.

---

## 6. Competitive Positioning

### Strengths

- Comprehensive feature set covering the full institution management lifecycle
- Multi-tenant architecture ready for horizontal scaling
- Separate tutor app demonstrates awareness of distinct user personas
- Modern tech stack with strong developer experience (React 19, NestJS, Prisma, TypeScript)
- Clean separation of admin vs. tutor concerns
- Bulk operations and CSV workflows reduce manual data entry

### Weaknesses

- No student/parent-facing application (critical gap in the user ecosystem)
- Manual-only payment tracking with no gateway integration
- No communication or notification system
- No measurable learning outcome tracking
- Limited analytics and reporting (basic KPIs only, no trend visualization)
- Local file storage not production-ready

---

## 7. Recommended Priority Roadmap

| Priority | Initiative | Expected Impact |
|----------|-----------|-----------------|
| **P0** | Parent portal + online payment gateway (Midtrans/Xendit) | Unlocks self-service payments, reduces admin burden, enables transaction-fee revenue |
| **P0** | WhatsApp/SMS notification system | Reduces no-shows and late payments, improves parent communication |
| **P1** | Student progress tracking (scores, feedback, report cards) | Strengthens value proposition, reduces churn |
| **P1** | Analytics dashboard with trend charts | Enables data-driven decisions for institution owners |
| **P2** | Online/hybrid class support | Expands addressable market |
| **P2** | Lead management and public trial booking | Reduces customer acquisition cost |
| **P2** | Recurring billing and package pricing | Improves revenue predictability |
| **P3** | Cloud file storage migration | Production readiness |
| **P3** | AI-powered features (lesson planning, progress summaries) | Market differentiation |
| **P3** | Tutor marketplace | New revenue stream |
