# Billing Phase 2: Auto-Invoice Generation — sinaloka

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Automatically create Payment records based on billing mode (per-session and package). Track tutor session fees for future payout calculation.
**Roadmap:** See `docs/superpowers/specs/2026-03-16-billing-roadmap.md`
**Depends on:** Phase 1 (billing config persistence — completed)

## Overview

When an institution's billing mode is set to `per_session` or `package`, the system automatically generates Payment records at the appropriate trigger point. Per-session creates payments when attendance is marked present/late. Package creates a single payment when a student enrolls. Tutor session fees are tracked on the session record when sessions complete. Manual mode is unchanged.

## Database Schema Changes

### Migration: Add 3 nullable columns

**Class model — 2 new fields:**
```prisma
model Class {
  // ... existing fields (name, subject, fee, capacity, schedule_*, status, tutor_id, etc.)
  package_fee       Decimal?  // Monthly package price for students (package mode)
  tutor_fee         Decimal?  // Per-session compensation for the assigned tutor
}
```

**Session model — 1 new field:**
```prisma
model Session {
  // ... existing fields (class_id, date, start_time, end_time, status, topic_covered, etc.)
  tutor_fee_amount  Decimal?  // Copied from class.tutor_fee when session marked COMPLETED
}
```

All nullable — existing data unaffected. One Prisma migration.

### Payment Model — No Changes

Auto-generated payments use the existing Payment structure:
- `institution_id`, `student_id`, `enrollment_id`, `amount`, `due_date`, `status`, `method`, `notes`

No invoice number field (deferred to Phase 5).

## Auto-Payment Generation Logic

### New Service: InvoiceGeneratorService

**Location:** `src/modules/payment/invoice-generator.service.ts`

**Dependencies:**
- `PrismaService` — database access
- `SettingsService` — read institution billing mode

**Responsibility:** Single place for all auto-payment creation logic. Called by session and enrollment services.

### Per-Session Mode

**Student payment trigger:** Attendance saved as PRESENT or LATE.

```
AttendanceService.saveAttendance(sessionId, records[])
  → existing attendance save logic
  → if billing_mode === 'per_session':
    → for each record where status === PRESENT or LATE:
      → invoiceGenerator.generatePerSessionPayment({
          institutionId,
          studentId: record.student_id,
          sessionId,
          classId: session.class_id,
          enrollmentId  // looked up from student + class
        })
```

**generatePerSessionPayment logic:**
1. Check if payment already exists for this `enrollment_id` + a note/reference to this session (duplicate prevention)
2. Look up `class.fee` for the amount
3. Create Payment:
   - `institution_id` = institutionId
   - `student_id` = studentId
   - `enrollment_id` = enrollmentId (looked up from student + class)
   - `amount` = class.fee
   - `due_date` = session.date
   - `status` = PENDING
   - `notes` = `"Auto: Session {session.date}"` (for traceability)
4. If payment creation fails, log error but don't throw (attendance save still succeeds)

**Tutor fee trigger:** Session marked COMPLETED.

```
SessionService.update(id, { status: 'COMPLETED' })
  → if previousStatus !== 'COMPLETED' and newStatus === 'COMPLETED':
    → copy class.tutor_fee to session.tutor_fee_amount
```

This is a simple field copy, not a separate service call. Done inline in the session update.

### Package Mode

**Student payment trigger:** Enrollment created.

```
EnrollmentService.create(institutionId, dto)
  → create enrollment (existing logic)
  → if billing_mode === 'package':
    → invoiceGenerator.generatePackagePayment({
        institutionId,
        studentId: enrollment.student_id,
        enrollmentId: enrollment.id,
        classId: enrollment.class_id,
      })
```

**generatePackagePayment logic:**
1. Check if payment already exists for this `enrollment_id` (duplicate prevention)
2. Look up `class.package_fee` (fall back to `class.fee` if null)
3. Create Payment:
   - `institution_id` = institutionId
   - `student_id` = studentId
   - `enrollment_id` = enrollmentId
   - `amount` = class.package_fee ?? class.fee
   - `due_date` = enrollment.enrolled_at + 7 days
   - `status` = PENDING
   - `notes` = `"Auto: Package enrollment"` (for traceability)
4. If payment creation fails, log error but don't throw

**Tutor fee:** Same as per-session. Tutor is always compensated per completed session regardless of student billing mode.

### Manual Mode

No auto-generation. All existing behavior preserved. The invoice generator checks billing mode and returns early if `manual`.

### Billing Mode Check Flow

```typescript
async generatePerSessionPayment(params) {
  const billing = await this.settingsService.getBilling(params.institutionId);
  if (billing.billing_mode !== 'per_session') return; // skip silently
  // ... create payment
}

async generatePackagePayment(params) {
  const billing = await this.settingsService.getBilling(params.institutionId);
  if (billing.billing_mode !== 'package') return; // skip silently
  // ... create payment
}
```

## Integration Points

### 1. Attendance Service → Per-Session Payments

**File:** `src/modules/attendance/attendance.service.ts`

After existing attendance save logic, call invoice generator for students marked PRESENT or LATE:

```typescript
// After saving attendance records
if (billing.billing_mode === 'per_session') {
  const presentStudents = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
  for (const record of presentStudents) {
    await this.invoiceGenerator.generatePerSessionPayment({
      institutionId,
      studentId: record.student_id,
      sessionId,
      classId: session.class_id,
    });
  }
}
```

### 2. Session Service → Tutor Fee Tracking

**File:** `src/modules/session/session.service.ts`

When session status changes to COMPLETED:

```typescript
// In update method
if (dto.status === 'COMPLETED' && existingSession.status !== 'COMPLETED') {
  // Copy tutor fee from class
  const sessionClass = await this.prisma.class.findUnique({
    where: { id: existingSession.class_id },
    select: { tutor_fee: true },
  });
  if (sessionClass?.tutor_fee) {
    data.tutor_fee_amount = sessionClass.tutor_fee;
  }
}
```

### 3. Enrollment Service → Package Payments

**File:** `src/modules/enrollment/enrollment.service.ts`

After creating enrollment, call invoice generator:

```typescript
// After prisma.enrollment.create()
await this.invoiceGenerator.generatePackagePayment({
  institutionId,
  studentId: enrollment.student_id,
  enrollmentId: enrollment.id,
  classId: enrollment.class_id,
});
```

## Frontend Changes

### Class Form — New Fields

**Settings.tsx is NOT affected.** Changes are in the Class management UI.

**File:** `src/pages/Classes.tsx`

Add two optional fields to the class create/edit form:
- **Package Fee (Rp)** — shown when billing mode is `package` (or always shown with a hint)
- **Tutor Fee per Session (Rp)** — always shown, for tutor compensation tracking

Both fields are optional with placeholder hints explaining their purpose.

**Class table** — optionally show tutor_fee column.

### Payment List — Auto-Generated Indicator

**File:** `src/pages/Finance/StudentPayments.tsx`

Payments with notes starting with "Auto:" get a small badge or indicator showing they were auto-generated. No functional change — just visual distinction.

### No Changes To

- Settings page (billing config already done in Phase 1)
- Dashboard (revenue calculation unchanged — still sums PAID payments)
- Tutor Payouts page (Phase 4 concern)

## Duplicate Prevention

**Per-session:** Before creating payment, check:
```sql
WHERE enrollment_id = ? AND notes LIKE 'Auto: Session %' AND notes LIKE '%{session_date}%'
```
If exists, skip.

**Package:** Before creating payment, check:
```sql
WHERE enrollment_id = ? AND notes LIKE 'Auto: Package%'
```
If exists, skip.

This is simple and sufficient. A more robust approach (dedicated `session_id` foreign key on Payment) can be added later if needed.

## Error Handling

- Auto-payment creation failures are **logged but not thrown**
- The parent operation (attendance save, enrollment create, session update) always succeeds
- Admin can always create payments manually as fallback
- No transactions wrapping the parent operation + payment creation (decoupled)

## Class DTO Changes

**File:** `src/modules/class/class.dto.ts`

Add optional fields to create/update schemas:
```typescript
package_fee: z.coerce.number().positive().optional().nullable(),
tutor_fee: z.coerce.number().positive().optional().nullable(),
```

## Module Dependencies

`InvoiceGeneratorService` needs `SettingsService`. Options:
- Import `SettingsModule` in `PaymentModule`, or
- Put `InvoiceGeneratorService` in `PaymentModule` and inject `SettingsService` via `@Inject(forwardRef(...))`

**Recommended:** Export `SettingsService` from `SettingsModule`, import `SettingsModule` in `PaymentModule`. Then export `InvoiceGeneratorService` from `PaymentModule` so `AttendanceModule` and `EnrollmentModule` can use it.

## Constraints

- No invoice numbers — deferred to Phase 5
- No recurring payment generation (subscription mode) — deferred
- Tutor fee tracking is data-only — no payout calculation yet (Phase 4)
- Auto-generated payments are identical to manual ones in structure
- Switching billing mode only affects future operations — no retroactive generation
- Duplicate prevention uses notes field pattern matching (simple, not bullet-proof)
