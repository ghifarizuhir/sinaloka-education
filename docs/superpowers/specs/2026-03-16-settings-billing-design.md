# Billing Settings (Phase 1) Design — sinaloka

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Persist billing configuration in the database and wire the Settings > Billing tab to the API. No billing behavior changes — configuration only.
**Roadmap:** See `docs/superpowers/specs/2026-03-16-billing-roadmap.md` for full phased plan.

## Overview

Store billing configuration (billing mode, currency, invoice prefix, late payment rules, expense categories, bank accounts) in the institution's `settings: Json` column. Add GET/PATCH endpoints to the existing settings module. Rewrite the Billing tab in Settings.tsx to load from and save to the API. Change the backend Expense DTO to accept custom category strings instead of a fixed enum.

## Data Storage

All billing config stored in the existing `settings: Json?` column under a `billing` key. **No database migration required.**

### Schema Shape

```json
{
  "billing": {
    "billing_mode": "manual",
    "currency": "IDR",
    "invoice_prefix": "INV-",
    "late_payment_auto_lock": false,
    "late_payment_threshold": 0,
    "expense_categories": ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "OTHER"],
    "bank_accounts": [
      {
        "id": "uuid-string",
        "bank_name": "BCA",
        "account_number": "1234567890",
        "account_holder": "Bimbel Cerdas"
      }
    ]
  }
}
```

### Defaults

When `settings.billing` is null/undefined (all existing institutions), the API returns hardcoded defaults:

```typescript
const BILLING_DEFAULTS = {
  billing_mode: 'manual',
  currency: 'IDR',
  invoice_prefix: 'INV-',
  late_payment_auto_lock: false,
  late_payment_threshold: 0,
  expense_categories: ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'],
  bank_accounts: [],
};
```

No backfill migration needed — defaults are applied at read time.

## Backend API

### Endpoints

Added to the existing `SettingsController` (`src/modules/settings/settings.controller.ts`):

```
GET   /api/settings/billing   → returns billing config (merged with defaults)
PATCH /api/settings/billing   → updates billing config (partial merge)
```

**Access:** `ADMIN` and `SUPER_ADMIN` roles. Same tenant scoping as general settings.

### GET /api/settings/billing — Response

Always returns a complete object by merging stored values with defaults:

```json
{
  "billing_mode": "manual",
  "currency": "IDR",
  "invoice_prefix": "INV-",
  "late_payment_auto_lock": false,
  "late_payment_threshold": 0,
  "expense_categories": ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "OTHER"],
  "bank_accounts": []
}
```

### PATCH /api/settings/billing — Request Body

All fields optional. Only send what changed:

```json
{
  "billing_mode": "per_session",
  "expense_categories": ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "SOFTWARE", "OTHER"]
}
```

### Merge Strategy

PATCH performs a shallow merge: `{ ...BILLING_DEFAULTS, ...existingBilling, ...dto }`.

For arrays (`expense_categories`, `bank_accounts`), the new value **replaces** the old entirely (not appended). Frontend must send the complete array.

### Service Implementation

In `settings.service.ts`:

```typescript
async getBilling(institutionId: string) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });
  if (!institution) throw new NotFoundException('Institution not found');

  const stored = (institution.settings as any)?.billing ?? {};
  return { ...BILLING_DEFAULTS, ...stored };
}

async updateBilling(institutionId: string, dto: UpdateBillingSettingsDto) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });
  if (!institution) throw new NotFoundException('Institution not found');

  const currentSettings = (institution.settings as any) ?? {};
  const currentBilling = currentSettings.billing ?? {};
  const updatedBilling = { ...currentBilling, ...dto };

  await this.prisma.institution.update({
    where: { id: institutionId },
    data: {
      settings: { ...currentSettings, billing: updatedBilling },
    },
  });

  return { ...BILLING_DEFAULTS, ...updatedBilling };
}
```

### Validation (Zod)

```typescript
export const UpdateBillingSettingsSchema = z.object({
  billing_mode: z.enum(['manual', 'per_session', 'package', 'subscription']).optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
  invoice_prefix: z.string().min(1).max(20).optional(),
  late_payment_auto_lock: z.boolean().optional(),
  late_payment_threshold: z.number().min(0).optional(),
  expense_categories: z.array(z.string().min(1).max(50)).min(1).optional(),
  bank_accounts: z.array(z.object({
    id: z.string().optional(),
    bank_name: z.string().min(1).max(100),
    account_number: z.string().min(1).max(50),
    account_holder: z.string().min(1).max(255),
  })).optional(),
});
```

## Expense DTO Change

**File:** `sinaloka-backend/src/modules/expense/expense.dto.ts`

Change the `category` field from a fixed enum to a free string:

```typescript
// Before
category: z.enum(['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'])

// After
category: z.string().min(1).max(50)
```

This allows institutions to use custom expense categories configured in their billing settings. Existing expenses with the standard categories continue to work.

## Frontend Integration

### Extend Existing Files

**`src/services/settings.service.ts`** — add:
```typescript
getBilling: () => api.get('/api/settings/billing').then(r => r.data),
updateBilling: (data: UpdateBillingSettingsDto) =>
  api.patch('/api/settings/billing', data).then(r => r.data),
```

**`src/hooks/useSettings.ts`** — add:
```typescript
export function useBillingSettings() {
  return useQuery({ queryKey: ['settings', 'billing'], queryFn: settingsService.getBilling });
}

export function useUpdateBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateBilling,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'billing'] }),
  });
}
```

**`src/types/settings.ts`** — add:
```typescript
export interface BillingSettings {
  billing_mode: 'manual' | 'per_session' | 'package' | 'subscription';
  currency: string;
  invoice_prefix: string;
  late_payment_auto_lock: boolean;
  late_payment_threshold: number;
  expense_categories: string[];
  bank_accounts: BankAccount[];
}

export interface BankAccount {
  id?: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface UpdateBillingSettingsDto {
  billing_mode?: string;
  currency?: string;
  invoice_prefix?: string;
  late_payment_auto_lock?: boolean;
  late_payment_threshold?: number;
  expense_categories?: string[];
  bank_accounts?: BankAccount[];
}
```

### Settings.tsx — Billing Tab Rewrite

**Loading:** Show skeleton while `useBillingSettings()` fetches data.

**Form state:** All fields tracked with `useState`, initialized from API data via `useEffect`.

**Billing mode cards:** Highlight active mode from API, click to change (local state until save).

**Currency + invoice prefix:** Bound inputs.

**Late payment:** Toggle + threshold input, both bound.

**Expense categories:**
- Loaded as badge list from API
- Add: text input + "Add" button, appends to local array
- Remove: click X on badge, removes from local array
- Save sends complete array

**Bank accounts:**
- Loaded as card list from API
- Add: inline form with bank name, account number, account holder fields. Client generates UUID for `id` field.
- Remove: click trash icon, removes from local array
- Save sends complete array

**Save button:** Single "Save Changes" at bottom of each Card section calls `useUpdateBillingSettings` with all billing fields. Success/error toast.

**Key behavior:** No auto-save. All changes are local until "Save Changes" is clicked.

### Translation Keys

Add billing-specific keys to `id.json` and `en.json` under `settings.billing.*` for any new strings (add category placeholder, bank account form labels, save success/error toasts). Most keys already exist from the i18n migration.

## Constraints

- No billing behavior changes — this is configuration persistence only
- `billing_mode` is stored but not enforced (Phase 2)
- `late_payment_auto_lock` is stored but not enforced (Phase 3)
- `expense_categories` change in expense DTO is backward-compatible (existing categories still work)
- Bank accounts are simple JSON, no separate table
- Currency is display-only (no multi-currency conversion logic)
