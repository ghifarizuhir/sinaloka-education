# Settings Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move billing & payment gateway settings to Super Admin panel, refactor Admin Settings to tab-based navigation with query params, and add confirmation modals showing change diffs before every save.

**Architecture:** Frontend-only changes. Reuse existing `/api/settings/*` endpoints (already support SUPER_ADMIN role). Create a reusable `ConfirmChangesModal` component, refactor the Settings page from scroll-spy to `?tab=` query param navigation, add a "Billing & Payment" tab to the Super Admin Institution Detail page.

**Tech Stack:** React 19, React Router (useSearchParams), TanStack Query, Tailwind CSS v4, Motion (framer-motion), existing UI components (Card, Button, Modal, Input, Label, Select, Switch)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/ui/confirm-changes-modal.tsx` | Create | Reusable modal showing field-level diffs before save |
| `src/components/ui/index.ts` | Modify | Export ConfirmChangesModal |
| `src/pages/Settings/index.tsx` | Modify | Refactor from scroll-spy to `?tab=` query param tab switching |
| `src/pages/Settings/useSettingsPage.ts` | Modify | Remove payment gateway state, add change detection helpers |
| `src/pages/Settings/tabs/BillingTab.tsx` | Modify | Remove billing config (mode, currency, prefix, late payment), keep expense categories + bank accounts only |
| `src/pages/Settings/tabs/PaymentGatewayTab.tsx` | Delete | Entire tab moves to Super Admin |
| `src/pages/Settings/tabs/GeneralTab.tsx` | Modify | Add single save button + confirm modal |
| `src/pages/Settings/tabs/AcademicTab.tsx` | Modify | Consolidate save buttons into one + confirm modal |
| `src/pages/SuperAdmin/InstitutionDetail.tsx` | Modify | Add "Billing & Payment" tab |
| `src/pages/SuperAdmin/BillingPaymentTab.tsx` | Create | Billing config + Payment Gateway for Super Admin |
| `src/pages/SuperAdmin/InstitutionForm.tsx` | Modify | Add optional "Billing & Payment" collapsible section for create flow |
| `src/hooks/useSettings.ts` | Modify | Remove payment gateway hooks (optional cleanup) |
| `src/services/settings.service.ts` | No change | Already supports all needed endpoints |

---

## Task 1: Create ConfirmChangesModal component

**Files:**
- Create: `sinaloka-platform/src/components/ui/confirm-changes-modal.tsx`
- Modify: `sinaloka-platform/src/components/ui/index.ts`

- [ ] **Step 1: Create the ConfirmChangesModal component**

Create `sinaloka-platform/src/components/ui/confirm-changes-modal.tsx`:

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { Button } from './button';
import { useOverlayClose } from './use-overlay-close';

export interface FieldChange {
  label: string;
  type: 'scalar' | 'array' | 'secret';
  oldValue?: string;
  newValue?: string;
  added?: string[];
  removed?: string[];
}

interface ConfirmChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: FieldChange[];
  isLoading?: boolean;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmChangesModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  isLoading = false,
  title = 'Konfirmasi Perubahan',
  confirmLabel = 'Konfirmasi & Simpan',
  cancelLabel = 'Batal',
}: ConfirmChangesModalProps) {
  useOverlayClose(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Periksa perubahan berikut sebelum menyimpan:
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {changes.map((change, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {change.label}
                  </p>

                  {change.type === 'scalar' && (
                    <p className="text-sm text-foreground">
                      <span className="text-red-500 line-through">{change.oldValue}</span>
                      {' → '}
                      <span className="text-emerald-600 font-medium">{change.newValue}</span>
                    </p>
                  )}

                  {change.type === 'secret' && (
                    <p className="text-sm text-amber-600 font-medium">Diperbarui</p>
                  )}

                  {change.type === 'array' && (
                    <div className="space-y-1">
                      {change.added?.map((item) => (
                        <p key={item} className="text-sm text-emerald-600">+ {item}</p>
                      ))}
                      {change.removed?.map((item) => (
                        <p key={item} className="text-sm text-red-500">- {item}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Export from UI index**

In `sinaloka-platform/src/components/ui/index.ts`, add:

```ts
export { ConfirmChangesModal, type FieldChange } from './confirm-changes-modal';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/confirm-changes-modal.tsx src/components/ui/index.ts
git commit -m "feat(platform): add ConfirmChangesModal component

Reusable modal that shows field-level diffs (scalar, array, secret)
before saving settings changes."
```

---

## Task 2: Create change detection utility

**Files:**
- Create: `sinaloka-platform/src/lib/change-detection.ts`

This utility compares initial vs current state and produces `FieldChange[]` for the modal.

- [ ] **Step 1: Create the utility**

Create `sinaloka-platform/src/lib/change-detection.ts`:

```ts
import type { FieldChange } from '../components/ui/confirm-changes-modal';

/**
 * Compare two values and return a FieldChange if they differ.
 * For scalar values (string, number, boolean).
 */
export function detectScalarChange(
  label: string,
  oldVal: unknown,
  newVal: unknown,
  formatter?: (v: unknown) => string,
): FieldChange | null {
  if (oldVal === newVal) return null;
  const fmt = formatter ?? String;
  return {
    label,
    type: 'scalar',
    oldValue: fmt(oldVal),
    newValue: fmt(newVal),
  };
}

/**
 * Compare two string arrays and return a FieldChange if they differ.
 */
export function detectArrayChange(
  label: string,
  oldArr: string[],
  newArr: string[],
): FieldChange | null {
  const added = newArr.filter((item) => !oldArr.includes(item));
  const removed = oldArr.filter((item) => !newArr.includes(item));
  if (added.length === 0 && removed.length === 0) return null;
  return { label, type: 'array', added, removed };
}

/**
 * Detect if a secret field was changed (non-empty new value).
 */
export function detectSecretChange(
  label: string,
  newVal: string,
): FieldChange | null {
  if (!newVal || newVal.trim() === '') return null;
  return { label, type: 'secret' };
}

/**
 * Filter null entries from an array of possible changes.
 */
export function collectChanges(
  ...changes: (FieldChange | null)[]
): FieldChange[] {
  return changes.filter((c): c is FieldChange => c !== null);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add src/lib/change-detection.ts
git commit -m "feat(platform): add change detection utility for settings diffs"
```

---

## Task 3: Refactor Admin Settings — tab navigation via query params

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/index.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/useSettingsPage.ts`

- [ ] **Step 1: Refactor Settings/index.tsx to use ?tab= query param**

Replace the scroll-spy approach with `useSearchParams`. Key changes:

1. Import `useSearchParams` from `react-router-dom`
2. Read active tab from `searchParams.get('tab') || 'general'`
3. Render only the active tab's component (not all at once)
4. Tab click updates query param instead of scrolling
5. Remove `IntersectionObserver`, scroll-spy refs, `activeSection` state
6. Remove `PaymentGatewayTab` import and section

Tabs array becomes:
```ts
const tabs = [
  { id: 'general', label: t('settings.tabs.general'), icon: Building2 },
  { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard },
  { id: 'academic', label: t('settings.tabs.academic'), icon: GraduationCap },
];
```

Tab bar renders:
```tsx
{tabs.map((tab) => (
  <button
    key={tab.id}
    onClick={() => setSearchParams({ tab: tab.id })}
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
      activeTab === tab.id
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )}
  >
    <tab.icon size={16} />
    {tab.label}
  </button>
))}
```

Content area renders conditionally:
```tsx
{activeTab === 'general' && <GeneralTab s={s} />}
{activeTab === 'billing' && <BillingTab s={s} />}
{activeTab === 'academic' && <AcademicTab s={s} />}
```

- [ ] **Step 2: Remove payment gateway state from useSettingsPage.ts**

In `useSettingsPage.ts`:
- Remove `usePaymentGatewaySettings` import and hook call
- Remove all `paymentGateway*` fields from the returned state
- Remove `handleSavePaymentGateway` function
- Keep all other state (general, billing, academic)

- [ ] **Step 3: Delete PaymentGatewayTab.tsx**

```bash
rm sinaloka-platform/src/pages/Settings/tabs/PaymentGatewayTab.tsx
```

- [ ] **Step 4: Verify build**

Run: `cd sinaloka-platform && npm run lint && npm run build`

Expected: No errors. Any import of `PaymentGatewayTab` should be removed in Step 1.

- [ ] **Step 5: Commit**

```bash
git add -A sinaloka-platform/src/pages/Settings/
git commit -m "refactor(platform): convert Settings to tab navigation via ?tab= query param

Remove scroll-spy approach. Each tab renders independently.
Remove Payment Gateway tab (moved to Super Admin).
Remove payment gateway state from useSettingsPage."
```

---

## Task 4: Slim down BillingTab — remove billing config, keep expense categories + bank accounts

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/tabs/BillingTab.tsx`

- [ ] **Step 1: Remove the "Billing Configuration" card**

The first Card in BillingTab contains: billing mode selector, currency dropdown, invoice prefix, late payment toggle. Remove this entire Card section. Keep the remaining two Cards:
- Expense Categories (tag badges + input)
- Bank Accounts (list + add form)

- [ ] **Step 2: Add single save button at the bottom**

After the two remaining cards, add a save button that calls the existing `handleSaveBilling`:

```tsx
<div className="flex justify-end pt-4">
  <Button
    onClick={() => {
      // Build changes and show confirm modal
      // (will be wired in Task 6)
      s.handleSaveBilling();
    }}
    disabled={s.updateBilling.isPending}
  >
    {s.updateBilling.isPending ? t('common.saving') : t('common.save')}
  </Button>
</div>
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/tabs/BillingTab.tsx
git commit -m "refactor(platform): slim BillingTab to expense categories and bank accounts only

Remove billing mode, currency, invoice prefix, and late payment
settings. These are now managed by Super Admin."
```

---

## Task 5: Add "Billing & Payment" tab to Super Admin Institution Detail

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx`
- Modify: `sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx`

- [ ] **Step 1: Create BillingPaymentTab component**

Create `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx`. This component:

1. Fetches billing and payment gateway settings using existing hooks (`useBillingSettings`, `usePaymentGatewaySettings`)
2. Renders two Cards: Billing Configuration + Payment Gateway (same fields as the old admin Settings tabs)
3. One "Simpan" button at the bottom
4. Calls both `PATCH /api/settings/billing` and `PATCH /api/settings/payment-gateway` on save

Key: The Super Admin accesses this from the Institution Detail page (without impersonation). The backend `TenantInterceptor` reads `institution_id` from query params for SUPER_ADMIN role. So all API calls must include `?institution_id=<id>`.

The BillingPaymentTab receives `institutionId` as prop and passes it to the API calls:

```tsx
interface BillingPaymentTabProps {
  institutionId: string;
}
```

Use `settingsService` directly (not hooks) to fetch and save with the institution_id query param:
```ts
const fetchBilling = () => api.get('/api/settings/billing', { params: { institution_id: institutionId } });
const fetchPaymentGateway = () => api.get('/api/settings/payment-gateway', { params: { institution_id: institutionId } });
```

The component manages its own local form state (not shared with useSettingsPage).

Include all billing config fields:
- Billing Mode card selector (per_session, package, subscription)
- Currency dropdown (IDR, USD)
- Invoice Prefix text input
- Late Payment Auto-Lock toggle + threshold
- Midtrans Server Key (password)
- Midtrans Client Key (text)
- Sandbox Mode toggle
- Connection status badge

- [ ] **Step 2: Add the tab to InstitutionDetail.tsx**

In `InstitutionDetail.tsx`, add "Billing & Payment" to the tabs array (after General, before Admins):

```ts
const tabs = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'billing', label: 'Billing & Payment', icon: CreditCard },
  { id: 'admins', label: 'Admins', icon: Users },
  { id: 'overview', label: 'Overview', icon: BarChart3 },
];
```

Import and render:
```tsx
{activeTab === 'billing' && <BillingPaymentTab institutionId={id!} />}
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npm run lint && npm run build`

- [ ] **Step 4: Manual test**

1. Login as Super Admin
2. Go to `/super/institutions`
3. Click an institution → Detail page
4. Click "Billing & Payment" tab
5. Verify billing config and payment gateway fields load
6. Change billing mode, click Save
7. Verify save succeeds (toast)

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx \
       sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx
git commit -m "feat(platform): add Billing & Payment tab to Super Admin institution detail

Super Admin can now configure billing mode, currency, invoice prefix,
late payment rules, and Midtrans payment gateway per institution."
```

---

## Task 6: Wire ConfirmChangesModal into all save flows

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/tabs/GeneralTab.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/tabs/BillingTab.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx`
- Modify: `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx`

For each tab, the pattern is:

1. Store `initialState` ref (snapshot when data first loads from API)
2. "Save" button click → compute `FieldChange[]` using `change-detection.ts` utilities
3. If no changes → show toast "Tidak ada perubahan", skip modal
4. If changes exist → open `ConfirmChangesModal` with the diff
5. User confirms → call API → close modal → toast success
6. User cancels → close modal, form stays as-is

- [ ] **Step 1: Wire GeneralTab**

Add state: `showConfirm`, `pendingChanges`, `initialGeneral` (ref).

On save click:
```ts
const changes = collectChanges(
  detectScalarChange('Nama', initialGeneral.name, s.general.name),
  detectScalarChange('Email', initialGeneral.email, s.general.email),
  detectScalarChange('Telepon', initialGeneral.phone, s.general.phone),
  detectScalarChange('Alamat', initialGeneral.address, s.general.address),
  detectScalarChange('Timezone', initialGeneral.timezone, s.general.timezone),
  detectScalarChange('Bahasa', initialGeneral.default_language, s.general.default_language),
);
```

- [ ] **Step 2: Wire BillingTab**

On save click, detect changes for expense categories and bank accounts:
```ts
const changes = collectChanges(
  detectArrayChange('Kategori Pengeluaran', initialBilling.expense_categories, s.billing.expense_categories),
  // Bank accounts: compare by stringified name+number
  detectArrayChange(
    'Rekening Bank',
    initialBilling.bank_accounts.map(a => `${a.bank_name} - ${a.account_number}`),
    s.billing.bank_accounts.map(a => `${a.bank_name} - ${a.account_number}`),
  ),
);
```

- [ ] **Step 3: Wire AcademicTab**

Detect changes for working days, grade levels, and rooms:
```ts
const changes = collectChanges(
  detectArrayChange('Hari Kerja', initialAcademic.working_days.map(String), s.academic.working_days.map(String)),
  detectArrayChange('Tingkat Kelas', initialAcademic.grade_levels, s.academic.grade_levels),
  // Rooms: compare by name
  detectArrayChange(
    'Ruangan',
    initialAcademic.rooms.map(r => r.name),
    s.academic.rooms.map(r => r.name),
  ),
);
```

Note: Subjects are managed via separate CRUD hooks (create/delete) with instant saves, not the batch save flow. Do NOT add confirm modal to individual subject add/delete — those are already atomic operations.

- [ ] **Step 4: Wire SuperAdmin BillingPaymentTab**

On save click, detect changes for all billing + payment gateway fields:
```ts
const changes = collectChanges(
  detectScalarChange('Billing Mode', initial.billing_mode, form.billing_mode),
  detectScalarChange('Currency', initial.currency, form.currency),
  detectScalarChange('Invoice Prefix', initial.invoice_prefix, form.invoice_prefix),
  detectScalarChange('Late Payment Auto-Lock',
    initial.late_payment_auto_lock ? `Aktif (${initial.late_payment_threshold} hari)` : 'Nonaktif',
    form.late_payment_auto_lock ? `Aktif (${form.late_payment_threshold} hari)` : 'Nonaktif',
  ),
  detectSecretChange('Midtrans Server Key', form.midtrans_server_key),
  detectScalarChange('Midtrans Client Key', initial.midtrans_client_key, form.midtrans_client_key),
  detectScalarChange('Sandbox Mode', initial.is_sandbox ? 'Aktif' : 'Nonaktif', form.is_sandbox ? 'Aktif' : 'Nonaktif'),
);
```

- [ ] **Step 5: Verify build and test manually**

Run: `cd sinaloka-platform && npm run lint && npm run build`

Manual test: edit a setting → click Save → verify modal shows correct diff → confirm → verify save works.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/tabs/ \
       sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx
git commit -m "feat(platform): add confirmation modal to all settings save flows

Shows field-level diffs before saving. Supports scalar, array, and
secret field types. Skips modal if no changes detected."
```

---

## Task 7: Add Billing & Payment to Create Institution flow

**Files:**
- Modify: `sinaloka-platform/src/pages/SuperAdmin/InstitutionForm.tsx`

- [ ] **Step 1: Add collapsible "Billing & Payment" section**

After the main form fields (name, email, phone, address, timezone, language) and before the "First Admin" section (which only appears on create), add a collapsible section:

```tsx
{/* Billing & Payment (optional) */}
<div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
  <button
    type="button"
    onClick={() => setShowBilling(!showBilling)}
    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
  >
    <div className="flex items-center gap-2">
      <CreditCard size={16} className="text-muted-foreground" />
      <span className="text-sm font-medium">Billing & Payment</span>
      <span className="text-xs text-muted-foreground">(opsional)</span>
    </div>
    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", showBilling && "rotate-180")} />
  </button>

  {showBilling && (
    <div className="p-4 pt-0 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
      {/* Same billing config fields: mode, currency, prefix, late payment */}
      {/* No payment gateway here — that can be set after creation */}
    </div>
  )}
</div>
```

Add state: `showBilling` (boolean, default false).

Add form state for billing fields with defaults:
```ts
billing_mode: 'per_session',
currency: 'IDR',
invoice_prefix: 'INV-',
late_payment_auto_lock: false,
late_payment_threshold: 0,
```

On submit, if billing fields were changed from defaults, call `PATCH /api/settings/billing` after institution creation succeeds (using the new institution's ID via `?institution_id=`).

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/InstitutionForm.tsx
git commit -m "feat(platform): add optional billing config to Create Institution flow

Super Admin can set billing mode, currency, and invoice prefix
during institution creation. Collapsed by default."
```

---

## Task 8: Final verification and cleanup

- [ ] **Step 1: Full type check and build**

Run: `cd sinaloka-platform && npm run lint && npm run build`

Expected: 0 errors

- [ ] **Step 2: Manual E2E verification**

Test as **Admin**:
1. Go to `/settings` → verify 3 tabs (General, Billing, Academic)
2. Verify no Payment Gateway tab
3. Verify Billing tab only shows expense categories + bank accounts (no billing mode)
4. Edit a field → Save → verify confirmation modal appears with correct diff
5. Confirm → verify save succeeds
6. Change tab via clicking → verify URL updates (`?tab=billing`)
7. Refresh page → verify tab persists

Test as **Super Admin**:
1. Go to `/super/institutions` → click an institution
2. Click "Billing & Payment" tab
3. Verify billing config + payment gateway fields load
4. Edit fields → Save → verify confirmation modal
5. Create new institution → verify optional billing section appears

- [ ] **Step 3: Commit any cleanup**

```bash
git add -A sinaloka-platform/
git commit -m "chore(platform): cleanup unused imports and dead code from settings restructure"
```
