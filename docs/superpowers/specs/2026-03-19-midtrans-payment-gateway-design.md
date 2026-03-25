# Midtrans Payment Gateway Integration

## Overview

Integrate Midtrans Snap as the online payment gateway for Sinaloka. Parents can pay tuition fees online via VA (bank transfer), QRIS, e-wallets, and other methods supported by Midtrans. Each institution configures their own Midtrans merchant account — money flows directly to them.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gateway provider | Midtrans | Most popular in Indonesia, great sandbox, well-documented |
| Integration method | Snap (hosted checkout) | Fastest integration, Midtrans handles payment method UI, supports all channels automatically |
| Payment initiator | Both admin and parent | Admin sends payment links, parent pays directly from app |
| Notification method | Webhook + frontend redirect | Webhook is source of truth, redirect gives instant UX feedback |
| Merchant accounts | Per-institution | Each institution uses own Midtrans keys, money goes directly to them, zero regulatory risk |
| Config storage | Institution settings JSON | Follows established pattern (billing, academic), no new Prisma model needed |

## Payment Flow

### Entry Point 1: Admin sends payment link

1. Admin opens PENDING payment in sinaloka-platform
2. Clicks "Send Invoice" button
3. Backend creates Midtrans Snap transaction → returns `snap_token` + `redirect_url`
4. Admin copies link or sends via WhatsApp (existing reminder flow with payment link)
5. Parent opens link → Midtrans Snap checkout → pays

### Entry Point 2: Parent pays from app

1. Parent sees PENDING/OVERDUE payment in sinaloka-parent
2. Taps "Bayar" (Pay) button
3. Frontend calls `POST /api/payments/:id/checkout`
4. Opens `redirect_url` in system browser
5. Parent completes payment on Midtrans Snap page
6. Redirected back to payment status page

### After Payment

1. **Webhook** (server-to-server): Midtrans POSTs to `/api/payments/midtrans-webhook`
   - Backend verifies SHA-512 signature using institution's Server Key
   - Maps status: `settlement` → PAID, `expire` → PENDING, `cancel/deny` → no change
   - Updates Payment record: status, paid_date, method=MIDTRANS, midtrans_transaction_id
   - Optionally sends WhatsApp payment receipt to parent
2. **Frontend redirect**: Parent sees "Payment Successful" or "Processing..." page
   - Polls `GET /api/payments/:id/status` for confirmed status

## Data Model Changes

### Payment model — 3 new fields

| Field | Type | Purpose |
|-------|------|---------|
| `midtrans_transaction_id` | `String?` | Midtrans order_id for reconciliation |
| `snap_token` | `String?` | Reusable Snap token (expires 24h) |
| `snap_redirect_url` | `String?` | Direct link to Snap checkout page |

### PaymentMethod enum — add MIDTRANS

```prisma
enum PaymentMethod {
  CASH
  TRANSFER
  OTHER
  MIDTRANS
}
```

### Settings JSON — new `payment_gateway` namespace

Stored in `Institution.settings` alongside existing `billing` and `academic`:

```json
{
  "payment_gateway": {
    "provider": "midtrans",
    "midtrans_server_key": "SB-Mid-server-xxx",
    "midtrans_client_key": "SB-Mid-client-xxx",
    "is_sandbox": true
  }
}
```

No new Prisma models. Configuration in JSON, transaction history on existing Payment model.

## API Endpoints

### New endpoints

These endpoints live in a **new `PaymentGatewayController`** at route prefix `payments` (not `admin/payments`), because they serve both admin and parent roles, and the webhook must be public:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/payments/:id/checkout` | ADMIN, PARENT (JWT + ownership check) | Creates Midtrans Snap transaction, returns snap_token + redirect_url |
| `POST` | `/api/payments/midtrans-webhook` | @Public (signature verified, no JWT) | Receives Midtrans status notifications |
| `GET` | `/api/payments/:id/status` | ADMIN, PARENT (JWT + ownership check) | Polls current payment status |

**Controller separation:** The webhook handler uses `@Public()` at the method level. The checkout and status endpoints require JWT auth. Parent access uses the same ParentStudentGuard pattern (payment → student → ParentStudent → parent) for both checkout and status endpoints.

### Extended settings endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/settings/payment-gateway` | ADMIN | Returns gateway config (server_key masked) |
| `PATCH` | `/api/settings/payment-gateway` | ADMIN | Updates Midtrans keys, sandbox toggle |

### Checkout endpoint detail

`POST /api/payments/:id/checkout`

1. Validates payment exists, belongs to institution, status is PENDING or OVERDUE
2. Reads institution's Midtrans Server Key from `settings.payment_gateway`
3. If not configured → returns 400 `{ message: "Payment gateway not configured" }`
4. If `snap_token` already exists → attempts to reuse it. If Midtrans returns an error (token expired), creates a new one. No expiry timestamp stored — let Midtrans be the authority on token validity.
5. Otherwise creates Midtrans Snap transaction:
   - `order_id`: payment.id (UUID, unique)
   - `gross_amount`: payment.amount
   - `customer_details`: student name, parent email/phone (from student record)
   - `item_details`: class name, invoice number
6. Stores `snap_token`, `snap_redirect_url`, `midtrans_transaction_id` on Payment record
7. Returns `{ snap_token, redirect_url }`

**Parent access control:** When called by PARENT role, validates the payment belongs to one of their children (reuses ParentStudentGuard pattern — lookup payment → student → ParentStudent → parent).

### Webhook endpoint detail

`POST /api/payments/midtrans-webhook`

1. Receives JSON body from Midtrans with `order_id`, `status_code`, `gross_amount`, `signature_key`, `transaction_status`
2. Extracts `order_id` (= payment.id), looks up Payment record
3. Gets institution_id from Payment → reads Server Key from settings
4. Verifies signature: `SHA512(order_id + status_code + gross_amount + server_key)` must match `signature_key`
5. If signature fails → return 400, log warning
6. Maps `transaction_status`:
   - `settlement` or `capture` → Payment.status = PAID, Payment.paid_date = now, Payment.method = MIDTRANS
   - `expire` → Payment.status = PENDING (reset for retry)
   - `cancel`, `deny` → no status change (leave as PENDING/OVERDUE)
   - `pending` → no change (waiting for payment)
7. Idempotent: if Payment.status already PAID, skip update
8. Verify `gross_amount` matches Payment.amount before updating
9. On successful PAID update: optionally trigger WhatsApp receipt via existing WhatsAppService
10. Returns 200 OK

## Frontend Changes

### sinaloka-platform (Admin)

**Settings page — new "Payment Gateway" section (4th scroll-spy tab):**
- Midtrans Server Key input (type=password, masked)
- Midtrans Client Key input
- Environment toggle: Sandbox / Production
- Save button
- Uses existing scroll-spy pattern + settings service

**Payments page — new actions:**
- "Send Invoice" button on PENDING/OVERDUE payments → calls checkout endpoint → shows modal with payment link (copy + send via WhatsApp)
- New badge: "Awaiting Payment" for payments with snap_token but not yet paid

### sinaloka-parent (Parent App)

**PaymentList — "Bayar" button:**
- Shown on PENDING/OVERDUE payments when institution has payment gateway configured
- Taps → calls `POST /api/payments/:id/checkout` → opens `redirect_url` in system browser
- Hidden when gateway not configured — the parent payments endpoint (`GET /api/parent/children/:studentId/payments`) is extended to include a `gateway_configured: boolean` field in its response, derived from checking if `settings.payment_gateway.midtrans_server_key` exists for the institution

**Payment status page (new view):**
- Shown after returning from Midtrans redirect
- Displays "Processing..." with spinner
- Polls `GET /api/payments/:id/status` every 3 seconds (max 10 attempts)
- Shows "Payment Successful" (green) or "Still Processing" (with retry link)
- "Back to Payments" button

### sinaloka-tutors

No changes — tutors don't interact with payments.

## Dependencies

**Backend:**
- `midtrans-client` npm package (official Node.js SDK)
- Provides `MidtransClient.Snap` class for creating transactions
- Handles sandbox/production URL switching automatically

**Frontend:**
- No Midtrans SDK needed — Snap uses redirect URLs, not embedded widgets
- Parent app opens URL in system browser

## Security

**Webhook verification:**
- SHA-512 signature verification on every webhook call
- Signature = `SHA512(order_id + status_code + gross_amount + server_key)`
- Server Key is per-institution — looked up from Payment → institution_id → settings

**Key protection:**
- Server Key never exposed to frontend
- `GET /api/settings/payment-gateway` returns Server Key masked (`SB-Mid-***...xxx`)
- Client Key is safe to expose (public by Midtrans design)

**Amount verification:**
- Webhook handler verifies `gross_amount` matches `Payment.amount` before updating
- Prevents amount tampering

**Idempotency:**
- Duplicate webhook calls are no-ops (check if already PAID before updating)

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Parent doesn't complete payment | Snap token expires 24h. Payment stays PENDING. Parent can retry. |
| Webhook arrives before redirect | Normal flow — webhook updates DB, frontend poll catches up |
| Institution not configured | Checkout returns 400. "Bayar" button hidden in parent app |
| Double webhook | Idempotent — already PAID, skip |
| Amount mismatch | Reject webhook update, log error |
| Admin records manually AND parent pays online | First update wins. If already PAID, webhook skips |
| Snap token expired, parent clicks old link | Midtrans shows expired page. Parent returns to app, clicks "Bayar" again → new token created |

## Out of Scope (YAGNI)

- Refunds — handle manually in Midtrans dashboard
- Partial payments — not supported
- Recurring auto-charge — Midtrans Snap doesn't support natively
- Multiple gateway providers — Midtrans only for v1
- Credit card 3DS flow — handled by Snap automatically
- Subscription billing via Midtrans — use existing subscription generation + individual Snap payments

## Environment Variables

No application-level environment variables needed — Midtrans keys are per-institution in settings JSON.

The webhook URL (`https://api.sinaloka.com/api/payments/midtrans-webhook`) is registered manually in each institution's Midtrans dashboard settings. It is not consumed by application code.
