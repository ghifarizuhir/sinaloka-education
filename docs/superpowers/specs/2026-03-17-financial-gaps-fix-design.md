# Financial Gaps Fix — Design Spec

> Date: 2026-03-17
> Scope: Fix all incomplete/stub features identified in the financial audit (`.coordination/20260317-050651/financial-findings.md`)
> Approach: Layered — foundation first, then 3 parallel streams, then standalone enhancements

---

## Architecture Overview

```
Layer 1 (Foundation)    → File upload endpoint + schema migration (all streams depend on this)
Layer 2 (Parallel)      → Stream A: Expense fixes
                          Stream B: Payout fixes
                          Stream C: Payment fixes
Layer 3 (Standalone)    → Custom date range picker, PDF report localization, subscription billing
```

### Explicitly Deferred (Out of Scope)
- **Revenue analytics** (StudentPayments "Coming Soon" button) — requires a new analytics design (charts, metrics); deferred to a dedicated analytics spec
- **Export PDF** and **Resend Receipt** buttons in payment ledger drawer — depends on receipt/notification infrastructure not yet available
- **Branding/Academic/Security/Integration settings** — UI-only mockups, each requires its own backend module
- **Tutor app i18n** — separate project scope

---

## Layer 1: File Upload Infrastructure

### Problem
`UploadService.saveFile()` exists but has no controller endpoint. Payout `proof_url` and expense `receipt_url` fields exist in schema but cannot be populated via API.

### Solution
Add a single generic upload endpoint to `UploadController`:

```
POST /api/uploads/:type
```

- **Allowed types**: `receipts`, `proofs`, `logos` (validated whitelist)
- **Auth**: ADMIN, SUPER_ADMIN only
- **Interceptor**: `@UseInterceptors(FileInterceptor('file'))` (already used in student/enrollment modules)
- **Validation**: Existing `UploadService.saveFile()` handles extension whitelist (jpg/jpeg/png/pdf) and 5MB limit
- **Response**: `{ url: "{institutionId}/{type}/{uuid}.ext" }`
- **Tenant isolation**: Uses `request.tenantId` from JWT as institution directory

### Schema Migration (runs in Layer 1 to avoid parallel conflicts)

Single migration: `add_recurring_expenses_and_payout_slip`

```prisma
// Expense model additions
is_recurring          Boolean   @default(false)
recurrence_frequency  String?
recurrence_end_date   DateTime? @db.Date

// Payout model addition
slip_url              String?
```

This migration is placed in Layer 1 because both Stream A and Stream B would otherwise modify `prisma/schema.prisma` in parallel, causing merge conflicts.

### Files Changed
- `sinaloka-backend/src/modules/upload/upload.controller.ts` — add `POST /:type` endpoint
- `prisma/schema.prisma` — add recurring expense fields + slip_url
- Run `npx prisma migrate dev` + `npm run prisma:generate`

---

## Layer 2, Stream A: Expense Fixes

### A1. Receipt Upload Wiring

**Backend**: No changes needed — `receipt_url` field already accepted in `CreateExpenseSchema` and `UpdateExpenseSchema`.

**Frontend** (`OperatingExpenses.tsx`):
- In expense create/edit drawer: wire the existing drag-drop zone to call `POST /api/uploads/receipts`
- On successful upload, set `receipt_url` in form state
- Include `receipt_url` in the create/update mutation payload
- Show uploaded receipt thumbnail/link in the drawer

**Frontend** (`expenses.service.ts`):
- Add `uploadReceipt(file: File): Promise<{ url: string }>` function

### A2. Search Connection

**Backend** (`expense.dto.ts`):
- Add `search: z.string().max(100).optional()` to `ExpenseQuerySchema`

**Backend** (`expense.service.ts`):
- When `search` is provided, add `description: { contains: search, mode: 'insensitive' }` to the Prisma where clause

**Frontend** (`OperatingExpenses.tsx`):
- Wire the existing search input's value to the query params passed to `useExpenses()` hook
- Debounce input (300ms) to avoid excessive API calls

### A3. Dynamic Categories from Settings

**Frontend** (`OperatingExpenses.tsx`):
- Remove hardcoded `const EXPENSE_CATEGORIES = ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER']`
- Fetch categories from `useBillingSettings()` hook → `billingSettings.expense_categories`
- Fallback to default array if settings haven't loaded yet

### A4. Recurring Expenses

**Schema migration** — add to `Expense` model:
```prisma
is_recurring          Boolean   @default(false)
recurrence_frequency  String?   // 'weekly' | 'monthly'
recurrence_end_date   DateTime? @db.Date
```

**Backend** (`expense.dto.ts`):
- Add `is_recurring`, `recurrence_frequency`, `recurrence_end_date` to Create/Update schemas

**Backend** (`expense.service.ts`):
- Add `processRecurringExpenses(institutionId: string)` method:
  - Query all recurring expenses where `is_recurring = true` and last generated date < today
  - Clone expense record for the current period if not already created
  - Duplicate detection via date + category + amount match

**Backend** — Optional cron trigger or manual endpoint:
- `POST /api/admin/expenses/process-recurring` — manually trigger recurring expense generation
- Or use `@nestjs/schedule` `@Cron('0 0 1 * *')` for automatic monthly processing

**Frontend** (`OperatingExpenses.tsx`):
- Wire existing `isRecurring` toggle and frequency selector to the DTO fields
- Show recurring badge on expense rows where `is_recurring = true`

---

## Layer 2, Stream B: Payout Fixes

### B1. Proof Upload Wiring

**Backend** (`payout.dto.ts`):
- Add `proof_url: z.string().max(500).optional().nullable()` to `UpdatePayoutSchema` (currently missing — PATCH would silently strip the field)

**Frontend** (`TutorPayouts.tsx`):
- In reconciliation view: wire existing file input to call `POST /api/uploads/proofs`
- On upload success, call `PATCH /api/admin/payouts/:id` with `{ proof_url: response.url }`
- Show uploaded proof image/link in reconciliation view
- Disable re-upload once proof exists (show existing proof instead)

**Frontend** (`payouts.service.ts`):
- Add `uploadProof(file: File): Promise<{ url: string }>` function

### B2. Payout Slip PDF Generation

**Backend** — new `PayoutSlipService` in `sinaloka-backend/src/modules/payout/payout-slip.service.ts`:
- Modeled after `InvoiceService` pattern (PDFKit, bilingual labels, A4)
- Content:
  - Institution header (logo, name, address, contact)
  - "PAYOUT SLIP" / "SLIP PEMBAYARAN" title
  - Slip number: `PAY-{YYYYMM}-{NNN}` (using same serializable transaction counter mechanism as `InvoiceService`, but stored under a separate key `payout_slip_counter` in `institution.settings.billing`)
  - Tutor info: name, bank name, account number, account holder
  - Period: start → end dates
  - Session breakdown table: date, class name, fee amount
  - Summary: base amount, bonus, deduction, net payout
  - Status and payment date
  - Footer

**Backend** (`payout.controller.ts`):
- Add `POST /api/admin/payouts/:id/generate-slip` endpoint

**Backend** (`payout.dto.ts`):
- Add `slip_url: z.string().max(500).optional().nullable()` to `UpdatePayoutSchema` (so generate-slip can persist the URL)
- Bonus/deduction are frontend-only adjustments passed via the existing update endpoint

**Backend** (`payout.module.ts`):
- Import `SettingsModule` (for institution branding/language lookup in `PayoutSlipService`)
- Register `PayoutSlipService` as provider

**Prisma schema**: `slip_url String?` added to Payout model (in Layer 1 migration)

**Frontend** (`TutorPayouts.tsx`):
- Wire "Download Payout Slip" button to call generate-slip endpoint, then download the PDF
- Wire "Confirm & Generate Slip" button in reconciliation to: update payout status → generate slip → download

### B3. Export Audit

**Backend** (`payout.controller.ts`):
- Add `GET /api/admin/payouts/:id/export-audit` endpoint
- Returns a CSV or PDF containing: payout details, session breakdown, status, created/updated timestamps, proof URL

**Backend** (`payout.service.ts`):
- Add `exportAudit(institutionId, payoutId)` method:
  - Fetch payout with tutor info
  - Fetch associated sessions (using period_start/period_end)
  - Format as CSV with headers: field, value (for summary) + session rows

**Frontend** (`TutorPayouts.tsx`):
- Wire "Export Audit" button to call the endpoint and trigger file download

---

## Layer 2, Stream C: Payment Fixes

### C1. Batch Payment Recording

**Backend** (`payment.dto.ts`):
- Add `BatchRecordPaymentSchema`:
  ```
  payment_ids: z.array(z.string().uuid()).min(1).max(50)
  paid_date: z.coerce.date()
  method: PaymentMethod
  ```

**Backend** (`payment.service.ts`):
- Add `batchRecord(institutionId, dto)` method:
  - Verify all payment IDs belong to the institution
  - Update all to `status: 'PAID'`, set `paid_date` and `method`
  - Return count of updated records

**Backend** (`payment.controller.ts`):
- Add `POST /api/admin/payments/batch-record` endpoint (placed BEFORE `:id` route)

**Frontend** (`StudentPayments.tsx`):
- Replace "Coming Soon" toast on batch button with a confirmation modal
- Modal shows: selected count, payment method selector, paid date picker
- On confirm: call batch-record endpoint → refresh list → clear selection
- Disable button when no payments selected

### C2. Subscription Billing Mode

**Backend** (`invoice-generator.service.ts`):
- Add `generateSubscriptionPayment(params)` method:
  - Checks `billing_mode === 'subscription'`
  - Creates monthly payment per active enrollment
  - Amount = class `fee` (monthly subscription)
  - Due date = 1st of current month
  - Duplicate detection: `notes startsWith 'Auto: Subscription {YYYY-MM}'`

**Backend** — trigger mechanism:
- Option 1: `@Cron('0 0 1 * *')` in a `SubscriptionCronService` — runs on 1st of each month
- Option 2: Manual trigger `POST /api/admin/payments/generate-subscriptions`
- Recommend: both — cron for automation, manual for catch-up

**Frontend**: No changes needed — subscription mode already shows in settings UI dropdown. Payments will appear automatically in the payments list.

### C3. Payment Reminders (Lightweight)

**Backend** (`payment.controller.ts`):
- Add `POST /api/admin/payments/:id/remind` endpoint
- For now: logs the reminder intent, returns `{ reminded: true, method: 'logged' }`
- Structured for future WhatsApp/email integration: accepts optional `{ channel: 'whatsapp' | 'email' | 'logged' }`

**Frontend** (`StudentPayments.tsx`):
- Replace "Coming Soon" toast on reminder buttons with actual API call
- Show success toast: "Reminder logged for {student name}" instead of "Coming Soon"
- When full integration exists later, the same endpoint will send actual messages

---

## Layer 3: Standalone Enhancements

### L3.1 Custom Date Range Picker

**Frontend** (`FinanceOverview.tsx`):
- Add "Custom" option to period selector (alongside Month/Quarter/YTD)
- When "Custom" is selected, show two date inputs (start/end)
- Wire the custom dates directly to `periodStart`/`periodEnd` state
- All existing queries already accept these date params — no backend changes

### L3.2 PDF Report Localization

**Backend** (`report.service.ts`):
- Add bilingual LABELS object (same pattern as `InvoiceService`)
- Fetch `institution.default_language` via `this.prisma.institution.findUnique()` at the start of each PDF generation method (service currently only receives `institutionId` as string — needs the institution query to determine language)
- Replace hardcoded English strings ("Attendance Report", "Finance Report", etc.) with localized labels
- Affects: `generateAttendanceReport()`, `generateFinanceReport()`, `generateStudentProgressReport()`

---

## File Impact Summary

### Backend — New Files
- `src/modules/payout/payout-slip.service.ts` — payout slip PDF generation

### Backend — Modified Files (Layer 1)
- `src/modules/upload/upload.controller.ts` — add POST endpoint
- `prisma/schema.prisma` — add recurring expense fields, slip_url

### Backend — Modified Files (Stream A: Expenses)
- `src/modules/expense/expense.dto.ts` — add search, recurring fields
- `src/modules/expense/expense.service.ts` — add search filter, recurring processing
- `src/modules/expense/expense.controller.ts` — add process-recurring endpoint

### Backend — Modified Files (Stream B: Payouts)
- `src/modules/payout/payout.controller.ts` — add generate-slip, export-audit endpoints
- `src/modules/payout/payout.service.ts` — add exportAudit method
- `src/modules/payout/payout.dto.ts` — add proof_url, slip_url to UpdatePayoutSchema
- `src/modules/payout/payout.module.ts` — register PayoutSlipService, import SettingsModule

### Backend — Modified Files (Stream C: Payments)
- `src/modules/payment/payment.controller.ts` — add batch-record, remind, generate-subscriptions endpoints
- `src/modules/payment/payment.service.ts` — add batchRecord method
- `src/modules/payment/payment.dto.ts` — add BatchRecordPaymentSchema
- `src/modules/payment/invoice-generator.service.ts` — add subscription mode

### Backend — Modified Files (Layer 3)
- `src/modules/report/report.service.ts` — add bilingual labels to PDF reports

### Frontend — Modified Files
- `src/pages/Finance/OperatingExpenses.tsx` — receipt upload, search, dynamic categories, recurring
- `src/pages/Finance/TutorPayouts.tsx` — proof upload, slip download, export audit
- `src/pages/Finance/StudentPayments.tsx` — batch recording, reminder calls
- `src/pages/Finance/FinanceOverview.tsx` — custom date range picker
- `src/services/expenses.service.ts` — upload function
- `src/services/payouts.service.ts` — upload, generate-slip, export-audit functions
- `src/services/payments.service.ts` — batch-record, remind functions
- `src/hooks/useExpenses.ts` — search param support (if separate hook exists)

---

## Parallelization Strategy

- **Layer 1** runs first — upload endpoint + schema migration + prisma generate
- **Layer 2** runs as 3 parallel tmux agents after Layer 1 completes:
  - Agent 1: Stream A (expense fixes) — touches expense module + OperatingExpenses.tsx
  - Agent 2: Stream B (payout fixes) — touches payout module + TutorPayouts.tsx
  - Agent 3: Stream C (payment fixes) — touches payment module + StudentPayments.tsx
- **Layer 3** runs after Layer 2 — touches FinanceOverview.tsx and report.service.ts (no conflicts)

Zero file overlap between the 3 parallel streams. Schema migration is handled in Layer 1 to eliminate the only potential conflict (`prisma/schema.prisma`).
