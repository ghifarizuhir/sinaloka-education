# Tutors Page Bug Fixes — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** sinaloka-platform (frontend only)

## Problem

Three UI bugs found during manual testing of the Tutors page (`/tutors`):

1. **Modal X button and Escape key don't close modals** — The Edit Detail Tutor and Undang Tutor Baru modals can only be closed via the "Batal" button. The X button click gets swallowed by event propagation, and no Escape key handler exists.

2. **Card three-dot menu uses CSS hover instead of click** — The `...` menu on tutor cards/rows uses `group-hover/menu` CSS pattern, making it unreliable (doesn't work on touch, hard to click items). Needs to be a click-based toggle.

3. **"Spesialis" text wraps awkwardly on cards** — For tutors with long subject lists (e.g., "Bahasa Inggris, Bahasa Indonesia Spesialis"), the text overflows and "Spesialis" lands on its own line.

## Files Changed

| File | Changes |
|------|---------|
| `sinaloka-platform/src/components/UI.tsx` | Modal: add Escape key handler, fix event propagation |
| `sinaloka-platform/src/pages/Tutors.tsx` | Dropdown: hover→click toggle; Subject text: add truncation |

## Fix 1: Modal Close — Escape Key + X Button

**File:** `sinaloka-platform/src/components/UI.tsx` (Modal component)

### Changes

1. Add a `useEffect` that listens for `keydown` on `document`:
   - When `event.key === 'Escape'`, call `onClose()`
   - Cleanup listener on unmount or when `onClose` changes

2. Add `e.stopPropagation()` on the modal content container's `onClick` handler to prevent clicks inside the modal from bubbling to the backdrop overlay's `onClick={onClose}`.

### Acceptance Criteria
- Pressing Escape closes any open modal
- Clicking the X button closes the modal
- Clicking inside the modal content does NOT close it
- Clicking the backdrop still closes it

## Fix 2: Click-Based Dropdown Menu

**File:** `sinaloka-platform/src/pages/Tutors.tsx`

### Changes

1. Add state: `const [openMenuId, setOpenMenuId] = useState<string | null>(null)`

2. Replace CSS `group-hover/menu` visibility with conditional rendering:
   - Button `onClick`: toggle `openMenuId === tutor.id ? null : tutor.id`
   - Menu div: render only when `openMenuId === tutor.id`
   - Remove `group/menu`, `group-hover/menu:opacity-100`, `group-hover/menu:visible`, `opacity-0`, `invisible` classes

3. Add click-outside handler:
   - `useEffect` with `mousedown` listener on `document`
   - Sets `openMenuId` to `null` when clicking outside
   - Cleanup on unmount

4. Close menu after action:
   - When "Edit Profil" or "Hapus Tutor" is clicked, set `openMenuId` to `null` before executing the action

5. Apply to **both** grid view (card) and list view (table row) sections.

### Acceptance Criteria
- Clicking `...` opens the menu
- Clicking `...` again closes it
- Clicking outside closes it
- Clicking a menu item closes the menu and executes the action
- Works identically in grid and list views

## Fix 3: Subject Text Truncation

**File:** `sinaloka-platform/src/pages/Tutors.tsx`

### Changes

1. Add `truncate` Tailwind class to the `<p>` element rendering subjects + "Spesialis" in grid view
2. Add `title` attribute with the full untruncated text for hover tooltip

### Acceptance Criteria
- Long subject text truncates with ellipsis on one line
- Full text visible on hover via native tooltip
- Card height remains consistent across all tutors

## What's NOT Changing

- No new dependencies
- No backend changes
- Subject filter dropdown (native `<select>`) — works correctly
- Modal animation and styling unchanged
- Sort functionality unchanged
- Add/Edit form fields unchanged

## Testing

- Manual browser test: verify all 3 fixes in both grid and list views
- Run `npm run lint` (TypeScript type-check)
- Run `npm run build` to ensure no build errors
