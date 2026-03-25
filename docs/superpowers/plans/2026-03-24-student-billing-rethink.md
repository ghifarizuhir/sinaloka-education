# Student Billing Architecture Rethink — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify student billing from 4 modes to 2 (PER_SESSION, MONTHLY_FIXED), move billing control from SuperAdmin to Admin via onboarding wizard, and clean up settings hierarchy.

**Architecture:** Add `billing_mode` as a proper Prisma enum on Institution (not JSON). Admin selects mode during onboarding (locked after). Remove package_fee from Class. Add billing_period to Payment for robust duplicate detection. New cron job for monthly_fixed payment generation.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, Vite, TailwindCSS v4, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-24-student-billing-architecture-rethink-design.md`

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add BillingMode enum after TutorFeeMode enum (line 46)**

```prisma
enum BillingMode {
  PER_SESSION
  MONTHLY_FIXED
}
```

- [ ] **Step 2: Add fields to Institution model (after `default_language` field, ~line 162)**

```prisma
  billing_mode          BillingMode?
  onboarding_completed  Boolean  @default(false)
```

- [ ] **Step 3: Add billing_period to Payment model (after `notes` field, ~line 630)**

```prisma
  billing_period  String?
```

And add unique constraint inside Payment model (before `@@map`):

```prisma
  @@unique([enrollment_id, billing_period])
```

- [ ] **Step 4: Remove package_fee from Class model (line 508)**

Delete the line:
```prisma
  package_fee         Decimal?
```

- [ ] **Step 5: Run migration**

```bash
cd sinaloka-backend
npx prisma migrate dev --name simplify-billing-modes
```

- [ ] **Step 6: Regenerate Prisma client**

```bash
npm run prisma:generate
```

- [ ] **Step 7: Verify migration**

```bash
npx prisma migrate status
```
Expected: All migrations applied.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(backend): add BillingMode enum, billing_period, remove package_fee

- Add BillingMode enum (PER_SESSION, MONTHLY_FIXED)
- Add billing_mode and onboarding_completed to Institution
- Add billing_period to Payment with unique constraint
- Remove package_fee from Class"
```

---

## Task 2: Backend — Remove package_fee from Class Module

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.dto.ts:46,79`
- Modify: `sinaloka-backend/src/modules/class/class.service.ts:59,90-91,174,216-218,292,322,339-340`
- Modify: `sinaloka-backend/src/modules/class/class.service.spec.ts:50,176,187-228,285,370,410`
- Modify: `sinaloka-backend/src/modules/academic-year/academic-year.service.ts:327`
- Modify: `sinaloka-backend/src/modules/academic-year/academic-year.service.spec.ts:361`

- [ ] **Step 1: Remove package_fee from CreateClassSchema in class.dto.ts**

Remove line 46: `package_fee: z.number().min(0).optional().nullable(),`

- [ ] **Step 2: Remove package_fee from UpdateClassSchema in class.dto.ts**

Remove line 79: `package_fee: z.number().min(0).optional().nullable(),`

- [ ] **Step 3: Remove package_fee from class.service.ts create method**

In `create()` (~line 59), remove: `package_fee: dto.package_fee ?? null,`

In the return mapping (~lines 90-91), remove the `package_fee` conversion line:
```typescript
package_fee: record.package_fee != null ? Number(record.package_fee) : null,
```

- [ ] **Step 4: Remove package_fee from class.service.ts findAll method**

In `findAll()` (~line 174), remove the `package_fee` conversion in the map function.

- [ ] **Step 5: Remove package_fee from class.service.ts findOne method**

In `findOne()` (~lines 216-218), remove the `package_fee` conversion.

- [ ] **Step 6: Remove package_fee from class.service.ts update method**

In `update()`:
- Remove `package_fee` from destructuring (~line 292)
- Remove `...(package_fee !== undefined && { package_fee }),` (~line 322)
- Remove `package_fee` conversion in return (~lines 339-340)

- [ ] **Step 7: Remove package_fee from academic-year.service.ts**

In roll-over logic (~line 327), remove: `package_fee: sourceClass.package_fee,`

- [ ] **Step 8: Update class.service.spec.ts**

- Remove `package_fee: '700000'` from mock data (~line 50)
- Remove all `package_fee` assertions throughout the test file
- Remove the dedicated test `'should pass package_fee and tutor_fee to prisma create'` (~lines 187-228) — replace with a test that only checks `tutor_fee`

- [ ] **Step 9: Update academic-year.service.spec.ts**

- Remove `package_fee: '700000'` from mock data (~line 361)

- [ ] **Step 10: Run tests**

```bash
cd sinaloka-backend
npm run test -- --testPathPattern="class|academic-year" --ci
```
Expected: All tests pass.

- [ ] **Step 11: Commit**

```bash
git add sinaloka-backend/src/modules/class/ sinaloka-backend/src/modules/academic-year/
git commit -m "refactor(backend): remove package_fee from class module

Package billing mode eliminated — fee field now serves both
PER_SESSION (rate per session) and MONTHLY_FIXED (monthly fee)."
```

---

## Task 3: Backend — Simplify InvoiceGeneratorService & Settings

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/invoice-generator.service.ts`
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts:18`
- Modify: `sinaloka-backend/src/modules/settings/settings.dto.ts:25-27`
- Modify: `sinaloka-backend/src/modules/settings/settings.service.spec.ts:97,109`
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.service.ts:143-150,412-419`
- Modify: `sinaloka-backend/src/modules/enrollment/enrollment.service.spec.ts:22-24`
- Modify: `sinaloka-backend/src/modules/payment/payment.controller.ts:66-71`

- [ ] **Step 1: Rewrite invoice-generator.service.ts**

Replace the entire file with:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

interface PerSessionPaymentParams {
  institutionId: string;
  studentId: string;
  sessionId: string;
  classId: string;
}

interface MonthlyPaymentParams {
  institutionId: string;
}

interface MidMonthEnrollmentParams {
  institutionId: string;
  studentId: string;
  enrollmentId: string;
  classId: string;
  enrolledAt: Date;
}

@Injectable()
export class InvoiceGeneratorService {
  private readonly logger = new Logger(InvoiceGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePerSessionPayment(
    params: PerSessionPaymentParams,
  ): Promise<void> {
    try {
      const institution = await this.prisma.institution.findUnique({
        where: { id: params.institutionId },
        select: { billing_mode: true },
      });
      if (institution?.billing_mode !== 'PER_SESSION') return;

      const session = await this.prisma.session.findFirst({
        where: { id: params.sessionId, institution_id: params.institutionId },
        select: { date: true },
      });
      if (!session) return;

      const sessionDateStr = new Date(session.date)
        .toISOString()
        .split('T')[0];

      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          student_id: params.studentId,
          class_id: params.classId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
      if (!enrollment) return;

      // Per-session uses notes-based dedup (billing_period is null).
      // Note: @@unique([enrollment_id, billing_period]) does NOT protect
      // against duplicates when billing_period is NULL (PostgreSQL: NULL != NULL).
      // This is intentional — per-session dedup uses notes; monthly uses billing_period.
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: enrollment.id,
          notes: { contains: `Auto: Session ${sessionDateStr}` },
        },
      });
      if (existing) return;

      const classRecord = await this.prisma.class.findFirst({
        where: { id: params.classId, institution_id: params.institutionId },
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

      this.logger.log(
        `Per-session payment created: student=${params.studentId}, session=${sessionDateStr}`,
      );
    } catch (error) {
      this.logger.error(`Failed to generate per-session payment: ${error}`);
    }
  }

  async generateMonthlyPayments(
    params: MonthlyPaymentParams,
  ): Promise<{ created: number }> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: params.institutionId },
      select: { billing_mode: true },
    });
    if (institution?.billing_mode !== 'MONTHLY_FIXED') return { created: 0 };

    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: params.institutionId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { class: { select: { fee: true } } },
    });

    let created = 0;

    for (const enrollment of enrollments) {
      try {
        await this.prisma.payment.create({
          data: {
            institution_id: params.institutionId,
            student_id: enrollment.student_id,
            enrollment_id: enrollment.id,
            amount: enrollment.class.fee,
            due_date: dueDate,
            billing_period: billingPeriod,
            status: 'PENDING',
            notes: `Auto: Monthly ${billingPeriod}`,
          },
        });
        created++;
      } catch (error: any) {
        // Unique constraint violation = duplicate, skip silently
        if (error?.code === 'P2002') continue;
        this.logger.error(
          `Failed to create monthly payment for enrollment ${enrollment.id}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Monthly payments for ${params.institutionId}: ${created} created for ${billingPeriod}`,
    );
    return { created };
  }

  async generateMidMonthEnrollmentPayment(
    params: MidMonthEnrollmentParams,
  ): Promise<void> {
    try {
      const institution = await this.prisma.institution.findUnique({
        where: { id: params.institutionId },
        select: { billing_mode: true },
      });
      if (institution?.billing_mode !== 'MONTHLY_FIXED') return;

      const now = new Date(params.enrolledAt);
      const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const classRecord = await this.prisma.class.findFirst({
        where: { id: params.classId, institution_id: params.institutionId },
        select: { fee: true },
      });
      if (!classRecord) return;

      const dueDate = new Date(params.enrolledAt);
      dueDate.setDate(dueDate.getDate() + 7); // 7-day grace period

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: params.studentId,
          enrollment_id: params.enrollmentId,
          amount: classRecord.fee,
          due_date: dueDate,
          billing_period: billingPeriod,
          status: 'PENDING',
          notes: `Auto: Monthly ${billingPeriod} (mid-month enrollment)`,
        },
      });

      this.logger.log(
        `Mid-month enrollment payment created: enrollment=${params.enrollmentId}`,
      );
    } catch (error: any) {
      if (error?.code === 'P2002') return; // duplicate
      this.logger.error(
        `Failed to generate mid-month enrollment payment: ${error}`,
      );
    }
  }
}
```

- [ ] **Step 2: Remove billing_mode from BILLING_DEFAULTS in settings.service.ts**

In `sinaloka-backend/src/modules/settings/settings.service.ts` line 18, remove:
```typescript
  billing_mode: 'manual' as const,
```

- [ ] **Step 3: Remove billing_mode from settings.dto.ts**

In `sinaloka-backend/src/modules/settings/settings.dto.ts` lines 25-27, remove:
```typescript
  billing_mode: z
    .enum(['manual', 'per_session', 'package', 'subscription'])
    .optional(),
```

- [ ] **Step 4: Update settings.service.spec.ts**

Replace `billing: { billing_mode: 'manual' }` with `billing: { invoice_prefix: 'TEST-' }` in test mocks (~lines 97, 109).

- [ ] **Step 5: Update enrollment.service.ts — remove generatePackagePayment calls**

In `sinaloka-backend/src/modules/enrollment/enrollment.service.ts`:

At ~lines 143-150, replace `generatePackagePayment` call with `generateMidMonthEnrollmentPayment`:
```typescript
await this.invoiceGenerator.generateMidMonthEnrollmentPayment({
  institutionId: tenantId,
  studentId: dto.student_id,
  enrollmentId: enrollment.id,
  classId: dto.class_id,
  enrolledAt: new Date(),
});
```

At ~lines 412-419 (importFromCsv), apply the same replacement.

- [ ] **Step 6: Update enrollment.service.spec.ts**

Replace `generatePackagePayment: jest.fn()` mock (~line 23) with:
```typescript
generatePerSessionPayment: jest.fn(),
generateMidMonthEnrollmentPayment: jest.fn(),
```

- [ ] **Step 7: Update payment.controller.ts — replace generate-subscriptions endpoint**

In `sinaloka-backend/src/modules/payment/payment.controller.ts` (~lines 66-71), replace:
```typescript
@Post('generate-subscriptions')
generateSubscriptions(@InstitutionId() institutionId: string) {
  return this.invoiceGeneratorService.generateSubscriptionPayments({
    institutionId,
  });
}
```

With:
```typescript
@Post('generate-monthly')
generateMonthly(@InstitutionId() institutionId: string) {
  return this.invoiceGeneratorService.generateMonthlyPayments({
    institutionId,
  });
}
```

- [ ] **Step 8: Keep SettingsModule in payment.module.ts**

`PaymentService` still depends on `SettingsService` (line 209: `settingsService.getBilling()` for overdue summary threshold). Keep `SettingsModule` import in `payment.module.ts`. Only `InvoiceGeneratorService` no longer needs it — no module-level change needed.

- [ ] **Step 9: Run tests**

```bash
cd sinaloka-backend
npm run test -- --testPathPattern="payment|enrollment|settings" --ci
```
Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add sinaloka-backend/src/modules/payment/ sinaloka-backend/src/modules/settings/ sinaloka-backend/src/modules/enrollment/
git commit -m "refactor(backend): simplify billing to PER_SESSION and MONTHLY_FIXED

- Rewrite InvoiceGeneratorService: remove package/subscription, add monthly
- Read billing_mode from Institution enum field instead of JSON settings
- Remove billing_mode from settings DTO and defaults
- Replace generatePackagePayment with generateMidMonthEnrollmentPayment
- Replace generate-subscriptions endpoint with generate-monthly"
```

---

## Task 4: Backend — Monthly Payment Cron Job

**Files:**
- Create: `sinaloka-backend/src/modules/payment/monthly-payment.cron.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.module.ts`

- [ ] **Step 1: Create monthly-payment.cron.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';

@Injectable()
export class MonthlyPaymentCron {
  private readonly logger = new Logger(MonthlyPaymentCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}

  // Runs 1st of every month at 00:00 UTC = 07:00 WIB
  @Cron('0 0 1 * *')
  async generateMonthlyPayments() {
    this.logger.log('Starting monthly payment generation...');

    const institutions = await this.prisma.institution.findMany({
      where: { billing_mode: 'MONTHLY_FIXED', is_active: true },
      select: { id: true, name: true },
    });

    let totalCreated = 0;

    for (const institution of institutions) {
      try {
        const result = await this.invoiceGenerator.generateMonthlyPayments({
          institutionId: institution.id,
        });
        totalCreated += result.created;
        this.logger.log(
          `${institution.name}: ${result.created} payments created`,
        );
      } catch (error) {
        this.logger.error(
          `Failed for ${institution.name} (${institution.id}): ${error}`,
        );
      }
    }

    this.logger.log(
      `Monthly payment generation complete. Total: ${totalCreated} payments across ${institutions.length} institutions.`,
    );
  }
}
```

- [ ] **Step 2: Register cron in payment.module.ts**

Add `MonthlyPaymentCron` to providers:

```typescript
import { MonthlyPaymentCron } from './monthly-payment.cron.js';

// In providers array, add:
MonthlyPaymentCron,
```

- [ ] **Step 3: Run build to verify**

```bash
cd sinaloka-backend
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payment/monthly-payment.cron.ts sinaloka-backend/src/modules/payment/payment.module.ts
git commit -m "feat(backend): add monthly payment cron job

Runs 1st of every month at 07:00 WIB. Generates PENDING payments
for all MONTHLY_FIXED institutions with active enrollments.
Uses billing_period unique constraint for idempotent re-runs."
```

---

## Task 5: Backend — Onboarding Module

**Files:**
- Create: `sinaloka-backend/src/modules/onboarding/onboarding.module.ts`
- Create: `sinaloka-backend/src/modules/onboarding/onboarding.controller.ts`
- Create: `sinaloka-backend/src/modules/onboarding/onboarding.service.ts`
- Create: `sinaloka-backend/src/modules/onboarding/onboarding.dto.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create onboarding.dto.ts**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SetBillingModeSchema = z.object({
  billing_mode: z.enum(['PER_SESSION', 'MONTHLY_FIXED']),
});

export type SetBillingModeDto = z.infer<typeof SetBillingModeSchema>;

export const CompleteOnboardingSchema = z.object({});

export type CompleteOnboardingDto = z.infer<typeof CompleteOnboardingSchema>;
```

- [ ] **Step 2: Create onboarding.service.ts**

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { SetBillingModeDto } from './onboarding.dto.js';
import type { BillingMode } from '../../../generated/prisma/client.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        billing_mode: true,
        onboarding_completed: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return {
      billing_mode: institution.billing_mode,
      onboarding_completed: institution.onboarding_completed,
      steps: {
        profile: !!(institution.name && institution.phone),
        billing: !!institution.billing_mode,
      },
    };
  }

  async setBillingMode(institutionId: string, dto: SetBillingModeDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { billing_mode: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    if (institution.billing_mode !== null) {
      throw new BadRequestException(
        'Billing mode already set. Contact support to change.',
      );
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { billing_mode: dto.billing_mode as BillingMode },
      select: { billing_mode: true, onboarding_completed: true },
    });
  }

  async complete(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { billing_mode: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    if (!institution.billing_mode) {
      throw new BadRequestException(
        'Billing mode must be set before completing onboarding.',
      );
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { onboarding_completed: true },
      select: { onboarding_completed: true },
    });
  }
}
```

- [ ] **Step 3: Create onboarding.controller.ts**

```typescript
import { Controller, Get, Post, Body, UsePipes } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OnboardingService } from './onboarding.service.js';
import { SetBillingModeSchema } from './onboarding.dto.js';
import type { SetBillingModeDto } from './onboarding.dto.js';

@Controller('onboarding')
@Roles(Role.ADMIN)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  getStatus(@InstitutionId() institutionId: string) {
    return this.onboardingService.getStatus(institutionId);
  }

  @Post('billing-mode')
  @UsePipes(new ZodValidationPipe(SetBillingModeSchema))
  setBillingMode(
    @InstitutionId() institutionId: string,
    @Body() dto: SetBillingModeDto,
  ) {
    return this.onboardingService.setBillingMode(institutionId, dto);
  }

  @Post('complete')
  complete(@InstitutionId() institutionId: string) {
    return this.onboardingService.complete(institutionId);
  }
}
```

- [ ] **Step 4: Create onboarding.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
```

- [ ] **Step 5: Register OnboardingModule in app.module.ts**

Add import and register in the imports array:
```typescript
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';

// In imports array, add after AcademicYearModule:
OnboardingModule,
```

- [ ] **Step 6: Run build**

```bash
cd sinaloka-backend
npm run build
```
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-backend/src/modules/onboarding/ sinaloka-backend/src/app.module.ts
git commit -m "feat(backend): add onboarding module with billing mode selection

- GET /api/onboarding/status — check onboarding progress
- POST /api/onboarding/billing-mode — set billing mode (locked after)
- POST /api/onboarding/complete — mark onboarding as done
Admin only. Billing mode is immutable after first set."
```

---

## Task 6: Backend — SuperAdmin Billing Mode Override

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.controller.ts`
- Modify: `sinaloka-backend/src/modules/institution/institution.service.ts`

- [ ] **Step 1: Add billing mode override endpoint to institution.controller.ts**

Add after the `update` method:

```typescript
@Patch(':id/billing-mode')
async overrideBillingMode(
  @Param('id') id: string,
  @Body(new ZodValidationPipe(z.object({
    billing_mode: z.enum(['PER_SESSION', 'MONTHLY_FIXED']),
  })))
  dto: { billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED' },
) {
  return this.institutionService.overrideBillingMode(id, dto.billing_mode);
}
```

Add `z` to imports:
```typescript
import { z } from 'zod';
```

- [ ] **Step 2: Add overrideBillingMode to institution.service.ts**

```typescript
async overrideBillingMode(id: string, billingMode: string) {
  const institution = await this.prisma.institution.findUnique({
    where: { id },
  });
  if (!institution) {
    throw new NotFoundException('Institution not found');
  }

  return this.prisma.institution.update({
    where: { id },
    data: { billing_mode: billingMode as any },
    select: { id: true, name: true, billing_mode: true },
  });
}
```

Add `NotFoundException` to imports if not already present.

- [ ] **Step 3: Run build**

```bash
cd sinaloka-backend
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/institution/
git commit -m "feat(backend): add SuperAdmin billing mode override endpoint

PATCH /api/admin/institutions/:id/billing-mode
SUPER_ADMIN only. Used for edge cases when admin needs mode change."
```

---

## Task 7: Backend — Guard Class Creation Without Billing Mode

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.ts`

- [ ] **Step 1: Add billing mode check at start of create method**

At the beginning of the `create()` method in class.service.ts, add:

```typescript
// Guard: billing mode must be set before creating classes
const institution = await this.prisma.institution.findUnique({
  where: { id: tenantId },
  select: { billing_mode: true },
});
if (!institution?.billing_mode) {
  throw new BadRequestException(
    'Billing mode must be configured before creating classes. Complete onboarding first.',
  );
}
```

Add `BadRequestException` to the `@nestjs/common` import.

- [ ] **Step 2: Update class.service.spec.ts — mock institution query**

In class create tests, add a mock for the new `prisma.institution.findUnique` call:

```typescript
mockPrisma.institution.findUnique.mockResolvedValue({ billing_mode: 'PER_SESSION' });
```

Add this before each `create` test that calls `service.create()`.

- [ ] **Step 3: Run tests**

```bash
cd sinaloka-backend
npm run test -- --testPathPattern="class" --ci
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.service.ts sinaloka-backend/src/modules/class/class.service.spec.ts
git commit -m "feat(backend): guard class creation when billing mode not set

Returns 400 if institution.billing_mode is null, prompting admin
to complete onboarding first."
```

---

## Task 8: Backend — Full Build & Test Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd sinaloka-backend
npm run test -- --ci
```
Expected: All tests pass.

- [ ] **Step 2: Run backend build**

```bash
cd sinaloka-backend
npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Run lint**

```bash
cd sinaloka-backend
npm run lint
```
Expected: No errors.

---

## Task 9: Backend — Update Auth /me Endpoint to Include Onboarding Fields

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.service.ts` (or wherever `/me` returns user profile)

> **IMPORTANT:** This task MUST be done before any frontend tasks. Frontend relies on `user.institution.billing_mode` and `user.institution.onboarding_completed` from the `/me` response.

- [ ] **Step 1: Find and update the /me endpoint response**

The `getMe` or `profile` endpoint needs to include `billing_mode` and `onboarding_completed` in the institution object. Find the query that returns the user profile with institution data and add these fields to the `select`:

```typescript
institution: {
  select: {
    id: true,
    name: true,
    slug: true,
    logo_url: true,
    timezone: true,
    default_language: true,
    billing_mode: true,           // ADD
    onboarding_completed: true,   // ADD
  },
},
```

- [ ] **Step 2: Run build**

```bash
cd sinaloka-backend
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/auth/
git commit -m "feat(backend): include onboarding fields in /me response

Add billing_mode and onboarding_completed to institution object
in user profile response. Used by frontend for onboarding redirect."
```

---

## Task 10: Frontend — Update Types

**Files:**
- Modify: `sinaloka-platform/src/types/class.ts:19,42`
- Modify: `sinaloka-platform/src/types/settings.ts:26-28,36-38`
- Create: `sinaloka-platform/src/types/onboarding.ts`

- [ ] **Step 1: Remove package_fee from class types**

In `sinaloka-platform/src/types/class.ts`:

Remove line 19: `package_fee: number | null;` from `Class` interface.
Remove line 42: `package_fee?: number | null;` from `CreateClassDto`.

- [ ] **Step 2: Update billing settings types**

In `sinaloka-platform/src/types/settings.ts`:

Replace `BillingSettings` interface (lines 26-34):
```typescript
export interface BillingSettings {
  currency: string;
  invoice_prefix: string;
  late_payment_auto_lock: boolean;
  late_payment_threshold: number;
  expense_categories: string[];
  bank_accounts: BankAccount[];
}
```

Replace `UpdateBillingSettingsDto` interface (lines 36-44):
```typescript
export interface UpdateBillingSettingsDto {
  currency?: string;
  invoice_prefix?: string;
  late_payment_auto_lock?: boolean;
  late_payment_threshold?: number;
  expense_categories?: string[];
  bank_accounts?: BankAccount[];
}
```

- [ ] **Step 3: Add User type fields for onboarding**

In `sinaloka-platform/src/types/auth.ts`, add to the `institution` object inside `User` interface:

```typescript
    billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED' | null;
    onboarding_completed: boolean;
```

- [ ] **Step 4: Create onboarding types**

Create `sinaloka-platform/src/types/onboarding.ts`:

```typescript
export interface OnboardingStatus {
  billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED' | null;
  onboarding_completed: boolean;
  steps: {
    profile: boolean;
    billing: boolean;
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/
git commit -m "refactor(platform): update types for billing rethink

- Remove package_fee from class types
- Remove billing_mode from BillingSettings (now on Institution)
- Add onboarding_completed and billing_mode to User.institution
- Add onboarding types"
```

---

## Task 11: Frontend — Update Class Form (remove package_fee, dynamic labels)

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx`
- Modify: `sinaloka-platform/src/pages/Classes/useClassesPage.ts`

- [ ] **Step 1: Update ClassFormModal.tsx**

Remove the `package_fee` input section (~lines 266-276, the conditional block `{billingMode === 'package' && (...)}`).

Update the fee label logic (~lines 249-253) to use the new billing modes:
```typescript
const feeLabel = billingMode === 'PER_SESSION' ? 'Tarif per sesi' : 'Biaya bulanan';
const feeHelper = billingMode === 'PER_SESSION'
  ? 'Siswa ditagih nominal ini setiap hadir di sesi kelas'
  : 'Siswa ditagih nominal ini setiap awal bulan';
```

Remove `formPackageFee` prop and any references to it.

- [ ] **Step 2: Update useClassesPage.ts**

Update billing mode source (~line 81):
```typescript
const billingMode = user?.institution?.billing_mode ?? 'PER_SESSION';
```

Remove `formPackageFee` state and all references:
- Remove `setFormPackageFee` (~line 159)
- Remove `package_fee` from submit payload (~line 220)
- Remove `formPackageFee` from exported state (~line 381)

- [ ] **Step 3: Run frontend type check**

```bash
cd sinaloka-platform
npm run lint
```
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Classes/
git commit -m "refactor(platform): remove package_fee from class form, dynamic fee labels

Fee label now reads from institution.billing_mode:
- PER_SESSION: 'Tarif per sesi'
- MONTHLY_FIXED: 'Biaya bulanan'"
```

---

## Task 12: Frontend — Onboarding Page

**Files:**
- Create: `sinaloka-platform/src/pages/Onboarding/index.tsx`
- Create: `sinaloka-platform/src/services/onboarding.service.ts`
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create onboarding service**

Create `sinaloka-platform/src/services/onboarding.service.ts`:

```typescript
import api from '@/src/lib/api';
import type { OnboardingStatus } from '@/src/types/onboarding';

export const onboardingService = {
  getStatus: () => api.get<OnboardingStatus>('/api/onboarding/status').then((r) => r.data),
  setBillingMode: (billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED') =>
    api.post('/api/onboarding/billing-mode', { billing_mode }).then((r) => r.data),
  complete: () => api.post('/api/onboarding/complete').then((r) => r.data),
};
```

- [ ] **Step 2: Create Onboarding page**

Create `sinaloka-platform/src/pages/Onboarding/index.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Receipt, CalendarDays, ArrowRight, Check } from 'lucide-react';
import { onboardingService } from '@/src/services/onboarding.service';
import { cn } from '@/src/lib/utils';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

const BILLING_OPTIONS = [
  {
    value: 'PER_SESSION' as BillingMode,
    icon: Receipt,
    title: 'Per Sesi',
    description: 'Siswa ditagih setiap kali hadir di sesi kelas',
    details: [
      'Cocok untuk les privat dan bimbel fleksibel',
      'Tagihan otomatis dibuat saat absensi dicatat',
      'Nominal diatur per kelas',
    ],
  },
  {
    value: 'MONTHLY_FIXED' as BillingMode,
    icon: CalendarDays,
    title: 'Bulanan Tetap',
    description: 'Siswa bayar biaya tetap per bulan',
    details: [
      'Cocok untuk bimbel reguler dan program intensif',
      'Tagihan otomatis dibuat setiap awal bulan',
      'Nominal diatur per kelas',
    ],
  },
] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<BillingMode | null>(null);

  const setBillingMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await onboardingService.setBillingMode(selected);
      await onboardingService.complete();
    },
    onSuccess: () => {
      toast.success('Setup selesai!');
      window.location.href = '/'; // navigate + reload to refresh user profile
    },
    onError: () => {
      toast.error('Gagal menyimpan. Silakan coba lagi.');
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Selamat datang!
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Bagaimana cara kamu menagih siswa?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BILLING_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={cn(
                  'relative p-6 rounded-xl border-2 text-left transition-all',
                  'hover:border-zinc-400 dark:hover:border-zinc-500',
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50',
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white dark:text-zinc-900" />
                  </div>
                )}
                <Icon className="w-8 h-8 text-zinc-700 dark:text-zinc-300 mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {option.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </p>
                <ul className="mt-3 space-y-1">
                  {option.details.map((detail) => (
                    <li key={detail} className="text-xs text-zinc-400 dark:text-zinc-500 flex items-start gap-1.5">
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={!selected || setBillingMutation.isPending}
            onClick={() => setBillingMutation.mutate()}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
              selected
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
            )}
          >
            {setBillingMutation.isPending ? 'Menyimpan...' : 'Lanjutkan'}
            {!setBillingMutation.isPending && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Mode billing tidak dapat diubah setelah dipilih. Hubungi support jika perlu mengubah.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add onboarding route to App.tsx**

Add import at top:
```typescript
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
```

Add route after the `/register` route and before the `<Route path="/super"` line:
```tsx
<Route path="/onboarding" element={
  <React.Suspense fallback={
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
    </div>
  }>
    <Onboarding />
  </React.Suspense>
} />
```

- [ ] **Step 4: Add onboarding redirect in ProtectedRoute.tsx**

In `ProtectedRoute.tsx`, after the `isAuthenticated` check, add onboarding redirect:

```typescript
// After the SUPER_ADMIN redirect block (line 33):
if (user?.role === 'ADMIN' && user?.institution && !user.institution.onboarding_completed) {
  return <Navigate to="/onboarding" replace />;
}
```

- [ ] **Step 5: Run frontend type check and build**

```bash
cd sinaloka-platform
npm run lint && npm run build
```
Expected: Both pass.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Onboarding/ sinaloka-platform/src/services/onboarding.service.ts sinaloka-platform/src/App.tsx sinaloka-platform/src/components/ProtectedRoute.tsx
git commit -m "feat(platform): add onboarding wizard with billing mode selection

- New /onboarding page with two-card billing mode picker
- ProtectedRoute redirects admin to onboarding if not completed
- Billing mode locked after selection
- Onboarding service for API calls"
```

---

## Task 13: Frontend — Update Admin Billing Settings Tab

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/tabs/BillingTab.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/useSettingsPage.ts`

- [ ] **Step 1: Add billing mode info card to BillingTab.tsx**

At the top of the BillingTab component, before the existing expense categories section, add a read-only billing mode display:

```tsx
{/* Billing Mode — read-only */}
<div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 mb-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Mode Billing
      </p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {billingMode === 'PER_SESSION' ? 'Per Sesi' : 'Bulanan Tetap'}
      </p>
    </div>
    <span className="text-xs text-zinc-400 dark:text-zinc-500">
      Ditetapkan saat setup awal
    </span>
  </div>
</div>
```

The `billingMode` value should come from `user.institution.billing_mode` (via auth context or settings page hook).

- [ ] **Step 2: Add late payment settings to BillingTab.tsx**

Add after bank accounts section:

```tsx
{/* Late Payment Settings */}
<div className="space-y-4">
  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
    Keterlambatan Pembayaran
  </h3>
  <label className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={latePaymentAutoLock}
      onChange={(e) => setLatePaymentAutoLock(e.target.checked)}
      className="rounded border-zinc-300 dark:border-zinc-600"
    />
    <span className="text-sm text-zinc-600 dark:text-zinc-400">
      Otomatis kunci akses siswa jika pembayaran terlambat
    </span>
  </label>
  {latePaymentAutoLock && (
    <div>
      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        Jumlah tagihan terlambat sebelum dikunci
      </label>
      <input
        type="number"
        min={1}
        value={latePaymentThreshold}
        onChange={(e) => setLatePaymentThreshold(Number(e.target.value))}
        className="mt-1 w-24 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
      />
    </div>
  )}
</div>
```

- [ ] **Step 3: Update useSettingsPage.ts**

Remove `formBillingMode` state and references (~line 74, 86). The billing mode is no longer editable via settings — it's set during onboarding and read from `user.institution.billing_mode`.

Add state for late payment settings:
```typescript
const [latePaymentAutoLock, setLatePaymentAutoLock] = useState(false);
const [latePaymentThreshold, setLatePaymentThreshold] = useState(0);
```

Initialize from billing settings query, and include in save mutation.

- [ ] **Step 4: Run type check**

```bash
cd sinaloka-platform
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/
git commit -m "refactor(platform): update billing settings tab

- Add read-only billing mode info card
- Add late payment settings (auto-lock + threshold)
- Remove billing_mode from editable settings"
```

---

## Task 14: Frontend — Update SuperAdmin BillingPaymentTab

**Files:**
- Modify: `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx`

- [ ] **Step 1: Strip billing mode configuration**

Remove the BILLING_MODES array (~lines 16-23).
Remove `formBillingMode` state (~line 29).
Remove the billing mode dropdown/select from the form.
Remove billing_mode from the PATCH mutation payload (~lines 77-89).

- [ ] **Step 2: Add read-only billing mode display**

Replace the billing mode config section with a read-only display:

```tsx
<div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
  <p className="text-sm text-zinc-500">Mode Billing</p>
  <p className="text-lg font-semibold">
    {institution?.billing_mode === 'PER_SESSION' ? 'Per Sesi' :
     institution?.billing_mode === 'MONTHLY_FIXED' ? 'Bulanan Tetap' :
     'Belum diatur'}
  </p>
</div>
```

- [ ] **Step 3: Add override button with confirmation**

```tsx
<button
  onClick={() => {
    if (confirm('Yakin ingin mengubah mode billing? Ini akan mempengaruhi semua tagihan baru.')) {
      overrideBillingMode();
    }
  }}
  className="text-xs text-zinc-400 hover:text-zinc-600 underline"
>
  Override mode billing
</button>
```

Add mutation:
```typescript
const overrideMutation = useMutation({
  mutationFn: (mode: string) =>
    api.patch(`/api/admin/institutions/${institutionId}/billing-mode`, { billing_mode: mode }),
  onSuccess: () => { toast.success('Billing mode updated'); queryClient.invalidateQueries(); },
});
```

- [ ] **Step 4: Run type check**

```bash
cd sinaloka-platform
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx
git commit -m "refactor(platform): SuperAdmin billing tab read-only with override

SuperAdmin can no longer configure billing operational settings.
Tab now shows billing mode as read-only with override button for
edge cases."
```

---

## Task 15: Frontend — Full Build Verification

- [ ] **Step 1: Run type check**

```bash
cd sinaloka-platform
npm run lint
```
Expected: No errors.

- [ ] **Step 2: Run build**

```bash
cd sinaloka-platform
npm run build
```
Expected: Build succeeds.

---

## Task 16: Full Stack Integration Verification

- [ ] **Step 1: Backend full test + build**

```bash
cd sinaloka-backend
npm run test -- --ci && npm run build && npm run lint
```

- [ ] **Step 2: Frontend full lint + build**

```bash
cd sinaloka-platform
npm run lint && npm run build
```

- [ ] **Step 3: Final commit if any remaining changes**

```bash
git status
# If any unstaged changes remain, add and commit appropriately
```
