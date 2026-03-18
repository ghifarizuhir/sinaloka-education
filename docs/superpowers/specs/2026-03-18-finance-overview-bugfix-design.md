# Finance Overview Bugfix Design

**Date**: 2026-03-18
**Scope**: Fix 4 bugs found in the Finance Overview page (`/finance`)

## Problem Statement

The Finance Overview page has several rendering and i18n issues discovered through browser testing:

1. **Missing i18n keys** — 9 translation keys used in `FinanceOverview.tsx` don't exist in the `finance` namespace of `en.json`/`id.json`, causing raw keys like `finance.totalPayouts` to display.
2. **RpNaN in Revenue Breakdown** — The "Per Kelas" table shows `RpNaN` because the component accesses `item.revenue` but the backend returns `item.amount`.
3. **Untranslated enum values** — Raw database enums (`TRANSFER`, `PAID`, `RENT`, `SUPPLIES`) are rendered without translation.
4. **Chart color issue** — The Revenue Summary bar chart uses `#18181b` (near-black), making it appear as a solid black rectangle against the dark grid.

**Note**: Bug 5 (time period filters) was investigated and confirmed to be working correctly — all data falls within the current month, so wider periods show the same data.

## Root Cause Analysis

### Bug 1: Missing i18n Keys
The component uses `t('finance.totalPayouts')`, `t('finance.totalExpenses')`, etc., but these keys were never added to the locale files. The existing keys use different names (`tutorPayouts`, `operatingExpenses`).

### Bug 2: RpNaN
`FinanceOverview.tsx` line 357: `formatCurrency(item.revenue, ...)` — the backend `getRevenueBreakdown().by_class` returns `{ class_id, class_name, amount, payment_count }` with field `amount`, not `revenue`. `formatCurrency(undefined)` produces `RpNaN`.

### Bug 3: Untranslated Enums
`item.method`, `item.status`, and `item.category` from the API are rendered directly without `t()` wrapping. No enum translation keys exist in the locale files.

### Bug 4: Chart Color
Line 329: `<Bar dataKey="amount" fill="#18181b" />` — zinc-900 is too dark, especially with the dark gridlines. The expense chart at line 453 uses `#f59e0b` (amber) which renders clearly.

## Solution Design

### Files to Modify

1. `sinaloka-platform/src/locales/en.json`
2. `sinaloka-platform/src/locales/id.json`
3. `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`

### Changes

#### 1. Add Missing i18n Keys (en.json + id.json)

Add to the `finance` namespace:

**en.json:**
```json
"totalPayouts": "Total Payouts",
"totalExpenses": "Total Expenses",
"class": "Class",
"revenueLabel": "Revenue",
"payments": "Payments",
"method": "Method",
"count": "Count",
"category": "Category",
"records": "Records"
```

**id.json:**
```json
"totalPayouts": "Total Pembayaran Tutor",
"totalExpenses": "Total Biaya Operasional",
"class": "Kelas",
"revenueLabel": "Pendapatan",
"payments": "Pembayaran",
"method": "Metode",
"count": "Jumlah",
"category": "Kategori",
"records": "Catatan"
```

#### 2. Add Enum Translation Keys (en.json + id.json)

Add under `finance` namespace:

**en.json:**
```json
"status": {
  "NEW": "New",
  "PAID": "Paid",
  "PENDING": "Pending",
  "OVERDUE": "Overdue"
},
"methodLabel": {
  "TRANSFER": "Bank Transfer",
  "CASH": "Cash",
  "OTHER": "Other"
},
"expenseCategory": {
  "RENT": "Rent",
  "SUPPLIES": "Supplies",
  "UTILITIES": "Utilities",
  "SALARY": "Salary",
  "MARKETING": "Marketing",
  "OTHER": "Other"
}
```

> **Note**: Expense categories are free-form strings per institution (not a Prisma enum). These translations cover the legacy/common values from the original enum. Unknown categories will display as-is via the `t()` fallback parameter.

**id.json:**
```json
"status": {
  "NEW": "Baru",
  "PAID": "Lunas",
  "PENDING": "Tertunda",
  "OVERDUE": "Terlambat"
},
"methodLabel": {
  "TRANSFER": "Transfer Bank",
  "CASH": "Tunai",
  "OTHER": "Lainnya"
},
"expenseCategory": {
  "RENT": "Sewa",
  "SUPPLIES": "Perlengkapan",
  "UTILITIES": "Utilitas",
  "SALARY": "Gaji",
  "MARKETING": "Pemasaran",
  "OTHER": "Lainnya"
}
```

#### 3. Fix Field Name Mismatch (FinanceOverview.tsx)

Line 357: Change `item.revenue` → `item.amount`

#### 4. Wrap Enum Values with t() (FinanceOverview.tsx)

- Line 381 (`item.method`): → `t(\`finance.methodLabel.${item.method}\`, item.method)`
- Line 402 (`item.status`): → `t(\`finance.status.${item.status}\`, item.status)`
- Line 434 (`item.category`): → `t(\`finance.expenseCategory.${item.category}\`, item.category)`

Using fallback to raw value ensures graceful degradation for unknown enum values.

#### 5. Fix Incorrect Count Labels on Payouts/Expenses Cards (FinanceOverview.tsx)

- Line 267: Change `t('finance.paymentCountLabel', ...)` → `t('finance.payoutCountLabel', { count: summary?.payout_count ?? 0 })`
- Line 282: Change `t('finance.paymentCountLabel', ...)` → `t('finance.expenseCountLabel', { count: summary?.expense_count ?? 0 })`

The keys `finance.payoutCountLabel` and `finance.expenseCountLabel` already exist in both locale files.

#### 6. Fix Chart Bar Color (FinanceOverview.tsx)

Line 329: Change `fill="#18181b"` → `fill="#3b82f6"` (blue-500, matching the Tutor Payouts card color scheme and providing clear contrast).

## Testing

After changes, verify in browser:
- [ ] All 4 summary cards show translated labels
- [ ] Revenue Breakdown "Per Kelas" table shows proper currency amounts (not RpNaN)
- [ ] Revenue Breakdown table headers are translated
- [ ] Expense Breakdown table headers are translated
- [ ] Payment methods show translated labels (e.g., "Transfer Bank")
- [ ] Payment statuses show translated labels (e.g., "Lunas")
- [ ] Expense categories show translated labels (e.g., "Sewa")
- [ ] Payouts card shows "X payouts" (not "X payments")
- [ ] Expenses card shows "X records" (not "X payments")
- [ ] Revenue Summary chart bar is blue and clearly visible
- [ ] Switch to English — all labels display in English
- [ ] Switch to Indonesian — all labels display in Indonesian
