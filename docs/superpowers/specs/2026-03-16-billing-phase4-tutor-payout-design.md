# Billing Phase 4: Tutor Payout Calculation — sinaloka

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Auto-calculate tutor payouts from completed sessions using per-session rates. Pre-fill payout amount in the creation form with session breakdown and overlap detection.
**Roadmap:** See `docs/superpowers/specs/2026-03-16-billing-roadmap.md`
**Depends on:** Phase 2 (`class.tutor_fee`, `session.tutor_fee_amount` on completed sessions)

## Overview

When creating a payout, the admin selects a tutor and date range. The system calculates the total from completed sessions with `tutor_fee_amount` set, shows a session-by-session breakdown, and pre-fills the amount. Admin can adjust (add bonuses/deductions) before confirming. Overlap detection warns if the date range conflicts with an existing payout. Manual entry remains available — this is an enhancement, not a replacement.

## Database Schema Changes

### Migration: Add 2 nullable columns to Payout

```prisma
model Payout {
  // ... existing fields (tutor_id, amount, date, status, proof_url, description)
  period_start  DateTime?  @db.Date
  period_end    DateTime?  @db.Date
}
```

Both nullable — existing manual payouts without a period continue to work. When auto-calculated, both are set.

No changes to Session model — `tutor_fee_amount` already exists from Phase 2.

## Backend — Payout Calculation

### New Endpoint

```
GET /api/admin/payouts/calculate?tutor_id=uuid&period_start=2026-03-01&period_end=2026-03-31
```

**Access:** ADMIN + SUPER_ADMIN

**Query validation (Zod):**
```typescript
const CalculatePayoutSchema = z.object({
  tutor_id: z.string().uuid(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
```

### Response

```json
{
  "tutor_id": "uuid",
  "tutor_name": "Budi Santoso",
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "sessions": [
    {
      "session_id": "uuid",
      "class_name": "Matematika SMP",
      "date": "2026-03-05",
      "tutor_fee_amount": 200000
    }
  ],
  "total_sessions": 8,
  "calculated_amount": 1800000,
  "overlap_warning": null
}
```

### Calculation Logic

```typescript
async calculatePayout(institutionId: string, params: CalculatePayoutParams) {
  // 1. Validate tutor exists
  const tutor = await this.prisma.tutor.findFirst({
    where: { id: params.tutor_id, institution_id: institutionId },
    include: { user: { select: { name: true } } },
  });
  if (!tutor) throw new NotFoundException('Tutor not found');

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
    (sum, s) => sum + Number(s.tutor_fee_amount ?? 0), 0
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
    sessions: sessions.map(s => ({
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

### Payout DTO Changes

**File:** `sinaloka-backend/src/modules/payout/payout.dto.ts`

Add optional fields to CreatePayoutSchema and UpdatePayoutSchema:
```typescript
period_start: z.coerce.date().optional().nullable(),
period_end: z.coerce.date().optional().nullable(),
```

### Route Ordering

The `GET calculate` endpoint must be declared **before** `GET :id` in the controller to avoid route conflict (same pattern as payment's `overdue-summary`).

## Frontend Changes

### New Service Method + Hook

**`src/services/payouts.service.ts`:**
```typescript
calculatePayout: (params: { tutor_id: string; period_start: string; period_end: string }) =>
  api.get('/api/admin/payouts/calculate', { params }).then(r => r.data),
```

**`src/hooks/usePayouts.ts`:**
```typescript
export function useCalculatePayout() {
  return useMutation({
    mutationFn: payoutsService.calculatePayout,
  });
}
```

Using `useMutation` (not `useQuery`) because it's triggered by a button click, not on mount.

### New Type

**`src/types/payout.ts`:**
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

### TutorPayouts.tsx — Enhanced Create Payout Modal

The existing "Create Payout" modal gets enhanced:

**New fields (above amount):**
- Period Start — date input
- Period End — date input
- "Calculate" button — triggers calculation when tutor + dates are set

**Auto-fill flow:**
1. Admin selects tutor from dropdown
2. Admin sets period start and end dates
3. Admin clicks "Calculate"
4. System calls `/api/admin/payouts/calculate`
5. Amount field auto-fills with `calculated_amount`
6. Session breakdown appears below the amount

**Session breakdown (shown after calculation):**
```
📊 8 sessions · Rp 1.800.000
├─ 2026-03-05  Matematika SMP    Rp 200.000
├─ 2026-03-07  Fisika SMA        Rp 250.000
├─ 2026-03-12  Matematika SMP    Rp 200.000
└─ ... (collapsible if > 5 sessions)
```

**Overlap warning (shown if exists):**
Amber banner above the "Create Payout" button:
```
⚠ Existing payout (Rp 1.800.000) covers 2026-03-01 to 2026-03-31
```

**Submit payload:** Includes `period_start` and `period_end` in the create request.

**Manual mode:** If admin doesn't click "Calculate", they type amount manually. Period fields are optional. Backward compatible.

### TutorPayouts.tsx — Reconciliation View Enhancement

The existing reconciliation/detail view already shows payout details. When a payout has `period_start` and `period_end`:
- Show "Period: {start} — {end}" in the details section
- Call the calculate endpoint to show session breakdown
- Display the same session list as in the creation modal

### Payout Type Update

**`src/types/payout.ts`:**

Add to existing Payout interface:
```typescript
period_start: string | null;
period_end: string | null;
```

### Translation Keys

Add to `payouts` namespace in both `id.json` and `en.json`:

```json
"periodStart": "Periode Mulai" / "Period Start",
"periodEnd": "Periode Akhir" / "Period End",
"calculate": "Hitung" / "Calculate",
"calculating": "Menghitung..." / "Calculating...",
"sessionBreakdown": "Rincian Sesi" / "Session Breakdown",
"sessionsCount": "{{count}} sesi" / "{{count}} sessions",
"overlapWarning": "Peringatan tumpang tindih" / "Overlap warning",
"noSessions": "Tidak ada sesi yang ditemukan dalam periode ini" / "No sessions found in this period"
```

## Constraints

- Per-session rate only — revenue share and flat monthly deferred
- Overlap detection is advisory (warning), not blocking
- Manual payout creation still works (period fields optional)
- No batch payout generation — one tutor at a time
- Uses existing `session.tutor_fee_amount` from Phase 2 — no new session tracking
- No new billing settings — calculation is based on per-class tutor_fee
