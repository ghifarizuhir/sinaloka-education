# Generate Sessions from Class Drawer — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to generate sessions directly from the class detail drawer, removing the enrollment constraint.

**Architecture:** Remove enrolled-students validation from backend `validateClassForSession()`. Add "Generate Sessions" button + confirmation modal to the class detail drawer in `Classes.tsx`. Fix generate response type in session service.

**Tech Stack:** NestJS (backend), React + TanStack Query (frontend), date-fns, i18next, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-17-generate-sessions-from-class-drawer-design.md`

---

## Task 1: Remove enrolled-students constraint from backend

**Files:**
- Modify: `sinaloka-backend/src/modules/session/session.service.ts:60-90`
- Modify: `sinaloka-backend/src/modules/session/session.service.spec.ts` (if exists)

- [ ] **Step 1: Read the current `validateClassForSession()` method**

File: `sinaloka-backend/src/modules/session/session.service.ts` lines 60-90. The method currently:
1. Finds class by id + institution_id (lines 61-63)
2. Throws NotFoundException if not found (lines 65-67)
3. Throws BadRequestException if status !== 'ACTIVE' (lines 69-73)
4. Counts enrollments with status ACTIVE/TRIAL (lines 75-81)
5. Throws BadRequestException if count === 0 (lines 83-87)
6. Returns class record (line 89)

- [ ] **Step 2: Remove the enrollment check**

Remove lines 75-87 (the enrollment count query and the check). The method should become:

```typescript
private async validateClassForSession(classId: string, institutionId: string) {
  const classRecord = await this.prisma.class.findUnique({
    where: { id: classId, institution_id: institutionId },
  });

  if (!classRecord) {
    throw new NotFoundException(`Class with id ${classId} not found`);
  }

  if (classRecord.status !== 'ACTIVE') {
    throw new BadRequestException(
      'Cannot create sessions for an archived class',
    );
  }

  return classRecord;
}
```

- [ ] **Step 3: Run tests**

```bash
cd sinaloka-backend && npx jest --testPathPatterns=session.service
```

If tests exist that assert the enrollment check error, update them to remove that expectation.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/session/session.service.ts
git commit -m "feat(session): remove enrolled-students constraint from session generation"
```

---

## Task 2: Fix generate sessions response type in frontend

**Files:**
- Modify: `sinaloka-platform/src/services/sessions.service.ts:16-17`
- Modify: `sinaloka-platform/src/types/session.ts`

- [ ] **Step 1: Add response type to session types**

File: `sinaloka-platform/src/types/session.ts`

Add at the end of the file:

```typescript
export interface GenerateSessionsResponse {
  count: number;
  sessions: Session[];
}
```

- [ ] **Step 2: Fix service return type**

File: `sinaloka-platform/src/services/sessions.service.ts` line 16-17

Change:
```typescript
generate: (data: GenerateSessionsDto) =>
  api.post<Session[]>('/api/admin/sessions/generate', data).then((r) => r.data),
```

To:
```typescript
generate: (data: GenerateSessionsDto) =>
  api.post<GenerateSessionsResponse>('/api/admin/sessions/generate', data).then((r) => r.data),
```

Import `GenerateSessionsResponse` from the types file.

- [ ] **Step 3: Run lint**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/services/sessions.service.ts sinaloka-platform/src/types/session.ts
git commit -m "fix(session): correct generate sessions response type"
```

---

## Task 3: Add i18n keys

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add English i18n keys**

File: `sinaloka-platform/src/locales/en.json`

Add inside the `classes` section (find existing `classes.drawer.*` keys and add nearby):

```json
"classes.drawer.generateSessions": "Generate Sessions",
"classes.generateModal.title": "Generate Sessions",
"classes.generateModal.duration": "Duration",
"classes.generateModal.days": "days",
"classes.generateModal.dateRange": "From {{from}} to {{to}}",
"classes.generateModal.estimatedSessions": "Estimated sessions",
"classes.generateModal.confirm": "Generate",
"classes.toast.generateSuccess": "{{count}} sessions generated successfully",
"classes.toast.generateError": "Failed to generate sessions"
```

- [ ] **Step 2: Add Indonesian i18n keys**

File: `sinaloka-platform/src/locales/id.json`

Add matching keys:

```json
"classes.drawer.generateSessions": "Buat Sesi",
"classes.generateModal.title": "Buat Sesi Kelas",
"classes.generateModal.duration": "Durasi",
"classes.generateModal.days": "hari",
"classes.generateModal.dateRange": "Dari {{from}} sampai {{to}}",
"classes.generateModal.estimatedSessions": "Estimasi sesi",
"classes.generateModal.confirm": "Buat Sesi",
"classes.toast.generateSuccess": "{{count}} sesi berhasil dibuat",
"classes.toast.generateError": "Gagal membuat sesi"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(i18n): add generate sessions modal translations"
```

---

## Task 4: Add Generate Sessions button and modal to class drawer

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

This is the main UI task. All changes are in Classes.tsx.

- [ ] **Step 1: Add imports**

At the top of `Classes.tsx`, add to existing imports:

```typescript
// Add to lucide-react imports (find existing import line)
import { Calendar } from 'lucide-react';

// Add new import for session hook
import { useGenerateSessions } from '@/src/hooks/useSessions';

// Add date-fns imports
import { format, addDays, getDay } from 'date-fns';
```

Check which of these are already imported and only add missing ones.

- [ ] **Step 2: Add state and hooks**

Near the existing state declarations (around line 64-70), add:

```typescript
const [showGenerateModal, setShowGenerateModal] = useState(false);
const [generateDuration, setGenerateDuration] = useState(30);
const generateSessions = useGenerateSessions();
```

- [ ] **Step 3: Add helper function for estimated session count**

After the existing handler functions (around line 200), add:

```typescript
const estimateSessionCount = (scheduleDays: string[], duration: number): number => {
  const dayMap: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const targetDays = new Set(scheduleDays.map(d => dayMap[d]));
  const today = new Date();
  let count = 0;
  for (let i = 0; i < duration; i++) {
    if (targetDays.has(getDay(addDays(today, i)))) count++;
  }
  return count;
};
```

- [ ] **Step 4: Add generate handler**

After the helper function, add:

```typescript
const handleGenerateSessions = () => {
  if (!classDetail.data) return;
  const today = new Date();
  const dateFrom = format(today, 'yyyy-MM-dd');
  const dateTo = format(addDays(today, generateDuration - 1), 'yyyy-MM-dd');

  generateSessions.mutate(
    { class_id: classDetail.data.id, date_from: dateFrom, date_to: dateTo },
    {
      onSuccess: (data) => {
        toast.success(t('classes.toast.generateSuccess', { count: data.count }));
        setShowGenerateModal(false);
        setGenerateDuration(30);
      },
      onError: () => toast.error(t('classes.toast.generateError')),
    },
  );
};
```

- [ ] **Step 5: Add Generate Sessions button to drawer**

In the class detail drawer, find the "Action Buttons" section (line ~870-885). Add a new button BEFORE the existing action buttons div. Insert before `{/* Action Buttons */}`:

```tsx
{/* Generate Sessions Button */}
{classDetail.data?.status === 'ACTIVE' && classDetail.data?.schedule_days?.length > 0 && (
  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
    <Button
      variant="outline"
      className="w-full justify-center gap-2"
      onClick={() => setShowGenerateModal(true)}
      disabled={classDetail.isLoading}
    >
      <Calendar size={16} />
      {t('classes.drawer.generateSessions')}
    </Button>
  </div>
)}
```

- [ ] **Step 6: Add Generate Sessions modal**

After the existing `</Drawer>` closing tag (line ~888), add the confirmation modal:

```tsx
{/* Generate Sessions Modal */}
<Modal
  isOpen={showGenerateModal}
  onClose={() => { setShowGenerateModal(false); setGenerateDuration(30); }}
  title={t('classes.generateModal.title')}
>
  {classDetail.data && (
    <div className="space-y-5">
      {/* Class Info */}
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
        <p className="text-sm font-bold">{classDetail.data.name}</p>
        <div className="flex flex-wrap gap-1.5">
          {classDetail.data.schedule_days?.map((day: string) => (
            <span key={day} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full">
              {day}
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          {classDetail.data.schedule_start_time} - {classDetail.data.schedule_end_time}
        </p>
      </div>

      {/* Duration Input */}
      <div className="space-y-1.5">
        <Label>{t('classes.generateModal.duration')}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={365}
            value={generateDuration}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateDuration(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
            className="w-24"
          />
          <span className="text-sm text-zinc-500">{t('classes.generateModal.days')}</span>
        </div>
      </div>

      {/* Date Range Preview */}
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
        <p className="text-xs text-zinc-500">
          {t('classes.generateModal.dateRange', {
            from: format(new Date(), 'dd MMM yyyy'),
            to: format(addDays(new Date(), generateDuration - 1), 'dd MMM yyyy'),
          })}
        </p>
        <p className="text-lg font-bold">
          ~{estimateSessionCount(classDetail.data.schedule_days ?? [], generateDuration)}{' '}
          <span className="text-sm font-normal text-zinc-500">{t('classes.generateModal.estimatedSessions')}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 justify-center"
          onClick={() => { setShowGenerateModal(false); setGenerateDuration(30); }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          className="flex-1 justify-center"
          onClick={handleGenerateSessions}
          disabled={generateSessions.isPending}
        >
          <Calendar size={16} />
          {generateSessions.isPending ? t('common.processing') : t('classes.generateModal.confirm')}
        </Button>
      </div>
    </div>
  )}
</Modal>
```

- [ ] **Step 7: Run lint**

```bash
cd sinaloka-platform && npm run lint
```

Fix any TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(class): add generate sessions button and modal to class drawer"
```

---

## Verification

After all tasks are complete:

- [ ] Run backend tests: `cd sinaloka-backend && npx jest --testPathPatterns=session.service`
- [ ] Run frontend lint: `cd sinaloka-platform && npm run lint`
- [ ] Manual test flow: Open Classes page → click a class → see Generate Sessions button → click → modal with duration input → generate → toast with count
