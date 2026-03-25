# Sprint 1 — Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 critical bugs + verify 2 already-done items for production readiness demo.

**Architecture:** All backend changes in NestJS modules following existing patterns. One Prisma migration for both schema changes (discount + expense). Frontend changes in sinaloka-platform only. Event-based decoupling for WhatsApp wiring to avoid circular dependency.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, TanStack Query, TailwindCSS, pdfkit

**Spec:** `docs/superpowers/specs/2026-03-22-sprint1-critical-fixes-design.md`
**Branch:** `feat/sprint1-critical-fixes`
**Delivery:** Single PR with all changes

---

## Task 0: Branch Setup

**Files:** None

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/sprint1-critical-fixes
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```
Expected: clean working tree on new branch

---

## Task 1: Verification — Subject in Session Response (#2)

**Files:** Read-only verification, no changes

- [ ] **Step 1: Verify backend includes subject**

Read `sinaloka-backend/src/modules/session/session.service.ts` line 49–55. Confirm `sessionInclude` has `class` in the include — Prisma returns all scalar fields (including `subject`) automatically.

- [ ] **Step 2: Verify frontend displays subject**

Confirm these files reference `class?.subject`:
- `sinaloka-platform/src/pages/Calendar/CalendarDay.tsx` — `getSubjectColor(s.class?.subject)`
- `sinaloka-platform/src/pages/Calendar/CalendarMonth.tsx` — same pattern
- `sinaloka-platform/src/pages/Calendar/CalendarWeek.tsx` — receives `getSubjectColor` prop
- `sinaloka-platform/src/pages/Schedules/index.tsx` — subject badge with color
- `sinaloka-platform/src/pages/Sessions/SessionDetailDrawer.tsx` — subject badge uppercase

- [ ] **Step 3: Document verification in commit message**

No code changes. Record as verified in PR description.

---

## Task 2: Verification — hasPhone Check in WhatsApp (#8)

**Files:** Read-only verification, no changes

- [ ] **Step 1: Verify manual send checks parent_phone**

Read `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` lines 376–389. Confirm:
- Selects `student: { select: { name: true, parent_phone: true } }`
- Checks `if (!parentPhone)` → throws `BadRequestException`

- [ ] **Step 2: Verify cron checks parent_phone**

Read `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` lines 72–75. Confirm:
- Checks `if (!payment.student.parent_phone)` → `skipped++; continue;`

- [ ] **Step 3: Document verification in commit message**

No code changes. Record as verified in PR description.

---

## Task 3: Rate Limiting Auth Endpoints (#4)

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.controller.ts`
- Modify: `sinaloka-backend/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Add RateLimitGuard to auth module providers**

In `sinaloka-backend/src/modules/auth/auth.module.ts`, add import and provider:

```typescript
// Add import at top
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';

// Add to providers array
providers: [AuthService, JwtStrategy, RateLimitGuard],
```

- [ ] **Step 2: Add imports to auth controller**

In `sinaloka-backend/src/modules/auth/auth.controller.ts`, add to imports:

```typescript
import { UseGuards } from '@nestjs/common'; // add UseGuards if not already imported
import {
  RateLimitGuard,
  RateLimit,
} from '../../common/guards/rate-limit.guard.js';
```

- [ ] **Step 3: Add class-level UseGuards**

Add `@UseGuards(RateLimitGuard)` decorator to the controller class (after `@NoAuditLog()`, before `@Controller('auth')`):

```typescript
@NoAuditLog()
@UseGuards(RateLimitGuard)
@Controller('auth')
export class AuthController {
```

- [ ] **Step 4: Add RateLimit decorators to login and forgot-password**

On the `login` method, add `@RateLimit(5, 15 * 60 * 1000)` (5 requests per 15 minutes):

```typescript
@Public()
@HttpCode(HttpStatus.OK)
@RateLimit(5, 15 * 60 * 1000)
@UsePipes(new ZodValidationPipe(LoginSchema))
async login(@Body() dto: LoginDto) {
```

On the `forgotPassword` method, add `@RateLimit(3, 15 * 60 * 1000)` (3 requests per 15 minutes):

```typescript
@Public()
@HttpCode(HttpStatus.OK)
@RateLimit(3, 15 * 60 * 1000)
@UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
async forgotPassword(@Body() dto: ForgotPasswordDto) {
```

- [ ] **Step 5: Build and verify**

```bash
cd sinaloka-backend && npm run build
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/auth/auth.controller.ts sinaloka-backend/src/modules/auth/auth.module.ts
git commit -m "fix(backend): add rate limiting to login and forgot-password endpoints

Apply RateLimitGuard to AuthController:
- POST /auth/login: 5 requests per 15 minutes per IP
- POST /auth/forgot-password: 3 requests per 15 minutes per IP

Uses existing in-memory RateLimitGuard (same pattern as register.controller.ts)."
```

---

## Task 4: Fix Tenant Scope User Creation (#5)

**Files:**
- Modify: `sinaloka-backend/src/modules/user/user.controller.ts:45-49`
- Modify: `sinaloka-backend/src/modules/user/user.service.ts:120-152`
- Modify: `sinaloka-backend/src/modules/user/user.dto.ts:8-12`

- [ ] **Step 1: Remove institution_id from CreateUserSchema**

In `sinaloka-backend/src/modules/user/user.dto.ts`, remove `institution_id` from `CreateUserSchema`:

```typescript
// REMOVE this line from CreateUserSchema:
// institution_id: z.string().uuid().optional().nullable(),
```

The `institution_id` must come from the JWT/tenant context, not from the request body.

- [ ] **Step 2: Add InstitutionId to controller create method**

In `sinaloka-backend/src/modules/user/user.controller.ts`, update the `create()` method to use `@InstitutionId()` (following the pattern used by all other controllers):

```typescript
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';

@Post()
@UsePipes(new ZodValidationPipe(CreateUserSchema))
async create(
  @InstitutionId() institutionId: string,
  @Body() dto: CreateUserDto,
) {
  return this.userService.create(institutionId, dto);
}
```

- [ ] **Step 3: Update UserService.create() signature**

In `sinaloka-backend/src/modules/user/user.service.ts`, update the `create` method to accept `institutionId` as first parameter:

```typescript
async create(institutionId: string, dto: CreateUserDto) {
  // ... existing logic ...
  // Change this line:
  // institution_id: dto.institution_id ?? null,
  // To:
  institution_id: institutionId,
  // ... rest unchanged ...
}
```

- [ ] **Step 4: Build and run tests**

```bash
cd sinaloka-backend && npm run build && npm run test -- --ci
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/user/user.controller.ts sinaloka-backend/src/modules/user/user.service.ts sinaloka-backend/src/modules/user/user.dto.ts
git commit -m "fix(backend): enforce tenant scope in user creation

ADMIN users can no longer specify arbitrary institution_id in request body.
institution_id now comes from JWT tenant context via @InstitutionId() decorator.
SUPER_ADMIN can still scope via ?institution_id= query param (handled by TenantInterceptor)."
```

---

## Task 5: Wire Remind Endpoint to WhatsApp (#6)

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.service.ts:190-198`
- Create: `sinaloka-backend/src/modules/payment/listeners/payment-reminder.listener.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.module.ts`

**Important:** Direct import of `WhatsappModule` into `PaymentModule` causes circular dependency (`PaymentModule ↔ WhatsappModule`). Solution: emit event via `EventEmitter2` (already injected in `PaymentService`), listen in WhatsApp module.

- [ ] **Step 1: Define event constant**

Check if there's an existing events constants file. If not, add the event name inline. The pattern from existing code uses string event names with `EventEmitter2`.

In `sinaloka-backend/src/modules/payment/payment.service.ts`, update the `remind()` method:

```typescript
async remind(institutionId: string, paymentId: string) {
  const payment = await this.findOne(institutionId, paymentId);

  this.eventEmitter.emit('payment.remind', {
    institutionId,
    paymentId: payment.id,
  });

  return {
    reminded: true,
    method: 'whatsapp',
    payment_id: payment.id,
    student_id: payment.student_id,
  };
}
```

- [ ] **Step 2: Create event listener in WhatsApp module**

Create `sinaloka-backend/src/modules/whatsapp/listeners/payment-remind.listener.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsappService } from '../whatsapp.service.js';

@Injectable()
export class PaymentRemindListener {
  private readonly logger = new Logger(PaymentRemindListener.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @OnEvent('payment.remind')
  async handlePaymentRemind(payload: {
    institutionId: string;
    paymentId: string;
  }) {
    try {
      await this.whatsappService.sendPaymentReminder(
        payload.institutionId,
        payload.paymentId,
      );
      this.logger.log(
        `Payment reminder sent for payment ${payload.paymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminder for ${payload.paymentId}: ${error.message}`,
      );
    }
  }
}
```

- [ ] **Step 3: Register listener in WhatsApp module**

In `sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts`, add `PaymentRemindListener` to providers:

```typescript
import { PaymentRemindListener } from './listeners/payment-remind.listener.js';

@Module({
  imports: [PaymentModule],
  providers: [WhatsappService, WhatsappCron, PaymentRemindListener],
  exports: [WhatsappService],
})
```

- [ ] **Step 4: Build and verify**

```bash
cd sinaloka-backend && npm run build
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.service.ts sinaloka-backend/src/modules/whatsapp/listeners/payment-remind.listener.ts sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts
git commit -m "fix(backend): wire payment remind endpoint to WhatsApp service

Replace stub in PaymentService.remind() with EventEmitter2 event.
PaymentRemindListener in WhatsApp module handles the event and calls
WhatsappService.sendPaymentReminder(). Event-based to avoid circular
dependency between PaymentModule and WhatsappModule."
```

---

## Task 6: Prisma Schema Migration (Discount + Expense)

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`
- Create: migration file (auto-generated)

Both Task 7 (discount) and Task 8 (cron expenses) need schema changes. Combine into one migration.

- [ ] **Step 1: Add discount_amount to Payment model**

In `sinaloka-backend/prisma/schema.prisma`, in the `Payment` model, add after the `amount` field (around line 599):

```prisma
  discount_amount Decimal   @default(0)
```

- [ ] **Step 2: Add last_generated_at to Expense model**

In the `Expense` model, add after `recurrence_end_date` (around line 676):

```prisma
  last_generated_at DateTime?
```

- [ ] **Step 3: Generate migration WITHOUT applying**

```bash
cd sinaloka-backend && npx prisma migrate dev --name sprint1_discount_and_expense_cron --create-only
```

Expected: migration SQL file created but NOT applied yet.

- [ ] **Step 4: Add backfill SQL to migration**

Open the generated migration file in `prisma/migrations/<timestamp>_sprint1_discount_and_expense_cron/migration.sql` and append:

```sql
-- Backfill: set last_generated_at for existing recurring expenses
UPDATE "expenses" SET "last_generated_at" = "created_at" WHERE "is_recurring" = true;
```

Note: `discount_amount` defaults to 0 via the `@default(0)` — no backfill needed.

- [ ] **Step 5: Apply migration with backfill included**

```bash
cd sinaloka-backend && npx prisma migrate dev
```

- [ ] **Step 6: Regenerate Prisma client**

```bash
cd sinaloka-backend && npm run prisma:generate
```

- [ ] **Step 7: Build and verify**

```bash
cd sinaloka-backend && npm run build
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma sinaloka-backend/prisma/migrations/
git commit -m "feat(backend): add discount_amount to Payment and last_generated_at to Expense

Migration adds:
- Payment.discount_amount (Decimal, default 0) for proper discount tracking
- Expense.last_generated_at (DateTime?) for cron job frequency checks
- Backfills last_generated_at = created_at for existing recurring expenses"
```

---

## Task 7: Fix Discount in Payment (#1)

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.dto.ts`
- Modify: `sinaloka-backend/src/modules/payment/invoice.service.ts`
- Modify: `sinaloka-platform/src/types/payment.ts`
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`

Note: `payment.service.ts` uses spread (`...dto`) for create/update, so adding `discount_amount` to the DTO is sufficient — no service logic change needed.

- [ ] **Step 1: Add discount_amount to backend DTOs**

In `sinaloka-backend/src/modules/payment/payment.dto.ts`:

Add to `CreatePaymentSchema` (inside the `z.object({})`):
```typescript
discount_amount: z.coerce.number().min(0).default(0),
```

Add to `UpdatePaymentSchema` (inside the `z.object({})`):
```typescript
discount_amount: z.coerce.number().min(0).optional(),
```

- [ ] **Step 2: Update invoice PDF to show discount**

In `sinaloka-backend/src/modules/payment/invoice.service.ts`:

First, add discount labels to the `LABELS` object (both `id` and `en` sections):

```typescript
// In LABELS.id:
subtotal: 'Subtotal',
discount: 'Diskon',

// In LABELS.en:
subtotal: 'Subtotal',
discount: 'Discount',
```

Then update the amount table section (around lines 258–288). Replace the existing amount table code with:

```typescript
// --- Amount table ---
const tableY = doc.y;
doc.font('Helvetica-Bold').fontSize(10);
doc.text(labels.description, 50, tableY);
doc.text(labels.amount, 400, tableY, { align: 'right', width: 145 });

doc.moveTo(50, tableY + 18).lineTo(545, tableY + 18).stroke('#e4e4e7');

doc.font('Helvetica').fontSize(10);
const itemY = tableY + 26;
const className = payment.enrollment?.class?.name ?? 'Payment';
doc.text(className, 50, itemY);
doc.text(formatAmount(Number(payment.amount)), 400, itemY, {
  align: 'right',
  width: 145,
});

const discountAmount = Number(payment.discount_amount ?? 0);
const finalAmount = Number(payment.amount) - discountAmount;

if (discountAmount > 0) {
  doc.moveDown(1);

  // Subtotal
  doc.font('Helvetica');
  doc.text(labels.subtotal, 300, doc.y);
  doc.text(
    formatAmount(Number(payment.amount)),
    400,
    doc.y - doc.currentLineHeight(),
    { align: 'right', width: 145 },
  );

  doc.moveDown(0.5);

  // Discount
  doc.text(labels.discount, 300, doc.y);
  doc.text(
    `- ${formatAmount(discountAmount)}`,
    400,
    doc.y - doc.currentLineHeight(),
    { align: 'right', width: 145 },
  );
}

doc.moveDown(3);

// Total
doc.font('Helvetica-Bold');
doc.text(labels.total, 300, doc.y);
doc.text(
  formatAmount(finalAmount),
  400,
  doc.y - doc.currentLineHeight(),
  { align: 'right', width: 145 },
);
```

- [ ] **Step 3: Build backend**

```bash
cd sinaloka-backend && npm run build
```
Expected: no errors

- [ ] **Step 4: Update frontend Payment types**

In `sinaloka-platform/src/types/payment.ts`:

Add to `Payment` interface (after `amount: number`):
```typescript
discount_amount: number | null;
```

Add to `CreatePaymentDto` interface:
```typescript
discount_amount?: number;
```

Add to `UpdatePaymentDto` interface:
```typescript
discount_amount?: number;
```

- [ ] **Step 5: Wire discount in StudentPayments handleSavePayment**

In `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`, update `handleSavePayment` (around lines 74–94):

Change the `updateDto` construction to send `discount_amount` instead of encoding in notes:

```typescript
const handleSavePayment = () => {
  if (!selectedPayment) return;
  const updateDto: UpdatePaymentDto = {
    status: 'PAID',
    paid_date: paymentDate,
    method: paymentMethod,
    discount_amount: discount > 0 ? discount : undefined,
    notes: paymentNotes || undefined,
  };
  updatePayment.mutate(
    { id: selectedPayment.id, data: updateDto },
    // ... rest unchanged
  );
};
```

Note: `notes` should be the actual notes input field value, not the discount encoding. Check if there's a `paymentNotes` state or similar — if not, keep the existing notes field but remove the discount encoding.

- [ ] **Step 6: Update payment display to show discount**

In the payment list/table within `StudentPayments.tsx`, where `amount` is displayed, update to show strikethrough original + final amount when discount exists:

```tsx
{payment.discount_amount && payment.discount_amount > 0 ? (
  <div className="flex flex-col items-end">
    <span className="text-xs text-zinc-400 line-through">
      {formatCurrency(payment.amount, i18n.language)}
    </span>
    <span className="font-semibold">
      {formatCurrency(payment.amount - payment.discount_amount, i18n.language)}
    </span>
  </div>
) : (
  <span>{formatCurrency(payment.amount, i18n.language)}</span>
)}
```

- [ ] **Step 7: Build frontend**

```bash
cd sinaloka-platform && npm run build
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.dto.ts sinaloka-backend/src/modules/payment/invoice.service.ts sinaloka-platform/src/types/payment.ts sinaloka-platform/src/pages/Finance/StudentPayments.tsx
git commit -m "feat(backend+platform): implement proper discount tracking in payments

Backend:
- Add discount_amount to Create/Update payment DTOs
- Invoice PDF shows subtotal, discount, and total when discount > 0

Frontend:
- Send discount_amount as numeric field (no longer encoded in notes)
- Payment list shows strikethrough original + final amount when discounted"
```

---

## Task 8: Pagination in Enrollments (#3)

**Files:**
- Modify: `sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts`
- Modify: `sinaloka-platform/src/pages/Enrollments/index.tsx`

Pattern reference: `sinaloka-platform/src/pages/Students/useStudentPage.ts` (server-side filtering with debounce)

- [ ] **Step 1: Update useEnrollmentsPage for server-side pagination**

In `sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts`:

1. Change page state to expose setter:
```typescript
const [page, setPage] = useState(1);
```

2. Change limit from 100 to 20:
```typescript
const [limit] = useState(20);
```

3. Add debounced search (follow `useStudentPage.ts` pattern):
```typescript
const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
    setPage(1);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

4. Pass search to API query:
```typescript
const enrollmentsQuery = useEnrollments({
  page,
  limit,
  search: debouncedSearch || undefined,
  status: filterStatus !== 'all' ? filterStatus : undefined,
  // ... other existing params
});
```

5. Remove client-side filtering `useMemo` (search is now server-side). Replace `filteredEnrollments` with direct use of `enrollments`.

6. Reset page on filter changes — in the `setFilterStatus` handler (or wherever status filter changes), add `setPage(1)`.

7. Expose pagination data in return object:
```typescript
return {
  // ... existing returns
  page,
  setPage,
  meta: enrollmentsQuery.data?.meta,
  // Replace filteredEnrollments references with enrollments
};
```

- [ ] **Step 2: Add pagination UI to enrollment page**

In `sinaloka-platform/src/pages/Enrollments/index.tsx`, import and render the Pagination component after the table:

```typescript
import { Pagination } from '../../components/ui/pagination';
```

After `<EnrollmentTable ... />`, add:

```tsx
{state.meta && (
  <Pagination
    currentPage={state.page}
    totalPages={state.meta.totalPages}
    total={state.meta.total}
    itemsPerPage={state.meta.limit}
    onPageChange={state.setPage}
  />
)}
```

- [ ] **Step 3: Build frontend**

```bash
cd sinaloka-platform && npm run build
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Enrollments/useEnrollmentsPage.ts sinaloka-platform/src/pages/Enrollments/index.tsx
git commit -m "fix(platform): wire enrollment pagination to server-side with debounced search

Replace client-side filtering (limit:100 + useMemo) with proper server-side
pagination (limit:20) and debounced search. Reuse Pagination component.
Follows same pattern as Students page (useStudentPage.ts)."
```

---

## Task 9: Cron Job Recurring Expenses (#7)

**Files:**
- Create: `sinaloka-backend/src/modules/expense/expense.cron.ts`
- Modify: `sinaloka-backend/src/modules/expense/expense.service.ts`
- Modify: `sinaloka-backend/src/modules/expense/expense.module.ts`

- [ ] **Step 1: Create expense.cron.ts**

Create `sinaloka-backend/src/modules/expense/expense.cron.ts` following `whatsapp.cron.ts` pattern:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ExpenseService } from './expense.service.js';

@Injectable()
export class ExpenseCron {
  private readonly logger = new Logger(ExpenseCron.name);

  constructor(
    private readonly expenseService: ExpenseService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 17 * * *') // 00:00 WIB (UTC+7)
  async processRecurringExpenses() {
    this.logger.log('Starting recurring expenses processing...');

    const institutions = await this.prisma.institution.findMany({
      select: { id: true, name: true },
    });

    let totalProcessed = 0;
    let totalCreated = 0;

    for (const institution of institutions) {
      try {
        const result = await this.expenseService.processRecurringExpenses(
          institution.id,
        );
        totalProcessed += result.processed;
        totalCreated += result.created;

        if (result.created > 0) {
          this.logger.log(
            `[${institution.name}] Created ${result.created} recurring expense(s)`,
          );
        }
      } catch (error) {
        this.logger.error(
          `[${institution.name}] Failed to process recurring expenses: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Recurring expenses done: ${totalProcessed} processed, ${totalCreated} created`,
    );
  }
}
```

- [ ] **Step 2: Update processRecurringExpenses to use last_generated_at**

In `sinaloka-backend/src/modules/expense/expense.service.ts`, update `processRecurringExpenses()`:

The key change: after creating a new occurrence, update `last_generated_at` on the parent expense:

```typescript
// After the expense occurrence is created (inside the create loop):
await this.prisma.expense.update({
  where: { id: expense.id },
  data: { last_generated_at: new Date() },
});
```

Also, in the date calculation logic, use `last_generated_at` as the starting point if available (instead of always iterating from the original `date`):

```typescript
// Replace the baseDate logic:
const startDate = expense.last_generated_at
  ? new Date(expense.last_generated_at)
  : new Date(expense.date);
```

This optimization avoids re-scanning all historical dates on every cron run.

- [ ] **Step 3: Register cron in expense module**

In `sinaloka-backend/src/modules/expense/expense.module.ts`:

```typescript
import { ExpenseCron } from './expense.cron.js';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, ExpenseCron],
  exports: [ExpenseService],
})
```

- [ ] **Step 4: Build and run tests**

```bash
cd sinaloka-backend && npm run build && npm run test -- --ci
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.cron.ts sinaloka-backend/src/modules/expense/expense.service.ts sinaloka-backend/src/modules/expense/expense.module.ts
git commit -m "feat(backend): add cron job for recurring expense generation

Daily at 00:00 WIB, iterates all institutions and generates pending
recurring expense occurrences. Uses last_generated_at for efficient
date scanning instead of iterating from original date every run.
Follows same pattern as WhatsApp cron (whatsapp.cron.ts)."
```

---

## Task 10: Final Verification and PR

**Files:** None (verification only)

- [ ] **Step 1: Full backend build + lint + test**

```bash
cd sinaloka-backend && npm run lint && npm run test -- --ci && npm run build
```
Expected: all pass

- [ ] **Step 2: Full frontend build + lint**

```bash
cd sinaloka-platform && npm run lint && npm run build
```
Expected: all pass

- [ ] **Step 3: Create PR**

```bash
gh pr create --title "feat: sprint 1 — critical fixes for production readiness" --body "$(cat <<'EOF'
## Summary

Sprint 1 critical fixes based on Platform Analysis v5. Makes the platform demo-ready:

- **Discount tracking** — proper `discount_amount` field in Payment schema, invoice PDF shows subtotal/discount/total
- **Rate limiting** — login (5/15min) and forgot-password (3/15min) endpoints protected
- **Tenant scope** — user creation enforces institution_id from JWT, not request body
- **WhatsApp wiring** — payment remind endpoint triggers actual WhatsApp message via event
- **Enrollment pagination** — server-side pagination with debounced search (was client-side limit:100)
- **Recurring expenses cron** — daily job generates pending occurrences (was manual HTTP only)

### Verified (no code changes needed)
- Subject in session response — already returned as scalar field, frontend displays correctly
- hasPhone check in WhatsApp — correctly checks `student.parent_phone`

## Migration

One migration: `sprint1_discount_and_expense_cron`
- `Payment.discount_amount` (Decimal, default 0)
- `Expense.last_generated_at` (DateTime?)
- Backfill: `last_generated_at = created_at` for existing recurring expenses

## Test plan

- [ ] Backend: `npm run lint && npm run test -- --ci && npm run build`
- [ ] Frontend: `npm run lint && npm run build`
- [ ] Create payment with discount → verify amount stored correctly
- [ ] Generate invoice with discount → verify PDF shows subtotal/discount/total
- [ ] Hit login 6 times rapidly → verify 429 on 6th attempt
- [ ] Verify enrollment page shows pagination controls with 20 items per page
- [ ] Trigger payment remind → verify WhatsApp message sent (check logs)

Fixes items from Platform Analysis v5 Sprint 1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
