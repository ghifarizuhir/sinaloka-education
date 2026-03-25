# Billing Phase 3: Late Payment Enforcement — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-detect overdue payments on-demand and show visual warning alerts across Dashboard, Students, and Enrollments pages for students with debt exceeding the configured threshold.

**Architecture:** Add `refreshOverdueStatus()` and `getOverdueSummary()` to PaymentService, called on-demand when payments are queried. New `GET /api/admin/payments/overdue-summary` endpoint returns flagged students. Frontend fetches the summary via `useOverdueSummary()` hook and shows alert cards/badges on Dashboard, Students, and Enrollments pages. No schema changes, no cron, no enrollment locking.

**Tech Stack:** NestJS, Prisma (groupBy aggregation), React, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-16-billing-phase3-late-payment-design.md`

---

## Chunk 1: Backend — Overdue Detection + Summary Endpoint

### Task 1: Add refreshOverdueStatus and getOverdueSummary to PaymentService

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.service.ts`

- [ ] **Step 1: Inject SettingsService**

Add import and update constructor:

```typescript
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}
```

Note: SettingsModule is already imported in PaymentModule from Phase 2.

- [ ] **Step 2: Add refreshOverdueStatus method**

Add after the `delete` method:

```typescript
async refreshOverdueStatus(institutionId: string): Promise<number> {
  const result = await this.prisma.payment.updateMany({
    where: {
      institution_id: institutionId,
      status: 'PENDING',
      due_date: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  });
  return result.count;
}
```

- [ ] **Step 3: Call refreshOverdueStatus at start of findAll**

In the `findAll` method, add as the first line:

```typescript
async findAll(institutionId: string, query: PaymentQueryDto) {
  // Auto-detect overdue payments
  await this.refreshOverdueStatus(institutionId);

  const { page, limit, status, student_id, sort_by, sort_order } = query;
  // ... rest unchanged
```

- [ ] **Step 4: Add getOverdueSummary method**

Add after `refreshOverdueStatus`:

```typescript
async getOverdueSummary(institutionId: string) {
  await this.refreshOverdueStatus(institutionId);

  const billing = await this.settingsService.getBilling(institutionId);

  const overdueByStudent = await this.prisma.payment.groupBy({
    by: ['student_id'],
    where: { institution_id: institutionId, status: 'OVERDUE' },
    _sum: { amount: true },
    _count: { id: true },
  });

  const overdue_count = overdueByStudent.reduce((sum, s) => sum + s._count.id, 0);
  const total_overdue_amount = overdueByStudent.reduce(
    (sum, s) => sum + Number(s._sum.amount ?? 0), 0,
  );

  let flaggedStudentIds = overdueByStudent.map(s => s.student_id);
  if (billing.late_payment_auto_lock && billing.late_payment_threshold > 0) {
    flaggedStudentIds = overdueByStudent
      .filter(s => Number(s._sum.amount ?? 0) >= billing.late_payment_threshold)
      .map(s => s.student_id);
  }

  const students = flaggedStudentIds.length > 0
    ? await this.prisma.student.findMany({
        where: { id: { in: flaggedStudentIds } },
        select: { id: true, name: true },
      })
    : [];

  const studentMap = new Map(students.map(s => [s.id, s.name]));

  const flagged_students = overdueByStudent
    .filter(s => flaggedStudentIds.includes(s.student_id))
    .map(s => ({
      student_id: s.student_id,
      student_name: studentMap.get(s.student_id) ?? 'Unknown',
      total_debt: Number(s._sum.amount ?? 0),
      overdue_payments: s._count.id,
    }))
    .sort((a, b) => b.total_debt - a.total_debt);

  return { overdue_count, total_overdue_amount, flagged_students };
}
```

- [ ] **Step 5: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep payment.service || echo "No errors"
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.service.ts
git commit -m "feat(backend): add refreshOverdueStatus and getOverdueSummary to PaymentService"
```

---

### Task 2: Add overdue-summary Endpoint to PaymentController

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.controller.ts`

- [ ] **Step 1: Add the endpoint BEFORE the :id route**

The `overdue-summary` route must be declared before `GET :id` to avoid NestJS matching "overdue-summary" as a UUID parameter.

Add after `findAll` and before `findOne`:

```typescript
@Get('overdue-summary')
getOverdueSummary(@CurrentUser() user: JwtPayload) {
  return this.paymentService.getOverdueSummary(user.institutionId!);
}
```

- [ ] **Step 2: Verify and test**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep payment || echo "No errors"
```

Test with curl:
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@cerdas.id","password":"password"}' | jq -r '.access_token')
curl -s http://localhost:5000/api/admin/payments/overdue-summary -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: Returns `{ overdue_count, total_overdue_amount, flagged_students }`.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.controller.ts
git commit -m "feat(backend): add GET /api/admin/payments/overdue-summary endpoint"
```

---

## Chunk 2: Frontend — Types, Service, Hook, Page Alerts

### Task 3: Add OverdueSummary Type, Service Method, and Hook

**Files:**
- Modify: `sinaloka-platform/src/types/payment.ts`
- Modify: `sinaloka-platform/src/services/payments.service.ts`
- Modify: `sinaloka-platform/src/hooks/usePayments.ts`

- [ ] **Step 1: Add OverdueSummary type**

Append to `sinaloka-platform/src/types/payment.ts`:

```typescript
export interface FlaggedStudent {
  student_id: string;
  student_name: string;
  total_debt: number;
  overdue_payments: number;
}

export interface OverdueSummary {
  overdue_count: number;
  total_overdue_amount: number;
  flagged_students: FlaggedStudent[];
}
```

- [ ] **Step 2: Add service method**

Append to the `paymentsService` object in `sinaloka-platform/src/services/payments.service.ts`:

```typescript
getOverdueSummary: () =>
  api.get<OverdueSummary>('/api/admin/payments/overdue-summary').then((r) => r.data),
```

Add import:
```typescript
import type { Payment, CreatePaymentDto, UpdatePaymentDto, PaymentQueryParams, OverdueSummary } from '@/src/types/payment';
```

- [ ] **Step 3: Add hook**

Append to `sinaloka-platform/src/hooks/usePayments.ts`:

```typescript
export function useOverdueSummary() {
  return useQuery({
    queryKey: ['payments', 'overdue-summary'],
    queryFn: paymentsService.getOverdueSummary,
  });
}
```

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/payment.ts sinaloka-platform/src/services/payments.service.ts sinaloka-platform/src/hooks/usePayments.ts
git commit -m "feat(platform): add overdue summary type, service method, and hook"
```

---

### Task 4: Add Translation Keys for Overdue Alerts

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add overdue alert keys to id.json**

Add under `payments` namespace (inside the existing payments object):

```json
"overdueAlert": {
  "title": "Pembayaran Terlambat",
  "students": "{{count}} siswa",
  "totalDebt": "Total {{amount}}",
  "viewDetails": "Lihat Detail",
  "warning": "Terlambat"
}
```

- [ ] **Step 2: Add equivalent keys to en.json**

```json
"overdueAlert": {
  "title": "Overdue Payments",
  "students": "{{count}} students",
  "totalDebt": "Total {{amount}}",
  "viewDetails": "View Details",
  "warning": "Overdue"
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add overdue alert translation keys"
```

---

### Task 5: Add Overdue Alert Card to Dashboard

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`

- [ ] **Step 1: Read Dashboard.tsx to find where to add the alert**

Read the file to find the stats cards section and upcoming sessions section.

- [ ] **Step 2: Add overdue alert**

Import the hook:
```typescript
import { useOverdueSummary } from '@/src/hooks/usePayments';
```

Import `AlertTriangle` from lucide:
```typescript
import { AlertTriangle } from 'lucide-react';
```

Import `useNavigate` if not already imported, and `formatCurrency` from utils.

Inside the component, add:
```typescript
const { data: overdueSummary } = useOverdueSummary();
const navigate = useNavigate();
```

After the stats cards grid and before the upcoming sessions section, add a conditional alert:

```tsx
{overdueSummary && overdueSummary.overdue_count > 0 && (
  <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{t('payments.overdueAlert.title')}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t('payments.overdueAlert.students', { count: overdueSummary.flagged_students.length })} · {t('payments.overdueAlert.totalDebt', { amount: formatCurrency(overdueSummary.total_overdue_amount, i18n.language) })}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-300 text-amber-700 hover:bg-amber-100"
        onClick={() => navigate('/finance/payments?status=OVERDUE')}
      >
        {t('payments.overdueAlert.viewDetails')}
      </Button>
    </div>
  </Card>
)}
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Dashboard.tsx
git commit -m "feat(platform): add overdue payment alert card to Dashboard"
```

---

### Task 6: Add Warning Badges to Students List

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx`

- [ ] **Step 1: Add hook import and fetch**

Import:
```typescript
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { AlertTriangle } from 'lucide-react';
```

Inside the component:
```typescript
const { data: overdueSummary } = useOverdueSummary();
const flaggedStudentIds = new Set(overdueSummary?.flagged_students.map(s => s.student_id) ?? []);
```

- [ ] **Step 2: Add warning icon next to flagged student names**

In the table row where student name is rendered (the `<td>` with `student.name`), add after the name span:

```tsx
{flaggedStudentIds.has(student.id) && (
  <AlertTriangle size={14} className="text-amber-500 shrink-0" title={t('payments.overdueAlert.warning')} />
)}
```

Add it inside the flex container that holds the avatar and name, so it appears inline.

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Students.tsx
git commit -m "feat(platform): add overdue warning badge on Students list"
```

---

### Task 7: Add Warning Styling to Enrollments List

**Files:**
- Modify: `sinaloka-platform/src/pages/Enrollments.tsx`

- [ ] **Step 1: Add hook import and fetch**

Import:
```typescript
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { AlertTriangle } from 'lucide-react';
```

Inside the component:
```typescript
const { data: overdueSummary } = useOverdueSummary();
const flaggedStudentIds = new Set(overdueSummary?.flagged_students.map(s => s.student_id) ?? []);
```

- [ ] **Step 2: Add warning highlight on enrollment rows**

In the table row for each enrollment, add a conditional class for amber tinting when the enrollment's student is flagged:

```tsx
<tr
  key={enrollment.id}
  className={cn(
    'hover:bg-zinc-50/50 ...',  // existing classes
    flaggedStudentIds.has(enrollment.student_id) && 'bg-amber-50/30 dark:bg-amber-900/10'
  )}
>
```

Also add a small warning badge next to the student name in the enrollment row:

```tsx
{flaggedStudentIds.has(enrollment.student_id) && (
  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
)}
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Enrollments.tsx
git commit -m "feat(platform): add overdue warning styling on Enrollments list"
```

---

## Chunk 3: Final Verification

### Task 8: Full Build + Smoke Test

- [ ] **Step 1: Backend type check**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep -E "payment|dashboard" || echo "No source errors"
```

- [ ] **Step 2: Frontend build**

```bash
cd sinaloka-platform && npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Smoke test — No overdue payments**

1. Login as admin
2. Dashboard should NOT show overdue alert card (no overdue payments exist)
3. Students list should have no warning icons
4. Enrollments list should have no amber rows

- [ ] **Step 4: Smoke test — Create overdue scenario**

1. Create a payment with `due_date` in the past and `status = PENDING`
2. Go to Finance > Student Payments — the payment should now show as OVERDUE (auto-detected)
3. Go to Dashboard — overdue alert card should appear
4. Go to Students — the student should have a warning icon
5. Go to Enrollments — the student's enrollment row should have amber tinting

- [ ] **Step 5: Smoke test — Threshold behavior**

1. In Settings > Billing, enable late payment auto-lock with threshold Rp 1,000,000
2. Create a small overdue payment (Rp 100,000) for a student
3. Dashboard should show overdue count but the student should NOT be in flagged list (below threshold)
4. Create another overdue payment bringing total above Rp 1,000,000
5. Now the student should appear in flagged list with warning badges

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Billing Phase 3 — late payment detection with overdue alerts"
```
