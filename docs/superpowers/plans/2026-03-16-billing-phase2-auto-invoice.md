# Billing Phase 2: Auto-Invoice Generation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically create Payment records when attendance is marked present/late (per-session mode) or when students enroll (package mode). Track tutor session fees on completed sessions.

**Architecture:** Add `package_fee` and `tutor_fee` columns to Class, `tutor_fee_amount` to Session. Create an `InvoiceGeneratorService` in the payment module that reads billing settings and creates payments. Hook it into attendance save (per-session) and enrollment create (package). Session completion copies tutor fee. All auto-generation is non-blocking — failures are logged, not thrown.

**Tech Stack:** NestJS, Prisma, Zod, React (Classes form update)

**Spec:** `docs/superpowers/specs/2026-03-16-billing-phase2-auto-invoice-design.md`

---

## Chunk 1: Schema Migration + Class DTO + InvoiceGeneratorService

### Task 1: Prisma Schema — Add 3 New Columns

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add package_fee and tutor_fee to Class model**

In the Class model, add after the `fee` field:

```prisma
  package_fee       Decimal?
  tutor_fee         Decimal?
```

- [ ] **Step 2: Add tutor_fee_amount to Session model**

In the Session model, add after `session_summary` (or any existing field):

```prisma
  tutor_fee_amount  Decimal?
```

- [ ] **Step 3: Push schema and regenerate**

```bash
cd sinaloka-backend && npx prisma db push && npm run prisma:generate
```

- [ ] **Step 4: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -E "class|session" | head -5
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma
git commit -m "feat(backend): add package_fee, tutor_fee to Class and tutor_fee_amount to Session"
```

---

### Task 2: Update Class DTO to Accept New Fields

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.dto.ts`

- [ ] **Step 1: Add package_fee and tutor_fee to CreateClassSchema**

Add inside the `z.object({})` of `CreateClassSchema`, before `status`:

```typescript
package_fee: z.number().min(0).optional().nullable(),
tutor_fee: z.number().min(0).optional().nullable(),
```

- [ ] **Step 2: Add to UpdateClassSchema**

Add inside the `z.object({})` of `UpdateClassSchema`:

```typescript
package_fee: z.number().min(0).optional().nullable(),
tutor_fee: z.number().min(0).optional().nullable(),
```

- [ ] **Step 3: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep class
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.dto.ts
git commit -m "feat(backend): add package_fee and tutor_fee to class DTOs"
```

---

### Task 3: Update SettingsModule to Export SettingsService

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.module.ts`

- [ ] **Step 1: Add exports array**

Change `settings.module.ts` to export the service:

```typescript
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.module.ts
git commit -m "feat(backend): export SettingsService from SettingsModule"
```

---

### Task 4: Create InvoiceGeneratorService

**Files:**
- Create: `sinaloka-backend/src/modules/payment/invoice-generator.service.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.module.ts`

- [ ] **Step 1: Create the invoice generator service**

Create `sinaloka-backend/src/modules/payment/invoice-generator.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

interface PerSessionPaymentParams {
  institutionId: string;
  studentId: string;
  sessionId: string;
  classId: string;
}

interface PackagePaymentParams {
  institutionId: string;
  studentId: string;
  enrollmentId: string;
  classId: string;
  enrolledAt: Date;
}

@Injectable()
export class InvoiceGeneratorService {
  private readonly logger = new Logger(InvoiceGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async generatePerSessionPayment(params: PerSessionPaymentParams): Promise<void> {
    try {
      const billing = await this.settingsService.getBilling(params.institutionId);
      if (billing.billing_mode !== 'per_session') return;

      // Look up the session to get the date
      const session = await this.prisma.session.findUnique({
        where: { id: params.sessionId },
        select: { date: true },
      });
      if (!session) return;

      const sessionDateStr = new Date(session.date).toISOString().split('T')[0];

      // Look up enrollment for this student + class
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          student_id: params.studentId,
          class_id: params.classId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
      if (!enrollment) return;

      // Duplicate check: payment already exists for this enrollment + session date
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: enrollment.id,
          notes: { contains: `Auto: Session ${sessionDateStr}` },
        },
      });
      if (existing) return;

      // Get class fee
      const classRecord = await this.prisma.class.findUnique({
        where: { id: params.classId },
        select: { fee: true },
      });
      if (!classRecord) return;

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: params.studentId,
          enrollment_id: enrollment.id,
          amount: classRecord.fee,
          due_date: session.date,
          status: 'PENDING',
          notes: `Auto: Session ${sessionDateStr}`,
        },
      });

      this.logger.log(`Auto-payment created for student ${params.studentId}, session ${sessionDateStr}`);
    } catch (error) {
      this.logger.error(`Failed to generate per-session payment: ${error}`);
    }
  }

  async generatePackagePayment(params: PackagePaymentParams): Promise<void> {
    try {
      const billing = await this.settingsService.getBilling(params.institutionId);
      if (billing.billing_mode !== 'package') return;

      // Duplicate check
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: params.enrollmentId,
          notes: { startsWith: 'Auto: Package' },
        },
      });
      if (existing) return;

      // Get class fee
      const classRecord = await this.prisma.class.findUnique({
        where: { id: params.classId },
        select: { fee: true, package_fee: true },
      });
      if (!classRecord) return;

      const amount = classRecord.package_fee ?? classRecord.fee;
      const dueDate = new Date(params.enrolledAt);
      dueDate.setDate(dueDate.getDate() + 7);

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: params.studentId,
          enrollment_id: params.enrollmentId,
          amount,
          due_date: dueDate,
          status: 'PENDING',
          notes: 'Auto: Package enrollment',
        },
      });

      this.logger.log(`Auto-package payment created for enrollment ${params.enrollmentId}`);
    } catch (error) {
      this.logger.error(`Failed to generate package payment: ${error}`);
    }
  }
}
```

- [ ] **Step 2: Update PaymentModule**

Update `sinaloka-backend/src/modules/payment/payment.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [PaymentController],
  providers: [PaymentService, InvoiceGeneratorService],
  exports: [PaymentService, InvoiceGeneratorService],
})
export class PaymentModule {}
```

- [ ] **Step 3: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -E "invoice|payment" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payment/
git commit -m "feat(backend): create InvoiceGeneratorService with per-session and package payment generation"
```

---

## Chunk 2: Integration Hooks — Attendance, Session, Enrollment

### Task 5: Hook Attendance Save → Per-Session Payments

**Files:**
- Modify: `sinaloka-backend/src/modules/attendance/attendance.service.ts`
- Modify: `sinaloka-backend/src/modules/attendance/attendance.module.ts`

- [ ] **Step 1: Update AttendanceModule to import PaymentModule**

In `attendance.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module.js';
import { AttendanceController } from './attendance.controller.js';
import { TutorAttendanceController } from './tutor-attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [PaymentModule],
  controllers: [AttendanceController, TutorAttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
```

- [ ] **Step 2: Inject InvoiceGeneratorService into AttendanceService**

In `attendance.service.ts`, add import and constructor injection:

```typescript
import { InvoiceGeneratorService } from '../payment/invoice-generator.service.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}
```

- [ ] **Step 3: Add per-session payment generation after batchCreate**

At the end of the `batchCreate` method, after `createMany` and before the return, add:

```typescript
    // Auto-generate per-session payments for present/late students
    const presentRecords = dto.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    );
    for (const record of presentRecords) {
      await this.invoiceGenerator.generatePerSessionPayment({
        institutionId: session.institution_id,
        studentId: record.student_id,
        sessionId: dto.session_id,
        classId: session.class_id,
      });
    }
```

- [ ] **Step 4: Also add after attendance `update` method (for status changes)**

In the `update` method, after the prisma update, add:

```typescript
    // If status changed to PRESENT or LATE, generate payment
    if (dto.status === 'PRESENT' || dto.status === 'LATE') {
      const att = await this.prisma.attendance.findUnique({
        where: { id },
        include: { session: true },
      });
      if (att) {
        await this.invoiceGenerator.generatePerSessionPayment({
          institutionId,
          studentId: att.student_id,
          sessionId: att.session_id,
          classId: att.session.class_id,
        });
      }
    }
```

Do the same for `updateByTutor` method.

- [ ] **Step 5: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep attendance
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/attendance/
git commit -m "feat(backend): hook attendance save to auto-generate per-session payments"
```

---

### Task 6: Hook Session Completion → Tutor Fee Tracking

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts`

- [ ] **Step 1: Add tutor fee copy in the `update` method**

In `session.service.ts`, in the `update` method (line ~154), before the prisma update call, add logic to copy tutor fee when status becomes COMPLETED:

```typescript
  async update(institutionId: string, id: string, dto: UpdateSessionDto) {
    const existing = await this.findOne(institutionId, id);

    const data: any = { ...dto };

    // Copy tutor fee when session is marked COMPLETED
    if (dto.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      const sessionClass = await this.prisma.class.findUnique({
        where: { id: existing.class?.id ?? '' },
        select: { tutor_fee: true },
      });
      if (sessionClass?.tutor_fee) {
        data.tutor_fee_amount = sessionClass.tutor_fee;
      }
    }

    const session = await this.prisma.session.update({
      where: { id, institution_id: institutionId },
      data,
      include: this.sessionInclude,
    });

    return this.flattenSession(session);
  }
```

- [ ] **Step 2: Also add to `completeSession` method**

In the `completeSession` method (line ~478), add tutor fee copy before the update:

```typescript
    // Copy tutor fee from class
    const tutorFeeData: any = {};
    const classForFee = await this.prisma.class.findUnique({
      where: { id: session.class_id },
      select: { tutor_fee: true },
    });
    if (classForFee?.tutor_fee) {
      tutorFeeData.tutor_fee_amount = classForFee.tutor_fee;
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary ?? null,
        ...tutorFeeData,
      },
      include: this.sessionInclude,
    });
```

- [ ] **Step 3: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep session
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "feat(backend): copy tutor_fee to session on completion"
```

---

### Task 7: Hook Enrollment Create → Package Payments

**Files:**
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.service.ts`
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.module.ts`

- [ ] **Step 1: Update EnrollmentModule to import PaymentModule**

In `enrollment.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module.js';
import { EnrollmentService } from './enrollment.service.js';
import { EnrollmentController } from './enrollment.controller.js';

@Module({
  imports: [PaymentModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
```

- [ ] **Step 2: Inject InvoiceGeneratorService into EnrollmentService**

```typescript
import { InvoiceGeneratorService } from '../payment/invoice-generator.service.js';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}
```

- [ ] **Step 3: Add package payment generation after enrollment create**

In the `create` method, after `prisma.enrollment.create()` and before the return, add:

```typescript
    const enrollment = await this.prisma.enrollment.create({
      data: { ... },
      include: { ... },
    });

    // Auto-generate package payment
    await this.invoiceGenerator.generatePackagePayment({
      institutionId,
      studentId: dto.student_id,
      enrollmentId: enrollment.id,
      classId: dto.class_id,
      enrolledAt: enrollment.enrolled_at,
    });

    return enrollment;
```

- [ ] **Step 4: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep enrollment
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/enrollment/
git commit -m "feat(backend): hook enrollment create to auto-generate package payments"
```

---

## Chunk 3: Frontend — Class Form + Payment Indicator

### Task 8: Add package_fee and tutor_fee Fields to Classes.tsx

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

- [ ] **Step 1: Read Classes.tsx**

Read the file to find the class create/edit form.

- [ ] **Step 2: Add form state for new fields**

Add state variables:
```typescript
const [formPackageFee, setFormPackageFee] = useState('');
const [formTutorFee, setFormTutorFee] = useState('');
```

Populate in edit handler from class data.

- [ ] **Step 3: Add form fields in the modal**

After the "Fee per Session (Rp)" field, add:

```tsx
<div className="space-y-1.5">
  <Label>{t('classes.form.packageFee')}</Label>
  <Input
    type="number"
    placeholder="700000"
    value={formPackageFee}
    onChange={(e) => setFormPackageFee(e.target.value)}
  />
</div>
<div className="space-y-1.5">
  <Label>{t('classes.form.tutorFee')}</Label>
  <Input
    type="number"
    placeholder="200000"
    value={formTutorFee}
    onChange={(e) => setFormTutorFee(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Include in form submission payload**

Add to the create/update payload:
```typescript
package_fee: formPackageFee ? Number(formPackageFee) : null,
tutor_fee: formTutorFee ? Number(formTutorFee) : null,
```

- [ ] **Step 5: Add translation keys**

Add to `id.json` under `classes.form`:
```json
"packageFee": "Biaya Paket Bulanan (Rp)",
"tutorFee": "Biaya Tutor per Sesi (Rp)"
```

Add to `en.json` under `classes.form`:
```json
"packageFee": "Monthly Package Fee (Rp)",
"tutorFee": "Tutor Fee per Session (Rp)"
```

- [ ] **Step 6: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): add package_fee and tutor_fee fields to class form"
```

---

### Task 9: Add Auto-Generated Badge to StudentPayments.tsx

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`

- [ ] **Step 1: Read the file to find where payment notes are rendered**

- [ ] **Step 2: Add auto-generated indicator**

Where payment rows are rendered, check if `payment.notes?.startsWith('Auto:')` and show a small badge:

```tsx
{payment.notes?.startsWith('Auto:') && (
  <Badge variant="outline" className="text-[9px] ml-2">Auto</Badge>
)}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/StudentPayments.tsx
git commit -m "feat(platform): show auto-generated indicator on payments"
```

---

## Chunk 4: Final Verification

### Task 10: Full Build + Integration Test

- [ ] **Step 1: Backend type check**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -E "invoice|payment|attendance|session|enrollment|class" | head -10
```

Expected: No related errors (pre-existing spec test errors are OK).

- [ ] **Step 2: Frontend build**

```bash
cd sinaloka-platform && npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: End-to-end smoke test — Manual mode (no change)**

1. Ensure institution billing mode is `manual` (default)
2. Create enrollment → verify NO auto-payment created
3. Save attendance → verify NO auto-payment created
4. Complete session → verify NO tutor_fee_amount set

- [ ] **Step 4: Smoke test — Package mode**

1. Set billing mode to `package` in Settings > Billing
2. Set a class's package_fee to 700000
3. Create enrollment for a student in that class
4. Check Finance > Student Payments → auto-payment should appear with amount 700000, notes "Auto: Package enrollment"

- [ ] **Step 5: Smoke test — Per-session mode**

1. Set billing mode to `per_session` in Settings > Billing
2. Set a class's fee to 100000 and tutor_fee to 200000
3. Create a session for that class
4. Save attendance marking a student as PRESENT
5. Check Finance > Student Payments → auto-payment should appear with amount 100000, notes "Auto: Session {date}"
6. Mark session as COMPLETED → check session has tutor_fee_amount = 200000

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Billing Phase 2 — auto-invoice generation for per-session and package modes"
```
