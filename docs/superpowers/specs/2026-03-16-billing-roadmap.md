# Billing System Roadmap — sinaloka

**Date:** 2026-03-16
**Status:** Approved roadmap
**Scope:** End-to-end billing transformation from manual admin-driven to semi-automated institution-configurable billing

## Current State

The billing system is **100% manual**:
- Admin manually creates Payment records with typed amounts and due dates
- No connection between class fee and payment amount
- No auto-invoicing on enrollment
- Tutor payouts are manual with no calculation from sessions taught
- Expense categories are hardcoded in the UI
- No billing configuration stored in the database
- Currency assumed IDR throughout

## Target State

Institution-configurable billing with automation options:
- Billing mode determines how/when payments are generated
- Auto-invoicing tied to enrollment lifecycle
- Tutor payout calculations based on sessions completed
- Configurable expense categories, bank accounts, invoice format
- Audit trail for all financial changes

---

## Phase 1: Configuration Persistence (Current Sprint)

**Goal:** Store billing configuration in the database. No behavior changes — just persistence.

**What gets built:**
- `PATCH/GET /api/settings/billing` endpoint
- Billing settings stored in institution `settings: Json` field (structured schema)
- Frontend Settings > Billing tab wired to API

**Configuration fields:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| billing_mode | enum | `manual` | `manual`, `per_session`, `package`, `subscription` |
| currency | string | `IDR` | Display currency code |
| invoice_prefix | string | `INV-` | Prefix for generated invoice numbers |
| late_payment_threshold | number | `0` | Amount threshold to auto-lock enrollment (0 = disabled) |
| late_payment_auto_lock | boolean | `false` | Enable/disable auto-lock |
| expense_categories | string[] | `['RENT','UTILITIES','SUPPLIES','MARKETING','OTHER']` | Custom categories per institution |
| bank_accounts | json[] | `[]` | `{bank_name, account_number, account_holder}` |

**Affected files:**
- Backend: settings module (add billing endpoints), settings DTO
- Frontend: Settings.tsx billing tab, settings service/hook
- Database: uses existing `settings: Json` column (no migration)

**Dependencies:** Phase 1 General Settings (completed)
**Risk:** Low — no behavioral changes, purely configuration storage

---

## Phase 2: Auto-Invoice Generation

**Goal:** When a student enrolls in a class, automatically create a Payment record based on billing mode.

**What changes:**

### Per-Session Mode
- On session creation → auto-generate Payment records for each enrolled student
- Amount = `class.fee`
- Due date = session date
- Status = `PENDING`

### Package Mode
- On enrollment → auto-generate a single Payment record
- Amount = `class.fee × sessions_per_month` (or package price if defined)
- Due date = enrollment date + payment terms (e.g., 7 days)

### Subscription Mode
- On enrollment → auto-generate monthly recurring Payment
- Amount = flat monthly fee (configured per class or institution)
- Due date = 1st of each month (or configurable)
- Recurring job to generate next month's invoice

### Manual Mode
- No change — admin creates payments manually (current behavior)

**Affected files:**
- Backend: enrollment service (auto-create payment on enroll), session service (per-session mode), payment service (new auto-generation logic)
- New: invoice number generation utility (uses invoice_prefix)
- Database: possibly add `invoice_number` column to Payment model

**Dependencies:** Phase 1 (billing_mode must be stored)
**Risk:** Medium — changes enrollment and session creation flow. Must be backward-compatible with existing manual payments.

---

## Phase 3: Late Payment Enforcement

**Goal:** Auto-detect overdue payments and optionally lock enrollments.

**What changes:**
- Scheduled job (cron) runs daily:
  1. Find all payments where `due_date < today AND status = PENDING`
  2. Update status to `OVERDUE`
  3. If `late_payment_auto_lock` enabled AND student's total debt > `late_payment_threshold`:
     - Update enrollment status to indicate locked/suspended
     - Optionally notify admin
- Dashboard shows overdue alerts
- Student list shows payment warning indicators

**Affected files:**
- Backend: new cron/scheduled task module, payment service (bulk status update), enrollment service (lock logic)
- Frontend: dashboard alerts, student list indicators
- Database: possibly add `locked_reason` to enrollment

**Dependencies:** Phase 2 (payments must exist to be overdue)
**Risk:** Medium — automated status changes need careful testing to avoid false locks

---

## Phase 4: Tutor Payout Calculation

**Goal:** Auto-calculate tutor payouts based on sessions taught, replacing manual amount entry.

**What changes:**
- Payout calculation formula per institution:
  - **Revenue share:** Tutor gets X% of payments collected from their students
  - **Per-session rate:** Fixed amount per session taught (e.g., Rp 200K/session)
  - **Flat monthly:** Fixed monthly salary regardless of sessions
- Admin selects calculation mode in Settings > Billing
- Payout creation pre-fills calculated amount (admin can override)
- Payout reconciliation shows breakdown: sessions taught × rate, bonuses, deductions

**New configuration fields:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| payout_mode | enum | `manual` | `manual`, `per_session_rate`, `revenue_share`, `flat_monthly` |
| payout_per_session_rate | number | `0` | Default rate per session |
| payout_revenue_share_pct | number | `0` | Percentage of class revenue |
| payout_flat_monthly | number | `0` | Fixed monthly amount |

**Affected files:**
- Backend: payout service (calculation engine), settings (new payout config)
- Frontend: payout creation form (pre-filled amounts), settings billing tab (payout config)
- Database: possibly add session-payout linking table

**Dependencies:** Phase 2 (need payment records to calculate revenue share), Phase 1 (payout config stored)
**Risk:** High — involves money calculation, must be auditable and transparent

---

## Phase 5: Invoice PDF Generation & Notifications

**Goal:** Generate formal PDF invoices and send payment reminders.

**What changes:**
- PDF invoice generation with institution branding (logo, name, address)
- Invoice includes: invoice number, student name, class, amount, due date, bank account details
- Configurable invoice template
- Email/WhatsApp notifications:
  - Payment created → send invoice to parent
  - Payment overdue → send reminder to parent
  - Payment received → send receipt to parent

**Affected files:**
- Backend: new invoice generation service (PDF library), email service (new templates), notification scheduler
- Frontend: payment detail view (download invoice button), settings (notification preferences)
- Database: add `invoice_url` to Payment model

**Dependencies:** Phase 2 (invoices need auto-generated payments), Phase 1 (institution branding/bank accounts)
**Risk:** Medium — PDF generation adds dependency, email delivery reliability

---

## Phase 6: Financial Reporting & Reconciliation

**Goal:** Comprehensive financial reports and bank reconciliation.

**What changes:**
- Monthly financial summary report: revenue, expenses, payouts, net profit
- Revenue breakdown by class, tutor, payment method
- Expense report by category with trends
- Bank reconciliation: match recorded payments to bank deposits
- Export to CSV/PDF for accounting

**Affected files:**
- Backend: report service (new financial report queries), export utilities
- Frontend: new finance report pages, charts, export buttons
- Database: no schema changes (queries on existing data)

**Dependencies:** Phase 2-5 (need complete financial data)
**Risk:** Low — read-only reporting, no behavioral changes

---

## Phase Summary

| Phase | Name | Scope | Risk | Dependency |
|-------|------|-------|------|------------|
| **1** | Configuration Persistence | Store billing config, wire UI | Low | General Settings (done) |
| **2** | Auto-Invoice Generation | Auto-create payments on enroll/session | Medium | Phase 1 |
| **3** | Late Payment Enforcement | Cron job, overdue detection, auto-lock | Medium | Phase 2 |
| **4** | Tutor Payout Calculation | Auto-calculate payouts from sessions | High | Phase 1, 2 |
| **5** | Invoice PDF & Notifications | PDF generation, email/WhatsApp reminders | Medium | Phase 1, 2 |
| **6** | Financial Reporting | Reports, reconciliation, exports | Low | Phase 2-5 |

**Recommended execution order:** 1 → 2 → 3 → 4 → 5 → 6

Each phase is independently deployable. Phase 1 is the foundation — all others depend on it. Phases 3, 4, and 5 can be parallelized after Phase 2 is complete.

---

## Key Design Principles

1. **Backward compatible:** Manual mode always works. New modes add automation, never remove manual capability.
2. **Admin override:** Auto-calculated amounts are suggestions — admin can always override before confirming.
3. **Audit trail:** Every financial change should be traceable (who, when, what, from what value).
4. **Multi-tenant isolated:** Each institution has its own billing config. One institution's billing mode doesn't affect another.
5. **Progressive enhancement:** Each phase adds value independently. No "big bang" deployment.
