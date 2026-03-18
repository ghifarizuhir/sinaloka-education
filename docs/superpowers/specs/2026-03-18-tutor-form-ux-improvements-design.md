# Tutor Form UX Improvements Design

**Date**: 2026-03-18
**Scope**: sinaloka-platform — Tutors.tsx form (add/edit), UI.tsx (new MultiSelect component)
**Goal**: Improve three form fields that don't scale or serve their purpose well: subjects (pill checkboxes → searchable multi-select), rating (slider → remove from form), experience (slider → number input).

---

## Problem

1. **Subjects**: Current pill-style checkboxes render all subjects inline. Works for 3-5 subjects, becomes unusable at 20+. No search/filter capability.
2. **Rating**: Slider (0-5, step 0.1) allows manual editing, but there's no scoring module yet. Manually setting a rating is meaningless and misleading. Defaults to 4.5 on create which is arbitrary.
3. **Experience**: Slider (0-30) is imprecise for number input — hard to land on exact values. A simple number input is faster and more accurate.

---

## Change 1: Subjects — Searchable Multi-Select with Chips

**Replace** the current pill checkbox grid (Tutors.tsx lines ~103-128) with a searchable dropdown component.

### Behavior

- Text input with placeholder "Search subjects..."
- Typing filters the dropdown list in real-time (case-insensitive match)
- Clicking a subject in the dropdown adds it as a chip/tag below the input and removes it from the dropdown
- Each chip displays the subject name with an `×` button to remove
- Dropdown closes on click outside or Escape key
- Dropdown opens on input focus
- When all subjects are selected, dropdown shows empty state
- Minimum 1 subject required (existing validation unchanged)

### Component

Create a reusable `MultiSelect` component in `src/components/UI.tsx` with props:

```typescript
interface MultiSelectProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}
```

### Data Flow

No backend changes. Still sends `subject_ids: string[]` in the create/update request. The `useSubjects()` hook already provides the subject list.

---

## Change 2: Rating — Remove from Form, Read-Only Display

### Form Changes

- **Remove** the rating slider from the TutorForm component entirely (Tutors.tsx lines ~132-150)
- **Remove** `rating` from `formData` state initialization
- **Do not send** `rating` in update requests

### Display Changes

- On tutor cards/table, when `rating === 0`: show "No ratings yet" (gray text, no stars)
- When `rating > 0`: show filled stars as before (this path will only trigger once a scoring module populates it)

### Database

- **Keep** `rating` field in Prisma schema (`Float @default(0)`)
- Default stays at 0 for new tutors (not 4.5)
- Field will be populated by a future scoring/review module

### i18n

Add key `tutors.noRatings`: "No ratings yet" (en) / "Belum ada penilaian" (id)

---

## Change 3: Experience — Simple Number Input

**Replace** the slider (Tutors.tsx lines ~151-159) with a standard number input.

### Behavior

- `<Input type="number" min={0} max={50} />`
- Placeholder: "e.g. 5"
- Label: "Years of Experience" (static label, no dynamic value display)
- User types exact number — no slider imprecision
- Same backend validation: `z.number().int().min(0)`

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/Tutors.tsx` | Replace subjects UI with MultiSelect, remove rating slider, replace experience slider with number input, update rating display on cards |
| `src/components/UI.tsx` | Add `MultiSelect` component |
| `src/locales/en.json` | Add `tutors.noRatings` key |
| `src/locales/id.json` | Add `tutors.noRatings` key |

## No Backend Changes

- Prisma schema unchanged (rating field stays with default 0)
- Tutor DTOs unchanged
- API endpoints unchanged

## Out of Scope

- Rating/scoring module (future feature)
- Changes to tutor invitation acceptance form (sinaloka-tutors app)
- Changes to tutor profile edit (sinaloka-tutors app)
- Subject CRUD management (already exists in settings)
