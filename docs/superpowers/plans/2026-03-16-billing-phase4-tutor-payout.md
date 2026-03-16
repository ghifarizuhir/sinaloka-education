# Billing Phase 4: Tutor Payout Calculation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-calculate tutor payouts from completed sessions, pre-filling the payout amount with session breakdown and overlap detection in the create payout modal.

**Architecture:** Add `period_start` and `period_end` to Payout model. New `calculatePayout()` method in PayoutService queries completed sessions with `tutor_fee_amount`, sums them, and detects overlapping payouts. New `GET /api/admin/payouts/calculate` endpoint. Frontend enhances the Create Payout modal with period dates, calculate button, session breakdown, and overlap warning.

**Tech Stack:** NestJS, Prisma, Zod, React, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-16-billing-phase4-tutor-payout-design.md`

---

## Chunk 1: Backend — Schema, DTO, Service, Controller

### Task 1: Prisma Schema — Add period_start and period_end to Payout

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add columns to Payout model**

Find the Payout model. Add after `description`:

```prisma
  period_start    DateTime?  @db.Date
  period_end      DateTime?  @db.Date
```

- [ ] **Step 2: Push schema and regenerate**

```bash
cd sinaloka-backend && npx prisma db push && npm run prisma:generate
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma
git commit -m "feat(backend): add period_start and period_end to Payout model"
```

---

### Task 2: Update Payout DTO

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.dto.ts`

- [ ] **Step 1: Add period fields to CreatePayoutSchema**

Add before the closing `})` of `CreatePayoutSchema`:

```typescript
  period_start: z.coerce.date().optional().nullable(),
  period_end: z.coerce.date().optional().nullable(),
```

- [ ] **Step 2: Add period fields to UpdatePayoutSchema**

Add the same two fields to `UpdatePayoutSchema`.

- [ ] **Step 3: Add CalculatePayoutSchema**

Append after the existing schemas:

```typescript
export const CalculatePayoutSchema = z.object({
  tutor_id: z.string().uuid(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
export type CalculatePayoutDto = z.infer<typeof CalculatePayoutSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payout/payout.dto.ts
git commit -m "feat(backend): add period fields to payout DTOs and CalculatePayoutSchema"
```

---

### Task 3: Add calculatePayout Method to PayoutService

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.service.ts`

- [ ] **Step 1: Add import for NotFoundException (already imported) and the new DTO type**

Update the import from payout.dto.js to include `CalculatePayoutDto`:

```typescript
import type {
  CreatePayoutDto,
  UpdatePayoutDto,
  PayoutQueryDto,
  CalculatePayoutDto,
} from './payout.dto.js';
```

- [ ] **Step 2: Add calculatePayout method**

Add after the `findByTutor` method:

```typescript
  async calculatePayout(institutionId: string, params: CalculatePayoutDto) {
    // 1. Validate tutor exists
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: params.tutor_id, institution_id: institutionId },
      include: { user: { select: { name: true } } },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }

    // 2. Find completed sessions with tutor_fee_amount in date range
    const sessions = await this.prisma.session.findMany({
      where: {
        institution_id: institutionId,
        class: { tutor_id: params.tutor_id },
        status: 'COMPLETED',
        tutor_fee_amount: { not: null },
        date: { gte: params.period_start, lte: params.period_end },
      },
      include: { class: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    // 3. Calculate total
    const calculated_amount = sessions.reduce(
      (sum, s) => sum + Number(s.tutor_fee_amount ?? 0),
      0,
    );

    // 4. Check for overlapping payouts
    const overlapping = await this.prisma.payout.findFirst({
      where: {
        tutor_id: params.tutor_id,
        institution_id: institutionId,
        period_start: { not: null, lte: params.period_end },
        period_end: { not: null, gte: params.period_start },
      },
    });

    const overlap_warning = overlapping
      ? `Existing payout (Rp ${Number(overlapping.amount).toLocaleString()}) covers ${overlapping.period_start?.toISOString().split('T')[0]} to ${overlapping.period_end?.toISOString().split('T')[0]}`
      : null;

    return {
      tutor_id: params.tutor_id,
      tutor_name: tutor.user.name,
      period_start: params.period_start,
      period_end: params.period_end,
      sessions: sessions.map((s) => ({
        session_id: s.id,
        class_name: s.class.name,
        date: s.date,
        tutor_fee_amount: Number(s.tutor_fee_amount),
      })),
      total_sessions: sessions.length,
      calculated_amount,
      overlap_warning,
    };
  }
```

- [ ] **Step 3: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep payout || echo "No errors"
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payout/payout.service.ts
git commit -m "feat(backend): add calculatePayout method with session breakdown and overlap detection"
```

---

### Task 4: Add calculate Endpoint to PayoutController

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.controller.ts`

- [ ] **Step 1: Add import for CalculatePayoutSchema**

Update imports:
```typescript
import {
  CreatePayoutSchema,
  UpdatePayoutSchema,
  PayoutQuerySchema,
  CalculatePayoutSchema,
} from './payout.dto.js';
import type {
  CreatePayoutDto,
  UpdatePayoutDto,
  PayoutQueryDto,
  CalculatePayoutDto,
} from './payout.dto.js';
```

- [ ] **Step 2: Add GET calculate endpoint BEFORE GET :id**

Add after `findAll` and before `findOne`:

```typescript
  @Get('calculate')
  calculate(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(CalculatePayoutSchema)) query: CalculatePayoutDto,
  ) {
    return this.payoutService.calculatePayout(user.institutionId!, query);
  }
```

- [ ] **Step 3: Verify and test**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep payout || echo "No errors"
```

Test with curl:
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@cerdas.id","password":"password"}' | jq -r '.access_token')

# Get a tutor ID first
TUTOR_ID=$(curl -s http://localhost:5000/api/admin/tutors -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

curl -s "http://localhost:5000/api/admin/payouts/calculate?tutor_id=$TUTOR_ID&period_start=2026-03-01&period_end=2026-03-31" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: Returns calculation with sessions, total, and overlap_warning.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payout/payout.controller.ts
git commit -m "feat(backend): add GET /api/admin/payouts/calculate endpoint"
```

---

## Chunk 2: Frontend — Types, Service, Hook, Modal Enhancement

### Task 5: Update Frontend Types, Service, and Hook

**Files:**
- Modify: `sinaloka-platform/src/types/payout.ts`
- Modify: `sinaloka-platform/src/services/payouts.service.ts`
- Modify: `sinaloka-platform/src/hooks/usePayouts.ts`

- [ ] **Step 1: Add period fields to Payout interface and CreatePayoutDto**

In `sinaloka-platform/src/types/payout.ts`:

Add to `Payout` interface:
```typescript
  period_start: string | null;
  period_end: string | null;
```

Add to `CreatePayoutDto` interface:
```typescript
  period_start?: string;
  period_end?: string;
```

Append new interface:
```typescript
export interface PayoutCalculation {
  tutor_id: string;
  tutor_name: string;
  period_start: string;
  period_end: string;
  sessions: {
    session_id: string;
    class_name: string;
    date: string;
    tutor_fee_amount: number;
  }[];
  total_sessions: number;
  calculated_amount: number;
  overlap_warning: string | null;
}
```

- [ ] **Step 2: Add calculatePayout to service**

In `sinaloka-platform/src/services/payouts.service.ts`, add import:
```typescript
import type { Payout, CreatePayoutDto, UpdatePayoutDto, PayoutQueryParams, PayoutCalculation } from '@/src/types/payout';
```

Add to `payoutsService` object:
```typescript
  calculatePayout: (params: { tutor_id: string; period_start: string; period_end: string }) =>
    api.get<PayoutCalculation>('/api/admin/payouts/calculate', { params }).then((r) => r.data),
```

- [ ] **Step 3: Add useCalculatePayout hook**

In `sinaloka-platform/src/hooks/usePayouts.ts`, append:
```typescript
export function useCalculatePayout() {
  return useMutation({
    mutationFn: payoutsService.calculatePayout,
  });
}
```

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/payout.ts sinaloka-platform/src/services/payouts.service.ts sinaloka-platform/src/hooks/usePayouts.ts
git commit -m "feat(platform): add payout calculation types, service method, and hook"
```

---

### Task 6: Add Translation Keys

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add payout calculation keys to id.json**

Add inside the `payouts` object (after existing keys like `confirm`):

```json
"periodStart": "Periode Mulai",
"periodEnd": "Periode Akhir",
"calculate": "Hitung",
"calculating": "Menghitung...",
"sessionBreakdown": "Rincian Sesi",
"sessionsCount": "{{count}} sesi",
"overlapWarning": "Peringatan: Tumpang tindih dengan pembayaran yang sudah ada",
"noSessions": "Tidak ada sesi ditemukan dalam periode ini",
"period": "Periode"
```

- [ ] **Step 2: Add equivalent keys to en.json**

```json
"periodStart": "Period Start",
"periodEnd": "Period End",
"calculate": "Calculate",
"calculating": "Calculating...",
"sessionBreakdown": "Session Breakdown",
"sessionsCount": "{{count}} sessions",
"overlapWarning": "Warning: Overlaps with existing payout",
"noSessions": "No sessions found in this period",
"period": "Period"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add payout calculation translation keys"
```

---

### Task 7: Enhance TutorPayouts.tsx — Create Modal + Reconciliation

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`

- [ ] **Step 1: Read the current file**

Read TutorPayouts.tsx to understand the existing Create Payout modal and reconciliation view structure.

- [ ] **Step 2: Add imports and state**

Add imports:
```typescript
import { useCalculatePayout } from '@/src/hooks/usePayouts';
import type { PayoutCalculation } from '@/src/types/payout';
import { formatCurrency } from '../lib/utils'; // if not already imported
```

Add state variables for the enhanced create modal:
```typescript
const calculatePayout = useCalculatePayout();
const [formPeriodStart, setFormPeriodStart] = useState('');
const [formPeriodEnd, setFormPeriodEnd] = useState('');
const [calculation, setCalculation] = useState<PayoutCalculation | null>(null);
```

- [ ] **Step 3: Add calculate handler**

```typescript
const handleCalculate = () => {
  if (!newPayoutTutor || !formPeriodStart || !formPeriodEnd) return;
  calculatePayout.mutate(
    { tutor_id: newPayoutTutor, period_start: formPeriodStart, period_end: formPeriodEnd },
    {
      onSuccess: (data) => {
        setCalculation(data);
        setNewPayoutAmount(String(data.calculated_amount));
      },
      onError: () => toast.error(t('payouts.toast.confirmError')),
    },
  );
};
```

Reset `calculation`, `formPeriodStart`, `formPeriodEnd` when the modal opens and when it closes.

- [ ] **Step 4: Enhance the Create Payout modal**

In the create payout modal, add BEFORE the amount field:

**Period date inputs:**
```tsx
<div className="grid grid-cols-2 gap-3">
  <div className="space-y-1.5">
    <Label>{t('payouts.periodStart')}</Label>
    <Input type="date" value={formPeriodStart} onChange={(e) => setFormPeriodStart(e.target.value)} />
  </div>
  <div className="space-y-1.5">
    <Label>{t('payouts.periodEnd')}</Label>
    <Input type="date" value={formPeriodEnd} onChange={(e) => setFormPeriodEnd(e.target.value)} />
  </div>
</div>
<Button
  variant="outline"
  size="sm"
  onClick={handleCalculate}
  disabled={!newPayoutTutor || !formPeriodStart || !formPeriodEnd || calculatePayout.isPending}
  className="w-full justify-center"
>
  {calculatePayout.isPending ? t('payouts.calculating') : t('payouts.calculate')}
</Button>
```

**Session breakdown (after calculate, before amount field):**
```tsx
{calculation && (
  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 space-y-2">
    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
      {t('payouts.sessionBreakdown')} — {t('payouts.sessionsCount', { count: calculation.total_sessions })}
    </p>
    {calculation.sessions.length > 0 ? (
      <div className="max-h-40 overflow-y-auto space-y-1">
        {calculation.sessions.map((s) => (
          <div key={s.session_id} className="flex items-center justify-between text-xs text-zinc-500">
            <span>{new Date(s.date).toLocaleDateString()} — {s.class_name}</span>
            <span className="font-mono">{formatCurrency(s.tutor_fee_amount, i18n.language)}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-zinc-400 italic">{t('payouts.noSessions')}</p>
    )}
  </div>
)}
```

**Overlap warning (after session breakdown):**
```tsx
{calculation?.overlap_warning && (
  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
      <AlertTriangle size={14} />
      {calculation.overlap_warning}
    </p>
  </div>
)}
```

Import `AlertTriangle` from lucide if not already.

- [ ] **Step 5: Include period in submission payload**

When submitting the create payout form, add `period_start` and `period_end`:
```typescript
period_start: formPeriodStart || undefined,
period_end: formPeriodEnd || undefined,
```

- [ ] **Step 6: Enhance reconciliation view**

In the reconciliation/detail view, if the payout has `period_start` and `period_end`:
- Show "Period: {start} — {end}" in the details section
- If period exists, call `calculatePayout.mutate()` on view open to show session breakdown

- [ ] **Step 7: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/TutorPayouts.tsx
git commit -m "feat(platform): enhance create payout modal with auto-calculation and session breakdown"
```

---

## Chunk 3: Final Verification

### Task 8: Full Build + Smoke Test

- [ ] **Step 1: Backend type check**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep payout || echo "No errors"
```

- [ ] **Step 2: Frontend build**

```bash
cd sinaloka-platform && npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Smoke test — Manual payout (backward compatible)**

1. Go to Finance > Tutor Payouts
2. Click "New Payout"
3. Select tutor, type amount manually, set date
4. Leave period fields empty
5. Create → payout created without period dates. Same as before.

- [ ] **Step 4: Smoke test — Auto-calculated payout**

1. Ensure a tutor has completed sessions with `tutor_fee` set on their class
2. Click "New Payout"
3. Select the tutor
4. Set period start = 2026-03-01, period end = 2026-03-31
5. Click "Calculate"
6. Verify: amount auto-fills, session breakdown shows, correct total
7. Create the payout → verify it saves with period_start and period_end

- [ ] **Step 5: Smoke test — Overlap detection**

1. Create a payout for a tutor with period March 1-31
2. Try creating another payout for the same tutor with overlapping dates (March 15 - April 15)
3. Click "Calculate" → verify overlap warning appears
4. Can still create the payout (warning is advisory)

- [ ] **Step 6: Smoke test — No sessions in period**

1. Select a tutor with no completed sessions
2. Set period dates
3. Click "Calculate"
4. Verify: amount = 0, "No sessions found" message shown

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Billing Phase 4 — tutor payout auto-calculation from sessions"
```
