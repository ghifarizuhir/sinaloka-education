# Session Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze session context data (tutor, subject, class name, fee, room) at completion time so editing a class does not corrupt historical session records.

**Architecture:** Add 8 nullable snapshot columns to the Session model. Populate them when session transitions to COMPLETED. Display logic uses snapshot-first with fallback to live reference for backward compatibility.

**Tech Stack:** NestJS, Prisma, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-23-session-snapshot-design.md`

---

### Task 1: Prisma Schema — Add Snapshot Columns

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma:549-576` (Session model)

- [ ] **Step 1: Add 8 snapshot columns to Session model**

In `prisma/schema.prisma`, add these columns to the `Session` model, after `reschedule_reason` (line 565) and before `created_at` (line 566):

```prisma
  snapshot_tutor_id             String?
  snapshot_tutor_name           String?
  snapshot_subject_name         String?
  snapshot_class_name           String?
  snapshot_class_fee            Decimal?
  snapshot_class_room           String?
  snapshot_tutor_fee_mode       String?
  snapshot_tutor_fee_per_student Decimal?
```

- [ ] **Step 2: Generate migration**

Run from `sinaloka-backend/`:
```bash
npx prisma migrate dev --name add_session_snapshot_columns
```

If shadow DB errors block `migrate dev`, create the migration directory and SQL manually:
```sql
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_id" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_subject_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_class_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_class_fee" DECIMAL;
ALTER TABLE "sessions" ADD COLUMN "snapshot_class_room" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_fee_mode" TEXT;
ALTER TABLE "sessions" ADD COLUMN "snapshot_tutor_fee_per_student" DECIMAL;
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run prisma:generate
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(backend): add snapshot columns to Session model"
```

---

### Task 2: Extract Snapshot Helper

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts:42-47`

Create a private helper method that builds the snapshot data object from a class record. This avoids duplicating the snapshot logic across the two completion paths.

- [ ] **Step 1: Add `buildSnapshotData` helper method**

Add this method to `SessionService` class, after the `sessionInclude` property (after line 56):

```typescript
  /**
   * Build snapshot data from a class record for freezing into a completed session.
   * Requires class to be fetched with: subject, tutor.user includes.
   */
  private buildSnapshotData(classRecord: any) {
    return {
      snapshot_tutor_id: classRecord.tutor_id ?? null,
      snapshot_tutor_name: classRecord.tutor?.user?.name ?? null,
      snapshot_subject_name: classRecord.subject?.name ?? null,
      snapshot_class_name: classRecord.name ?? null,
      snapshot_class_fee: classRecord.fee ?? null,
      snapshot_class_room: classRecord.room ?? null,
      snapshot_tutor_fee_mode: classRecord.tutor_fee_mode ?? null,
      snapshot_tutor_fee_per_student: classRecord.tutor_fee_per_student ?? null,
    };
  }
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/session/session.service.ts
git commit -m "feat(backend): add buildSnapshotData helper to SessionService"
```

---

### Task 3: Snapshot on Admin Completion Path

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts:239-302`

The admin path at `update()` fetches class with a limited `select` (line 240-248). We need to expand it to include subject and tutor.user, then spread snapshot data into the session update.

- [ ] **Step 1: Expand the class query to include snapshot-required fields**

Replace the class query at lines 240-248:

```typescript
      const sessionClass = await this.prisma.class.findUnique({
        where: { id: existing.class?.id ?? '' },
        select: {
          tutor_fee: true,
          tutor_fee_mode: true,
          tutor_fee_per_student: true,
          tutor_id: true,
          name: true,
        },
      });
```

With:

```typescript
      const sessionClass = await this.prisma.class.findUnique({
        where: { id: existing.class?.id ?? '' },
        include: {
          subject: { select: { name: true } },
          tutor: { include: { user: { select: { name: true } } } },
        },
      });
```

Note: `include` returns all scalar fields (name, fee, room, tutor_id, tutor_fee, tutor_fee_mode, tutor_fee_per_student) plus the relations. This replaces the limited `select`.

- [ ] **Step 2: Spread snapshot data into session update**

At line 250-252 where `tutor_fee_amount` is set, replace:

```typescript
      if (sessionClass?.tutor_fee) {
        data.tutor_fee_amount = sessionClass.tutor_fee;
      }
```

With:

```typescript
      if (sessionClass) {
        if (sessionClass.tutor_fee) {
          data.tutor_fee_amount = sessionClass.tutor_fee;
        }
        Object.assign(data, this.buildSnapshotData(sessionClass));
      }
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/session/session.service.ts
git commit -m "feat(backend): snapshot class data on admin session completion"
```

---

### Task 4: Snapshot on Tutor Completion Path

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts:693-788`

The tutor path at `completeSession()` also fetches class with a limited `select` (line 722-730). Same expansion needed.

- [ ] **Step 1: Expand the class query to include snapshot-required fields**

Replace the class query at lines 722-730:

```typescript
    const classForFee = await this.prisma.class.findUnique({
      where: { id: session.class_id },
      select: {
        tutor_fee: true,
        tutor_fee_mode: true,
        tutor_fee_per_student: true,
        name: true,
      },
    });
```

With:

```typescript
    const classForFee = await this.prisma.class.findUnique({
      where: { id: session.class_id },
      include: {
        subject: { select: { name: true } },
        tutor: { include: { user: { select: { name: true } } } },
      },
    });
```

- [ ] **Step 2: Spread snapshot data into session update**

At lines 734-743, the `prisma.session.update()` call. Replace:

```typescript
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary ?? null,
        ...(tutorFee > 0 ? { tutor_fee_amount: classForFee!.tutor_fee } : {}),
      },
      include: this.sessionInclude,
    });
```

With:

```typescript
    const snapshotData = classForFee ? this.buildSnapshotData(classForFee) : {};

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary ?? null,
        ...(tutorFee > 0 ? { tutor_fee_amount: classForFee!.tutor_fee } : {}),
        ...snapshotData,
      },
      include: this.sessionInclude,
    });
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/session/session.service.ts
git commit -m "feat(backend): snapshot class data on tutor session completion"
```

---

### Task 5: Display Logic — flattenSession() Snapshot-First Fallback

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts:58-74`

Update `flattenSession()` to prefer snapshot values when available.

- [ ] **Step 1: Update flattenSession() with snapshot-first logic**

Replace the current `flattenSession` method (lines 58-74):

```typescript
  private flattenSession(session: any) {
    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            subject: session.class.subject?.name ?? null,
            fee: Number(session.class.fee),
            tutor: session.class.tutor
              ? {
                  id: session.class.tutor.id,
                  name: session.class.tutor.user.name,
                }
              : null,
          }
        : null,
    };
```

With:

```typescript
  private flattenSession(session: any) {
    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            subject: session.snapshot_subject_name ?? session.class.subject?.name ?? null,
            name: session.snapshot_class_name ?? session.class.name,
            fee: Number(session.snapshot_class_fee ?? session.class.fee),
            room: session.snapshot_class_room ?? session.class.room ?? null,
            tutor_fee_mode: session.snapshot_tutor_fee_mode ?? session.class.tutor_fee_mode,
            tutor: session.snapshot_tutor_id
              ? {
                  id: session.snapshot_tutor_id,
                  name: session.snapshot_tutor_name ?? session.class.tutor?.user?.name ?? null,
                }
              : session.class.tutor
                ? {
                    id: session.class.tutor.id,
                    name: session.class.tutor.user.name,
                  }
                : null,
          }
        : null,
    };
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/session/session.service.ts
git commit -m "feat(backend): snapshot-first fallback in flattenSession"
```

---

### Task 6: Display Logic — findOne() Snapshot-First Fallback

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts:168-217`

`findOne()` has its own inline flattening that bypasses `flattenSession()`. Add snapshot-first fallback here too.

- [ ] **Step 1: Add subject include to findOne query**

At lines 171-188, the `include` clause is missing `subject`. Add it:

```typescript
      include: {
        class: {
          include: {
            subject: { select: { name: true } },
            tutor: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        attendances: {
          include: {
            student: { select: { id: true, name: true, grade: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
```

- [ ] **Step 2: Update the inline flattening with snapshot-first logic**

Replace lines 194-208:

```typescript
    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            fee: Number(session.class.fee),
            tutor: session.class.tutor
              ? {
                  id: session.class.tutor.id,
                  name: session.class.tutor.user.name,
                  email: session.class.tutor.user.email,
                }
              : null,
          }
        : null,
```

With:

```typescript
    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            subject: session.snapshot_subject_name ?? session.class.subject?.name ?? null,
            name: session.snapshot_class_name ?? session.class.name,
            fee: Number(session.snapshot_class_fee ?? session.class.fee),
            room: session.snapshot_class_room ?? session.class.room ?? null,
            tutor: session.snapshot_tutor_id
              ? {
                  id: session.snapshot_tutor_id,
                  name: session.snapshot_tutor_name ?? session.class.tutor?.user?.name ?? null,
                  email: session.class.tutor?.user?.email ?? null,
                }
              : session.class.tutor
                ? {
                    id: session.class.tutor.id,
                    name: session.class.tutor.user.name,
                    email: session.class.tutor.user.email,
                  }
                : null,
          }
        : null,
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/session/session.service.ts
git commit -m "feat(backend): snapshot-first fallback in findOne"
```

---

### Task 7: Payout Audit — Use Snapshot Tutor ID

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.service.ts:115-128` (exportAudit)
- Modify: `sinaloka-backend/src/modules/payout/payout.service.ts:179-189` (calculatePayout)

Both methods query sessions by `class: { tutor_id }` which breaks after tutor reassignment. Use OR clause with snapshot_tutor_id fallback.

- [ ] **Step 1: Update exportAudit session query**

Replace lines 117-128:

```typescript
        ? await this.prisma.session.findMany({
            where: {
              institution_id: institutionId,
              class: { tutor_id: payout.tutor_id },
              status: 'COMPLETED',
              tutor_fee_amount: { not: null },
              date: { gte: payout.period_start, lte: payout.period_end },
            },
            include: { class: { select: { name: true } } },
            orderBy: { date: 'asc' },
          })
```

With:

```typescript
        ? await this.prisma.session.findMany({
            where: {
              institution_id: institutionId,
              OR: [
                { snapshot_tutor_id: payout.tutor_id },
                { snapshot_tutor_id: null, class: { tutor_id: payout.tutor_id } },
              ],
              status: 'COMPLETED',
              tutor_fee_amount: { not: null },
              date: { gte: payout.period_start, lte: payout.period_end },
            },
            include: { class: { select: { name: true } } },
            orderBy: { date: 'asc' },
          })
```

- [ ] **Step 2: Update exportAudit class name in session rows**

At line 145, the class name in audit rows. Replace:

```typescript
        s.class?.name ?? '',
```

With:

```typescript
        s.snapshot_class_name ?? s.class?.name ?? '',
```

- [ ] **Step 3: Update calculatePayout session query**

Replace lines 179-189:

```typescript
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
```

With:

```typescript
    const sessions = await this.prisma.session.findMany({
      where: {
        institution_id: institutionId,
        OR: [
          { snapshot_tutor_id: params.tutor_id },
          { snapshot_tutor_id: null, class: { tutor_id: params.tutor_id } },
        ],
        status: 'COMPLETED',
        tutor_fee_amount: { not: null },
        date: { gte: params.period_start, lte: params.period_end },
      },
      include: { class: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/payout/payout.service.ts
git commit -m "feat(backend): use snapshot_tutor_id in payout audit queries"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Full build check**

```bash
cd sinaloka-backend
npm run build
```

Expected: 0 new errors (pre-existing errors may exist).

- [ ] **Step 2: Verify migration file exists**

```bash
ls prisma/migrations/ | tail -1
```

Should show the new migration directory `*_add_session_snapshot_columns`.

- [ ] **Step 3: Verify snapshot columns in generated Prisma client**

```bash
grep -c "snapshot_" generated/prisma/index.d.ts
```

Expected: 8+ matches (one per column in the type definition).

- [ ] **Step 4: Commit any remaining changes**

```bash
git status
# If clean, nothing to do. Otherwise commit remaining files.
```
