# Unified Midtrans Integration & Settlement Tracking

**Date:** 2026-03-21
**Status:** Design
**Scope:** Backend + Frontend Platform + Frontend Parent

## Context

Sinaloka is a multi-tenant tutoring platform. The existing codebase has Midtrans Snap integration built out but assumes each institution configures their own Midtrans keys. Since institutions (small tutoring centers) are unlikely to sign up for their own Midtrans accounts, the decision is to use a single Midtrans account (owned by Sinaloka platform) for all payments.

### Business Model

- **Revenue:** Sinaloka earns from subscription fees (GROWTH Rp 150K/mo, BUSINESS Rp 500K/mo). No commission on tuition payments.
- **Fee:** Midtrans transaction fees are absorbed by Sinaloka (platform cost), not charged to institutions.
- **Payment methods:** QRIS only for initial launch (other methods can be enabled from Midtrans dashboard without code changes).
- **Settlement:** Manual transfer to institution bank accounts for now, Midtrans Iris (auto-disbursement) planned for future.

## Design

### 1. Unified Midtrans Config

Replace per-institution Midtrans keys (stored in `institution.settings` DB) with a single set of environment variables used for all transactions (both tuition SPP and platform subscription).

**Environment variables:**

```
MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
MIDTRANS_IS_SANDBOX=true
```

Replaces: `SUBSCRIPTION_MIDTRANS_SERVER_KEY`, `SUBSCRIPTION_MIDTRANS_CLIENT_KEY`, `SUBSCRIPTION_MIDTRANS_SANDBOX`.

**Changes:**

| File | Change |
|------|--------|
| `SettingsService.getPaymentGatewayConfig()` | Read from `ConfigService` (env vars) instead of DB |
| `SubscriptionPaymentService.getMidtransConfig()` | Read from `MIDTRANS_*` env vars |
| `SettingsService.getPaymentGateway()` | Return `is_configured: true` when env vars present |
| `SettingsService.updatePaymentGateway()` | Remove or make no-op (keys no longer in DB) |
| `.env.example` | Replace `SUBSCRIPTION_MIDTRANS_*` with `MIDTRANS_*` |

### 2. Settlement Model

Track money flow from Midtrans to Sinaloka to institutions.

**Prisma schema:**

```prisma
model Settlement {
  id               String           @id @default(uuid())
  institution_id   String
  payment_id       String           @unique
  gross_amount     Decimal          // amount paid by parent (e.g. 500,000)
  midtrans_fee     Decimal          // Midtrans fee (e.g. 3,500)
  transfer_amount  Decimal          // amount to transfer to institution = gross_amount (fee absorbed by platform)
  platform_cost    Decimal          // fee absorbed by platform = midtrans_fee
  status           SettlementStatus @default(PENDING)
  transferred_at   DateTime?
  transferred_by   String?          // Super Admin user_id (no FK — audit log only)
  notes            String?
  created_at       DateTime         @default(now())
  updated_at       DateTime         @updatedAt

  institution      Institution      @relation(fields: [institution_id], references: [id])
  payment          Payment          @relation(fields: [payment_id], references: [id])

  @@map("settlements")
}

enum SettlementStatus {
  PENDING
  TRANSFERRED
}
```

**Required backrefs on existing models:**
- `Institution` model: add `settlements Settlement[]`
- `Payment` model: add `settlement Settlement?`

**Additional field on Payment model:**

```prisma
midtrans_payment_type  String?  // "qris", "bank_transfer", etc. — from webhook body
```

### 3. Fee Calculation

Midtrans does not return fee details in webhook or Get Status API. Fees are calculated using a hardcoded rate table based on `payment_type` from the webhook.

```typescript
const DEFAULT_FEE_RATES = {
  qris:           { type: 'percentage', value: 0.007 },  // 0.7%
  bank_transfer:  { type: 'flat',      value: 4000  },
  echannel:       { type: 'flat',      value: 4000  },
  cstore:         { type: 'flat',      value: 5000  },
  credit_card:    { type: 'percentage', value: 0.029 },
  gopay:          { type: 'percentage', value: 0.02  },
  shopeepay:      { type: 'percentage', value: 0.02  },
};
```

Overridable via `MIDTRANS_FEE_RATES` env var (JSON string). Only QRIS is active for initial launch.

**Fee is absorbed by platform:**

```
gross_amount   = 500,000 (paid by parent)
midtrans_fee   = 3,500   (QRIS 0.7%)
transfer_amount     = 500,000  (transferred to institution = full gross)
platform_cost  = 3,500    (absorbed by Sinaloka)
```

### 4. Settlement Flow

**Automatic (on webhook PAID):**

1. Midtrans webhook arrives
2. Save `midtrans_payment_type` from webhook body
3. Inside a single `prisma.$transaction()`:
   - Set payment status to PAID
   - Calculate fee based on `payment_type` and fee rate table
   - Create `Settlement` record: status=PENDING, transfer_amount=gross_amount, platform_cost=fee
4. This ensures atomicity — if Settlement creation fails, payment stays un-PAID and Midtrans will retry the webhook

**Manual (Super Admin):**

1. Open Settlement page in Super Admin
2. See list of PENDING settlements per institution
3. Transfer money manually to institution's bank account
4. Click "Mark as Transferred" → input date + optional notes
5. Status changes to TRANSFERRED

### 5. Settlement API

All endpoints are SUPER_ADMIN only.

| Method | Path | Description |
|--------|------|-------------|
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/settlements` | List settlements (query: `institution_id?`, `status?`, `from?`, `to?`, `page`, `limit`) |
| `GET` | `/api/admin/settlements/summary` | Summary per institution (pending/transferred amounts) |
| `GET` | `/api/admin/settlements/report` | Transaction report (query: `institution_id` required, `period` e.g. `2026-03`) |
| `PATCH` | `/api/admin/settlements/batch-transfer` | Mark multiple as transferred (must be defined before `:id` route in controller) |
| `PATCH` | `/api/admin/settlements/:id/transfer` | Mark single settlement as transferred |

**Note:** `batch-transfer` route must be registered before `:id/transfer` in the controller to avoid NestJS route matching conflict.

**Request body for transfer endpoints:**

```json
// PATCH /:id/transfer
{ "transferred_at": "2026-03-22T00:00:00Z", "notes": "Transfer via BCA" }

// PATCH /batch-transfer
{ "settlement_ids": ["uuid1", "uuid2"], "transferred_at": "2026-03-22T00:00:00Z", "notes": "Batch transfer" }
```

**Summary response:**

```json
{
  "institutions": [
    {
      "institution_id": "uuid",
      "institution_name": "Bimbel Cerdas",
      "pending_count": 5,
      "pending_amount": 2500000,
      "transferred_count": 12,
      "transferred_amount": 6000000,
      "total_platform_cost": 21000
    }
  ],
  "totals": {
    "total_pending": 2500000,
    "total_transferred": 6000000,
    "total_platform_cost": 21000
  }
}
```

**Report response (per institution, per period):**

```json
{
  "institution_name": "Bimbel Cerdas",
  "period": "2026-03",
  "transactions": [
    {
      "date": "2026-03-21",
      "student_name": "Siswa 1",
      "gross_amount": 500000,
      "midtrans_fee": 3500,
      "transfer_amount": 500000,
      "platform_cost": 3500,
      "status": "TRANSFERRED",
      "transferred_at": "2026-03-22"
    }
  ],
  "summary": {
    "total_gross": 500000,
    "total_fee": 3500,
    "total_net": 500000,
    "total_platform_cost": 3500
  }
}
```

### 6. Institution Bank Account

Institutions configure their bank account in the existing Settings > Billing section. The `bank_accounts` array already exists in billing settings — no new UI section needed. Super Admin references this when doing manual transfers.

### 7. Changes Summary

**Backend — Modified files:**

| File | Change |
|------|--------|
| `SettingsService` | `getPaymentGatewayConfig()` reads from env vars; `updatePaymentGateway()` returns 410 Gone |
| `SubscriptionPaymentService` | `getMidtransConfig()` uses `MIDTRANS_*` env vars |
| `PaymentGatewayController` webhook | Save `midtrans_payment_type`, create Settlement in `$transaction` after PAID |
| `ParentService` | `gateway_configured` now always true (reads from env vars via `getPaymentGatewayConfig()`) |
| `Payment` Prisma model | Add `midtrans_payment_type` field, add `settlement Settlement?` backref |
| `Institution` Prisma model | Add `settlements Settlement[]` backref |
| `.env.example` | Rename and add env vars |

**Backend — New files:**

| File | Purpose |
|------|---------|
| `Settlement` Prisma model | Model + enum + migration |
| `SettlementModule` | Module registration |
| `SettlementController` | 5 Super Admin endpoints |
| `SettlementService` | CRUD, summary, report, fee calculation |

**Frontend Platform:**

| Change | Detail |
|--------|--------|
| Remove/hide | Midtrans keys config UI in Settings > Payment Gateway |
| Remove/hide | `BillingPaymentTab.tsx` (per-institution gateway config) |
| New | Settlement page in Super Admin (list, summary, mark as transferred, report) |

**Frontend Parent:**

| Change | Detail |
|--------|--------|
| `PaymentList.tsx` | Remove `gateway_configured` check — Midtrans always available |

**Unchanged:**

- `MidtransService` — already generic
- Checkout flow (Snap redirect)
- Subscription payment flow (only env var rename)
- Signature verification
- Parent app flow (except removing gateway check)

### 8. Known Limitations

- **Refunds:** If a payment is refunded via Midtrans dashboard, the Settlement record is not automatically updated. Requires manual adjustment by Super Admin.
- **Fee accuracy:** Fee rates are hardcoded estimates. Actual Midtrans fees may differ slightly from calculated values. Will be replaced with real data when Midtrans Iris is integrated.
- **`transferred_by`:** Stores user ID as string without FK relation — intentional for simplicity. Sufficient for audit trail.
