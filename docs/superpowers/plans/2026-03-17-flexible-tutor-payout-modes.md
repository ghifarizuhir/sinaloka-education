# Flexible Tutor Payout Modes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 tutor payout modes (fixed per session, per student attendance, monthly salary) configurable per class.

**Architecture:** Add `TutorFeeMode` enum and `tutor_fee_per_student` to Class model, `monthly_salary` to Tutor model. Session completion logic branches on mode. Monthly salary uses cron + manual endpoint.

**Tech Stack:** NestJS, Prisma, React, TanStack Query, Zod, @nestjs/schedule

**Spec:** `docs/superpowers/specs/2026-03-17-flexible-tutor-payout-modes-design.md`

---

### Task 1: Prisma Schema — Add TutorFeeMode Enum and New Fields

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add TutorFeeMode enum after existing enums (after line 39)**

Add after the `PayoutStatus` enum block:

```prisma
enum TutorFeeMode {
  FIXED_PER_SESSION
  PER_STUDENT_ATTENDANCE
  MONTHLY_SALARY
}
```

- [ ] **Step 2: Add fields to Class model (after `tutor_fee` line)**

```prisma
  tutor_fee_mode        TutorFeeMode @default(FIXED_PER_SESSION)
  tutor_fee_per_student Decimal?
```

- [ ] **Step 3: Add monthly_salary to Tutor model (after `bank_account_holder` line)**

```prisma
  monthly_salary       Decimal?
```

- [ ] **Step 4: Push schema to database**

```bash
cd sinaloka-backend
npx prisma db execute --stdin <<< "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TutorFeeMode') THEN CREATE TYPE \"TutorFeeMode\" AS ENUM ('FIXED_PER_SESSION', 'PER_STUDENT_ATTENDANCE', 'MONTHLY_SALARY'); END IF; END \$\$;"
npx prisma db execute --stdin <<< "ALTER TABLE classes ADD COLUMN IF NOT EXISTS tutor_fee_mode \"TutorFeeMode\" NOT NULL DEFAULT 'FIXED_PER_SESSION';"
npx prisma db execute --stdin <<< "ALTER TABLE classes ADD COLUMN IF NOT EXISTS tutor_fee_per_student DECIMAL;"
npx prisma db execute --stdin <<< "ALTER TABLE tutors ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL;"
npx prisma db push
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
npm run prisma:generate
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma
git commit -m "feat(schema): add TutorFeeMode enum, tutor_fee_per_student, monthly_salary"
```

---

### Task 2: Backend DTOs — Class and Tutor Validation

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.dto.ts`
- Modify: `sinaloka-backend/src/modules/tutor/tutor.dto.ts`

- [ ] **Step 1: Update CreateClassSchema in class.dto.ts**

Add `tutor_fee_mode` and `tutor_fee_per_student` fields. Add `.refine()` for conditional validation.

In `class.dto.ts`, change the `CreateClassSchema` to:

```typescript
const TutorFeeMode = z.enum(['FIXED_PER_SESSION', 'PER_STUDENT_ATTENDANCE', 'MONTHLY_SALARY']);

export const CreateClassSchema = z
  .object({
    tutor_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    subject: z.string().min(1, 'Subject is required').max(100),
    capacity: z.number().int().min(1),
    fee: z.number().min(0),
    schedule_days: z.array(ScheduleDay).min(1),
    schedule_start_time: TimeString,
    schedule_end_time: TimeString,
    room: z.string().max(100).optional().nullable(),
    package_fee: z.number().min(0).optional().nullable(),
    tutor_fee: z.number().min(0),
    tutor_fee_mode: TutorFeeMode.default('FIXED_PER_SESSION'),
    tutor_fee_per_student: z.number().min(0).optional().nullable(),
    status: ClassStatus.default('ACTIVE'),
  })
  .refine((data) => data.schedule_start_time < data.schedule_end_time, {
    message: 'schedule_start_time must be before schedule_end_time',
    path: ['schedule_end_time'],
  })
  .refine(
    (data) => data.tutor_fee_mode !== 'PER_STUDENT_ATTENDANCE' || (data.tutor_fee_per_student != null && data.tutor_fee_per_student > 0),
    {
      message: 'tutor_fee_per_student is required when mode is PER_STUDENT_ATTENDANCE',
      path: ['tutor_fee_per_student'],
    },
  );
```

- [ ] **Step 2: Update UpdateClassSchema in class.dto.ts**

Add the new optional fields:

```typescript
    tutor_fee_mode: TutorFeeMode.optional(),
    tutor_fee_per_student: z.number().min(0).optional().nullable(),
```

- [ ] **Step 3: Update UpdateTutorSchema in tutor.dto.ts**

Add after `rating` field:

```typescript
    monthly_salary: z.number().min(0).optional().nullable(),
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.dto.ts sinaloka-backend/src/modules/tutor/tutor.dto.ts
git commit -m "feat(dto): add tutor_fee_mode, tutor_fee_per_student, monthly_salary validation"
```

---

### Task 3: Backend Class Service — Handle New Fields

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.service.ts`

- [ ] **Step 1: Update create() method to include new fields**

In the `data` object of `prisma.class.create`, add:

```typescript
        tutor_fee_mode: dto.tutor_fee_mode ?? 'FIXED_PER_SESSION',
        tutor_fee_per_student: dto.tutor_fee_per_student ?? null,
```

In the return mapping, add:

```typescript
      tutor_fee_mode: record.tutor_fee_mode,
      tutor_fee_per_student: record.tutor_fee_per_student != null ? Number(record.tutor_fee_per_student) : null,
```

- [ ] **Step 2: Update findAll() and findOne() return mapping**

Add the same `tutor_fee_mode` and `tutor_fee_per_student` mapping to every method that returns class data (findAll flatten, findOne).

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/class/class.service.ts
git commit -m "feat(class): persist and return tutor_fee_mode and tutor_fee_per_student"
```

---

### Task 4: Backend Session Service — Branching Payout Logic

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts`

- [ ] **Step 1: Update completeSession() to branch on tutor_fee_mode**

Change the class query to include new fields:

```typescript
    const classForFee = await this.prisma.class.findUnique({
      where: { id: session.class_id },
      select: { tutor_fee: true, tutor_fee_mode: true, tutor_fee_per_student: true, name: true },
    });
```

Replace the existing payout creation block (after session update) with:

```typescript
    // Auto-create payout based on tutor fee mode
    const feeMode = classForFee?.tutor_fee_mode ?? 'FIXED_PER_SESSION';

    if (feeMode === 'FIXED_PER_SESSION') {
      if (tutorFee > 0) {
        const sessionDate = new Date(session.date);
        await this.payoutService.create(session.institution_id, {
          tutor_id: tutor.id,
          amount: tutorFee,
          date: sessionDate,
          status: 'PENDING',
          description: `Session: ${classForFee!.name} - ${sessionDate.toISOString().split('T')[0]}`,
          period_start: sessionDate,
          period_end: sessionDate,
        });
      }
    } else if (feeMode === 'PER_STUDENT_ATTENDANCE') {
      const feePerStudent = Number(classForFee?.tutor_fee_per_student ?? 0);
      if (feePerStudent > 0) {
        const attendingCount = await this.prisma.attendance.count({
          where: {
            session_id: sessionId,
            status: { in: ['PRESENT', 'LATE'] },
          },
        });
        if (attendingCount > 0) {
          const totalFee = feePerStudent * attendingCount;
          const sessionDate = new Date(session.date);
          await this.payoutService.create(session.institution_id, {
            tutor_id: tutor.id,
            amount: totalFee,
            date: sessionDate,
            status: 'PENDING',
            description: `Session: ${classForFee!.name} - ${sessionDate.toISOString().split('T')[0]} (${attendingCount} students)`,
            period_start: sessionDate,
            period_end: sessionDate,
          });
        }
      }
    }
    // MONTHLY_SALARY: no per-session payout — handled by cron/manual endpoint
```

- [ ] **Step 2: Update update() method with same branching logic**

Apply the same branching in the `update()` method where `dto.status === 'COMPLETED'`. Update the class query select to include `tutor_fee_mode` and `tutor_fee_per_student`. Replace the payout creation block with the same branching logic as above.

- [ ] **Step 3: Remove debug console.log statements**

Remove all `console.log` lines added during debugging in earlier sessions (search for `[completeSession]` and `[PayoutService`).

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "feat(session): branch payout creation on tutor_fee_mode"
```

---

### Task 5: Backend Payout Service — Monthly Salary Generation

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.service.ts`
- Modify: `sinaloka-backend/src/modules/payout/payout.controller.ts`
- Modify: `sinaloka-backend/src/modules/payout/payout.module.ts`

- [ ] **Step 1: Add generateMonthlySalaries() to PayoutService**

Add this method to `payout.service.ts`:

```typescript
  async generateMonthlySalaries(institutionId: string) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const salaryPrefix = `Salary: ${monthKey}`;

    const tutors = await this.prisma.tutor.findMany({
      where: {
        institution_id: institutionId,
        monthly_salary: { not: null, gt: 0 },
      },
      include: { user: { select: { name: true } } },
    });

    let created = 0;
    for (const tutor of tutors) {
      // Duplicate check
      const existing = await this.prisma.payout.findFirst({
        where: {
          tutor_id: tutor.id,
          institution_id: institutionId,
          description: { startsWith: salaryPrefix },
        },
      });

      if (existing) continue;

      await this.prisma.payout.create({
        data: {
          institution_id: institutionId,
          tutor_id: tutor.id,
          amount: tutor.monthly_salary!,
          date: now,
          status: 'PENDING',
          description: `${salaryPrefix} - ${tutor.user.name}`,
        },
      });
      created++;
    }

    return { created };
  }
```

- [ ] **Step 2: Remove debug console.log from create() and findAll()**

Remove the `console.log` lines we added for debugging in payout.service.ts.

- [ ] **Step 3: Add endpoint to PayoutController**

Add before the `@Get(':id')` route (to avoid route conflict):

```typescript
  @Post('generate-salaries')
  @HttpCode(HttpStatus.OK)
  generateSalaries(@CurrentUser() user: JwtPayload) {
    return this.payoutService.generateMonthlySalaries(user.institutionId!);
  }
```

- [ ] **Step 4: Add cron job to PayoutModule**

Create a new file `sinaloka-backend/src/modules/payout/payout.cron.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PayoutService } from './payout.service.js';

@Injectable()
export class PayoutCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
  ) {}

  @Cron('0 0 1 * *')
  async handleMonthlySalaries() {
    const institutions = await this.prisma.institution.findMany({
      select: { id: true },
    });

    for (const inst of institutions) {
      const result = await this.payoutService.generateMonthlySalaries(inst.id);
      if (result.created > 0) {
        console.log(`[PayoutCron] Generated ${result.created} salary payouts for institution ${inst.id}`);
      }
    }
  }
}
```

Update `payout.module.ts` to add `PayoutCronService` to providers:

```typescript
import { PayoutCronService } from './payout.cron.js';

@Module({
  controllers: [PayoutController, TutorPayoutController],
  providers: [PayoutService, PayoutSlipService, PayoutCronService],
  exports: [PayoutService],
})
export class PayoutModule {}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/payout/
git commit -m "feat(payout): add monthly salary generation with cron and manual endpoint"
```

---

### Task 6: Frontend Types — Class and Tutor

**Files:**
- Modify: `sinaloka-platform/src/types/class.ts`
- Modify: `sinaloka-platform/src/types/tutor.ts`

- [ ] **Step 1: Update Class interface and CreateClassDto**

In `class.ts`, add to `Class` interface:

```typescript
  tutor_fee_mode: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
  tutor_fee_per_student: number | null;
```

Add to `CreateClassDto`:

```typescript
  tutor_fee_mode?: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
  tutor_fee_per_student?: number | null;
```

- [ ] **Step 2: Update Tutor interface**

In `tutor.ts`, add to `Tutor` interface:

```typescript
  monthly_salary: number | null;
```

- [ ] **Step 3: Verify type-check**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/class.ts sinaloka-platform/src/types/tutor.ts
git commit -m "feat(types): add tutor_fee_mode, tutor_fee_per_student, monthly_salary"
```

---

### Task 7: Frontend Class Form — Tutor Fee Mode Selector

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add form state for new fields**

Add after `formTutorFee` state:

```typescript
const [formTutorFeeMode, setFormTutorFeeMode] = useState<'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY'>('FIXED_PER_SESSION');
const [formTutorFeePerStudent, setFormTutorFeePerStudent] = useState('');
```

- [ ] **Step 2: Update form reset logic**

In the reset function, add:

```typescript
setFormTutorFeeMode('FIXED_PER_SESSION');
setFormTutorFeePerStudent('');
```

- [ ] **Step 3: Update edit mode load**

When loading class for edit, add:

```typescript
setFormTutorFeeMode(cls.tutor_fee_mode ?? 'FIXED_PER_SESSION');
setFormTutorFeePerStudent(cls.tutor_fee_per_student ? String(cls.tutor_fee_per_student) : '');
```

- [ ] **Step 4: Update form payload**

In the submit handler, add to payload:

```typescript
tutor_fee_mode: formTutorFeeMode,
tutor_fee_per_student: formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' ? Number(formTutorFeePerStudent) : null,
```

- [ ] **Step 5: Add tutor fee mode dropdown and conditional fields to form UI**

After the existing tutor_fee input, add:

```tsx
<div className="space-y-1.5">
  <Label>{t('classes.form.tutorFeeMode')}</Label>
  <select
    className="h-10 w-full px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
    value={formTutorFeeMode}
    onChange={(e) => setFormTutorFeeMode(e.target.value as any)}
  >
    <option value="FIXED_PER_SESSION">{t('classes.form.feeMode.fixedPerSession')}</option>
    <option value="PER_STUDENT_ATTENDANCE">{t('classes.form.feeMode.perStudentAttendance')}</option>
    <option value="MONTHLY_SALARY">{t('classes.form.feeMode.monthlySalary')}</option>
  </select>
</div>

{formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' && (
  <div className="space-y-1.5">
    <Label>{t('classes.form.tutorFeePerStudent')}</Label>
    <Input
      type="number"
      placeholder="30000"
      required
      value={formTutorFeePerStudent}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTutorFeePerStudent(e.target.value)}
    />
  </div>
)}

{formTutorFeeMode === 'MONTHLY_SALARY' && (
  <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg">
    {t('classes.form.monthlySalaryHint')}
  </p>
)}
```

- [ ] **Step 6: Add i18n keys to en.json**

Under `classes.form`, add:

```json
"tutorFeeMode": "Tutor Fee Mode",
"tutorFeePerStudent": "Fee Per Student (per session)",
"feeMode": {
  "fixedPerSession": "Fixed Per Session",
  "perStudentAttendance": "Per Attending Student",
  "monthlySalary": "Monthly Salary"
},
"monthlySalaryHint": "Tutor payout comes from their monthly salary. No per-session fee needed."
```

- [ ] **Step 7: Add i18n keys to id.json**

Under `classes.form`, add:

```json
"tutorFeeMode": "Mode Bayar Tutor",
"tutorFeePerStudent": "Biaya Per Murid (per sesi)",
"feeMode": {
  "fixedPerSession": "Tetap Per Sesi",
  "perStudentAttendance": "Per Murid Hadir",
  "monthlySalary": "Gaji Bulanan"
},
"monthlySalaryHint": "Payout tutor berasal dari gaji bulanan. Tidak perlu biaya per sesi."
```

- [ ] **Step 8: Verify type-check and build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 9: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add tutor fee mode selector in class form"
```

---

### Task 8: Frontend Tutor Form — Monthly Salary Field

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add monthly_salary to TutorForm state**

In the TutorForm component, add to formData state:

```typescript
monthly_salary: initialData?.monthly_salary ?? '',
```

- [ ] **Step 2: Add monthly_salary to handleSubmit payload**

```typescript
monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null,
```

- [ ] **Step 3: Add input field in TutorForm (in the bank details grid section)**

Add a new field alongside the bank fields:

```tsx
<div className="space-y-2">
  <Label htmlFor="monthly_salary">{t('tutors.form.monthlySalary')}</Label>
  <Input id="monthly_salary" name="monthly_salary" type="number" value={formData.monthly_salary} onChange={handleChange} placeholder={t('tutors.form.monthlySalaryPlaceholder')} />
</div>
```

- [ ] **Step 4: Add i18n keys**

en.json under `tutors.form`:
```json
"monthlySalary": "Monthly Salary",
"monthlySalaryPlaceholder": "e.g., 5000000"
```

id.json under `tutors.form`:
```json
"monthlySalary": "Gaji Bulanan",
"monthlySalaryPlaceholder": "cth. 5000000"
```

- [ ] **Step 5: Verify type-check**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add monthly salary field to tutor form"
```

---

### Task 9: Frontend Tutor Payouts — Generate Salaries Button

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`
- Modify: `sinaloka-platform/src/services/payouts.service.ts`
- Modify: `sinaloka-platform/src/hooks/usePayouts.ts`
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add generateSalaries to payoutsService**

In `payouts.service.ts`, add:

```typescript
  generateSalaries: () =>
    api.post<{ created: number }>('/api/admin/payouts/generate-salaries').then((r) => r.data),
```

- [ ] **Step 2: Add useGenerateSalaries hook**

In `usePayouts.ts`, add:

```typescript
export function useGenerateSalaries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutsService.generateSalaries,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payouts'] }); },
  });
}
```

- [ ] **Step 3: Add Generate Salaries button to TutorPayouts page**

Import `useGenerateSalaries` and add the button next to existing action buttons at the top of the page. Look for the header area with the "Create Payout" button and add alongside it:

```tsx
const generateSalaries = useGenerateSalaries();

// In the header actions area:
<Button
  variant="outline"
  onClick={() => {
    generateSalaries.mutate(undefined, {
      onSuccess: (result) => toast.success(t('finance.payouts.salariesGenerated', { count: result.created })),
      onError: () => toast.error(t('finance.payouts.salariesError')),
    });
  }}
  disabled={generateSalaries.isPending}
>
  <DollarSign size={18} />
  {t('finance.payouts.generateSalaries')}
</Button>
```

- [ ] **Step 4: Add i18n keys**

en.json under `finance.payouts`:
```json
"generateSalaries": "Generate Monthly Salaries",
"salariesGenerated": "{{count}} salary payout(s) created",
"salariesError": "Failed to generate salaries"
```

id.json under `finance.payouts`:
```json
"generateSalaries": "Generate Gaji Bulanan",
"salariesGenerated": "{{count}} payout gaji dibuat",
"salariesError": "Gagal membuat gaji"
```

- [ ] **Step 5: Verify type-check**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/TutorPayouts.tsx sinaloka-platform/src/services/payouts.service.ts sinaloka-platform/src/hooks/usePayouts.ts sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add generate monthly salaries button to tutor payouts"
```

---

### Task 10: Update Seed Data

**Files:**
- Modify: `sinaloka-backend/prisma/seed.ts`

- [ ] **Step 1: Add tutor_fee_mode to seed classes**

Update the 4 class seeds to include `tutor_fee_mode`. Keep 2 as `FIXED_PER_SESSION`, set 1 to `PER_STUDENT_ATTENDANCE` with `tutor_fee_per_student`, and 1 to `MONTHLY_SALARY`:

Class 1 (Matematika SMP): add `tutor_fee_mode: 'FIXED_PER_SESSION'`
Class 2 (English SMP): add `tutor_fee_mode: 'PER_STUDENT_ATTENDANCE', tutor_fee_per_student: 40000`
Class 3 (Fisika SMA): add `tutor_fee_mode: 'FIXED_PER_SESSION'`
Class 4 (B. Indonesia SMA): add `tutor_fee_mode: 'MONTHLY_SALARY'`

- [ ] **Step 2: Add monthly_salary to one tutor seed**

Add `monthly_salary: 5000000` to tutors[3] (the one teaching B. Indonesia SMA with MONTHLY_SALARY mode).

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/prisma/seed.ts
git commit -m "feat(seed): add tutor_fee_mode and monthly_salary to seed data"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Full backend build**

```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 2: Full platform type-check**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 3: Manual testing checklist**

1. Create class with `FIXED_PER_SESSION` → complete session → verify payout = tutor_fee
2. Create class with `PER_STUDENT_ATTENDANCE`, set tutor_fee_per_student = 30000 → complete session with 3 present students → verify payout = 90000
3. Create class with `MONTHLY_SALARY` → complete session → verify NO per-session payout
4. Set tutor monthly_salary = 5000000 → click "Generate Monthly Salaries" → verify PENDING payout created
5. Click "Generate Monthly Salaries" again → verify no duplicate (toast shows 0 created)
6. Verify class form shows correct conditional fields per mode
7. Verify tutor edit form has monthly salary field

- [ ] **Step 4: Push to remote**

```bash
git push origin feat/parent-module
```
