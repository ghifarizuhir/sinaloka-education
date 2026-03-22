# Sprint Roadmap

> **Last updated:** 2026-03-22
> **Reference:** `docs/platform-analysis-v4.md` (analisis lengkap 22 halaman platform)

---

## Completed

### Session 1 (2026-03-22) — Sprint 1-4

| Sprint | PR | Items | Status |
|---|---|---|---|
| **Sprint 1: Bug Fixes** | #58 | Server-side filtering (Students/Tutors), expense stats accuracy, command palette search, registration detail display | Merged |
| **Sprint 2: Auth & Security** | #59 | SuperAdmin password reset + must_change_password + token revocation, forgot password info on login, impersonation identity fix, ADMIN role guard | Merged |
| **Sprint 3: UX Improvements** | #60 | Registration reject email, session edit modal, remove enrollment stub, expense CSV export, WhatsApp payment link (PaymentGatewayService), landing page email required | Merged |
| **Sprint 4: Quick Wins** | #61 | Attendance summary per class, login redirect preservation (?redirect=), enrollment conflict check, open redirect fix, sequential mutateAsync, useSearchParams, attendance i18n keys | Merged |

**Total: 20 items, 4 PRs, semua merged.**

### Session 2 (2026-03-22) — Sprint 5

| Sprint | PR | Items | Status |
|---|---|---|---|
| **Sprint 5: Medium Items** | #62 | Dashboard charts (revenue vs expenses, attendance trend, student growth), bulk tutor operations (verify, delete, resend/cancel invite), tutor profile photos (crop + upload, platform + tutors app) | Merged |

**Total: 3 items, 1 PR, merged. Payment gateway settings UI di-skip (sudah centralized ke platform-level). Profile photos menggantikan slot ke-3.**

### Session 2 (2026-03-22) — Sprint 6

| Sprint | PR | Items | Status |
|---|---|---|---|
| **Sprint 6: WhatsApp Templates** | #63 | Custom WhatsApp template editor — split-view editor + live WhatsApp-style preview, `whatsapp_templates` table, template CRUD + variable validation, `sendPaymentReminder` refactored to use custom templates with fallback, XSS protection | Merged |

**Total: 1 item besar, 1 PR, merged.**

### Session 3 (2026-03-22) — Sprint 7

| Sprint | PR | Items | Status |
|---|---|---|---|
| **Sprint 7: Notification Center** | #64 | In-app notification center — event-driven architecture (`@nestjs/event-emitter`), SSE real-time push, notification bell dropdown + full `/notifications` page, 7 event types (payment, student, parent, session create/cancel, attendance, tutor invite), mark as read, unread badge, multi-tenant scoped | Merged |

**Total: 1 item besar, 1 PR, merged.**

---

## Upcoming

### Session 4 — Sprint 8: Audit Log (1 item besar)

| # | Item | Effort | Detail |
|---|---|---|---|
| 1 | **Audit log** | Besar | Siapa melakukan apa, kapan. Perlu: audit_log table, interceptor/decorator untuk auto-log, audit log viewer di SuperAdmin + Admin (institusi sendiri), filter by user/action/date. Penting untuk akuntabilitas institusi. |

---

## Backlog (belum dijadwalkan)

| # | Item | Effort | Detail |
|---|---|---|---|
| 1 | Multi-branch support | Besar | Tercantum di pricing card (BUSINESS plan) tapi belum implemented. Perlu: branch model, branch-scoped data, branch selector UI. |
| 2 | Advanced Reporting | Besar | Tercantum di pricing card. Report saat ini masih basic (3 PDF reports). Perlu: custom report builder, scheduled reports, email delivery. |
| 3 | Notification preferences | Medium | Per-user toggle per notification type. Extend notification center dari Sprint 7. |

---

## Prioritization Guide

**Urutan didasarkan pada:**
1. **Quick wins dulu** — items yang hook/endpoint sudah ada (Sprint 4 pattern)
2. **User-facing impact** — fitur yang langsung terasa oleh admin dan parent
3. **Platform completeness** — fitur yang sudah dijanjikan di pricing card
4. **Infrastructure** — notification center dan audit log sebagai fondasi untuk fitur lanjutan
