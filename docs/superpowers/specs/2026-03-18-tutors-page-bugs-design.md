# Tutors Page Bug Fixes — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** sinaloka-platform (frontend only)

## Problem

Three UI bugs found during manual testing of the Tutors page (`/tutors`):

1. **Modal Escape key doesn't close modals** — No keyboard handler exists for Escape in Modal, ConfirmDialog, or Drawer components.

2. **Card three-dot menu uses CSS hover instead of click** — The `...` menu on tutor cards/rows uses `group-hover/menu` CSS pattern, making it unreliable (doesn't work on touch, hard to click items). Needs to be a click-based toggle.

3. **"Spesialis" text wraps awkwardly on cards** — For tutors with long subject lists (e.g., "Bahasa Inggris, Bahasa Indonesia Spesialis"), the text overflows and "Spesialis" lands on its own line.

## Files Changed

| File | Changes |
|------|---------|
| `sinaloka-platform/src/components/UI.tsx` | Extract `useOverlayClose` hook; apply to Modal, ConfirmDialog, Drawer |
| `sinaloka-platform/src/pages/Tutors.tsx` | Dropdown: hover→click toggle; Subject text: add truncation |

## Fix 1: Overlay Escape Key Handler

**File:** `sinaloka-platform/src/components/UI.tsx`

### Root Cause

The Modal, ConfirmDialog, and Drawer components all share the same overlay pattern (backdrop + content) but none have an Escape key listener. The X button and backdrop click work correctly due to sibling DOM structure (backdrop and content are siblings, not parent-child).

### Changes

1. Create a `useOverlayClose` hook that:
   - Accepts `isOpen: boolean` and `onClose: () => void`
   - Adds a `keydown` listener on `document` when `isOpen` is true
   - Calls `onClose()` when `event.key === 'Escape'`
   - Cleans up listener on unmount or when dependencies change

2. Convert Modal from arrow-function component to a function component that can use hooks, and call `useOverlayClose(isOpen, onClose)`.

3. Convert ConfirmDialog from arrow-function component to a function component and call `useOverlayClose(isOpen, onClose)`.

4. Convert Drawer from arrow-function component to a function component and call `useOverlayClose(isOpen, onClose)`.

### Acceptance Criteria
- Pressing Escape closes any open Modal, ConfirmDialog, or Drawer
- X button still works (Modal, Drawer)
- Backdrop click still works
- Cancel/Batal buttons still work

## Fix 2: Click-Based Dropdown Menu

**File:** `sinaloka-platform/src/pages/Tutors.tsx`

### Changes

1. Add state: `const [openMenuId, setOpenMenuId] = useState<string | null>(null)` (verify `tutor.id` type and match accordingly)

2. Replace CSS `group-hover/menu` visibility with conditional rendering:
   - Button `onClick`: toggle `openMenuId === tutor.id ? null : tutor.id`
   - Menu div: render only when `openMenuId === tutor.id`
   - Remove `group/menu`, `group-hover/menu:opacity-100`, `group-hover/menu:visible`, `opacity-0`, `invisible` classes

3. Add click-outside handler using ref-based approach:
   - Use `useRef` on each menu container
   - `useEffect` with `mousedown` listener on `document`
   - Check if `event.target` is outside the menu ref before closing
   - This prevents the menu from being removed from DOM before menu item `click` fires

4. Add Escape key handler:
   - When a dropdown is open, pressing Escape closes it (set `openMenuId` to `null`)

5. Close menu after action:
   - When "Edit Profil" or "Hapus Tutor" is clicked, set `openMenuId` to `null` before executing the action

6. Apply to **both** grid view (card) and list view (table row) sections.

### Acceptance Criteria
- Clicking `...` opens the menu
- Clicking `...` again closes it (toggle)
- Clicking outside closes it
- Pressing Escape closes it
- Clicking a menu item closes the menu and executes the action
- Only one menu can be open at a time
- Works identically in grid and list views

## Fix 3: Subject Text Truncation

**File:** `sinaloka-platform/src/pages/Tutors.tsx`

### Changes

1. Add `min-w-0` to the parent flex container of the subject text (required for `truncate` to work inside flex layouts)
2. Add `truncate` Tailwind class to the `<p>` element rendering subjects + "Spesialis" in grid view
3. Add `title` attribute with the full untruncated text for hover tooltip

### Acceptance Criteria
- Long subject text truncates with ellipsis on one line
- Full text visible on hover via native tooltip
- Card height remains consistent across all tutors
- Truncation works at various viewport widths

## What's NOT Changing

- No new dependencies
- No backend changes
- Subject filter dropdown (native `<select>`) — works correctly
- Modal animation and styling unchanged
- Sort functionality unchanged
- Add/Edit form fields unchanged
- Focus trapping (noted as follow-up accessibility concern)

## Testing

- Manual browser test: verify all 3 fixes in both grid and list views
- Test Escape key on Modal, ConfirmDialog, and Drawer
- Test dropdown click behavior on both grid and list views
- Run `npm run lint` (TypeScript type-check)
- Run `npm run build` to ensure no build errors
