# Tutors Page Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 UI bugs on the Tutors page: missing Escape key on overlays, hover-based dropdown menus, and text truncation on cards.

**Architecture:** Add a shared `useOverlayClose` hook to UI.tsx for Escape key handling across Modal/ConfirmDialog/Drawer. Convert hover-based dropdown to click-based with ref-based click-outside detection in Tutors.tsx. Add CSS truncation with flex layout fix for subject text.

**Tech Stack:** React, TailwindCSS v4, Framer Motion, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-tutors-page-bugs-design.md`

---

### Task 1: Add `useOverlayClose` hook and apply to Modal

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx:1` (import `useEffect`)
- Modify: `sinaloka-platform/src/components/UI.tsx:173-208` (Modal component)

- [ ] **Step 1: Add the `useOverlayClose` hook above the Modal component**

Add after line 171 (after `Skeleton` component), before `Modal`:

```typescript
function useOverlayClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
```

- [ ] **Step 2: Update the import on line 1**

Change:
```typescript
import React, { useState } from 'react';
```
To:
```typescript
import React, { useState, useEffect } from 'react';
```

- [ ] **Step 3: Convert Modal from arrow function to function declaration and add hook**

Replace lines 173-208 with:

```tsx
export function Modal({ isOpen, onClose, title, children, className }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, className?: string }) {
  useOverlayClose(isOpen, onClose);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            className={cn("relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden", className)}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xl font-bold dark:text-zinc-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "fix(platform): add useOverlayClose hook and Escape key support to Modal"
```

---

### Task 2: Apply `useOverlayClose` to ConfirmDialog and Drawer

**Files:**
- Modify: `sinaloka-platform/src/components/UI.tsx:210-276` (ConfirmDialog)
- Modify: `sinaloka-platform/src/components/UI.tsx:278-314` (Drawer)

- [ ] **Step 1: Convert ConfirmDialog to function declaration and add hook**

Replace the ConfirmDialog arrow function (lines 210-276) with a function declaration. Add `useOverlayClose(isOpen, onClose);` as the first line inside the function body. Keep all existing JSX and logic identical.

```tsx
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel, cancelLabel, variant = 'danger', isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}) {
  useOverlayClose(isOpen, onClose);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-bold dark:text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {cancelLabel ?? 'Cancel'}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2",
                    variant === 'danger'
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  )}
                >
                  {isLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Convert Drawer to function declaration and add hook**

Replace the Drawer arrow function (lines 278-314) with a function declaration. Add `useOverlayClose(isOpen, onClose);` as the first line inside the function body. Keep all existing JSX identical.

```tsx
export function Drawer({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  useOverlayClose(isOpen, onClose);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xl font-bold dark:text-zinc-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/UI.tsx
git commit -m "fix(platform): add Escape key support to ConfirmDialog and Drawer"
```

---

### Task 3: Fix subject text truncation on grid cards

> **Note:** This task runs before the dropdown conversion (Task 4) so that line number references to Tutors.tsx remain accurate.

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:439` (parent flex div)
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:443-445` (subject paragraph)

- [ ] **Step 1: Add `min-w-0` to the parent flex container**

On line 439, change:
```tsx
<div className="flex flex-col gap-1">
```
To:
```tsx
<div className="flex flex-col gap-1 min-w-0">
```

- [ ] **Step 2: Add `truncate` and `title` to subject text**

On lines 443-445, change:
```tsx
<p className="text-sm text-zinc-500 dark:text-zinc-400">
  {(tutor.subjects ?? []).slice(0, 2).join(', ')} {t('tutors.specialist')}
</p>
```
To:
```tsx
<p className="text-sm text-zinc-500 dark:text-zinc-400 truncate" title={`${(tutor.subjects ?? []).slice(0, 2).join(', ')} ${t('tutors.specialist')}`}>
  {(tutor.subjects ?? []).slice(0, 2).join(', ')} {t('tutors.specialist')}
</p>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "fix(platform): truncate long subject text on tutor grid cards"
```

---

### Task 4: Convert dropdown menus from hover to click-based

> **Note:** Line numbers below reference the file after Task 3 changes (truncation). The content strings used for matching remain the same.

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:1` (add `useEffect, useRef, useCallback` imports)
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:181-191` (add state + refs + handlers)
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:344,350` (view mode toggles — close menu on switch)
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:394-432` (grid view menu)
- Modify: `sinaloka-platform/src/pages/Tutors.tsx:515-552` (list view menu)

- [ ] **Step 1: Update React imports on line 1**

Change:
```typescript
import React, { useState, useMemo } from 'react';
```
To:
```typescript
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
```

- [ ] **Step 2: Add state, ref, and click-outside/escape handlers**

After line 191 (`const [confirmAction, ...`), add:

```typescript
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
const menuRef = useRef<HTMLDivElement>(null);

const toggleMenu = useCallback((id: string) => {
  setOpenMenuId(prev => prev === id ? null : id);
}, []);

useEffect(() => {
  if (!openMenuId) return;
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpenMenuId(null);
    }
  };
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpenMenuId(null);
  };
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleEscape);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  };
}, [openMenuId]);
```

- [ ] **Step 3: Close menu on view mode toggle**

At lines 344 and 350, update the view mode toggle buttons to also close any open menu:

Change:
```tsx
onClick={() => setViewMode('grid')}
```
To:
```tsx
onClick={() => { setOpenMenuId(null); setViewMode('grid'); }}
```

Change:
```tsx
onClick={() => setViewMode('list')}
```
To:
```tsx
onClick={() => { setOpenMenuId(null); setViewMode('list'); }}
```

- [ ] **Step 4: Replace grid view menu (lines 394-432)**

Replace the entire `<div className="absolute top-0 right-0 p-4">...</div>` block with:

```tsx
<div className="absolute top-0 right-0 p-4">
  <div className="relative" ref={openMenuId === tutor.id ? menuRef : undefined}>
    <button
      onClick={(e) => { e.stopPropagation(); toggleMenu(tutor.id); }}
      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <MoreHorizontal size={18} />
    </button>
    {openMenuId === tutor.id && (
      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1">
        {(tutor as any).user?.is_active === false ? (
          <>
            <button
              onClick={() => { setOpenMenuId(null); handleResendInvite(tutor.id); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Mail size={14} /> {t('tutors.menu.resendInvite')}
            </button>
            <button
              onClick={() => { setOpenMenuId(null); handleCancelInvite(tutor.id); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
            >
              <XCircle size={14} /> {t('tutors.menu.cancelInvite')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setOpenMenuId(null); setEditingTutor(tutor); setShowForm(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <FileText size={14} /> {t('tutors.menu.editProfile')}
            </button>
            <button
              onClick={() => { setOpenMenuId(null); handleDeleteTutor(tutor.id); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
            >
              <XCircle size={14} /> {t('tutors.menu.deleteTutor')}
            </button>
          </>
        )}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 5: Replace list view menu (lines 515-552)**

Replace the `<div className="relative group/menu inline-block">...</div>` block with:

```tsx
<div className="relative inline-block" ref={openMenuId === tutor.id ? menuRef : undefined}>
  <button
    onClick={(e) => { e.stopPropagation(); toggleMenu(tutor.id); }}
    className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
  >
    <MoreHorizontal size={18} />
  </button>
  {openMenuId === tutor.id && (
    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1">
      {(tutor as any).user?.is_active === false ? (
        <>
          <button
            onClick={() => { setOpenMenuId(null); handleResendInvite(tutor.id); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Mail size={14} /> {t('tutors.menu.resendInvite')}
          </button>
          <button
            onClick={() => { setOpenMenuId(null); handleCancelInvite(tutor.id); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
          >
            <XCircle size={14} /> {t('tutors.menu.cancelInvite')}
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => { setOpenMenuId(null); setEditingTutor(tutor); setShowForm(true); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <FileText size={14} /> {t('tutors.menu.editProfile')}
          </button>
          <button
            onClick={() => { setOpenMenuId(null); handleDeleteTutor(tutor.id); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
          >
            <XCircle size={14} /> {t('tutors.menu.deleteTutor')}
          </button>
        </>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "fix(platform): convert tutor dropdown menus from hover to click-based"
```

---

### Task 5: Build verification and manual testing

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Manual browser verification**

Test in browser at `http://localhost:3000/tutors`:

1. **Escape key on Modal:** Click "+ Tambah Tutor", press Escape → modal should close
2. **Escape key on ConfirmDialog:** Open `...` menu → "Hapus Tutor" → press Escape → dialog should close
3. **Dropdown click:** Click `...` → menu opens. Click `...` again → menu closes. Click outside → menu closes. Press Escape → menu closes.
4. **Dropdown in list view:** Switch to list view, repeat dropdown tests
5. **Subject truncation:** Verify long subject text truncates with ellipsis. Hover → full text tooltip appears.

- [ ] **Step 3: Commit if any adjustments were needed**

```bash
git add -A
git commit -m "fix(platform): final adjustments from manual testing"
```
