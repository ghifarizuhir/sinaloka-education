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
| Expiry checking | Read-only guard + cron job for state transitions | Guard only reads and attaches warnings; cron handles all writes (state transitions, downgrade) |
| UpgradeRequest model | Deprecated — replaced by subscription payment flow | Avoids two conflicting upgrade paths |
| Midtrans credentials | Platform-level env vars for subscription payments | Sinaloka is the merchant (not institution); separate from per-institution SPP Midtrans keys |
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
| `institution_id` | String | FK to Institution |
| `plan_type` | PlanType | GROWTH or BUSINESS |
| `status` | SubscriptionStatus | ACTIVE, GRACE_PERIOD, EXPIRED, CANCELLED |
| `started_at` | DateTime | Start of current billing period |
| `expires_at` | DateTime | started_at + 30 days |
| `grace_ends_at` | DateTime? | expires_at + 7 days (set when entering grace period) |
| `auto_downgraded_at` | DateTime? | Timestamp when auto-downgrade occurred |
| `cancelled_at` | DateTime? | When subscription was cancelled |
| `cancelled_reason` | String? | Why subscription was cancelled |
| `last_reminder_tier` | Int? | Last reminder sent: 7, 3, or 1 (H-X). Prevents duplicate reminders. |
| `created_at` | DateTime @default(now()) | |
| `updated_at` | DateTime @updatedAt | |

**Uniqueness constraint:** Partial unique index via raw SQL migration: `CREATE UNIQUE INDEX idx_subscription_active_per_institution ON subscription (institution_id) WHERE status IN ('ACTIVE', 'GRACE_PERIOD')`. This ensures only one active/grace-period subscription per institution while allowing historical EXPIRED/CANCELLED records.

**Indexes:** `@@index([institution_id])`, `@@index([status])`, `@@index([expires_at])` (for cron job queries).

**SubscriptionPayment** — Every payment for a subscription.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String @id @default(cuid()) | PK |
| `subscription_id` | String | FK to Subscription |
| `institution_id` | String | FK to Institution |
| `amount` | Int | Amount in Rupiah |
| `method` | SubscriptionPaymentMethod | MIDTRANS or MANUAL_TRANSFER |
| `status` | SubscriptionPaymentStatus | PENDING, PAID, FAILED, EXPIRED |
| `midtrans_order_id` | String? | For Midtrans payments (prefixed `SUB-` to distinguish from student payments) |
| `midtrans_transaction_id` | String? | From Midtrans webhook |
| `proof_url` | String? | Upload URL for manual transfer proof |
| `confirmed_by` | String? | SUPER_ADMIN user ID who confirmed |
| `confirmed_at` | DateTime? | When manual payment was confirmed |
| `notes` | String? | SUPER_ADMIN notes (approval/rejection reason) |
| `paid_at` | DateTime? | When payment was completed |
| `created_at` | DateTime @default(now()) | |

**Indexes:** `@@index([institution_id])`, `@@index([status])`.

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
subscriptions Subscription[]
```

Use one-to-many relation because Prisma's one-to-one requires `@unique` on the FK, which conflicts with the partial unique index (multiple EXPIRED/CANCELLED rows per institution). The active subscription is fetched via service-layer query: `prisma.subscription.findFirst({ where: { institution_id, status: { in: ['ACTIVE', 'GRACE_PERIOD'] } } })`.

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
| POST | `/api/subscription/pay` | Initiate payment or renewal (Midtrans or manual upload). Accepts optional `type: 'new' | 'renewal'` — if renewal, extends from old `expires_at`. |

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
| POST | `/api/payments/midtrans-webhook` | Shared Midtrans webhook (existing endpoint, extended) |

**Midtrans webhook routing:** The existing `POST /api/payments/midtrans-webhook` endpoint is extended. **The `order_id` prefix check (`SUB-` prefix) must be the first operation in the webhook handler, before any payment table lookup.** If `order_id` starts with `SUB-`, immediately delegate to `SubscriptionPaymentService.handleWebhook()` and return. Otherwise, proceed with the existing student payment flow. This ordering is critical because the existing handler attempts a `payment.findFirst()` lookup that would return null for subscription orders, causing a premature `payment_not_found` response.

**Midtrans credentials:** Subscription payments use platform-level env vars (`SUBSCRIPTION_MIDTRANS_SERVER_KEY`, `SUBSCRIPTION_MIDTRANS_CLIENT_KEY`) since Sinaloka is the merchant. These are separate from per-institution Midtrans keys used for student SPP payments.

**SUPER_ADMIN Stats Endpoint:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/subscriptions/stats` | Aggregated stats: counts per plan, expiring soon, pending payments, monthly revenue |

### Subscription Guard (Read-Only Lazy Check)

Applied globally after auth. **Read-only** — no database writes. Attaches warnings to the response for the frontend to display.

```
if no subscription → skip (STARTER, no action)
if status == ACTIVE && now > expires_at:
  → attach warning: { type: 'EXPIRED', grace_ends_at: expires_at + 7 days }
  (actual status transition happens in cron job)
else if status == GRACE_PERIOD && now > grace_ends_at:
  → attach warning: { type: 'DOWNGRADE_PENDING' }
  (actual downgrade happens in cron job)
else if status == GRACE_PERIOD:
  → attach warning: { type: 'GRACE_PERIOD', days_remaining: grace_ends_at - now }
else if status == ACTIVE && now <= expires_at && (expires_at - now) <= 7 days:
  → attach warning: { type: 'EXPIRING_SOON', days_remaining: N }
```

Conditions are mutually exclusive via `else if`. The EXPIRING_SOON check explicitly requires `now <= expires_at` to prevent negative days.

The guard only reads subscription state and attaches `_subscriptionWarning` to the request. All state transitions (ACTIVE → GRACE_PERIOD → EXPIRED, downgrade) happen exclusively in the cron job to avoid race conditions from concurrent requests performing writes.

### Cron Jobs

Uses `@nestjs/schedule`:

| Schedule | Job | Description |
|----------|-----|-------------|
| Daily 00:00 | Subscription lifecycle | Single cron job, sequential steps: **Step 1:** Find ACTIVE subscriptions past `expires_at` → transition to GRACE_PERIOD (using `updateMany WHERE status = 'ACTIVE'` for idempotency) + send grace period entry emails. **Step 2:** Find GRACE_PERIOD past `grace_ends_at` → transition to EXPIRED + downgrade `institution.plan_type` to STARTER + send downgrade notification emails. **Step 3:** Send reminder emails (H-7, H-3, H-1) for still-ACTIVE subscriptions — check `last_reminder_tier` to skip already-sent tiers. |

**Email error handling:** For each subscription, send email first, then update DB state (`last_reminder_tier`, `status`) only on email success. On email failure, log the error and skip to the next subscription — the next cron run will retry since the state was not updated. This ensures no silent email loss.

### Integration with Existing PlanGuard

- `PlanGuard` continues to enforce limits based on `institution.plan_type` — **no changes needed**
- Subscription module updates `institution.plan_type` on upgrade/downgrade
- `PlanGuard` is unaware of subscriptions — clean separation

### Deprecation of UpgradeRequest

The existing `UpgradeRequest` model is deprecated. Currently, ADMINs submit upgrade requests that SUPER_ADMIN manually approves/rejects. With the subscription payment flow, upgrades are handled via payment (Midtrans or manual transfer + SUPER_ADMIN confirmation). The `UpgradeRequest` table and related endpoints will be removed as part of this implementation. Existing pending requests should be resolved before deployment.

### Tenant Scoping

- ADMIN endpoints: scoped by `request.tenantId` from JWT (standard behavior via `TenantInterceptor`)
- SUPER_ADMIN endpoints: query across all institutions, optionally filterable by `?institution_id=`
- This follows the existing pattern used by other SUPER_ADMIN endpoints

### In-Flight Payment During Grace Period

If an ADMIN initiates a Midtrans payment before expiry but completes it during grace period (or even after auto-downgrade), the webhook handler should still process the payment and restore the subscription to ACTIVE with `plan_type` updated accordingly. The payment's `subscription_id` links it to the correct subscription regardless of current status.

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

- `last_reminder_tier` field on Subscription stores which reminder was last sent (7, 3, or 1)
- Cron job only sends a reminder if the current H-X tier is different from `last_reminder_tier`
- Example: on H-7 day, cron sets `last_reminder_tier = 7`. On H-6, H-5, H-4 no email sent. On H-3, `last_reminder_tier` is 7 ≠ 3, so H-3 email is sent and tier updated to 3.

### Email Recipients

- ADMIN emails: sent to all users with ADMIN role for the institution
- SUPER_ADMIN emails: sent to all users with SUPER_ADMIN role

### Invoice Number Sequence

Invoice numbers use format `INV-{YYYYMM}-{seq}` where `{seq}` is a zero-padded 5-digit global counter (e.g., `INV-202603-00042`). Uses a single Postgres sequence `subscription_invoice_seq` created once in a migration (`CREATE SEQUENCE subscription_invoice_seq`). The sequence increments monotonically across all months — no per-month sequences needed. Fetch next value via `SELECT nextval('subscription_invoice_seq')` in a Prisma raw query.

## Out of Scope (Future)

- Annual subscription plans
- Prorate on mid-cycle plan changes
- Auto-retry failed Midtrans payments
- CSV export of payment history
- WhatsApp notifications for subscription events
