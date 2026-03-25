# Student Billing Architecture Rethink

**Date:** 2026-03-24
**Status:** Draft
**Scope:** Student billing only (tutor payout out of scope)

## Problem Statement

Current billing architecture has two pain points:
1. **Admin confusion** — 4 billing modes (manual/per_session/package/subscription) are too many options with unclear differences
2. **Blurred responsibility** — SuperAdmin sets billing_mode per institution, but admin configures class-level fees. The relationship between these two layers is confusing.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Billing modes | 2 only: `PER_SESSION`, `MONTHLY_FIXED` | Covers ~95% of Indonesian bimbel. Package and manual eliminated. |
| Mode scope | 1 institution = 1 mode | Simplicity. All classes in an institution follow the same billing model. |
| Who sets mode | Admin, during onboarding wizard | Admin knows their business model. Locked after selection. |
| Rate configuration | Per class | Admin sets tarif on each class. No institution-level default rate. |
| Payment generation (per_session) | Auto on attendance recording | Existing behavior, unchanged. |
| Payment generation (monthly_fixed) | Cron job on 1st of each month | Standard bimbel practice — pay at start of month. |
| Payment methods | Unchanged: Cash, Transfer, Midtrans | Existing integration works well. |
| SuperAdmin role | Platform-level only | No billing operational config. Monitor + override only. |
| Admin control | Full billing operational settings | Invoice prefix, bank accounts, late payment settings. |

## 1. Data Model Changes

### New Enum

```prisma
enum BillingMode {
  PER_SESSION
  MONTHLY_FIXED
}
```

### Institution Model

Add two fields:

```prisma
model Institution {
  // ... existing fields ...
  billing_mode          BillingMode?     // null = not yet configured
  onboarding_completed  Boolean @default(false)
}
```

- `billing_mode` as a proper Prisma enum field (not JSON) for queryability and type safety
- `null` means billing not yet set up (triggers onboarding)
- `onboarding_completed` separate from `billing_mode` because onboarding has multiple steps beyond billing

### Payment Model

Add `billing_period` for robust duplicate detection (replaces fragile string-matching on `notes`):

```prisma
model Payment {
  // ... existing fields ...
  billing_period  String?    // "YYYY-MM" for monthly payments, null for per-session

  @@unique([enrollment_id, billing_period])  // prevents duplicate monthly payments
}
```

### Class Model

Remove `package_fee`:

```prisma
model Class {
  // ... existing fields ...
  fee          Decimal       // PER_SESSION: rate per session
                              // MONTHLY_FIXED: monthly fee
  // REMOVE: package_fee
  // KEEP: tutor_fee, tutor_fee_mode, tutor_fee_per_student (out of scope)
}
```

### Billing Settings (JSON)

Remove `billing_mode` from `settings.billing` JSON. Remaining fields:

```json
{
  "currency": "IDR",
  "invoice_prefix": "INV-",
  "late_payment_auto_lock": false,
  "late_payment_threshold": 0,
  "expense_categories": ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "OTHER"],
  "bank_accounts": []
}
```

## 2. Onboarding Wizard (Billing Step)

### Flow

```
Admin first login
  → Check institution.onboarding_completed == false
    → Redirect to /onboarding
      → Step 1: Institution profile (name, address, logo, etc.)
      → Step 2: Billing mode selection
      → Step N: ... (future steps)
      → Complete → set onboarding_completed = true
```

### Billing Step UI

Two-card selection: "Bagaimana cara kamu menagih siswa?"

**Card 1: Per Sesi**
- Siswa ditagih setiap kali hadir di sesi kelas
- Cocok untuk: les privat, bimbel fleksibel
- Tagihan otomatis dibuat saat absensi dicatat

**Card 2: Bulanan Tetap**
- Siswa bayar biaya tetap per bulan
- Cocok untuk: bimbel reguler, program intensif
- Tagihan otomatis dibuat setiap awal bulan

### Lock Mechanism

- After selection, billing mode is **locked**
- Settings > Billing shows billing mode as **read-only** with label "Ditetapkan saat setup awal"
- Change request → "Hubungi support untuk mengubah mode billing"
- SuperAdmin can override via SuperAdmin panel (edge case)

### API

```
POST /api/onboarding/billing-mode
Body: { billing_mode: "PER_SESSION" | "MONTHLY_FIXED" }
Guard: ADMIN only
Constraint: institution.billing_mode must be null (not yet set)
```

## 3. Class Creation Form Changes

### Remove
- `package_fee` field — no longer relevant

### Dynamic Labels
Based on `institution.billing_mode`:

| Billing Mode | Fee Label | Helper Text |
|---|---|---|
| `PER_SESSION` | "Tarif per sesi" | "Siswa ditagih nominal ini setiap hadir di sesi kelas" |
| `MONTHLY_FIXED` | "Biaya bulanan" | "Siswa ditagih nominal ini setiap awal bulan" |

### Guard: Class Creation Requires Billing Mode

Class creation is **blocked** if `institution.billing_mode` is null. Backend guard returns 400: "Billing mode must be configured before creating classes. Complete onboarding first." Frontend hides "Create Class" button and shows prompt to complete onboarding.

### No Structural Changes
Form structure unchanged. Only label/helper text adapts. Admin no longer needs to understand billing modes — context is provided automatically.

## 4. Payment Generation Logic

### Per Session (existing, minor changes)

Flow unchanged:
1. Tutor completes session → attendance recorded
2. `InvoiceGeneratorService.generatePerSessionPayment()` → creates PENDING payment
3. Amount from `class.fee`

**Change:** Read `billing_mode` from `institution.billing_mode` (enum field) instead of `settings.billing.billing_mode` (JSON).

### Monthly Fixed (new cron job)

```
Schedule: 1st of every month, 07:00 WIB (cron: "0 0 1 * *" UTC)
  → Query all institutions WHERE billing_mode = 'MONTHLY_FIXED'
    → Per institution, query all ACTIVE/TRIAL enrollments
      → Per enrollment, check duplicate via billing_period unique constraint
        → If not exists → create PENDING payment
          amount: class.fee
          due_date: 1st of current month
          billing_period: "YYYY-MM"
          notes: "Auto: Monthly YYYY-MM"
```

Note: Cron runs at `0 0 1 * *` UTC = 07:00 WIB on the 1st. This avoids timezone edge cases with late-night UTC-to-WIB conversion.

**Edge cases:**
- Mid-month enrollment → charged full amount for current month. Payment generated at enrollment time with `due_date = enrollment_date + 7 days` (grace period, avoids instant overdue). `billing_period` set to current month.
- Mid-month drop → enrollment status = DROPPED, cron skips. Existing payment remains (admin can void manually).
- Cron failure → `billing_period` unique constraint makes re-run safe (duplicate insert fails gracefully). Admin can also trigger manually via API.

### Remove
- `generatePackagePayment()` — package mode eliminated
- `generateSubscriptionPayments()` — replaced by monthly fixed cron

### API Changes

```
REMOVE: POST /api/admin/payments/generate-subscriptions
ADD:    POST /api/admin/payments/generate-monthly
        Guard: ADMIN only
        Logic: same as cron, scoped to admin's institution
```

## 5. Settings & SuperAdmin Separation

### Admin Settings (Billing Tab)

| Setting | Description | Editable? |
|---------|-------------|-----------|
| Billing Mode | PER_SESSION / MONTHLY_FIXED | Read-only (set during onboarding) |
| Invoice Prefix | e.g. "INV-" | Yes |
| Bank Accounts | Payment instructions on invoices | Yes |
| Late Payment Auto-lock | Auto-lock student on overdue | Yes |
| Late Payment Threshold | Number of overdue payments before lock | Yes |
| Expense Categories | Expense tracker categories | Yes (existing) |

Billing mode displayed as read-only info card at top of tab.

### SuperAdmin BillingPaymentTab

**Before:** Could configure billing_mode, currency, invoice_prefix, late_payment settings per institution.
**After:** Monitoring only.

| Element | Description |
|---------|-------------|
| Billing Mode | Read-only display per institution |
| Override Button | Change billing mode with confirmation dialog (edge case, rare) |

### SuperAdmin API

```
PATCH /api/superadmin/institutions/:id/billing-mode
Body: { billing_mode: "PER_SESSION" | "MONTHLY_FIXED" }
Guard: SUPER_ADMIN only
```

## 6. Migration & Cleanup

### Prisma Migration
1. Add `BillingMode` enum
2. Add `billing_mode BillingMode?` to Institution
3. Add `onboarding_completed Boolean @default(false)` to Institution
4. Add `billing_period String?` to Payment + unique constraint `@@unique([enrollment_id, billing_period])`
5. Drop `package_fee` from Class

### Code Changes (Backend)
1. `invoice-generator.service.ts` → remove `generatePackagePayment()`, `generateSubscriptionPayments()`, add `generateMonthlyPayments()`
2. `settings.service.ts` → remove `billing_mode` from `BILLING_DEFAULTS`
3. `settings.dto.ts` → remove `billing_mode` from billing DTO
4. `enrollment.service.ts` → remove call to `generatePackagePayment()`
5. `payment.controller.ts` → remove `generate-subscriptions`, add `generate-monthly`
6. New: `payment.cron.ts` or extend existing → monthly fixed cron job
7. New: onboarding module/controller/service

### Code Changes (Frontend)
1. `SuperAdmin/BillingPaymentTab.tsx` → strip billing config, make read-only + override
2. `Settings/tabs/BillingTab.tsx` → add billing mode info card + late payment settings
3. Class create/edit form → remove `package_fee`, dynamic `fee` label
4. New: `/onboarding` page with wizard steps
5. Auth context/router → redirect to onboarding if `onboarding_completed == false`

### No Data Migration Needed
No production clients exist. Clean migration without backward compatibility concerns.

## Files Affected

### Backend (~15 files)
- `prisma/schema.prisma` — enum + Institution fields + Payment billing_period + drop package_fee
- `src/modules/settings/settings.service.ts` — remove billing_mode from defaults
- `src/modules/settings/settings.service.spec.ts` — update tests (remove billing_mode: 'manual')
- `src/modules/settings/settings.dto.ts` — remove billing_mode from DTO
- `src/modules/payment/invoice-generator.service.ts` — rewrite for 2 modes, use billing_period
- `src/modules/payment/payment.controller.ts` — endpoint changes
- `src/modules/payment/payment.service.ts` — minor billing_mode read changes
- `src/modules/payment/payment.cron.ts` — new/extend monthly cron
- `src/modules/enrollment/enrollment.service.ts` — remove package payment call
- `src/modules/enrollment/enrollment.service.spec.ts` — remove generatePackagePayment mock
- `src/modules/class/class.dto.ts` — remove package_fee from DTO
- `src/modules/class/class.service.ts` — remove package_fee handling
- `src/modules/class/class.service.spec.ts` — update tests
- `src/modules/academic-year/academic-year.service.ts` — remove package_fee references
- `src/modules/academic-year/academic-year.service.spec.ts` — update tests
- `src/modules/onboarding/` — new module (controller, service, dto)
- `src/modules/superadmin/` — billing mode override endpoint

### Frontend (~8 files)
- `src/pages/SuperAdmin/BillingPaymentTab.tsx` — strip config, read-only
- `src/pages/Settings/tabs/BillingTab.tsx` — add billing info + late payment
- `src/pages/Classes/` — form changes (remove package_fee, dynamic label, guard if no billing_mode)
- `src/pages/Onboarding/` — new wizard page
- `src/contexts/AuthContext.tsx` or router — onboarding redirect logic
- `src/services/onboarding.ts` — new API service
- `src/services/settings.ts` — billing settings type updates
- `src/services/classes.ts` — remove package_fee from types
