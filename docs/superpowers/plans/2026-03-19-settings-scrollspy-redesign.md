# Settings Page Scroll-Spy Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Settings page from a vertical sidebar tab-switcher to a single scrollable page with a sticky horizontal underline tab bar and IntersectionObserver-based scroll-spy.

**Architecture:** Minimal refactor — add a `useScrollSpy` hook, rewrite `index.tsx` layout, remove `activeTab` state from `useSettingsPage`. All 3 tab components render simultaneously with no internal changes.

**Tech Stack:** React, TailwindCSS v4, IntersectionObserver API, Lucide icons

---

### Task 1: Create `useScrollSpy` Hook

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/useScrollSpy.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useState, useEffect } from 'react';

export function useScrollSpy(sectionIds: string[]): string {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting section
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (intersecting.length > 0) {
          setActiveId(intersecting[0].target.id);
        }
      },
      {
        rootMargin: '-64px 0px 0px 0px', // offset for sticky bar height (4rem)
        threshold: 0.3,
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd sinaloka-platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `useScrollSpy.ts`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/useScrollSpy.ts
git commit -m "feat(settings): add useScrollSpy hook with IntersectionObserver"
```

---

### Task 2: Remove `activeTab` State from `useSettingsPage`

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/useSettingsPage.ts`

- [ ] **Step 1: Remove `activeTab` state declaration**

In `useSettingsPage.ts`, remove line 11:
```typescript
const [activeTab, setActiveTab] = useState('general');
```

- [ ] **Step 2: Remove `activeTab` and `setActiveTab` from the return object**

In the return block (~line 294-295), remove:
```typescript
    activeTab,
    setActiveTab,
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd sinaloka-platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Errors in `index.tsx` referencing `state.activeTab` / `state.setActiveTab` — these will be fixed in Task 3.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/useSettingsPage.ts
git commit -m "refactor(settings): remove activeTab state from useSettingsPage"
```

---

### Task 3: Rewrite `index.tsx` — Scroll-Spy Layout

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/index.tsx`

- [ ] **Step 1: Rewrite the full component**

Replace the entire contents of `index.tsx` with:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CreditCard, GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsPage } from './useSettingsPage';
import { useScrollSpy } from './useScrollSpy';
import { GeneralTab } from './tabs/GeneralTab';
import { BillingTab } from './tabs/BillingTab';
import { AcademicTab } from './tabs/AcademicTab';

const SECTION_IDS = ['general', 'billing', 'academic'];

export const SettingsPage = () => {
  const { t } = useTranslation();
  const state = useSettingsPage();
  const activeSection = useScrollSpy(SECTION_IDS);

  const tabs = [
    { id: 'general', label: t('settings.tabs.general'), icon: Building2 },
    { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard },
    { id: 'academic', label: t('settings.tabs.academic'), icon: GraduationCap },
  ];

  const handleTabClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Page header — scrolls away */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">
            {t('settings.title')}
          </h2>
          <p className="text-zinc-500 text-sm">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Sticky horizontal tab bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 -mx-1 px-1">
        <nav className="flex gap-7 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap pb-3 pt-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeSection === tab.id
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* All sections rendered — scroll-spy determines active tab */}
      <section id="general" className="scroll-mt-16">
        <GeneralTab
          t={state.t}
          isLoadingGeneral={state.isLoadingGeneral}
          updateSettings={state.updateSettings}
          formName={state.formName}
          setFormName={state.setFormName}
          formEmail={state.formEmail}
          setFormEmail={state.setFormEmail}
          formPhone={state.formPhone}
          setFormPhone={state.setFormPhone}
          formAddress={state.formAddress}
          setFormAddress={state.setFormAddress}
          formTimezone={state.formTimezone}
          setFormTimezone={state.setFormTimezone}
          formLanguage={state.formLanguage}
          setFormLanguage={state.setFormLanguage}
          handleSaveGeneral={state.handleSaveGeneral}
        />
      </section>

      <section id="billing" className="scroll-mt-16">
        <BillingTab
          t={state.t}
          isLoadingBilling={state.isLoadingBilling}
          updateBilling={state.updateBilling}
          formBillingMode={state.formBillingMode}
          setFormBillingMode={state.setFormBillingMode}
          formCurrency={state.formCurrency}
          setFormCurrency={state.setFormCurrency}
          formInvoicePrefix={state.formInvoicePrefix}
          setFormInvoicePrefix={state.setFormInvoicePrefix}
          formLatePaymentAutoLock={state.formLatePaymentAutoLock}
          setFormLatePaymentAutoLock={state.setFormLatePaymentAutoLock}
          formLatePaymentThreshold={state.formLatePaymentThreshold}
          setFormLatePaymentThreshold={state.setFormLatePaymentThreshold}
          formExpenseCategories={state.formExpenseCategories}
          newCategoryInput={state.newCategoryInput}
          setNewCategoryInput={state.setNewCategoryInput}
          handleSaveBilling={state.handleSaveBilling}
          handleAddCategory={state.handleAddCategory}
          handleRemoveCategory={state.handleRemoveCategory}
          formBankAccounts={state.formBankAccounts}
          showAddBankForm={state.showAddBankForm}
          setShowAddBankForm={state.setShowAddBankForm}
          newBankName={state.newBankName}
          setNewBankName={state.setNewBankName}
          newBankAccount={state.newBankAccount}
          setNewBankAccount={state.setNewBankAccount}
          newBankHolder={state.newBankHolder}
          setNewBankHolder={state.setNewBankHolder}
          handleAddBankAccount={state.handleAddBankAccount}
          handleRemoveBankAccount={state.handleRemoveBankAccount}
        />
      </section>

      <section id="academic" className="scroll-mt-16">
        <AcademicTab
          t={state.t}
          rooms={state.rooms}
          subjectCategories={state.subjectCategories}
          gradeLevels={state.gradeLevels}
          workingDays={state.workingDays}
          isLoadingAcademic={state.isLoadingAcademic}
          updateAcademic={state.updateAcademic}
          showRoomModal={state.showRoomModal}
          setShowRoomModal={state.setShowRoomModal}
          editingRoom={state.editingRoom}
          setEditingRoom={state.setEditingRoom}
          roomFormName={state.roomFormName}
          setRoomFormName={state.setRoomFormName}
          roomFormType={state.roomFormType}
          setRoomFormType={state.setRoomFormType}
          roomFormCapacity={state.roomFormCapacity}
          setRoomFormCapacity={state.setRoomFormCapacity}
          roomFormStatus={state.roomFormStatus}
          setRoomFormStatus={state.setRoomFormStatus}
          handleOpenRoomModal={state.handleOpenRoomModal}
          handleSaveRoom={state.handleSaveRoom}
          roomToDelete={state.roomToDelete}
          setRoomToDelete={state.setRoomToDelete}
          handleDeleteRoom={state.handleDeleteRoom}
          showCategoryInput={state.showCategoryInput}
          setShowCategoryInput={state.setShowCategoryInput}
          newCategoryName={state.newCategoryName}
          setNewCategoryName={state.setNewCategoryName}
          handleAddSubjectCategory={state.handleAddSubjectCategory}
          handleRemoveSubjectCategory={state.handleRemoveSubjectCategory}
          showGradeInput={state.showGradeInput}
          setShowGradeInput={state.setShowGradeInput}
          newGradeName={state.newGradeName}
          setNewGradeName={state.setNewGradeName}
          handleAddGrade={state.handleAddGrade}
          handleRemoveGrade={state.handleRemoveGrade}
          handleToggleWorkingDay={state.handleToggleWorkingDay}
          handleSaveWorkingDays={state.handleSaveWorkingDays}
        />
      </section>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Verify dev server renders**

Run: `cd sinaloka-platform && npm run dev` (manually check http://localhost:3000/settings)
Expected: All 3 sections visible, tab bar at top, sticky on scroll, scroll-spy highlights active section

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/index.tsx
git commit -m "feat(settings): replace sidebar tabs with scroll-spy horizontal nav"
```

---

### Task 4: Build Verification

- [ ] **Step 1: Run production build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run lint/type-check**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 3: Verify no unused imports in changed files**

Check that `index.tsx` no longer imports anything tab-switch related that's unused, and `useSettingsPage.ts` no longer imports `useState` for activeTab (it still uses `useState` for other state so the import stays).
