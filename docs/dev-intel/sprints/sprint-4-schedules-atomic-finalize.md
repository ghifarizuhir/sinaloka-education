---
title: "Sprint 4: Atomic Finalize & Tenant Isolation"
source: docs/dev-intel/audits/audit-2026-03-28-schedules.md
scope: SA-003, CLS-13
---

# Sprint 4: Atomic Finalize & Tenant Isolation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the critical race condition in the attendance+session finalize flow by creating a single atomic endpoint, and fix tenant isolation gap in session queries.

**Architecture:** New `POST /api/tutor/attendance/finalize` endpoint wrapping attendance creation + session completion + payment/payout generation in a single Prisma `$transaction`. Frontend updated to call one endpoint instead of two.

**Tech Stack:** NestJS, Prisma, TypeScript, React

---

## Task 1: SA-003 — Atomic Finalize Session Endpoint

**Problem:** Tutor "Finalize & Close" makes 2 sequential API calls: `POST /api/tutor/attendance` then `PATCH /api/tutor/schedule/:id/complete`. If the first succeeds but second fails, attendance records persist but session stays SCHEDULED — orphaned payments, no payout, and retry gets ConflictException ("attendance already exists").

**Fix:** Create a single `POST /api/tutor/attendance/finalize` endpoint that wraps everything in a Prisma `$transaction`.

**Files changed:**
- `sinaloka-backend/src/modules/attendance/attendance.dto.ts`
- `sinaloka-backend/src/modules/attendance/attendance.service.ts`
- `sinaloka-backend/src/modules/attendance/attendance.service.spec.ts`
- `sinaloka-backend/src/modules/attendance/tutor-attendance.controller.ts`
- `sinaloka-tutors/src/hooks/useAttendance.ts`

### Steps

- [ ] **Step 1: Add FinalizeSessionSchema DTO**

```typescript
// FILE: sinaloka-backend/src/modules/attendance/attendance.dto.ts
// ADD after BatchCreateAttendanceSchema

export const FinalizeSessionSchema = z.object({
  session_id: z.string().uuid(),
  records: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
      homework_done: z.boolean().optional().default(false),
      notes: z.string().max(500).optional(),
    }),
  ).min(1),
  topic_covered: z.string().min(1).max(500),
  session_summary: z.string().max(2000).optional(),
});

export class FinalizeSessionDto extends createZodDto(FinalizeSessionSchema) {}
```

- [ ] **Step 2: Write failing test for `finalizeSession`**

Add a new `describe('finalizeSession')` block in `attendance.service.spec.ts`:

```typescript
// FILE: sinaloka-backend/src/modules/attendance/attendance.service.spec.ts
// ADD new describe block inside the outer describe

describe('finalizeSession', () => {
  const finalizeDto = {
    session_id: 'session-1',
    records: [
      { student_id: 'student-1', status: 'PRESENT' as const, homework_done: true },
      { student_id: 'student-2', status: 'ABSENT' as const },
    ],
    topic_covered: 'Algebra basics',
    session_summary: 'Good session',
  };

  it('should atomically create attendance, complete session, and generate payout', async () => {
    // Mock transaction to execute the callback
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));

    // Mock session lookup
    prisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      status: 'SCHEDULED',
      class_id: 'class-1',
      institution_id: 'inst-1',
      class: {
        id: 'class-1',
        tutor_id: 'tutor-1',
        fee: 100000,
        billing_mode: 'PER_SESSION',
        tutor_fee: 75000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        name: 'Math 101',
        subject: { name: 'Mathematics' },
        tutor: { user: { name: 'Tutor A' } },
      },
    });

    // Mock tutor lookup
    prisma.tutor.findFirst.mockResolvedValue({ id: 'tutor-1', user_id: 'user-1' });

    // Mock duplicate check
    prisma.attendance.findMany.mockResolvedValue([]);

    // Mock attendance createMany
    prisma.attendance.createMany.mockResolvedValue({ count: 2 });

    // Mock session update
    prisma.session.update.mockResolvedValue({ id: 'session-1', status: 'COMPLETED' });

    // Mock payout create
    prisma.tutorPayout.create.mockResolvedValue({ id: 'payout-1' });

    await service.finalizeSession('inst-1', 'user-1', finalizeDto);

    // Verify transaction was used
    expect(prisma.$transaction).toHaveBeenCalled();

    // Verify attendance was created
    expect(prisma.attendance.createMany).toHaveBeenCalled();

    // Verify session was completed
    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('should reject if session is not SCHEDULED', async () => {
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
    prisma.tutor.findFirst.mockResolvedValue({ id: 'tutor-1', user_id: 'user-1' });
    prisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      class_id: 'class-1',
      institution_id: 'inst-1',
      class: { tutor_id: 'tutor-1' },
    });

    await expect(service.finalizeSession('inst-1', 'user-1', finalizeDto))
      .rejects.toThrow();
  });

  it('should reject if tutor does not own the session', async () => {
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
    prisma.tutor.findFirst.mockResolvedValue({ id: 'tutor-1', user_id: 'user-1' });
    prisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      status: 'SCHEDULED',
      class_id: 'class-1',
      institution_id: 'inst-1',
      class: { tutor_id: 'other-tutor' },
    });

    await expect(service.finalizeSession('inst-1', 'user-1', finalizeDto))
      .rejects.toThrow();
  });
});
```

Run test to confirm it fails:
```bash
cd sinaloka-backend && npm run test -- --testPathPattern=attendance
```

- [ ] **Step 3: Implement `finalizeSession` in AttendanceService**

```typescript
// FILE: sinaloka-backend/src/modules/attendance/attendance.service.ts
// ADD new method to AttendanceService class

async finalizeSession(
  institutionId: string,
  userId: string,
  dto: FinalizeSessionDto,
) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Validate tutor
    const tutor = await tx.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });
    if (!tutor) throw new NotFoundException('Tutor not found');

    // 2. Validate session — must be SCHEDULED and owned by this tutor
    const session = await tx.session.findFirst({
      where: {
        id: dto.session_id,
        institution_id: institutionId,
      },
      include: {
        class: {
          include: {
            subject: true,
            tutor: { include: { user: true } },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('Not your session');
    }
    if (session.status !== 'SCHEDULED') {
      throw new ConflictException(`Session status is ${session.status}, expected SCHEDULED`);
    }

    // 3. Check for duplicate attendance
    const existing = await tx.attendance.findMany({
      where: { session_id: dto.session_id },
      select: { student_id: true },
    });
    if (existing.length > 0) {
      throw new ConflictException('Attendance already exists for this session');
    }

    // 4. Create attendance records
    await tx.attendance.createMany({
      data: dto.records.map((r) => ({
        session_id: dto.session_id,
        student_id: r.student_id,
        institution_id: institutionId,
        status: r.status,
        homework_done: r.homework_done ?? false,
        notes: r.notes,
      })),
    });

    // 5. Generate per-session payments for PRESENT/LATE students
    const presentRecords = dto.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    );

    if (session.class.billing_mode === 'PER_SESSION') {
      for (const record of presentRecords) {
        await this.invoiceGenerator.generatePerSessionPayment(
          {
            sessionId: dto.session_id,
            studentId: record.student_id,
            institutionId,
            fee: session.class.fee,
            className: session.class.name,
            sessionDate: session.date,
          },
          tx,
        );
      }
    }

    // 6. Complete session with snapshot data
    const snapshotData = {
      snapshot_tutor_name: session.class.tutor?.user?.name || null,
      snapshot_subject_name: session.class.subject?.name || null,
      snapshot_fee: session.class.fee,
      snapshot_class_name: session.class.name,
    };

    await tx.session.update({
      where: { id: dto.session_id },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary,
        completed_at: new Date(),
        ...snapshotData,
      },
    });

    // 7. Generate tutor payout
    if (session.class.tutor_fee_mode === 'FIXED_PER_SESSION') {
      await tx.tutorPayout.create({
        data: {
          session_id: dto.session_id,
          tutor_id: tutor.id,
          institution_id: institutionId,
          amount: session.class.tutor_fee || 0,
          status: 'PENDING',
        },
      });
    } else if (session.class.tutor_fee_mode === 'PER_STUDENT_ATTENDANCE') {
      const attendeeCount = presentRecords.length;
      const perStudentFee = session.class.tutor_fee || 0;
      await tx.tutorPayout.create({
        data: {
          session_id: dto.session_id,
          tutor_id: tutor.id,
          institution_id: institutionId,
          amount: perStudentFee * attendeeCount,
          status: 'PENDING',
        },
      });
    }
    // MONTHLY_SALARY — no per-session payout

    // 8. Emit notification (outside transaction is OK — notifications are best-effort)
    // Note: We emit after transaction commits by returning the data needed
    return {
      session_id: dto.session_id,
      attendance_count: dto.records.length,
      present_count: presentRecords.length,
    };
  });
}
```

**Important:** Check if `invoiceGenerator.generatePerSessionPayment` accepts a Prisma transaction client (`tx`) as parameter. If not, you'll need to adapt it or move payment generation logic inline. Look at the existing `batchCreate` method for reference on how payments are currently generated.

Run test:
```bash
cd sinaloka-backend && npm run test -- --testPathPattern=attendance
```

- [ ] **Step 4: Add controller endpoint**

```typescript
// FILE: sinaloka-backend/src/modules/attendance/tutor-attendance.controller.ts
// ADD new endpoint

@Post('finalize')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TUTOR')
async finalizeSession(
  @CurrentUser() user: any,
  @Body() dto: FinalizeSessionDto,
) {
  const result = await this.attendanceService.finalizeSession(
    user.institution_id,
    user.id,
    dto,
  );
  return result;
}
```

Make sure to import `FinalizeSessionDto` at the top of the file.

- [ ] **Step 5: Update tutor frontend to use new endpoint**

```typescript
// FILE: sinaloka-tutors/src/hooks/useAttendance.ts
// REPLACE the two-call submitAttendance with single call

const submitAttendance = useCallback(
  async (
    sessionId: string,
    studentList: StudentAttendance[],
    topicCovered: string,
    sessionSummary?: string,
  ) => {
    const records = studentList.map((s) => ({
      student_id: s.student_id,
      status: s.status,
      homework_done: s.homework_done ?? false,
      notes: s.notes,
    }));

    // Single atomic call — replaces two sequential calls
    await api.post('/api/tutor/attendance/finalize', {
      session_id: sessionId,
      records,
      topic_covered: topicCovered,
      session_summary: sessionSummary,
    });
  },
  [],
);
```

- [ ] **Step 6: Verify and build**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=attendance && npm run build
cd sinaloka-tutors && npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(attendance): atomic finalize session endpoint (SA-003)

Replace two sequential API calls (POST attendance + PATCH complete) with
a single POST /api/tutor/attendance/finalize wrapped in Prisma \$transaction.
Prevents race condition where attendance is saved but session stays SCHEDULED."
```

---

## Task 2: CLS-13 — Fix findUnique Tenant Isolation in Session Service

**Problem:** `validateClassForSession` uses `findUnique` with `{ id, institution_id }` compound where. `findUnique` only accepts fields that form a unique constraint. Since only `id` is `@id`, the `institution_id` filter may be silently ignored, allowing cross-tenant access.

**Fix:** Replace `findUnique` with `findFirst` to ensure both `id` AND `institution_id` are properly filtered.

**Files changed:**
- `sinaloka-backend/src/modules/session/session.service.ts`

### Steps

- [ ] **Step 1: Fix validateClassForSession**

```typescript
// FILE: sinaloka-backend/src/modules/session/session.service.ts
// In validateClassForSession method (around line 128-129)
// REPLACE:
//   const classRecord = await this.prisma.class.findUnique({
//     where: { id: classId, institution_id: institutionId },
// WITH:
const classRecord = await this.prisma.class.findFirst({
  where: { id: classId, institution_id: institutionId },
  include: { schedules: true },
});
```

- [ ] **Step 2: Scan for other findUnique with institution_id patterns in the same file**

Search for other `findUnique` calls that include `institution_id` in the where clause and fix them similarly.

```bash
cd sinaloka-backend && grep -n "findUnique" src/modules/session/session.service.ts
```

Fix each occurrence by replacing with `findFirst`.

- [ ] **Step 3: Test and build**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=session && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix(session): replace findUnique with findFirst for tenant isolation (CLS-13)

findUnique only accepts unique constraint fields. institution_id is not
part of the unique constraint, so it may be silently ignored. Using
findFirst ensures proper tenant scoping."
```
