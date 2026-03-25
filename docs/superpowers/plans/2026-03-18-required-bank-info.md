# Required Bank Info — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bank_name, bank_account_number, bank_account_holder required when editing tutors (admin), accepting invitations (tutor), and updating tutor profiles (tutor app).

**Architecture:** DTO-level validation changes in 3 Zod schemas (remove `.optional()` and `.nullable()`), plus frontend form updates across 3 files in 2 apps to add `required` attributes and remove null/undefined coercion patterns.

**Tech Stack:** NestJS, Zod (nestjs-zod), React, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-tutor-bank-required-subject-mapping-design.md` (Part 1)

---

### Task 1: Make bank fields required in backend DTOs

**Files:**
- Modify: `sinaloka-backend/src/modules/tutor/tutor.dto.ts:21-23,48-50`
- Modify: `sinaloka-backend/src/modules/invitation/invitation.dto.ts:15-17`

- [ ] **Step 1: Update `UpdateTutorSchema` bank fields**

In `sinaloka-backend/src/modules/tutor/tutor.dto.ts`, find lines 21-23:
```typescript
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
```
Change to:
```typescript
  bank_name: z.string().min(1).max(255),
  bank_account_number: z.string().min(1).max(50),
  bank_account_holder: z.string().min(1).max(255),
```

- [ ] **Step 2: Update `UpdateTutorProfileSchema` bank fields**

In the same file, find lines 48-50:
```typescript
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
```
Change to:
```typescript
  bank_name: z.string().min(1).max(255),
  bank_account_number: z.string().min(1).max(50),
  bank_account_holder: z.string().min(1).max(255),
```

- [ ] **Step 3: Update `AcceptInviteSchema` bank fields**

In `sinaloka-backend/src/modules/invitation/invitation.dto.ts`, find lines 15-17:
```typescript
  bank_name: z.string().max(255).optional(),
  bank_account_number: z.string().max(50).optional(),
  bank_account_holder: z.string().max(255).optional(),
```
Change to:
```typescript
  bank_name: z.string().min(1).max(255),
  bank_account_number: z.string().min(1).max(50),
  bank_account_holder: z.string().min(1).max(255),
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/tutor/tutor.dto.ts sinaloka-backend/src/modules/invitation/invitation.dto.ts
git commit -m "feat(backend): make bank info required in tutor update, profile update, and invitation accept DTOs"
```

---

### Task 2: Update platform TutorForm (admin edit) for required bank fields

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:86-88,156-166`

- [ ] **Step 1: Remove `|| undefined` coercion on bank fields in handleSubmit**

In `sinaloka-platform/src/pages/Tutors.tsx`, find lines 86-88 inside `handleSubmit`:
```typescript
      bank_name: formData.bank_name || undefined,
      bank_account_number: formData.bank_account_number || undefined,
      bank_account_holder: formData.bank_account_holder || undefined,
```
Change to:
```typescript
      bank_name: formData.bank_name,
      bank_account_number: formData.bank_account_number,
      bank_account_holder: formData.bank_account_holder,
```

- [ ] **Step 2: Add `required` to bank field inputs (edit mode)**

Find the bank input fields (around lines 156-166). For each of the 3 bank inputs, add `required` when in edit mode. Find each Input for bank_name, bank_account_number, bank_account_holder and add `required={isEditing}`.

Example — find:
```tsx
          <Input id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder={t('tutors.form.bankNamePlaceholder')} />
```
Change to:
```tsx
          <Input id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder={t('tutors.form.bankNamePlaceholder')} required={isEditing} />
```

Apply the same `required={isEditing}` to `bank_account_number` and `bank_account_holder` inputs.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "feat(platform): make bank info required in tutor edit form"
```

---

### Task 3: Update sinaloka-tutors AcceptInvitePage for required bank fields

**Files:**
- Modify: `sinaloka-tutors/src/pages/AcceptInvitePage.tsx:94-96`

- [ ] **Step 1: Remove `|| undefined` coercion on bank fields in handleSubmit**

In `sinaloka-tutors/src/pages/AcceptInvitePage.tsx`, find lines 94-96 inside the submit handler:
```typescript
        bank_name: bankName || undefined,
        bank_account_number: bankAccountNumber || undefined,
        bank_account_holder: bankAccountHolder || undefined,
```
Change to:
```typescript
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
```

- [ ] **Step 2: Change section label from optional to required**

Find the text "Info Bank (Opsional)" or similar optional label in the form and change it to "Info Bank" (remove the optional indicator).

- [ ] **Step 3: Add `required` to bank input fields**

Find the 3 bank input fields and add `required` attribute to each one.

- [ ] **Step 4: Add frontend validation**

In the submit handler, add validation before the API call:
```typescript
if (!bankName || !bankAccountNumber || !bankAccountHolder) {
  // Show error or return early — bank info is required
  return;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npm run lint`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add sinaloka-tutors/src/pages/AcceptInvitePage.tsx
git commit -m "feat(tutors): make bank info required in invitation acceptance form"
```

---

### Task 4: Update sinaloka-tutors ProfileEditPage for required bank fields

**Files:**
- Modify: `sinaloka-tutors/src/pages/ProfileEditPage.tsx:36-38`

- [ ] **Step 1: Remove `|| null` coercion on bank fields in handleSubmit**

In `sinaloka-tutors/src/pages/ProfileEditPage.tsx`, find lines 36-38 inside the submit handler:
```typescript
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_holder: bankAccountHolder || null,
```
Change to:
```typescript
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
```

- [ ] **Step 2: Add `required` to bank input fields**

Find the 3 bank input fields and add `required` attribute to each one.

- [ ] **Step 3: Add frontend validation**

In the submit handler, add validation before the API call:
```typescript
if (!bankName || !bankAccountNumber || !bankAccountHolder) {
  return;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd sinaloka-tutors && npm run lint`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-tutors/src/pages/ProfileEditPage.tsx
git commit -m "feat(tutors): make bank info required in tutor profile edit form"
```

---

### Task 5: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 2: Run platform build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run tutors build**

Run: `cd sinaloka-tutors && npm run build`
Expected: Build succeeds
