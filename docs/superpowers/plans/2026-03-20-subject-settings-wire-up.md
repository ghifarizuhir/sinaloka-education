# Subject Settings Wire-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Settings Academic tab's Subject Categories section to the real `subjects` database table instead of the settings JSON blob.

**Architecture:** Replace subject category state and handlers in `useSettingsPage.ts` with `useSubjects()` hook and new create/delete mutations. Update `AcademicTab.tsx` props to use `Subject[]` instead of `SubjectCategory[]`. Backend already has all needed endpoints — frontend-only change.

**Tech Stack:** React, TanStack Query, Axios, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-subject-settings-wire-up-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `sinaloka-platform/src/hooks/useSubjects.ts` | Modify | Add `useCreateSubject()` and `useDeleteSubject()` mutation hooks |
| `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` | Modify | Replace subject category state/handlers with real subjects hooks |
| `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx` | Modify | Update props to use `Subject[]` instead of `SubjectCategory[]` |

---

## Task 1: Add create and delete mutation hooks for subjects

**Files:**
- Modify: `sinaloka-platform/src/hooks/useSubjects.ts`

- [ ] **Step 1: Add useCreateSubject and useDeleteSubject hooks**

Add to the end of `sinaloka-platform/src/hooks/useSubjects.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ... existing useSubjects and useSubjectTutors stay unchanged ...

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/api/admin/subjects', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
```

Note: also update the existing import at line 1 to include `useMutation` and `useQueryClient`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

- [ ] **Step 2: Verify type check**

Run: `cd sinaloka-platform && npm run lint`

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/hooks/useSubjects.ts
git commit -m "feat(platform): add useCreateSubject and useDeleteSubject mutation hooks"
```

---

## Task 2: Rewire useSettingsPage to use real subjects

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/useSettingsPage.ts`

- [ ] **Step 1: Add imports**

Add these imports at the top of `useSettingsPage.ts`:

```typescript
import { useSubjects, useCreateSubject, useDeleteSubject } from '@/src/hooks/useSubjects';
```

- [ ] **Step 2: Replace subject category state with real hooks**

Inside the `useSettingsPage` function, find this block (around lines 129-145):

```typescript
  // Academic settings
  const { data: academicSettings, isLoading: isLoadingAcademic } = useAcademicSettings();
  const updateAcademic = useUpdateAcademicSettings();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (academicSettings) {
      setRooms(academicSettings.rooms);
      setSubjectCategories(academicSettings.subject_categories);
      setGradeLevels(academicSettings.grade_levels);
      setWorkingDays(academicSettings.working_days);
    }
  }, [academicSettings]);
```

Replace with:

```typescript
  // Academic settings
  const { data: academicSettings, isLoading: isLoadingAcademic } = useAcademicSettings();
  const updateAcademic = useUpdateAcademicSettings();

  // Subjects from real subjects table (not settings JSON blob)
  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (academicSettings) {
      setRooms(academicSettings.rooms);
      setGradeLevels(academicSettings.grade_levels);
      setWorkingDays(academicSettings.working_days);
    }
  }, [academicSettings]);
```

- [ ] **Step 3: Replace subject category handlers**

Find the subject category handlers block (around lines 208-238):

```typescript
  // Subject category handlers
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddSubjectCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (subjectCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    const newCat: SubjectCategory = {
      id: crypto.randomUUID(),
      name,
      order: subjectCategories.length,
    };
    const updated = [...subjectCategories, newCat];
    updateAcademic.mutate({ subject_categories: updated }, {
      onSuccess: () => {
        toast.success(t('settings.academic.categorySaved'));
        setNewCategoryName('');
        setShowCategoryInput(false);
      },
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  const handleRemoveSubjectCategory = (id: string) => {
    const updated = subjectCategories.filter(c => c.id !== id);
    updateAcademic.mutate({ subject_categories: updated }, {
      onSuccess: () => toast.success(t('settings.academic.categorySaved')),
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };
```

Replace with:

```typescript
  // Subject handlers (wired to real subjects table)
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddSubjectCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    createSubject.mutate(name, {
      onSuccess: () => {
        toast.success(t('settings.academic.categorySaved'));
        setNewCategoryName('');
        setShowCategoryInput(false);
      },
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  const handleRemoveSubjectCategory = (id: string) => {
    deleteSubject.mutate(id, {
      onSuccess: () => toast.success(t('settings.academic.categorySaved')),
      onError: (error: any) => {
        const message = error?.response?.data?.message || t('settings.academic.settingsSaveFailed');
        toast.error(message);
      },
    });
  };
```

- [ ] **Step 4: Update the return object**

In the return object (around line 373), change:

```typescript
    subjectCategories,
```

To:

```typescript
    subjects,
```

- [ ] **Step 5: Remove unused SubjectCategory import**

Check the imports at the top of `useSettingsPage.ts` and remove `SubjectCategory` from the settings types import if it's no longer used elsewhere in the file.

- [ ] **Step 6: Verify type check**

Run: `cd sinaloka-platform && npm run lint`

Expected: Type errors in `AcademicTab.tsx` (it still expects `subjectCategories` prop) — this is expected, we fix it in Task 3.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/useSettingsPage.ts
git commit -m "feat(platform): wire settings subject categories to real subjects table"
```

---

## Task 3: Update AcademicTab to use subjects prop

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx`

- [ ] **Step 1: Update the props type**

In `AcademicTab.tsx`, find the Pick type (around lines 12-24):

Change `'subjectCategories'` to `'subjects'` in the Pick type:

```typescript
type AcademicTabProps = Pick<SettingsPageState,
  't' | 'rooms' | 'subjects' | 'gradeLevels' | 'workingDays' |
  'isLoadingAcademic' | 'updateAcademic' |
  // ... rest stays the same
```

- [ ] **Step 2: Update the destructured props**

In the function signature (around line 38), change `subjectCategories` to `subjects`:

```typescript
export const AcademicTab = ({
  t, rooms, subjects, gradeLevels, workingDays,
  // ... rest stays the same
```

- [ ] **Step 3: Update the JSX references**

In the JSX, replace all uses of `subjectCategories` with `subjects`:

1. Empty state check (around line 107):
```typescript
{subjects.length === 0 && !showCategoryInput && (
```

2. Map (around line 110):
```typescript
{subjects.map(cat => (
```

- [ ] **Step 4: Update Settings/index.tsx**

In `sinaloka-platform/src/pages/Settings/index.tsx`, find where `AcademicTab` receives its props and change `subjectCategories` to `subjects`:

Find:
```typescript
subjectCategories={state.subjectCategories}
```

Replace with:
```typescript
subjects={state.subjects}
```

(Or if using spread props, this may already work automatically via `SettingsPageState`.)

- [ ] **Step 5: Verify type check and build**

Run: `cd sinaloka-platform && npm run lint && npm run build`

Expected: No type errors, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx sinaloka-platform/src/pages/Settings/index.tsx
git commit -m "fix(platform): update AcademicTab to use real subjects from useSubjects hook"
```
