# Phase 1: Academic Settings - Research

**Researched:** 2026-03-19
**Domain:** NestJS backend settings CRUD + React frontend settings UI (existing codebase extension)
**Confidence:** HIGH

## Summary

Phase 1 extends an existing, well-established settings pattern in the Sinaloka codebase. The backend already has a `SettingsService` that reads/writes to an `Institution.settings` JSON blob (Prisma `Json?` field) with GET/PATCH endpoints for `general` and `billing` sections. The frontend has a corresponding `settingsService`, TanStack Query hooks (`useSettings.ts`), and a page hook (`useSettingsPage.ts`). The Academic tab UI already exists with hardcoded mock data for rooms, subject categories, grade levels, and working days.

The implementation is a direct pattern replication: add `academic` subsections to the settings JSON blob following the exact same backend service pattern as `getBilling`/`updateBilling`, add corresponding frontend service calls and hooks, then wire the existing UI components to real data. The Class form room field (currently free-text `Input`) needs to be replaced with a `Select` component populated from academic settings rooms.

**Primary recommendation:** Follow the billing settings pattern exactly -- add `getAcademic`/`updateAcademic` (or per-subsection endpoints) to `SettingsService`/`SettingsController`, extend `settings.dto.ts` with Zod schemas, extend frontend `settingsService`/`useSettings` hooks, and replace mock data in `AcademicTab.tsx` and `useSettingsPage.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Modal form for CRUD (consistent with Classes/Students pattern, not inline editing)
- Room fields: Name, Type, Capacity, Status
- Room types: Fixed list -- Classroom, Laboratory, Studio, Online
- Online type automatically has unlimited capacity (no max students field)
- Status values: Available, Maintenance, Unavailable
- Status controls visibility in Class form dropdown
- Class form room field is a required dropdown populated from institution's settings rooms
- Only rooms with status "Available" appear in the dropdown
- Existing classes with free-text room values: show as-is until admin edits the class, then force dropdown selection. Old free-text value shown as warning
- Backend: Class room field stays as String? in Prisma -- dropdown writes the room name string (backward compatible)
- Categories are required for subjects -- every subject must belong to a category
- Categories shown as headers/filters in subject lists
- Admin can create/edit/delete categories
- Stored in Institution.settings JSON blob under academic.subject_categories key
- Grades apply to both students and classes -- students have a grade, classes are tagged with target grade levels
- Grade format: preset Indonesian levels as defaults (SD 1-6, SMP 7-9, SMA 10-12, Universitas) but admin can add/rename/reorder
- Stored in Institution.settings JSON blob under academic.grade_levels key
- Admin can toggle each day Mon-Sun for working days
- Working days enforce session generation -- sessions can only be created on enabled days
- Changing working days only affects future generation -- already-generated sessions on now-disabled days are kept
- Stored in Institution.settings JSON blob under academic.working_days key (array of enabled day numbers)

### Claude's Discretion
- Exact layout/spacing of Academic tab sections
- Default working days preset (likely Mon-Sat based on Indonesian tutoring norms)
- How to display the "old free-text room" warning on existing classes
- Error handling for deleting a room that's currently assigned to classes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACAD-01 | Admin can create, edit, and delete rooms in Settings Academic tab with backend persistence (including "Online" room type) | Rooms stored in `settings.academic.rooms` JSON array; backend GET/PATCH endpoints follow billing pattern; frontend Modal component for CRUD; existing room table UI in AcademicTab.tsx |
| ACAD-02 | Admin can manage subject categories in Settings Academic tab with backend persistence | Stored in `settings.academic.subject_categories` JSON array; badge-style UI already mocked in AcademicTab.tsx; add/remove pattern follows billing expense_categories |
| ACAD-03 | Admin can manage grade levels in Settings Academic tab with backend persistence | Stored in `settings.academic.grade_levels` JSON array; badge-style UI already mocked; defaults include Indonesian preset levels |
| ACAD-04 | Admin can configure working days (Mon-Sun toggles) in Settings Academic tab with backend persistence | Stored in `settings.academic.working_days` as array of day numbers; toggle UI already mocked; default Mon-Sat |
| ACAD-05 | Class creation/edit form shows room dropdown populated from institution's rooms in Settings (replacing free-text input) | Replace `Input` with `Select` in ClassFormModal.tsx (line 289-297); fetch rooms via academic settings hook; filter by status "Available"; backward-compatible string storage |
| ACAD-06 | Backend API endpoints exist for academic settings CRUD (rooms, subject categories, grade levels, working days) stored in Institution.settings JSON blob | Extend SettingsController with academic endpoints; Zod schemas for validation; same merge pattern as billing |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| NestJS | Backend framework | Already used, module/controller/service pattern |
| Prisma | ORM (Json? field for settings) | Already used, Institution.settings is `Json?` |
| Zod | DTO validation | Already used via `nestjs-zod` pattern in settings.dto.ts |
| React | Frontend framework | Already used |
| TanStack Query | Server state management | Already used in useSettings.ts hooks |
| Axios | HTTP client | Already used via `src/lib/api` |

### Supporting (Already in Project)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| Sonner | Toast notifications | Success/error feedback on save |
| Lucide React | Icons | Plus, Trash2, ExternalLink icons in room table |
| Motion (Framer) | Modal animations | Modal component already uses it |
| clsx + tailwind-merge | Class merging | All component styling |
| react-i18next | i18n | All user-facing strings |

### No New Dependencies Needed
This phase requires zero new npm packages. Everything is built with existing project dependencies.

## Architecture Patterns

### Backend: Settings JSON Blob Extension

The existing pattern stores settings subsections in the `Institution.settings` JSON blob. The billing section demonstrates the exact approach:

```typescript
// settings.service.ts - EXISTING pattern to replicate
async getBilling(institutionId: string) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });
  const stored = (institution.settings as any)?.billing ?? {};
  return { ...BILLING_DEFAULTS, ...stored };
}

async updateBilling(institutionId: string, dto: UpdateBillingSettingsDto) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });
  const currentSettings = (institution.settings as any) ?? {};
  const currentBilling = currentSettings.billing ?? {};
  const updatedBilling = { ...currentBilling, ...dto };
  await this.prisma.institution.update({
    where: { id: institutionId },
    data: { settings: { ...currentSettings, billing: updatedBilling } },
  });
  return { ...BILLING_DEFAULTS, ...updatedBilling };
}
```

**Academic settings should follow this exact pattern** with `settings.academic` containing subsections: `rooms`, `subject_categories`, `grade_levels`, `working_days`.

### Backend: Academic Settings Data Shape

```typescript
// Recommended shape inside Institution.settings.academic
interface AcademicSettings {
  rooms: Room[];
  subject_categories: SubjectCategory[];
  grade_levels: GradeLevel[];
  working_days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (JS convention)
}

interface Room {
  id: string;       // UUID generated on create
  name: string;
  type: 'Classroom' | 'Laboratory' | 'Studio' | 'Online';
  capacity: number | null;  // null for Online (unlimited)
  status: 'Available' | 'Maintenance' | 'Unavailable';
}

interface SubjectCategory {
  id: string;       // UUID
  name: string;
  order: number;    // for sorting
}

interface GradeLevel {
  id: string;       // UUID
  name: string;
  order: number;    // for sorting/reordering
}
```

### Backend: Endpoint Design Decision

Two viable approaches:

**Option A (recommended): Single academic endpoint with subsection parameter**
- `GET /api/settings/academic` -- returns all academic settings
- `PATCH /api/settings/academic` -- updates any/all subsections

This follows the billing pattern most closely (one GET, one PATCH for the whole section). The frontend can send partial updates for just rooms, just categories, etc.

**Option B: Per-subsection endpoints**
- `GET /api/settings/academic/rooms`, `PATCH /api/settings/academic/rooms`
- `GET /api/settings/academic/subject-categories`, etc.

More granular but deviates from the billing pattern and adds more controller methods.

**Recommendation:** Use Option A for the main GET/PATCH, but add specific item-level operations for rooms (create/update/delete a single room) since rooms have CRUD semantics unlike simple arrays:

```
GET    /api/settings/academic           -- returns full academic settings
PATCH  /api/settings/academic           -- updates working_days, subject_categories, grade_levels
POST   /api/settings/academic/rooms     -- add a room (returns updated rooms array)
PATCH  /api/settings/academic/rooms/:id -- update a room
DELETE /api/settings/academic/rooms/:id -- delete a room
```

Actually, looking at the billing pattern more carefully -- billing updates the entire section at once via PATCH. Subject categories and grade levels also have CRUD semantics (add/edit/delete individual items). To keep it simple and consistent:

**Final recommendation:** Single GET, single PATCH for the entire academic section. Frontend manages the array manipulation (add/remove/edit items) and sends the full updated section. This matches how billing `expense_categories` and `bank_accounts` arrays are managed -- the frontend manipulates the array locally and sends the whole thing on save. This is simpler and avoids individual item endpoints.

### Frontend: Hook/Service Extension Pattern

```typescript
// settings.service.ts - add these
getAcademic: () =>
  api.get<AcademicSettings>('/api/settings/academic').then((r) => r.data),
updateAcademic: (data: UpdateAcademicSettingsDto) =>
  api.patch<AcademicSettings>('/api/settings/academic', data).then((r) => r.data),

// useSettings.ts - add these
export function useAcademicSettings() {
  return useQuery({
    queryKey: ['settings', 'academic'],
    queryFn: settingsService.getAcademic,
  });
}

export function useUpdateAcademicSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAcademicSettingsDto) => settingsService.updateAcademic(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'academic'] }),
  });
}
```

### Frontend: Page Hook Pattern

The existing `useSettingsPage.ts` manages all settings state centrally. It currently has mock `rooms` state (lines 132-136). The academic settings state should:

1. Replace the mock `rooms` useState with data from `useAcademicSettings()`
2. Add state for subject categories and grade levels
3. Add working days toggle state
4. Add room modal form state (name, type, capacity, status)
5. Add save handlers that call `updateAcademic` mutation

### Frontend: Class Form Room Dropdown Integration

```typescript
// In ClassFormModal.tsx, replace lines 289-297:
// FROM:
<Input id="room" placeholder={...} value={formRoom} onChange={...} />

// TO:
<Select
  className="w-full"
  value={formRoom}
  onChange={(val) => setFormRoom(val)}
  options={availableRooms.map(r => ({ value: r.name, label: `${r.name} (${r.type}, ${r.capacity ?? 'unlimited'})` }))}
  placeholder={t('classes.form.selectRoom')}
/>
// Plus warning if editingClass?.room exists but is not in the rooms list
```

The `Select` component already supports the needed API (value, onChange, options, placeholder).

### Anti-Patterns to Avoid
- **Do not create a new Prisma model for rooms/categories/grades.** The decision is to use the JSON blob. No schema migration needed.
- **Do not add individual CRUD endpoints per room.** Follow the billing pattern -- send the full array on update.
- **Do not create a separate React context for academic settings.** Use TanStack Query hooks, consistent with existing pattern.
- **Do not modify the Class `room` field type in Prisma.** It stays as `String?`. The dropdown writes the room name string.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation for room IDs | Custom ID generator | `crypto.randomUUID()` | Already used in bank accounts pattern (useSettingsPage.ts line 116) |
| Modal dialog | Custom overlay | Existing `Modal` component | Already built with animations, accessibility, escape-to-close |
| Dropdown select | Custom combobox | Existing `Select` component | Supports optgroups, disabled options, placeholders |
| Toast notifications | Custom notification system | Sonner (`toast.success`/`toast.error`) | Already integrated throughout the app |
| Form validation (backend) | Manual checks | Zod schemas via `ZodValidationPipe` | Established pattern in all controllers |
| Cache invalidation | Manual refetch | TanStack Query `invalidateQueries` | Established pattern in useSettings.ts |

## Common Pitfalls

### Pitfall 1: JSON Merge Overwriting Sibling Sections
**What goes wrong:** When updating `settings.academic`, you accidentally overwrite `settings.billing` by writing only `{ academic: {...} }` to the settings field.
**Why it happens:** Prisma `Json` field update replaces the entire value.
**How to avoid:** Always read current settings first, spread existing settings, then merge the academic section -- exactly as billing does: `{ ...currentSettings, academic: updatedAcademic }`.
**Warning signs:** Billing settings disappear after saving academic settings.

### Pitfall 2: Room Deletion While Assigned to Classes
**What goes wrong:** Admin deletes a room that is currently the `room` value on existing classes. Those classes now reference a non-existent room name.
**How to avoid:** On delete, either (a) warn the admin with a count of affected classes and require confirmation, or (b) soft-prevent deletion. Recommendation: warn with count and allow -- the class `room` field is a free-text string anyway, so a stale value is acceptable until the class is edited.
**Warning signs:** Classes show a room name that does not exist in settings.

### Pitfall 3: Free-Text Room Backward Compatibility
**What goes wrong:** Existing classes have free-text room values (e.g., "Room 101") that do not match any room in the new settings. The dropdown shows nothing selected, confusing the admin.
**How to avoid:** When editing a class, if the current `room` value does not match any settings room name, display a warning: "This class has a custom room value '{value}'. Please select a room from the dropdown." Pre-select nothing (force a new selection).
**Warning signs:** Admin opens edit form for existing class and the room dropdown is empty despite the class having a room value.

### Pitfall 4: Working Days Day Number Convention
**What goes wrong:** Inconsistency between JS `Date.getDay()` (0=Sunday) and display order (Monday first in the UI toggle).
**How to avoid:** Store day numbers consistently using JS convention (0=Sunday through 6=Saturday). The UI displays Mon-Sun but maps to numbers 1-6, 0.
**Warning signs:** Sessions generated on wrong days.

### Pitfall 5: Online Room Capacity
**What goes wrong:** Online rooms are supposed to have unlimited capacity, but the form still submits a capacity number.
**How to avoid:** When room type is "Online", auto-set capacity to `null` and hide/disable the capacity input. Backend Zod schema should allow `null` capacity when type is "Online".
**Warning signs:** Online room saved with capacity 0 or some arbitrary number.

### Pitfall 6: Stale Settings Cache After Tab Switch
**What goes wrong:** Admin edits rooms, switches to billing tab, switches back -- sees stale data because TanStack Query cache is still fresh.
**How to avoid:** On mutation success, `invalidateQueries({ queryKey: ['settings', 'academic'] })` triggers refetch. This is already the pattern used for billing. Make sure the mutation onSuccess callback does this.

## Code Examples

### Backend: Academic Settings Defaults

```typescript
// Source: modeled after BILLING_DEFAULTS in settings.service.ts
const ACADEMIC_DEFAULTS = {
  rooms: [] as Room[],
  subject_categories: [] as SubjectCategory[],
  grade_levels: [
    { id: 'default-sd-1', name: 'SD 1', order: 1 },
    { id: 'default-sd-2', name: 'SD 2', order: 2 },
    { id: 'default-sd-3', name: 'SD 3', order: 3 },
    { id: 'default-sd-4', name: 'SD 4', order: 4 },
    { id: 'default-sd-5', name: 'SD 5', order: 5 },
    { id: 'default-sd-6', name: 'SD 6', order: 6 },
    { id: 'default-smp-7', name: 'SMP 7', order: 7 },
    { id: 'default-smp-8', name: 'SMP 8', order: 8 },
    { id: 'default-smp-9', name: 'SMP 9', order: 9 },
    { id: 'default-sma-10', name: 'SMA 10', order: 10 },
    { id: 'default-sma-11', name: 'SMA 11', order: 11 },
    { id: 'default-sma-12', name: 'SMA 12', order: 12 },
    { id: 'default-univ', name: 'Universitas', order: 13 },
  ] as GradeLevel[],
  working_days: [1, 2, 3, 4, 5, 6] as number[], // Mon-Sat
};
```

### Backend: Zod Schema for Academic Settings

```typescript
// Source: modeled after UpdateBillingSettingsSchema in settings.dto.ts
const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['Classroom', 'Laboratory', 'Studio', 'Online']),
  capacity: z.number().int().min(1).nullable(),
  status: z.enum(['Available', 'Maintenance', 'Unavailable']),
});

const SubjectCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
});

const GradeLevelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
});

export const UpdateAcademicSettingsSchema = z.object({
  rooms: z.array(RoomSchema).optional(),
  subject_categories: z.array(SubjectCategorySchema).optional(),
  grade_levels: z.array(GradeLevelSchema).optional(),
  working_days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
});
```

### Frontend: Room Form Modal Pattern

```typescript
// Source: follows ClassFormModal.tsx pattern with Modal component
// Room modal state in useSettingsPage.ts:
const [showRoomModal, setShowRoomModal] = useState(false);
const [editingRoom, setEditingRoom] = useState<Room | null>(null);
const [roomFormName, setRoomFormName] = useState('');
const [roomFormType, setRoomFormType] = useState<RoomType>('Classroom');
const [roomFormCapacity, setRoomFormCapacity] = useState('');
const [roomFormStatus, setRoomFormStatus] = useState<RoomStatus>('Available');
```

### Frontend: Class Form Select for Rooms

```typescript
// Source: follows the Select usage pattern in ClassFormModal.tsx (line 117-124)
// The Select component supports: value, onChange, options, placeholder, disabled
// Options format: { value: string, label: string, disabled?: boolean }[]
const roomOptions = availableRooms
  .filter(r => r.status === 'Available')
  .map(r => ({
    value: r.name,
    label: `${r.name} (${r.type}${r.capacity ? `, ${r.capacity} seats` : ', unlimited'})`,
  }));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock room data in useState | API-fetched from settings JSON blob | This phase | Rooms persist across sessions and users |
| Hardcoded subject categories | Admin-configurable categories | This phase | Categories are institution-specific |
| Hardcoded grade levels | Admin-configurable with Indonesian defaults | This phase | Grades match institution's curriculum |
| Free-text room input in Class form | Dropdown from institution rooms | This phase | Consistent room naming, capacity tracking |
| No working days concept | Configurable working days | This phase | Enforces session generation on valid days only |

## Open Questions

1. **Room deletion with assigned classes**
   - What we know: Class `room` is a free-text String?, so removing a room from settings does not break FK constraints.
   - What's unclear: Exact UX for the warning dialog.
   - Recommendation: Show confirmation with count of affected classes. Deletion proceeds -- existing classes keep their stale room string until manually edited.

2. **Subject category enforcement timing**
   - What we know: Decision says categories are required for subjects.
   - What's unclear: Whether existing subjects without categories need migration or just future subjects.
   - Recommendation: Defer enforcement to a future phase. This phase creates the category management UI. Subject-category linkage requires touching the Subject module which is out of scope.

3. **Grade level linkage to students and classes**
   - What we know: Decision says grades apply to both students and classes.
   - What's unclear: Whether the Student and Class models need schema changes (new `grade_level` field).
   - Recommendation: This phase creates the grade level management UI and stores grades in settings. Actual linkage to Student/Class models is a separate concern -- just build the settings CRUD.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 (backend), Playwright (frontend E2E) |
| Config file | `sinaloka-backend/package.json` jest section, `sinaloka-platform/e2e/playwright.config.ts` |
| Quick run command | `cd sinaloka-backend && npm run test -- --testPathPattern=settings` |
| Full suite command | `cd sinaloka-backend && npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACAD-01 | Room CRUD in settings | unit | `cd sinaloka-backend && npm run test -- --testPathPattern=settings -x` | No -- Wave 0 |
| ACAD-02 | Subject category CRUD | unit | Same as above | No -- Wave 0 |
| ACAD-03 | Grade level CRUD | unit | Same as above | No -- Wave 0 |
| ACAD-04 | Working days toggle | unit | Same as above | No -- Wave 0 |
| ACAD-05 | Room dropdown in Class form | manual-only | Visual verification -- Select component populated from API | N/A |
| ACAD-06 | Backend API endpoints | unit | `cd sinaloka-backend && npm run test -- --testPathPattern=settings -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd sinaloka-backend && npm run test -- --testPathPattern=settings -x`
- **Per wave merge:** `cd sinaloka-backend && npm run test && cd ../sinaloka-platform && npm run lint`
- **Phase gate:** Full backend test suite green + platform type-check + platform build

### Wave 0 Gaps
- [ ] `sinaloka-backend/src/modules/settings/settings.service.spec.ts` -- covers ACAD-01 through ACAD-04, ACAD-06
- [ ] `sinaloka-backend/src/modules/settings/settings.controller.spec.ts` -- covers ACAD-06

## Sources

### Primary (HIGH confidence)
- `sinaloka-backend/src/modules/settings/settings.service.ts` -- existing billing settings pattern (read directly)
- `sinaloka-backend/src/modules/settings/settings.dto.ts` -- existing Zod validation pattern (read directly)
- `sinaloka-backend/src/modules/settings/settings.controller.ts` -- existing endpoint structure (read directly)
- `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` -- current mock room data, page hook pattern (read directly)
- `sinaloka-platform/src/pages/Settings/tabs/AcademicTab.tsx` -- existing UI structure with mocks (read directly)
- `sinaloka-platform/src/services/settings.service.ts` -- existing API service pattern (read directly)
- `sinaloka-platform/src/hooks/useSettings.ts` -- existing TanStack Query hooks pattern (read directly)
- `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx` -- current room free-text input (read directly, lines 289-297)
- `sinaloka-backend/prisma/schema.prisma` -- Institution.settings Json? field, Class.room String? field (read directly)
- `sinaloka-platform/src/components/ui/modal.tsx` -- Modal component API (read directly)
- `sinaloka-platform/src/components/ui/select.tsx` -- Select component API with optgroups support (read directly)
- `sinaloka-platform/src/types/settings.ts` -- existing TypeScript types for settings (read directly)
- `sinaloka-backend/src/modules/class/class.dto.ts` -- room field Zod schema (read directly)

### Secondary (MEDIUM confidence)
- None needed -- this phase is entirely a codebase extension with no external library research required.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, verified by reading package.json and source files
- Architecture: HIGH -- exact pattern to follow exists in billing settings, read and documented above
- Pitfalls: HIGH -- identified from direct code reading (JSON merge, backward compatibility, capacity handling)

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- no external dependencies or version concerns)
