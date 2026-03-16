# Billing Phase 3: Late Payment Enforcement — sinaloka

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Auto-detect overdue payments on-demand and show warning alerts across Dashboard, Students, and Enrollments pages.
**Roadmap:** See `docs/superpowers/specs/2026-03-16-billing-roadmap.md`
**Depends on:** Phase 1 (billing config with late_payment_auto_lock + threshold), Phase 2 (auto-generated payments)

## Overview

Overdue detection runs on-demand (no cron) — when payment lists or dashboard stats are queried, PENDING payments past their due date are automatically updated to OVERDUE. A new summary endpoint returns flagged students whose total overdue debt exceeds the configured threshold. The frontend shows non-blocking visual alerts on Dashboard, Students list, and Enrollments list. No enrollment locking — admin sees warnings and decides action.

## Overdue Detection — On-Demand

### Where It Runs

A new utility method `refreshOverdueStatus(institutionId)` in `PaymentService`:

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

### Called By

1. `PaymentService.findAll()` — called at the start, before the paginated query
2. `PaymentService.getOverdueSummary()` — called before calculating the summary
3. `DashboardService` — when fetching stats (so dashboard overdue count is accurate)

### Characteristics

- Single bulk `UPDATE` query — fast, idempotent
- Only touches PENDING payments with `due_date < now`
- Scoped to institution (multi-tenant safe)
- No schema changes — OVERDUE status already exists
- No new dependencies (no scheduler, no cron)

## Overdue Summary Endpoint

### New Endpoint

```
GET /api/admin/payments/overdue-summary
```

**Access:** ADMIN + SUPER_ADMIN (same as payment endpoints)

### Response

```json
{
  "overdue_count": 5,
  "total_overdue_amount": 3500000,
  "flagged_students": [
    {
      "student_id": "uuid",
      "student_name": "Rina Pelajar",
      "total_debt": 1500000,
      "overdue_payments": 3
    },
    {
      "student_id": "uuid",
      "student_name": "Dimas Pelajar",
      "total_debt": 2000000,
      "overdue_payments": 2
    }
  ]
}
```

### Logic

```typescript
async getOverdueSummary(institutionId: string) {
  // 1. Refresh overdue status first
  await this.refreshOverdueStatus(institutionId);

  // 2. Get billing settings for threshold
  const billing = await this.settingsService.getBilling(institutionId);

  // 3. Aggregate overdue payments by student
  const overdueByStudent = await this.prisma.payment.groupBy({
    by: ['student_id'],
    where: { institution_id: institutionId, status: 'OVERDUE' },
    _sum: { amount: true },
    _count: { id: true },
  });

  // 4. Total overdue stats
  const overdue_count = overdueByStudent.reduce((sum, s) => sum + s._count.id, 0);
  const total_overdue_amount = overdueByStudent.reduce(
    (sum, s) => sum + Number(s._sum.amount ?? 0), 0
  );

  // 5. Filter flagged students (above threshold if auto-lock enabled)
  let flaggedStudentIds = overdueByStudent.map(s => s.student_id);
  if (billing.late_payment_auto_lock && billing.late_payment_threshold > 0) {
    flaggedStudentIds = overdueByStudent
      .filter(s => Number(s._sum.amount ?? 0) >= billing.late_payment_threshold)
      .map(s => s.student_id);
  }

  // 6. Fetch student names for flagged students
  const students = await this.prisma.student.findMany({
    where: { id: { in: flaggedStudentIds } },
    select: { id: true, name: true },
  });

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

  return {
    overdue_count,
    total_overdue_amount,
    flagged_students,
  };
}
```

### Threshold Behavior

- If `late_payment_auto_lock` is **disabled** (default): `flagged_students` returns ALL students with any overdue payment
- If `late_payment_auto_lock` is **enabled** with threshold > 0: `flagged_students` only returns students whose total debt exceeds the threshold
- This allows the dashboard to always show the overdue count, while the flagged list respects the admin's configured sensitivity

## Backend Changes Summary

### Modified Files

**`src/modules/payment/payment.service.ts`:**
- Add `refreshOverdueStatus(institutionId)` method
- Call it at the start of `findAll()`
- Add `getOverdueSummary(institutionId)` method
- Inject `SettingsService` (import SettingsModule already done in Phase 2)

**`src/modules/payment/payment.controller.ts`:**
- Add `GET overdue-summary` endpoint (must be before `GET :id` to avoid route conflict)

**`src/modules/dashboard/dashboard.service.ts`:**
- Call `refreshOverdueStatus()` before calculating stats (or include overdue count in dashboard response)

### No Schema Changes

- OVERDUE status already exists in Payment model
- No new columns, tables, or enums

## Frontend Changes

### New Hook

**`src/hooks/usePayments.ts`** (or extend existing):

```typescript
export function useOverdueSummary() {
  return useQuery({
    queryKey: ['payments', 'overdue-summary'],
    queryFn: () => api.get('/api/admin/payments/overdue-summary').then(r => r.data),
  });
}
```

### New Service Method

**`src/services/payments.service.ts`:**

```typescript
getOverdueSummary: () =>
  api.get('/api/admin/payments/overdue-summary').then(r => r.data),
```

### New Type

**`src/types/payment.ts`:**

```typescript
export interface OverdueSummary {
  overdue_count: number;
  total_overdue_amount: number;
  flagged_students: {
    student_id: string;
    student_name: string;
    total_debt: number;
    overdue_payments: number;
  }[];
}
```

### Dashboard Page

**`src/pages/Dashboard.tsx`:**

Add a conditional alert card when `overdue_count > 0`:

```
⚠️ Overdue Payments
{count} students · Rp {total} total
[View Details →]  → navigates to /finance/payments?status=OVERDUE
```

Positioned after the main stats cards, before upcoming sessions. Uses `useOverdueSummary()`.

### Students List

**`src/pages/Students.tsx`:**

Fetch `useOverdueSummary()`. Cross-reference `flagged_students[].student_id` with the student list. For matching students, show a small warning icon (⚠ or AlertTriangle from lucide) next to the student name in the table.

No changes to student API or data — purely frontend visual overlay.

### Enrollments List

**`src/pages/Enrollments.tsx`:**

Same approach — fetch overdue summary, cross-reference student IDs, add subtle warning styling (amber background tint or warning badge) on enrollment rows where the student is flagged.

### Translation Keys

Add to both `id.json` and `en.json`:

```json
"payments": {
  "overdueAlert": {
    "title": "Pembayaran Terlambat",
    "students": "{{count}} siswa",
    "totalDebt": "Total Rp {{amount}}",
    "viewDetails": "Lihat Detail"
  }
}
```

## Constraints

- No cron job — on-demand detection only
- No enrollment locking or status changes — visual alerts only
- No email/WhatsApp notifications — deferred to Phase 5
- Overdue detection only runs when admin views relevant pages (lazy)
- Threshold from Phase 1 billing settings — no new configuration
- No new database schema changes
