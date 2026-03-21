# Subscription Billing System — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Approach:** Subscription Module Terpisah (Approach B)

## Overview

Implement a monthly subscription billing system for Sinaloka's institution plans. Currently, plans (STARTER, GROWTH, BUSINESS) are set manually by SUPER_ADMIN with no billing cycle, expiry, or payment tracking. This design adds subscription lifecycle management, payment processing (Midtrans + manual transfer), auto-downgrade on non-payment, and self-service for institution ADMINs.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment model | Hybrid (Midtrans + manual transfer) | Midtrans already integrated; some institutions prefer bank transfer |
| Expiry behavior | 7-day grace period then downgrade to STARTER | Consistent with existing grace period system; avoids abrupt disruption |
| Billing cycle start | From payment confirmation date | Simplest — no prorate logic needed |
| Subscription management | ADMIN self-service + SUPER_ADMIN override | Reduces SUPER_ADMIN workload; ADMIN can pay/renew independently |
| Expiry checking | Lazy check (guard) + cron job | Lazy for immediate UX feedback; cron as safety net |
| Architecture | Separate SubscriptionModule | Follows existing module-per-domain pattern; keeps plan enforcement untouched |

## 1. Database Schema

### New Enums

```prisma
enum SubscriptionStatus {
  ACTIVE
  GRACE_PERIOD
  EXPIRED
  CANCELLED
}

enum SubscriptionPaymentMethod {
  MIDTRANS
  MANUAL_TRANSFER
}

enum SubscriptionPaymentStatus {
  PENDING
  PAID
  FAILED
  EXPIRED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

### New Models

**Subscription** — One active subscription per institution.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String @id @default(cuid()) | PK |
| `institution_id` | String | FK to Institution (unique for active) |
| `plan_type` | PlanType | GROWTH or BUSINESS |
| `status` | SubscriptionStatus | ACTIVE, GRACE_PERIOD, EXPIRED, CANCELLED |
| `started_at` | DateTime | Start of current billing period |
| `expires_at` | DateTime | started_at + 30 days |
| `grace_ends_at` | DateTime? | expires_at + 7 days (set when entering grace period) |
| `auto_downgraded_at` | DateTime? | Timestamp when auto-downgrade occurred |
| `last_reminder_sent` | DateTime? | Prevents duplicate reminder emails on same day |
| `created_at` | DateTime @default(now()) | |
| `updated_at` | DateTime @updatedAt | |

**SubscriptionPayment** — Every payment for a subscription.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String @id @default(cuid()) | PK |
| `subscription_id` | String | FK to Subscription |
| `institution_id` | String | FK to Institution |
| `amount` | Int | Amount in Rupiah |
| `method` | SubscriptionPaymentMethod | MIDTRANS or MANUAL_TRANSFER |
| `status` | SubscriptionPaymentStatus | PENDING, PAID, FAILED, EXPIRED |
| `midtrans_order_id` | String? | For Midtrans payments |
| `midtrans_transaction_id` | String? | From Midtrans webhook |
| `proof_url` | String? | Upload URL for manual transfer proof |
| `confirmed_by` | String? | SUPER_ADMIN user ID who confirmed |
| `confirmed_at` | DateTime? | When manual payment was confirmed |
| `notes` | String? | SUPER_ADMIN notes (approval/rejection reason) |
| `paid_at` | DateTime? | When payment was completed |
| `created_at` | DateTime @default(now()) | |

**SubscriptionInvoice** — Generated per billing cycle.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String @id @default(cuid()) | PK |
| `institution_id` | String | FK to Institution |
| `subscription_id` | String | FK to Subscription |
| `invoice_number` | String @unique | Format: INV-{YYYYMM}-{seq} |
| `amount` | Int | Invoice amount in Rupiah |
| `period_start` | DateTime | Billing period start |
| `period_end` | DateTime | Billing period end |
| `due_date` | DateTime | = period_end |
| `status` | InvoiceStatus | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| `payment_id` | String? | FK to SubscriptionPayment (when paid) |
| `created_at` | DateTime @default(now()) | |

### Modified Models

**Institution** — Add relation:

```prisma
subscription Subscription?
```

STARTER institutions have no Subscription record. No subscription = STARTER (default behavior unchanged).

## 2. Backend Architecture

### Module Structure

```
src/modules/subscription/
├── subscription.module.ts
├── subscription.controller.ts          # ADMIN self-service endpoints
├── subscription-admin.controller.ts    # SUPER_ADMIN management endpoints
├── subscription.service.ts             # Core subscription lifecycle logic
├── subscription-payment.service.ts     # Midtrans + manual payment handling
├── subscription-cron.service.ts        # Scheduled expiry checks + reminders
├── subscription.guard.ts               # Lazy expiry check (global guard)
├── dto/
│   ├── create-payment.dto.ts
│   ├── confirm-payment.dto.ts
│   └── subscription-query.dto.ts
└── subscription.constants.ts           # Pricing, durations, reminder days
```

### API Endpoints

**ADMIN Endpoints** (institution self-service):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscription` | Get own subscription status |
| GET | `/api/subscription/invoices` | List own invoices |
| POST | `/api/subscription/pay` | Initiate payment (Midtrans or manual upload) |
| POST | `/api/subscription/renew` | Renew subscription (generates payment) |

**SUPER_ADMIN Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/subscriptions` | List all subscriptions (filterable) |
| PATCH | `/api/admin/subscriptions/:id` | Override status, extend, force downgrade |
| GET | `/api/admin/subscription-payments` | List all payments (filter by pending) |
| PATCH | `/api/admin/subscription-payments/:id/confirm` | Approve or reject manual payment |

**Webhook:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subscription/midtrans-webhook` | Midtrans payment notification (public) |

### Subscription Guard (Lazy Check)

Applied globally after auth. Runs on every request:

```
if no subscription → skip (STARTER, no action)
if status == ACTIVE && now > expires_at:
  → set status = GRACE_PERIOD
  → set grace_ends_at = expires_at + 7 days
  → attach warning to response
if status == GRACE_PERIOD && now > grace_ends_at:
  → set status = EXPIRED
  → set institution.plan_type = STARTER
  → set auto_downgraded_at = now
if ACTIVE && (expires_at - now) <= 7 days:
  → attach warning to response (approaching expiry)
```

### Cron Jobs

Uses `@nestjs/schedule`:

| Schedule | Job | Description |
|----------|-----|-------------|
| Daily 00:00 | Expiry scanner | Find subscriptions expiring within 7 days, send reminder emails (H-7, H-3, H-1). Check `last_reminder_sent` to avoid duplicates. |
| Daily 01:00 | Auto-downgrade | Find GRACE_PERIOD subscriptions past `grace_ends_at`, downgrade to STARTER, send notification email. |

### Integration with Existing PlanGuard

- `PlanGuard` continues to enforce limits based on `institution.plan_type` — **no changes needed**
- Subscription module updates `institution.plan_type` on upgrade/downgrade
- `PlanGuard` is unaware of subscriptions — clean separation

## 3. Payment Flows

### Flow 1: Midtrans Payment

1. ADMIN calls `POST /api/subscription/pay` with `method: MIDTRANS`
2. Backend creates `SubscriptionPayment` (PENDING) + `SubscriptionInvoice` (DRAFT)
3. Backend calls `MidtransService` to generate Snap token
4. Frontend redirects to Midtrans payment page
5. User pays → Midtrans sends webhook
6. Backend updates payment (PAID), invoice (PAID)
7. Backend activates/renews subscription → updates `institution.plan_type`

### Flow 2: Manual Transfer

1. ADMIN calls `POST /api/subscription/pay` with `method: MANUAL_TRANSFER` + `proof_url`
2. Backend creates `SubscriptionPayment` (PENDING) + `SubscriptionInvoice` (SENT)
3. Email sent to SUPER_ADMIN: "New pending subscription payment"
4. SUPER_ADMIN reviews proof, calls `PATCH /api/admin/subscription-payments/:id/confirm`
5. If approved → same as steps 6-7 above
6. If rejected → payment marked FAILED, email sent to ADMIN with reason

### Flow 3: Renewal

1. Banner shows "Subscription expires in X days" when H-7 or less
2. ADMIN clicks renew → directed to payment flow (choose Midtrans or manual)
3. After payment confirmed → `expires_at` extended 30 days from **old** `expires_at` (not from payment date, so early payment doesn't lose days)

### Flow 4: SUPER_ADMIN Override

- SUPER_ADMIN can directly set plan + expiry without payment
- Use cases: free trial, extension due to issues, custom deals
- Must provide notes/reason (required field)

## 4. Expiry & Downgrade Lifecycle

### State Machine

```
[No Subscription] → ACTIVE → GRACE_PERIOD → EXPIRED
       ↑               ↑          |              |
       |               |          v              v
       |               +--- (renew/pay) ←--------+
       |
  (first upgrade from STARTER)
```

### Example Timeline

```
Mar 1:  Pay GROWTH → ACTIVE (started_at: Mar 1, expires_at: Mar 31)
Mar 24: Email reminder H-7
Mar 28: Email reminder H-3, in-app banner warning
Mar 30: Email reminder H-1
Mar 31: Not paid → GRACE_PERIOD (grace_ends_at: Apr 7)
        Banner: "Subscription expired, 7 days remaining"
Apr 7:  Not paid → EXPIRED, auto-downgrade to STARTER
        plan_type changed, auto_downgraded_at set
        Email: "Your plan has been downgraded to STARTER"
```

### Downgrade Behavior

- `institution.plan_type` set to STARTER
- `PlanGuard` automatically enforces STARTER limits (30 students, 5 tutors)
- Locked features (WhatsApp, Advanced Reporting, Multi-Branch) auto-lock via existing `PlanGuard`
- **Data is preserved** — existing students/tutors beyond limits are NOT deleted, but no new ones can be added
- Paying again after downgrade → `plan_type` restored, new subscription created

## 5. Frontend — ADMIN View

### PlansTab Extension (`Settings/tabs/PlansTab.tsx`)

**Subscription Status Card** (above pricing cards):
- Status badge: ACTIVE (green), GRACE_PERIOD (yellow), EXPIRED (red), "Free Plan" (gray for STARTER)
- Current plan, valid until date, days remaining
- "Renew" button (visible when H-7 or less)
- Grace period: warning card with countdown

**Payment & Invoice Section** (below status card):
- Invoice table: number, period, amount, status, pay button
- Payment history: date, method, status, proof link (for manual)

### Payment Modal

- Choose method: Midtrans or Manual Transfer
- Midtrans → redirect to Snap payment page
- Manual → upload proof + display destination bank account
- After manual submit → status "Waiting for Confirmation"

### PlanWarningBanner Extension (`PlanWarningBanner.tsx`)

- Add subscription expiry warning cases (H-7, H-3, H-1)
- Add grace period case (higher urgency than existing limit warnings)
- Link to `/settings?tab=plans` for renewal

## 6. Frontend — SUPER_ADMIN View

### SubscriptionManagement Page (`SuperAdmin/SubscriptionManagement.tsx`)

**Overview Cards** (top row):
- Active institutions per plan (STARTER / GROWTH / BUSINESS)
- Subscriptions expiring within 7 days
- Pending payment confirmations count
- Revenue this month

**Subscription Table:**
- Columns: Institution, Plan, Status, Expires At, Last Payment, Actions
- Filters: status, plan type
- Search: by institution name
- Actions: Override plan, Extend, Force downgrade

**Pending Payments Tab:**
- List PENDING + MANUAL_TRANSFER payments
- Details: institution, amount, proof image (clickable), upload date
- Buttons: Approve / Reject (with reason field)

**Payment History Tab:**
- All payments (Midtrans + manual), filterable by institution, status, method, period

**Override Modal:**
- Set plan + expiry date manually
- Required: notes/reason field

**Navigation:**
- New sidebar item for SUPER_ADMIN: "Subscriptions" (below existing "Institutions")

## 7. Email Notifications

Using existing `EmailService` (Resend).

### Reminder Emails (sent by cron job)

| Trigger | Subject | Content |
|---------|---------|---------|
| H-7 | Subscription Anda akan berakhir dalam 7 hari | Plan info, expiry date, renew link |
| H-3 | Subscription berakhir dalam 3 hari | Same + more urgent tone |
| H-1 | Subscription berakhir besok | Same + warning about grace period |

### Status Change Emails

| Trigger | Recipient | Content |
|---------|-----------|---------|
| Enter grace period | ADMIN | Plan expired, 7 days to pay before downgrade |
| Auto-downgrade | ADMIN | Downgraded to STARTER, new limits, link to re-upgrade |
| Manual payment confirmed | ADMIN | Payment confirmed, subscription active until date |
| Manual payment rejected | ADMIN | Payment rejected + SUPER_ADMIN's reason |
| Midtrans payment success | ADMIN | Payment successful, subscription active until date |
| New pending manual payment | SUPER_ADMIN | New manual payment awaiting confirmation |

### Deduplication

- `last_reminder_sent` field on Subscription prevents duplicate reminder emails on the same day
- Cron job checks this field before sending

## Out of Scope (Future)

- Annual subscription plans
- Prorate on mid-cycle plan changes
- Auto-retry failed Midtrans payments
- CSV export of payment history
- WhatsApp notifications for subscription events
