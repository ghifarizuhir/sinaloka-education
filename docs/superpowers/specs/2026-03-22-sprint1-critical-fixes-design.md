# Sprint 1 — Critical Fixes Design Spec

**Date:** 2026-03-22
**Source:** Platform Analysis v5 (Business Evaluation) — `docs/sinaloka-sprint-breakdown.docx`
**Goal:** Platform bisa di-demo ke calon pelanggan tanpa malu
**Delivery:** Single PR — semua 6 coding tasks + 2 verification tasks
**Branch:** `feat/sprint1-critical-fixes`

---

## Summary

Sprint 1 berisi 8 task: 6 perlu coding, 2 sudah done (verification only). Fokus pada bug yang berdampak langsung ke akurasi data, keamanan, dan usability inti. Semua item effort kecil — rata-rata 1–2 jam per task.

**Exit Criteria:** Semua 8 task terselesaikan. Financial data akurat, security baseline terpenuhi, dan semua core flow berjalan end-to-end tanpa stub.

---

## Task Overview

| # | Task | Status | Effort |
|---|---|---|---|
| 1 | Fix discount di payment | Perlu kerja | 2–3 jam |
| 2 | Fix subject di session response | **Sudah done** — verification only | 0 |
| 3 | Pagination di enrollments | Frontend only | 1–2 jam |
| 4 | Rate limiting auth endpoints | Perlu kerja | 30 min |
| 5 | Fix tenant scope user creation | Perlu kerja | 30 min |
| 6 | Wire remind endpoint ke WhatsApp | Perlu kerja | 30 min |
| 7 | Cron job recurring expenses | Perlu kerja | 1–2 jam |
| 8 | Fix hasPhone check di WhatsApp | **Sudah done** — verification only | 0 |

**Execution order (quick wins first):**
1. Verification #2 & #8
2. Rate limit #4 → Tenant scope #5 → Wire remind #6
3. Discount payment #1 (paling kompleks)
4. Pagination enrollment #3 → Cron expenses #7

---

## Task Details

### Task #2: Fix Subject di Session Response — VERIFICATION ONLY

**Status:** Already implemented. Subject is a scalar field on the `Class` model — Prisma returns it automatically when `class` is included in the query.

**Verification checklist:**
- `session.service.ts` `sessionInclude` includes `class` → subject scalar returned automatically
- Frontend `CalendarDay.tsx`, `CalendarMonth.tsx`, `CalendarWeek.tsx` use `s.class?.subject` for color badges
- `SessionDetailDrawer.tsx` displays subject as uppercase badge
- `Schedules/index.tsx` shows subject label with color

### Task #8: Fix hasPhone Check — VERIFICATION ONLY

**Status:** Already implemented correctly. Checks `student.parent_phone` (not `student.name`).

**Verification checklist:**
- `whatsapp.service.ts` `sendPaymentReminder()` checks `payment.student.parent_phone`, throws `BadRequestException` if null
- `whatsapp.cron.ts` checks `payment.student.parent_phone`, skips and increments `skipped` counter if null
- E.164 normalization via `normalizePhoneNumber()` runs after null check

### Task #4: Rate Limiting Auth Endpoints

**Scope:** Apply existing `RateLimitGuard` to `AuthController`.

**Files changed:**
- `sinaloka-backend/src/modules/auth/auth.controller.ts`
- `sinaloka-backend/src/modules/auth/auth.module.ts` (register `RateLimitGuard` as provider if not already)

**Design:**
- Add `@UseGuards(RateLimitGuard)` and `@RateLimit()` decorator on `POST /auth/login` — 5 requests / 15 minutes / IP
- Add `@UseGuards(RateLimitGuard)` and `@RateLimit()` decorator on `POST /auth/forgot-password` — 3 requests / 15 minutes / IP
- Guard already exists at `src/common/guards/rate-limit.guard.ts` — in-memory IP tracking, throws 429
- Follow pattern from `register.controller.ts` which already uses this guard

**Not in scope:**
- No new packages (not using `@nestjs/throttler`)
- No schema/migration changes
- No frontend changes
- Distributed rate limiting (Redis) is future work — in-memory acceptable for current scale

### Task #5: Fix Tenant Scope User Creation

**Scope:** Enforce `institution_id` from JWT when ADMIN creates users.

**Files changed:**
- `sinaloka-backend/src/modules/user/user.controller.ts`

**Design:**
- Inject `@CurrentUser()` in `create()` method
- If caller role = `ADMIN`: override `dto.institution_id` with `tenantId` from JWT (ignore body value)
- If caller role = `SUPER_ADMIN`: allow any `institution_id` (current behavior preserved)

**Why override instead of 403 reject:** More defensive — ADMIN doesn't need to know their `institution_id`, system sets it automatically. Reduces frontend friction.

**Not in scope:**
- No schema change
- No frontend change (ADMIN frontend already doesn't send `institution_id`)

### Task #6: Wire Remind Endpoint ke WhatsApp

**Scope:** Replace stub in `PaymentService.remind()` with actual `WhatsappService.sendPaymentReminder()` call.

**Files changed:**
- `sinaloka-backend/src/modules/payment/payment.module.ts`
- `sinaloka-backend/src/modules/payment/payment.service.ts`

**Design:**
- `payment.module.ts` — import `WhatsappModule` for DI
- `payment.service.ts`:
  - Inject `WhatsappService` via constructor
  - `remind()` → call `this.whatsappService.sendPaymentReminder(paymentId, institutionId)`
  - Return WhatsApp service result (message status)
  - Try-catch: if WhatsApp fails (no phone, Fonnte down), throw readable error

**Not in scope:**
- No changes to `WhatsappService` (already fully implemented: lookup, phone check, 24h dedup, template resolution, Fonnte API)
- No schema change
- No frontend change (remind button already hits this endpoint)

### Task #1: Fix Discount di Payment

**Scope:** End-to-end discount support: schema → service → invoice PDF → frontend wiring.

**Files changed:**
- `sinaloka-backend/prisma/schema.prisma`
- `sinaloka-backend/src/modules/payment/payment.dto.ts`
- `sinaloka-backend/src/modules/payment/payment.service.ts`
- `sinaloka-backend/src/modules/payment/invoice.service.ts`
- `sinaloka-platform/src/types/payment.ts`
- `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`

**Prisma schema:**
- Add `discount_amount Decimal @default(0)` to `Payment` model
- Migration: set `discount_amount = 0` for all existing payments

**Backend service:**
- `payment.dto.ts` — add `discount_amount` (optional, default 0) to `CreatePaymentDto` and `UpdatePaymentDto`
- `payment.service.ts`:
  - `create()` — persist `discount_amount` from DTO
  - `update()` / `batchRecord()` — accept and persist `discount_amount`
  - Add `final_amount` computed in response: `amount - discount_amount`

**Invoice PDF:**
- `invoice.service.ts` — update PDF table:
  - Row 1: Subtotal (original `amount`)
  - Row 2: Diskon (`discount_amount`) — only shown if > 0
  - Row 3: **Total** (`amount - discount_amount`)
  - Bilingual labels follow existing pattern in service

**Frontend:**
- `payment.ts` types — add `discount_amount: number`
- `StudentPayments.tsx`:
  - On save, send `discount_amount` to backend (stop encoding in notes)
  - Notes remains free-text for other comments
- Payment list/table — show original amount with strikethrough + final amount bold (when discount > 0)

**Not in scope:**
- Midtrans integration unchanged (charges original `amount`, discount is internal)
- Parent app unchanged (sees final amount from backend)

### Task #3: Pagination di Enrollments

**Scope:** Wire frontend to backend pagination that's already ready.

**Files changed:**
- `sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts`
- `sinaloka-platform/src/pages/Enrollments/EnrollmentTable.tsx` (or parent page)

**Design:**
- `useEnrollmentsPage.ts`:
  - Change `const [page] = useState(1)` → `const [page, setPage] = useState(1)` with exposed setter
  - Change `limit: 100` → `limit: 20` (use backend default)
  - Move search/status filter from client-side to query params (backend already supports)
  - Reset page to 1 when filters change
- Enrollment page:
  - Add pagination component (reuse from Students/Payments pages)
  - Display total count from API response `meta.total`

**Pattern reference:** Follow exactly the pattern from `useStudentsPage` migrated to server-side filtering in previous Sprint 1 (commit `7175d99`).

**Not in scope:**
- No backend changes (already supports `page`, `limit`, `search`, `status` in `EnrollmentQuerySchema`)
- No schema change

### Task #7: Cron Job Recurring Expenses

**Scope:** Add `@Cron` scheduler + `last_generated_at` field to schema.

**Files changed:**
- `sinaloka-backend/prisma/schema.prisma`
- `sinaloka-backend/src/modules/expense/expense.cron.ts` (new)
- `sinaloka-backend/src/modules/expense/expense.service.ts`
- `sinaloka-backend/src/modules/expense/expense.module.ts`

**Prisma schema:**
- Add `last_generated_at DateTime?` to `Expense` model
- Migration: backfill `last_generated_at = created_at` for existing recurring expenses

**Backend:**
- New `expense.cron.ts` (follow `whatsapp.cron.ts` pattern):
  - `@Cron('0 17 * * *')` — daily 00:00 WIB (UTC+7 = 17:00 UTC)
  - Inject `ExpenseService`
  - Call `processRecurringExpenses()`
  - Logger for tracking
- `expense.service.ts` — update `processRecurringExpenses()`:
  - Replace query-last-occurrence logic with `last_generated_at` check vs frequency
  - Update `last_generated_at` after generating new occurrence
- `expense.module.ts` — register `ExpenseCron` as provider
- Verify `ScheduleModule` imported in `AppModule` (likely already there for WhatsApp cron)

**Not in scope:**
- No frontend change
- Manual trigger endpoint `POST /admin/expenses/process-recurring` preserved

---

## Schema Migrations

Both tasks #1 and #7 require Prisma schema changes. They will be combined into a single migration:

```sql
-- AlterTable: Payment
ALTER TABLE "payments" ADD COLUMN "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable: Expense
ALTER TABLE "expenses" ADD COLUMN "last_generated_at" TIMESTAMP(3);

-- Backfill: set discount_amount = 0 (handled by DEFAULT)
-- Backfill: set last_generated_at = created_at for recurring expenses
UPDATE "expenses" SET "last_generated_at" = "created_at" WHERE "is_recurring" = true;
```

---

## Testing Strategy

- **Backend:** `npm run build` + `npm run lint` + `npm run test` (unit tests)
- **Frontend:** `npm run build` + `npm run lint` (type check)
- **Manual verification:** Task #2 and #8 checklist items confirmed via code review
- **Smoke test:** Generate invoice with discount, verify PDF output

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Discount migration breaks existing payments | Payment data inconsistent | Default 0 — no existing data affected |
| `last_generated_at` backfill misses edge cases | Duplicate expense generation on first cron run | Backfill only `is_recurring = true`, dedup logic in service as safety net |
| Rate limit in-memory resets on restart | Brief window without protection | Acceptable at current scale, Redis is future work |
| WhatsApp remind fails silently | User thinks reminder sent | Try-catch with readable error thrown to frontend |
