# Billing Settings (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist billing configuration (billing mode, currency, invoice prefix, late payment rules, expense categories, bank accounts) in the institution's `settings: Json` column and wire the Settings > Billing tab to the API.

**Architecture:** Add billing DTO, GET/PATCH endpoints to the existing settings module, storing config in the `settings` JSON column with defaults merge. Change expense DTO enum to accept custom strings. Extend frontend settings service/hook/types and rewrite the Billing tab to be API-driven with add/remove for categories and bank accounts.

**Tech Stack:** NestJS, Prisma (Json field), Zod, React, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-16-settings-billing-design.md`

---

## Chunk 1: Backend — DTO, Service, Controller, Expense DTO Change

### Task 1: Add Billing DTO to Settings Module

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.dto.ts`

- [ ] **Step 1: Add billing schema and types**

Append to `sinaloka-backend/src/modules/settings/settings.dto.ts`:

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

export type UpdateBillingSettingsDto = z.infer<typeof UpdateBillingSettingsSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.dto.ts
git commit -m "feat(backend): add billing settings Zod schema"
```

---

### Task 2: Add Billing Methods to Settings Service

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts`

- [ ] **Step 1: Add BILLING_DEFAULTS constant and billing methods**

Add import for the new type at top:
```typescript
import type { UpdateGeneralSettingsDto, UpdateBillingSettingsDto } from './settings.dto.js';
```

Add `BILLING_DEFAULTS` constant after `GENERAL_SELECT`:

```typescript
const BILLING_DEFAULTS = {
  billing_mode: 'manual' as const,
  currency: 'IDR',
  invoice_prefix: 'INV-',
  late_payment_auto_lock: false,
  late_payment_threshold: 0,
  expense_categories: ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'],
  bank_accounts: [] as any[],
};
```

Add two methods to the `SettingsService` class:

```typescript
async getBilling(institutionId: string) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });

  if (!institution) {
    throw new NotFoundException('Institution not found');
  }

  const stored = (institution.settings as any)?.billing ?? {};
  return { ...BILLING_DEFAULTS, ...stored };
}

async updateBilling(institutionId: string, dto: UpdateBillingSettingsDto) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });

  if (!institution) {
    throw new NotFoundException('Institution not found');
  }

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

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.service.ts
git commit -m "feat(backend): add getBilling and updateBilling to settings service"
```

---

### Task 3: Add Billing Endpoints to Settings Controller

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.controller.ts`

- [ ] **Step 1: Add billing imports and endpoints**

Add to imports:
```typescript
import { UpdateGeneralSettingsSchema, UpdateBillingSettingsSchema } from './settings.dto.js';
import type { UpdateGeneralSettingsDto, UpdateBillingSettingsDto } from './settings.dto.js';
```

Add two new methods to `SettingsController`:

```typescript
@Get('billing')
async getBilling(@CurrentUser() user: JwtPayload) {
  return this.settingsService.getBilling(user.institutionId!);
}

@Patch('billing')
async updateBilling(
  @CurrentUser() user: JwtPayload,
  @Body(new ZodValidationPipe(UpdateBillingSettingsSchema))
  dto: UpdateBillingSettingsDto,
) {
  return this.settingsService.updateBilling(user.institutionId!, dto);
}
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep settings
```

Expected: No settings-related errors.

- [ ] **Step 3: Test with curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@cerdas.id","password":"password"}' | jq -r '.access_token')

# GET billing defaults
curl -s http://localhost:5000/api/settings/billing -H "Authorization: Bearer $TOKEN" | jq .

# PATCH billing
curl -s -X PATCH http://localhost:5000/api/settings/billing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"billing_mode":"per_session","expense_categories":["RENT","UTILITIES","SUPPLIES","MARKETING","SOFTWARE","OTHER"]}' | jq .
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.controller.ts
git commit -m "feat(backend): add GET/PATCH /api/settings/billing endpoints"
```

---

### Task 4: Change Expense DTO Category from Enum to String

**Files:**
- Modify: `sinaloka-backend/src/modules/expense/expense.dto.ts`

- [ ] **Step 1: Replace the ExpenseCategory enum with a string validator**

Change:
```typescript
const ExpenseCategory = z.enum(['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER']);
```

To:
```typescript
const ExpenseCategory = z.string().min(1).max(50);
```

This single change propagates to `CreateExpenseSchema`, `UpdateExpenseSchema`, and `ExpenseQuerySchema` since they all reference `ExpenseCategory`.

- [ ] **Step 2: Verify backend compiles**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep expense
```

Expected: No expense-related errors.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.dto.ts
git commit -m "feat(backend): change expense category from fixed enum to string for custom categories"
```

---

## Chunk 2: Frontend — Types, Service, Hook, Billing Tab Rewrite

### Task 5: Extend Frontend Types, Service, and Hook

**Files:**
- Modify: `sinaloka-platform/src/types/settings.ts`
- Modify: `sinaloka-platform/src/services/settings.service.ts`
- Modify: `sinaloka-platform/src/hooks/useSettings.ts`

- [ ] **Step 1: Add billing types**

Append to `sinaloka-platform/src/types/settings.ts`:

```typescript
export interface BankAccount {
  id?: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface BillingSettings {
  billing_mode: 'manual' | 'per_session' | 'package' | 'subscription';
  currency: string;
  invoice_prefix: string;
  late_payment_auto_lock: boolean;
  late_payment_threshold: number;
  expense_categories: string[];
  bank_accounts: BankAccount[];
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

- [ ] **Step 2: Add billing service methods**

Append to the `settingsService` object in `sinaloka-platform/src/services/settings.service.ts`:

```typescript
getBilling: () =>
  api.get<BillingSettings>('/api/settings/billing').then((r) => r.data),
updateBilling: (data: UpdateBillingSettingsDto) =>
  api.patch<BillingSettings>('/api/settings/billing', data).then((r) => r.data),
```

Add the import:
```typescript
import type { GeneralSettings, UpdateGeneralSettingsDto, BillingSettings, UpdateBillingSettingsDto } from '@/src/types/settings';
```

- [ ] **Step 3: Add billing hooks**

Append to `sinaloka-platform/src/hooks/useSettings.ts`:

```typescript
export function useBillingSettings() {
  return useQuery({
    queryKey: ['settings', 'billing'],
    queryFn: settingsService.getBilling,
  });
}

export function useUpdateBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBillingSettingsDto) => settingsService.updateBilling(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'billing'] }),
  });
}
```

Add import for new type:
```typescript
import type { UpdateGeneralSettingsDto, UpdateBillingSettingsDto } from '@/src/types/settings';
```

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/settings.ts sinaloka-platform/src/services/settings.service.ts sinaloka-platform/src/hooks/useSettings.ts
git commit -m "feat(platform): add billing types, service methods, and hooks"
```

---

### Task 6: Rewrite Settings.tsx Billing Tab

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings.tsx`

- [ ] **Step 1: Read current Settings.tsx**

Read the file to understand the billing tab section (case 'billing' in renderTabContent).

- [ ] **Step 2: Add billing imports and state**

Add import at top:
```typescript
import { useBillingSettings, useUpdateBillingSettings } from '@/src/hooks/useSettings';
```

Inside the component, add:
```typescript
const { data: billingSettings, isLoading: isLoadingBilling } = useBillingSettings();
const updateBilling = useUpdateBillingSettings();

// Billing form state
const [formBillingMode, setFormBillingMode] = useState('manual');
const [formCurrency, setFormCurrency] = useState('IDR');
const [formInvoicePrefix, setFormInvoicePrefix] = useState('INV-');
const [formLatePaymentAutoLock, setFormLatePaymentAutoLock] = useState(false);
const [formLatePaymentThreshold, setFormLatePaymentThreshold] = useState(0);
const [formExpenseCategories, setFormExpenseCategories] = useState<string[]>([]);
const [formBankAccounts, setFormBankAccounts] = useState<BankAccount[]>([]);
const [newCategoryInput, setNewCategoryInput] = useState('');
const [showAddBankForm, setShowAddBankForm] = useState(false);
const [newBankName, setNewBankName] = useState('');
const [newBankAccount, setNewBankAccount] = useState('');
const [newBankHolder, setNewBankHolder] = useState('');
```

Add import for BankAccount type:
```typescript
import type { BankAccount } from '@/src/types/settings';
```

Add useEffect to initialize from API:
```typescript
useEffect(() => {
  if (billingSettings) {
    setFormBillingMode(billingSettings.billing_mode);
    setFormCurrency(billingSettings.currency);
    setFormInvoicePrefix(billingSettings.invoice_prefix);
    setFormLatePaymentAutoLock(billingSettings.late_payment_auto_lock);
    setFormLatePaymentThreshold(billingSettings.late_payment_threshold);
    setFormExpenseCategories(billingSettings.expense_categories);
    setFormBankAccounts(billingSettings.bank_accounts);
  }
}, [billingSettings]);
```

Add save handler:
```typescript
const handleSaveBilling = () => {
  updateBilling.mutate({
    billing_mode: formBillingMode,
    currency: formCurrency,
    invoice_prefix: formInvoicePrefix,
    late_payment_auto_lock: formLatePaymentAutoLock,
    late_payment_threshold: formLatePaymentThreshold,
    expense_categories: formExpenseCategories,
    bank_accounts: formBankAccounts,
  }, {
    onSuccess: () => toast.success(t('settings.billing.saveSuccess')),
    onError: () => toast.error(t('settings.billing.saveFailed')),
  });
};

const handleAddCategory = () => {
  const cat = newCategoryInput.trim().toUpperCase();
  if (cat && !formExpenseCategories.includes(cat)) {
    setFormExpenseCategories([...formExpenseCategories, cat]);
    setNewCategoryInput('');
  }
};

const handleRemoveCategory = (cat: string) => {
  setFormExpenseCategories(formExpenseCategories.filter(c => c !== cat));
};

const handleAddBankAccount = () => {
  if (newBankName && newBankAccount && newBankHolder) {
    setFormBankAccounts([...formBankAccounts, {
      id: crypto.randomUUID(),
      bank_name: newBankName,
      account_number: newBankAccount,
      account_holder: newBankHolder,
    }]);
    setNewBankName('');
    setNewBankAccount('');
    setNewBankHolder('');
    setShowAddBankForm(false);
  }
};

const handleRemoveBankAccount = (id: string) => {
  setFormBankAccounts(formBankAccounts.filter(a => a.id !== id));
};
```

- [ ] **Step 3: Rewrite the billing tab content**

Replace the entire `case 'billing':` block in `renderTabContent()` with API-driven content:

- **Billing Config Card:** Loading skeleton when `isLoadingBilling`, otherwise:
  - Billing mode cards bound to `formBillingMode`
  - Currency dropdown bound to `formCurrency`
  - Invoice prefix input bound to `formInvoicePrefix`
  - Late payment toggle bound to `formLatePaymentAutoLock`
  - Late payment threshold input bound to `formLatePaymentThreshold`
  - Save button calls `handleSaveBilling`

- **Expense Categories Card:**
  - Badge list from `formExpenseCategories` with X to remove
  - Input + "Add" button to add new category
  - Save button calls `handleSaveBilling`

- **Bank Accounts Card:**
  - Card list from `formBankAccounts` with trash icon to remove
  - "Add Account" button toggles inline form (bank name, account number, holder)
  - "Add" button in inline form calls `handleAddBankAccount`
  - Save button calls `handleSaveBilling`

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Settings.tsx
git commit -m "feat(platform): wire Billing Settings tab to API with CRUD for categories and bank accounts"
```

---

### Task 7: Add Missing Translation Keys

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add new billing translation keys**

Add to `settings.billing` in `id.json`:
```json
"saveSuccess": "Pengaturan penagihan berhasil disimpan",
"saveFailed": "Gagal menyimpan pengaturan penagihan",
"addCategoryPlaceholder": "Nama kategori baru",
"bankNameLabel": "Nama Bank",
"bankNamePlaceholder": "contoh: BCA",
"accountNumberLabel": "Nomor Rekening",
"accountNumberPlaceholder": "1234567890",
"accountHolderLabel": "Pemilik Rekening",
"accountHolderPlaceholder": "Nama pemilik",
"addBankAccount": "Tambah",
"cancelAdd": "Batal"
```

Add equivalent in `en.json`:
```json
"saveSuccess": "Billing settings saved successfully",
"saveFailed": "Failed to save billing settings",
"addCategoryPlaceholder": "New category name",
"bankNameLabel": "Bank Name",
"bankNamePlaceholder": "e.g. BCA",
"accountNumberLabel": "Account Number",
"accountNumberPlaceholder": "1234567890",
"accountHolderLabel": "Account Holder",
"accountHolderPlaceholder": "Account holder name",
"addBankAccount": "Add",
"cancelAdd": "Cancel"
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add billing settings translation keys"
```

---

## Chunk 3: Final Verification

### Task 8: Full Build + Smoke Test

- [ ] **Step 1: Backend type check**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -E "settings|expense|billing"
```

Expected: No related errors.

- [ ] **Step 2: Frontend type check + build**

```bash
cd sinaloka-platform && npx tsc --noEmit && npm run build
```

Expected: No errors, build succeeds.

- [ ] **Step 3: End-to-end smoke test**

Start both backend and frontend. Verify:

1. Navigate to Settings > Billing tab
2. All fields load from API (defaults on first load)
3. Change billing mode → Save → refresh → persists
4. Change currency → Save → persists
5. Add a new expense category "SOFTWARE" → Save → refresh → persists
6. Remove an expense category → Save → persists
7. Add a bank account (BCA, 1234567890, Bimbel Cerdas) → Save → refresh → persists
8. Remove a bank account → Save → persists
9. Toggle late payment auto-lock → set threshold to 1000000 → Save → persists
10. Go to Finance > Operating Expenses → create new expense with custom category "SOFTWARE" → works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Billing Settings Phase 1 — configuration persistence"
```
