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

---

## Upcoming

### Session 2 — Sprint 5: Medium Items (3 items)

| # | Item | Effort | Detail |
|---|---|---|---|
| 1 | **Dashboard charts** | Medium | Recharts sudah imported tapi Dashboard tidak punya grafik. Finance Overview sudah punya charts — Dashboard belum. Tambah revenue trend, attendance rate trend, atau student growth chart. |
| 2 | **Bulk operations pada Tutors** | Medium | Students dan Enrollments sudah punya bulk select + bulk delete/update. Tutors belum. Tambah checkbox selection + bulk actions (delete, verify, etc). |
| 3 | **Payment gateway settings UI** | Medium | Backend endpoint `GET/PATCH /api/settings/payment-gateway` sudah ada. Settings page belum punya tab UI untuk konfigurasi Midtrans keys (server key, client key, sandbox mode). |

### Session 3 — Sprint 6: Custom WhatsApp Templates (1 item besar)

| # | Item | Effort | Detail |
|---|---|---|---|
| 1 | **Custom WhatsApp templates** | Besar | Saat ini hardcoded 1 template (`payment_reminder`) dalam bahasa Indonesia. Perlu: template management UI di Settings/WhatsApp, template variables (nama, jumlah, tanggal), multi-language, preview. Backend: template CRUD + variable interpolation. |

### Session 4 — Sprint 7: Notification Center atau Audit Log (1 item besar)

| # | Item | Effort | Detail |
|---|---|---|---|
| 1a | **Notification center (in-app)** | Besar | Saat ini tidak ada in-app notifications — hanya WhatsApp. Perlu: notification model, real-time delivery (WebSocket/SSE), notification bell di header, mark as read, notification preferences. |
| 1b | **Audit log** | Besar | Siapa melakukan apa, kapan. Perlu: audit_log table, interceptor/decorator untuk auto-log, audit log viewer di SuperAdmin, filter by user/action/date. Penting untuk akuntabilitas institusi. |

---

## Backlog (belum dijadwalkan)

| # | Item | Effort | Detail |
|---|---|---|---|
| 1 | Student/Tutor profile photos | Medium | Saat ini hanya initials avatar. Perlu: upload foto, crop/resize, storage, display di semua tempat yang tampilkan avatar. |
| 2 | Multi-branch support | Besar | Tercantum di pricing card (BUSINESS plan) tapi belum implemented. Perlu: branch model, branch-scoped data, branch selector UI. |
| 3 | Advanced Reporting | Besar | Tercantum di pricing card. Report saat ini masih basic (3 PDF reports). Perlu: custom report builder, scheduled reports, email delivery. |

---

## Prioritization Guide

**Urutan didasarkan pada:**
1. **Quick wins dulu** — items yang hook/endpoint sudah ada (Sprint 4 pattern)
2. **User-facing impact** — fitur yang langsung terasa oleh admin dan parent
3. **Platform completeness** — fitur yang sudah dijanjikan di pricing card
4. **Infrastructure** — notification center dan audit log sebagai fondasi untuk fitur lanjutan
