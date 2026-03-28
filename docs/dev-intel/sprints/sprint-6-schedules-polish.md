---
title: "Sprint 6: Backend & Tutors App Polish"
source: docs/dev-intel/audits/audit-2026-03-28-schedules.md
scope: CLS-06, CLS-14, CLS-17, SA-015, SA-016, SA-017, SA-019
---

# Sprint 6: Backend & Tutors App Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix i18n gaps in platform, add safety limits to backend, improve error handling and toast UX in tutors app.

**Architecture:** Small, independent fixes across platform (i18n), backend (validation/limits), and tutors (UX polish).

**Tech Stack:** NestJS, React, TypeScript, i18next

---

## Task 1: CLS-06 — i18n for ClassFormModal Fee Labels

**Problem:** Fee label and helper text in `ClassFormModal` are hardcoded in Indonesian (`'Tarif per sesi'`, `'Biaya bulanan'`), not using the `t()` i18n function.

**Fix:** Replace hardcoded strings with i18n keys.

**Files changed:**
- `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx`
- `sinaloka-platform/public/locales/id/translation.json` (or equivalent i18n file)
- `sinaloka-platform/public/locales/en/translation.json` (or equivalent)

### Steps

- [ ] **Step 1: Find and update hardcoded strings**

```typescript
// FILE: sinaloka-platform/src/pages/Classes/ClassFormModal.tsx
// Lines 108-111 — REPLACE:
//   const feeLabel = billingMode === 'PER_SESSION' ? 'Tarif per sesi' : 'Biaya bulanan';
//   const feeHelper = billingMode === 'PER_SESSION'
//     ? 'Siswa ditagih nominal ini setiap hadir di sesi kelas'
//     : 'Siswa ditagih nominal ini setiap awal bulan';
// WITH:
const feeLabel = billingMode === 'PER_SESSION' ? t('classes.form.feePerSession') : t('classes.form.feeMonthly');
const feeHelper = billingMode === 'PER_SESSION'
  ? t('classes.form.feePerSessionHelper')
  : t('classes.form.feeMonthlyHelper');
```

Ensure the component has access to `t` — check if `useTranslation()` is already imported/used. If not, add it.

- [ ] **Step 2: Add i18n keys to locale files**

Find the translation JSON files and add:

```json
{
  "classes": {
    "form": {
      "feePerSession": "Tarif per sesi",
      "feeMonthly": "Biaya bulanan",
      "feePerSessionHelper": "Siswa ditagih nominal ini setiap hadir di sesi kelas",
      "feeMonthlyHelper": "Siswa ditagih nominal ini setiap awal bulan"
    }
  }
}
```

For English locale, add English translations.

- [ ] **Step 3: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix(platform): use i18n for ClassFormModal fee labels (CLS-06)"
```

---

## Task 2: CLS-14 — i18n for ScheduleWeekPreview Day Labels

**Problem:** Day abbreviations (`Sen`, `Sel`, `Rab`, etc.) and conflict tooltip are hardcoded in Indonesian.

**Fix:** Use i18n for day labels and tooltip text.

**Files changed:**
- `sinaloka-platform/src/components/ScheduleWeekPreview.tsx`
- `sinaloka-platform/public/locales/*/translation.json`

### Steps

- [ ] **Step 1: Replace hardcoded day labels**

```typescript
// FILE: sinaloka-platform/src/components/ScheduleWeekPreview.tsx
// Lines 6-9 — The DAY_SHORT map is hardcoded
// REPLACE with i18n:
// Use t(`days.short.${day}`) pattern, or use date-fns/locale for day names

// Also fix line ~129:
// FROM: title={conflictWith ? `Bentrok dengan ${conflictWith}` : ...}
// TO:   title={conflictWith ? t('schedulePreview.conflictWith', { name: conflictWith }) : ...}
```

Add `useTranslation` hook if not already present. Add keys to locale files.

- [ ] **Step 2: Add i18n keys**

```json
{
  "days": {
    "short": {
      "Monday": "Sen",
      "Tuesday": "Sel",
      "Wednesday": "Rab",
      "Thursday": "Kam",
      "Friday": "Jum",
      "Saturday": "Sab",
      "Sunday": "Min"
    }
  },
  "schedulePreview": {
    "conflictWith": "Bentrok dengan {{name}}"
  }
}
```

- [ ] **Step 3: Build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix(platform): use i18n for ScheduleWeekPreview labels (CLS-14)"
```

---

## Task 3: CLS-17 — Add Session Generation Limit

**Problem:** `generateSessions` has no upper bound. A large date range could generate thousands of sessions in one transaction.

**Fix:** Add a limit of 200 sessions per generation call.

**Files changed:**
- `sinaloka-backend/src/modules/session/session.service.ts`

### Steps

- [ ] **Step 1: Add limit check before createMany**

```typescript
// FILE: sinaloka-backend/src/modules/session/session.service.ts
// In generateSessions method, after building sessionsToCreate array
// but before the createMany call (around line 470):

const MAX_SESSIONS_PER_GENERATE = 200;
if (sessionsToCreate.length > MAX_SESSIONS_PER_GENERATE) {
  throw new BadRequestException(
    `Cannot generate more than ${MAX_SESSIONS_PER_GENERATE} sessions at once. ` +
    `Requested: ${sessionsToCreate.length}. Please use a shorter date range.`
  );
}
```

Make sure to import `BadRequestException` from `@nestjs/common`.

- [ ] **Step 2: Test and build**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=session && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(session): add limit of 200 to session generation (CLS-17)"
```

---

## Task 4: SA-015 — Parallelize Payment Generation Loop

**Problem:** `batchCreate` generates payments sequentially with `for...of await`. For classes with many present students, this is an N+1 pattern.

**Fix:** Use `Promise.all` for parallel execution. Same fix in `adminBatchCreate`.

**Files changed:**
- `sinaloka-backend/src/modules/attendance/attendance.service.ts`

### Steps

- [ ] **Step 1: Parallelize payment generation in batchCreate**

```typescript
// FILE: sinaloka-backend/src/modules/attendance/attendance.service.ts
// Lines 80-90 — REPLACE sequential loop:
//   for (const record of presentRecords) {
//     await this.invoiceGenerator.generatePerSessionPayment(...);
//   }
// WITH:
await Promise.all(
  presentRecords.map((record) =>
    this.invoiceGenerator.generatePerSessionPayment({
      sessionId: dto.session_id,
      studentId: record.student_id,
      institutionId,
      fee: session.class.fee,
      className: session.class.name,
      sessionDate: session.date,
    }),
  ),
);
```

Apply the same pattern to `adminBatchCreate` (around lines 158-168).

- [ ] **Step 2: Test and build**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=attendance && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "perf(attendance): parallelize payment generation loop (SA-015)"
```

---

## Task 5: SA-016 — Fix Silent Error Swallowing in SessionDetailPage

**Problem:** `.catch(() => {})` silently swallows API errors. User sees empty data with no error indication.

**Fix:** Add error state and show error message to user.

**Files changed:**
- `sinaloka-tutors/src/pages/SessionDetailPage.tsx`

### Steps

- [ ] **Step 1: Replace silent catch with error handling**

```typescript
// FILE: sinaloka-tutors/src/pages/SessionDetailPage.tsx
// Line 35 — REPLACE:
//   .catch(() => {})
// WITH:
.catch((err) => {
  console.error('Failed to load session students:', err);
  // Set an error state if one exists, or at minimum log the error
  // so it's visible in dev tools
})
```

If the component has a way to show error state (check for existing error state variables), use it. Otherwise, at minimum remove the silent catch and let the error be logged.

- [ ] **Step 2: Build**

```bash
cd sinaloka-tutors && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(tutors): log errors instead of silently swallowing in SessionDetailPage (SA-016)"
```

---

## Task 6: SA-017 — Add Past Date Validation to CreateSessionSchema

**Problem:** Admin can create sessions for past dates, which immediately appear as "incomplete" in the frontend.

**Fix:** Add date validation to reject past dates in `CreateSessionSchema`.

**Files changed:**
- `sinaloka-backend/src/modules/session/session.dto.ts`

### Steps

- [ ] **Step 1: Add past date validation**

```typescript
// FILE: sinaloka-backend/src/modules/session/session.dto.ts
// In CreateSessionSchema, update the date field:
// FROM:
//   date: z.coerce.date(),
// TO:
date: z.coerce.date().refine(
  (d) => d >= new Date(new Date().toDateString()),
  { message: 'Session date cannot be in the past' },
),
```

Note: `new Date(new Date().toDateString())` gets today at midnight, so sessions today are allowed but yesterday is rejected.

- [ ] **Step 2: Test and build**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=session && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(session): reject past dates in CreateSessionSchema (SA-017)"
```

---

## Task 7: SA-019 — Fix Toast Styling in Tutors App

**Problem:** All toasts in the tutors app use green success styling (`bg-brand` + `CheckCircle2` icon), even for error messages.

**Fix:** Add a toast type parameter and use red styling + error icon for error toasts.

**Files changed:**
- `sinaloka-tutors/src/App.tsx`

### Steps

- [ ] **Step 1: Add toast type support**

Read the current toast implementation in `App.tsx` (around lines 276-289). The current notification state likely has a `message` field. Add a `type` field:

```typescript
// In the notification state type, add:
type: 'success' | 'error';

// In the toast display (motion.div), conditionally style:
// success → bg-brand (green) + CheckCircle2
// error → bg-red-500 + XCircle (or AlertCircle)

// Update all showNotification/setNotification calls:
// Success calls: { message: '...', type: 'success' }
// Error calls: { message: '...', type: 'error' }
```

Search the file for all places that set the notification and add the correct type.

- [ ] **Step 2: Build**

```bash
cd sinaloka-tutors && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(tutors): differentiate error and success toast styling (SA-019)"
```
