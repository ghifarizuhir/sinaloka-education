# Tutor Form UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve three tutor form fields: subjects (searchable multi-select), rating (remove from form), experience (number input).

**Architecture:** Add a reusable `MultiSelect` component to UI.tsx, then update Tutors.tsx to use it for subjects, remove the rating slider, and replace the experience slider with a number input. Update E2E page object to match new form interactions.

**Tech Stack:** React, TypeScript, TailwindCSS, Playwright (E2E)

**Spec:** `docs/superpowers/specs/2026-03-18-tutor-form-ux-improvements-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/UI.tsx` | Add reusable `MultiSelect` component |
| `src/pages/Tutors.tsx` | Update form (subjects, rating, experience), update card/table rating display |
| `src/locales/en.json` | Add `tutors.noRatings` key |
| `src/locales/id.json` | Add `tutors.noRatings` key |
| `e2e/pages/tutors.page.ts` | Update form interactions for MultiSelect, remove rating from interface |
| `e2e/specs/crud/tutors.crud.spec.ts` | Update test data (subjects string → array) |

---

### Task 1: Add MultiSelect Component to UI.tsx

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx`

- [ ] **Step 1: Read UI.tsx to find the right insertion point**

Read the end of the file to find where to add the new component. The component should be added after existing exports.

- [ ] **Step 2: Add `useRef` to React imports**

The current UI.tsx imports `useState` and `useEffect` but NOT `useRef`. Update the React import at line 1:
```tsx
import React, { useState, useEffect, useRef } from 'react';
```

- [ ] **Step 3: Add the MultiSelect component**

Add the following component to `UI.tsx`:

```tsx
// ── MultiSelect ──
export const MultiSelect = ({ options, selected, onChange, placeholder = 'Search...' }: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(
    o => !selected.includes(o.id) && o.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedOptions = options.filter(o => selected.includes(o.id));

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[42px] max-h-32 overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selectedOptions.map(o => (
          <span key={o.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {o.label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(selected.filter(id => id !== o.id)); }}
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-sm bg-transparent border-none outline-none placeholder:text-zinc-400 dark:text-zinc-100"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-400">No options found</div>
          ) : filtered.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange([...selected, o.id]); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors dark:text-zinc-300"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "feat(ui): add reusable MultiSelect component with search and chips"
```

---

### Task 2: Add i18n Keys

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

> **Rationale**: i18n keys must exist before they are referenced in Tasks 3-4 to keep each commit in a buildable state.

- [ ] **Step 1: Add `tutors.noRatings` to en.json**

In the `tutors` section, add after `tutors.specialist`:
```json
"noRatings": "No ratings yet",
```

- [ ] **Step 2: Add `tutors.noRatings` to id.json**

Same location:
```json
"noRatings": "Belum ada penilaian",
```

- [ ] **Step 3: Update experience label key**

Check if `tutors.form.yearsOfExperience` contains `({{value}})`. If so, update it:

In en.json:
```json
"yearsOfExperience": "Years of Experience"
```
In id.json:
```json
"yearsOfExperience": "Tahun Pengalaman"
```

(Remove the `({{value}})` part since the slider is gone.)

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "fix(i18n): add tutors.noRatings key, update experience label format"
```

---

### Task 3: Update Tutor Form — Subjects, Rating, Experience

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Update imports**

In the import from `'../components/UI'` (line 26-34):
- **Add** `MultiSelect` to the named imports
- **Remove** `Slider` from the named imports (both slider usages are being removed in this task)

- [ ] **Step 2: Remove `rating` from formData state**

In the `TutorForm` component (line 57-69), change:
```tsx
rating: initialData?.rating ?? 4.5,
```
to: remove this line entirely. The `formData` state should no longer include `rating`.

- [ ] **Step 3: Update handleSubmit to not send rating**

Change line 83:
```tsx
...(isEditing ? { rating: Number(formData.rating), is_verified: formData.is_verified } : {}),
```
To:
```tsx
...(isEditing ? { is_verified: formData.is_verified } : {}),
```

- [ ] **Step 4: Replace subjects pill checkboxes with MultiSelect**

Replace the subjects section (lines 102-128):
```tsx
<div className="space-y-2">
  <Label>{t('tutors.form.subjects')}</Label>
  <div className="flex flex-wrap gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg min-h-[42px]">
    {(subjectsList ?? []).map(subject => (
      ...pill checkboxes...
    ))}
  </div>
</div>
```
With:
```tsx
<div className="space-y-2 sm:col-span-2">
  <Label>{t('tutors.form.subjects')}</Label>
  <MultiSelect
    options={(subjectsList ?? []).map(s => ({ id: s.id, label: s.name }))}
    selected={formData.subject_ids}
    onChange={(ids) => setFormData(prev => ({ ...prev, subject_ids: ids }))}
    placeholder={t('common.search') + '...'}
  />
</div>
```

Note: Add `sm:col-span-2` so the MultiSelect takes full width in the 2-column grid.

- [ ] **Step 5: Remove rating slider block**

Remove the entire rating slider section (lines 132-149):
```tsx
{isEditing && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label>{t('tutors.form.rating', { value: Number(formData.rating).toFixed(1) })}</Label>
      ...stars...
    </div>
    <Slider ... />
  </div>
)}
```

- [ ] **Step 6: Replace experience slider with number input**

Replace the experience slider section (lines 151-159):
```tsx
<div className="space-y-3">
  <Label htmlFor="experience_years">{t('tutors.form.yearsOfExperience', { value: formData.experience_years })}</Label>
  <Slider
    value={formData.experience_years}
    min={0}
    max={30}
    onChange={(val: number) => setFormData(prev => ({ ...prev, experience_years: val }))}
  />
</div>
```
With:
```tsx
<div className="space-y-2">
  <Label htmlFor="experience_years">{t('tutors.form.yearsOfExperience')}</Label>
  <Input
    id="experience_years"
    name="experience_years"
    type="number"
    min={0}
    max={50}
    step={1}
    value={formData.experience_years}
    onChange={(e) => setFormData(prev => ({ ...prev, experience_years: Number(e.target.value) || 0 }))}
    placeholder="e.g. 5"
  />
</div>
```

> Note: Task 2 already updated the i18n key to remove `({{value}})`, so the label is now a clean static string.

- [ ] **Step 7: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "fix(tutors): replace subjects pills with MultiSelect, remove rating slider, use number input for experience"
```

---

### Task 4: Update Rating Display on Cards and Table

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Update grid view card rating display**

Find the rating display in grid cards (around line 509-513):
```tsx
<div>
  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">{t('tutors.card.rating')}</p>
  <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
    <Star size={12} className="text-amber-400 fill-amber-400" /> {(tutor.rating ?? 0).toFixed(1)}
  </p>
</div>
```
Replace with:
```tsx
<div>
  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">{t('tutors.card.rating')}</p>
  <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
    {(tutor.rating ?? 0) > 0 ? (
      <><Star size={12} className="text-amber-400 fill-amber-400" /> {tutor.rating.toFixed(1)}</>
    ) : (
      <span className="text-xs text-zinc-400 font-normal">{t('tutors.noRatings')}</span>
    )}
  </p>
</div>
```

- [ ] **Step 2: Update list view table rating display**

Find the rating display in the table (around line 556-559):
```tsx
<td className="px-6 py-4">
  <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
    <Star size={14} fill="currentColor" /> {(tutor.rating ?? 0).toFixed(1)}
  </div>
</td>
```
Replace with:
```tsx
<td className="px-6 py-4">
  {(tutor.rating ?? 0) > 0 ? (
    <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
      <Star size={14} fill="currentColor" /> {tutor.rating.toFixed(1)}
    </div>
  ) : (
    <span className="text-xs text-zinc-400">{t('tutors.noRatings')}</span>
  )}
</td>
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "fix(tutors): show 'No ratings yet' when rating is 0 on cards and table"
```

---

### Task 5: Update E2E Page Object and Test Data

**Files:**
- Modify: `sinaloka-platform/e2e/pages/tutors.page.ts`
- Modify: `sinaloka-platform/e2e/specs/crud/tutors.crud.spec.ts`

- [ ] **Step 1: Update TutorFormData interface**

Change:
```typescript
export interface TutorFormData {
  name: string;
  email: string;
  password?: string;
  subjects: string; // comma-separated, e.g. "Math, Physics"
  experience_years?: number;
  rating?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
}
```
To:
```typescript
export interface TutorFormData {
  name: string;
  email: string;
  password?: string;
  subjects: string[]; // subject names to select, e.g. ["Math", "Physics"]
  experience_years?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
}
```

Changes: `subjects` type from `string` to `string[]`, removed `rating`.

- [ ] **Step 2: Update createTutor method for MultiSelect**

Replace line 38:
```typescript
await this.modal.getByLabel(/subjects/i).fill(data.subjects);
```
With:
```typescript
// Select subjects via MultiSelect
for (const subject of data.subjects) {
  const input = this.modal.locator('input[placeholder*="Search"], input[placeholder*="Cari"]');
  await input.fill(subject);
  await this.modal.locator('button').filter({ hasText: subject }).click();
}
```

- [ ] **Step 3: Update editTutor method for MultiSelect**

Replace line 51:
```typescript
if (data.subjects) await this.modal.getByLabel(/subjects/i).fill(data.subjects);
```
With:
```typescript
if (data.subjects) {
  for (const subject of data.subjects) {
    const input = this.modal.locator('input[placeholder*="Search"], input[placeholder*="Cari"]');
    await input.fill(subject);
    await this.modal.locator('button').filter({ hasText: subject }).click();
  }
}
```

- [ ] **Step 4: Update createTutor submit button text**

Line 42 currently clicks `register tutor` — verify this still matches. After our terminology standardization, the button text should be "Send Invitation" (`tutors.form.sendInvitation`). Update the locator if needed:
```typescript
await this.modal.getByRole('button', { name: /send invitation/i }).click();
```

- [ ] **Step 5: Update E2E spec test data**

In `sinaloka-platform/e2e/specs/crud/tutors.crud.spec.ts`, find all `createTutor` and `editTutor` calls that pass `subjects` as a comma-separated string (e.g. `subjects: 'Chemistry, Biology'`) and change to an array (e.g. `subjects: ['Chemistry', 'Biology']`).

Also remove any `rating` fields from test data objects.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/e2e/pages/tutors.page.ts sinaloka-platform/e2e/specs/crud/tutors.crud.spec.ts
git commit -m "fix(e2e): update tutor page object and test data for MultiSelect and removed rating"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run type check**

```bash
cd sinaloka-platform && npm run lint
```
Expected: PASS

- [ ] **Step 2: Run build**

```bash
cd sinaloka-platform && npm run build
```
Expected: PASS

- [ ] **Step 3: Visual spot check (manual)**

Start dev server and verify:
- Add Tutor modal: subjects shows searchable dropdown, no rating slider, experience is number input
- Edit Tutor modal: same as above, no rating slider
- Grid view cards: rating shows "No ratings yet" for tutors with 0 rating
- Table view: same "No ratings yet" treatment
- MultiSelect: typing filters, chips appear, × removes, Escape closes dropdown
