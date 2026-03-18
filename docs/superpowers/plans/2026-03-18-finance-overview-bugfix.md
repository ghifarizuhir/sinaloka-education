# Finance Overview Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 bugs on the Finance Overview page: missing i18n keys, RpNaN field mismatch, untranslated enums, incorrect count labels, and chart color.

**Architecture:** All changes are in the frontend platform app. Two locale files get new translation keys, and one component file gets 6 targeted line edits. No backend changes needed.

**Tech Stack:** React, react-i18next, Recharts, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-finance-overview-bugfix-design.md`

---

### Task 1: Add Missing i18n Keys to en.json

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json:885` (insert before closing `}` of finance namespace)

- [ ] **Step 1: Add 9 missing keys + 3 enum translation objects to en.json**

Insert the following keys before the closing `}` of the `"finance"` object (after line 885 `"exportCsv": "Export CSV"`):

```json
    "exportCsv": "Export CSV",
    "totalPayouts": "Total Payouts",
    "totalExpenses": "Total Expenses",
    "class": "Class",
    "revenueLabel": "Revenue",
    "payments": "Payments",
    "method": "Method",
    "count": "Count",
    "category": "Category",
    "records": "Records",
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

- [ ] **Step 2: Verify JSON is valid**

Run: `cd sinaloka-platform && node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en.json OK')"`
Expected: `en.json OK`

---

### Task 2: Add Missing i18n Keys to id.json

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json:885` (insert before closing `}` of finance namespace)

- [ ] **Step 1: Add 9 missing keys + 3 enum translation objects to id.json**

Insert the following keys before the closing `}` of the `"finance"` object (after line 885 `"exportCsv": "Ekspor CSV"`):

```json
    "exportCsv": "Ekspor CSV",
    "totalPayouts": "Total Pembayaran Tutor",
    "totalExpenses": "Total Biaya Operasional",
    "class": "Kelas",
    "revenueLabel": "Pendapatan",
    "payments": "Pembayaran",
    "method": "Metode",
    "count": "Jumlah",
    "category": "Kategori",
    "records": "Catatan",
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

- [ ] **Step 2: Verify JSON is valid**

Run: `cd sinaloka-platform && node -e "JSON.parse(require('fs').readFileSync('src/locales/id.json','utf8')); console.log('id.json OK')"`
Expected: `id.json OK`

- [ ] **Step 3: Commit locale changes**

```bash
cd sinaloka-platform
git add src/locales/en.json src/locales/id.json
git commit -m "fix(i18n): add missing finance overview translation keys and enum labels"
```

---

### Task 3: Fix RpNaN Field Name Mismatch

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx:357`

- [ ] **Step 1: Change `item.revenue` to `item.amount`**

On line 357, change:
```tsx
{formatCurrency(item.revenue, i18n.language)}
```
to:
```tsx
{formatCurrency(item.amount, i18n.language)}
```

---

### Task 4: Wrap Enum Values with t() for Translation

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx:381,402,434`

- [ ] **Step 1: Translate payment method (line 381)**

Change:
```tsx
<td className="py-2 text-sm dark:text-zinc-200">{item.method}</td>
```
to:
```tsx
<td className="py-2 text-sm dark:text-zinc-200">{t(`finance.methodLabel.${item.method}`, item.method)}</td>
```

- [ ] **Step 2: Translate payment status (line 402)**

Change:
```tsx
{item.status}
```
to:
```tsx
{t(`finance.status.${item.status}`, item.status)}
```

- [ ] **Step 3: Translate expense category (line 434)**

Change:
```tsx
<td className="py-2 text-sm dark:text-zinc-200">{item.category}</td>
```
to:
```tsx
<td className="py-2 text-sm dark:text-zinc-200">{t(`finance.expenseCategory.${item.category}`, item.category)}</td>
```

---

### Task 5: Fix Incorrect Count Labels on Payouts/Expenses Cards

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx:267,282`

- [ ] **Step 1: Fix Payouts card count label (line 267)**

Change:
```tsx
{t('finance.paymentCountLabel', { count: summary?.payout_count ?? 0 })}
```
to:
```tsx
{t('finance.payoutCountLabel', { count: summary?.payout_count ?? 0 })}
```

- [ ] **Step 2: Fix Expenses card count label (line 282)**

Change:
```tsx
{t('finance.paymentCountLabel', { count: summary?.expense_count ?? 0 })}
```
to:
```tsx
{t('finance.expenseCountLabel', { count: summary?.expense_count ?? 0 })}
```

---

### Task 6: Fix Chart Bar Color

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx:329`

- [ ] **Step 1: Change revenue chart bar fill color**

Change:
```tsx
<Bar dataKey="amount" fill="#18181b" radius={[4, 4, 0, 0]} />
```
to:
```tsx
<Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
```

- [ ] **Step 2: Commit all component changes**

```bash
cd sinaloka-platform
git add src/pages/Finance/FinanceOverview.tsx
git commit -m "fix(finance): fix RpNaN, enum translations, count labels, and chart color in overview"
```

---

### Task 7: Verify Build and Test in Browser

- [ ] **Step 1: Run TypeScript type check**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify in browser (manual)**

Open `http://localhost:3000/finance` and check:
- All 4 summary cards show translated labels (not raw keys)
- Revenue Breakdown "Per Kelas" shows proper Rp amounts (not RpNaN)
- All table headers are translated
- Payment methods show "Transfer Bank" (not "TRANSFER")
- Payment statuses show "Lunas" (not "PAID")
- Expense categories show "Sewa" (not "RENT")
- Payouts card shows "X pembayaran tutor" (not "X pembayaran")
- Expenses card shows "X catatan" (not "X pembayaran")
- Revenue Summary chart bar is blue
- Switch to English — all labels in English
- Switch to Indonesian — all labels in Indonesian
