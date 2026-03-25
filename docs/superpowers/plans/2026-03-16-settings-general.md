# General Settings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the General Settings tab so ADMINs can view and update their institution's name, email, phone, address, timezone, and default language via a new `/api/settings` backend module.

**Architecture:** Add `timezone` and `default_language` columns to the institution table via Prisma migration. Create a new NestJS `SettingsModule` with GET/PATCH endpoints at `/api/settings/general` accessible by ADMIN+SUPER_ADMIN. On the frontend, create a settings service/hook/types layer and rewire the General tab in Settings.tsx to load from and save to the API. Enrich the auth `/me` response with timezone and default_language so the i18n system can use institution defaults.

**Tech Stack:** NestJS, Prisma, Zod, React, TanStack Query, react-i18next

**Spec:** `docs/superpowers/specs/2026-03-16-settings-general-design.md`

---

## Chunk 1: Database Migration + Backend Settings Module

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma` (lines 81-108)

- [ ] **Step 1: Add timezone and default_language columns to Institution model**

In `sinaloka-backend/prisma/schema.prisma`, inside the `Institution` model, add after the `settings` field:

```prisma
  timezone         String   @default("Asia/Jakarta")
  default_language String   @default("id")
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd sinaloka-backend && npx prisma migrate dev --name add-institution-timezone-language
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd sinaloka-backend && npm run prisma:generate
```

- [ ] **Step 4: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd sinaloka-backend
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(backend): add timezone and default_language columns to institution table"
```

---

### Task 2: Create Settings DTO

**Files:**
- Create: `sinaloka-backend/src/modules/settings/settings.dto.ts`

- [ ] **Step 1: Create the DTO file**

Create `sinaloka-backend/src/modules/settings/settings.dto.ts`:

```typescript
import { z } from 'zod';

export const UpdateGeneralSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  timezone: z.enum([
    'Asia/Jakarta',
    'Asia/Singapore',
    'Asia/Makassar',
    'Asia/Jayapura',
    'UTC',
  ]).optional(),
  default_language: z.enum(['id', 'en']).optional(),
});

export type UpdateGeneralSettingsDto = z.infer<typeof UpdateGeneralSettingsSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.dto.ts
git commit -m "feat(backend): add settings DTO with Zod validation schema"
```

---

### Task 3: Create Settings Service

**Files:**
- Create: `sinaloka-backend/src/modules/settings/settings.service.ts`

- [ ] **Step 1: Create the service**

Create `sinaloka-backend/src/modules/settings/settings.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { UpdateGeneralSettingsDto } from './settings.dto.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneral(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        timezone: true,
        default_language: true,
      },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return institution;
  }

  async updateGeneral(institutionId: string, dto: UpdateGeneralSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: dto,
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        timezone: true,
        default_language: true,
      },
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.service.ts
git commit -m "feat(backend): add settings service with getGeneral and updateGeneral"
```

---

### Task 4: Create Settings Controller

**Files:**
- Create: `sinaloka-backend/src/modules/settings/settings.controller.ts`

- [ ] **Step 1: Create the controller**

Create `sinaloka-backend/src/modules/settings/settings.controller.ts`:

```typescript
import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SettingsService } from './settings.service.js';
import { UpdateGeneralSettingsSchema } from './settings.dto.js';
import type { UpdateGeneralSettingsDto } from './settings.dto.js';

@Controller('settings')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('general')
  async getGeneral(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getGeneral(user.institutionId!);
  }

  @Patch('general')
  async updateGeneral(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateGeneralSettingsSchema)) dto: UpdateGeneralSettingsDto,
  ) {
    return this.settingsService.updateGeneral(user.institutionId!, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.controller.ts
git commit -m "feat(backend): add settings controller with GET/PATCH general endpoints"
```

---

### Task 5: Create Settings Module and Register in App

**Files:**
- Create: `sinaloka-backend/src/modules/settings/settings.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

Create `sinaloka-backend/src/modules/settings/settings.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 2: Register in app.module.ts**

In `sinaloka-backend/src/app.module.ts`:

Add import at top:
```typescript
import { SettingsModule } from './modules/settings/settings.module.js';
```

Add `SettingsModule` to the `imports` array (after `ParentModule`).

- [ ] **Step 3: Verify backend compiles**

```bash
cd sinaloka-backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify endpoint with curl**

Start the backend and test:

```bash
curl -s http://localhost:5000/api/settings/general \
  -H "Authorization: Bearer <admin_token>" | jq .
```

Expected: Returns institution data with name, email, phone, address, timezone, default_language.

- [ ] **Step 5: Test PATCH**

```bash
curl -s -X PATCH http://localhost:5000/api/settings/general \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "Asia/Singapore"}' | jq .
```

Expected: Returns updated data with timezone "Asia/Singapore".

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/settings/ sinaloka-backend/src/app.module.ts
git commit -m "feat(backend): register SettingsModule in app and verify endpoints"
```

---

### Task 6: Enrich Auth /me Response

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.service.ts` (lines 168-196)

- [ ] **Step 1: Add timezone and default_language to getProfile select**

In `sinaloka-backend/src/modules/auth/auth.service.ts`, in the `getProfile` method, update the institution select (around line 180-186):

Change:
```typescript
institution: {
  select: {
    id: true,
    name: true,
    slug: true,
    logo_url: true,
  },
},
```

To:
```typescript
institution: {
  select: {
    id: true,
    name: true,
    slug: true,
    logo_url: true,
    timezone: true,
    default_language: true,
  },
},
```

- [ ] **Step 2: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit
```

- [ ] **Step 3: Test with curl**

```bash
curl -s http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <admin_token>" | jq '.institution'
```

Expected: Institution object now includes `timezone` and `default_language` fields.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/auth/auth.service.ts
git commit -m "feat(backend): include timezone and default_language in /auth/me response"
```

---

## Chunk 2: Frontend — Service, Hook, Types, Auth, i18n

### Task 7: Create Frontend Types, Service, and Hook

**Files:**
- Create: `sinaloka-platform/src/types/settings.ts`
- Create: `sinaloka-platform/src/services/settings.service.ts`
- Create: `sinaloka-platform/src/hooks/useSettings.ts`

- [ ] **Step 1: Create types**

Create `sinaloka-platform/src/types/settings.ts`:

```typescript
export interface GeneralSettings {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  default_language: string;
}

export interface UpdateGeneralSettingsDto {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
  default_language?: string;
}
```

- [ ] **Step 2: Create service**

Create `sinaloka-platform/src/services/settings.service.ts`:

```typescript
import api from '@/src/lib/api';
import type { GeneralSettings, UpdateGeneralSettingsDto } from '@/src/types/settings';

export const settingsService = {
  getGeneral: () =>
    api.get<GeneralSettings>('/api/settings/general').then((r) => r.data),
  updateGeneral: (data: UpdateGeneralSettingsDto) =>
    api.patch<GeneralSettings>('/api/settings/general', data).then((r) => r.data),
};
```

- [ ] **Step 3: Create hook**

Create `sinaloka-platform/src/hooks/useSettings.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/src/services/settings.service';
import type { UpdateGeneralSettingsDto } from '@/src/types/settings';

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['settings', 'general'],
    queryFn: settingsService.getGeneral,
  });
}

export function useUpdateGeneralSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGeneralSettingsDto) => settingsService.updateGeneral(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'general'] });
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}
```

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/settings.ts sinaloka-platform/src/services/settings.service.ts sinaloka-platform/src/hooks/useSettings.ts
git commit -m "feat(platform): add settings types, service, and hook for general settings"
```

---

### Task 8: Update Auth Type with timezone and default_language

**Files:**
- Modify: `sinaloka-platform/src/types/auth.ts` (lines 22-27)

- [ ] **Step 1: Add new fields to User.institution type**

In `sinaloka-platform/src/types/auth.ts`, update the `institution` property of the `User` interface:

Change:
```typescript
institution: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};
```

To:
```typescript
institution: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  default_language: string;
};
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/types/auth.ts
git commit -m "feat(platform): add timezone and default_language to User.institution type"
```

---

### Task 9: Update i18n to Use Institution Default Language on Login

**Files:**
- Modify: `sinaloka-platform/src/contexts/AuthContext.tsx` (line 33-34)

- [ ] **Step 1: Apply institution default language after login**

In `sinaloka-platform/src/contexts/AuthContext.tsx`, import i18n:

```typescript
import i18n from '@/src/lib/i18n';
```

In the `login` callback, after `setUser(profile)` (around line 34), add:

```typescript
// Apply institution default language if user has no preference
if (!localStorage.getItem('sinaloka-lang') && profile.institution?.default_language) {
  i18n.changeLanguage(profile.institution.default_language);
  document.documentElement.lang = profile.institution.default_language;
}
```

Also do the same in the initial load `useEffect` (around line 23-26), after `setUser`:

```typescript
authService.getMe()
  .then((profile) => {
    setUser(profile);
    if (!localStorage.getItem('sinaloka-lang') && profile.institution?.default_language) {
      i18n.changeLanguage(profile.institution.default_language);
      document.documentElement.lang = profile.institution.default_language;
    }
  })
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/contexts/AuthContext.tsx
git commit -m "feat(platform): apply institution default_language on login when no user preference"
```

---

## Chunk 3: Frontend — Settings.tsx General Tab Rewrite

### Task 10: Rewrite Settings.tsx General Tab

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings.tsx`

- [ ] **Step 1: Read current Settings.tsx**

Read the file to understand the current structure before editing.

- [ ] **Step 2: Add imports and hook**

Add at top of Settings.tsx:
```typescript
import { useGeneralSettings, useUpdateGeneralSettings } from '@/src/hooks/useSettings';
```

Inside the component, add:
```typescript
const { data: generalSettings, isLoading: isLoadingGeneral } = useGeneralSettings();
const updateSettings = useUpdateGeneralSettings();
```

- [ ] **Step 3: Add form state initialized from API data**

Add `useEffect` to populate form state when data loads:
```typescript
const [formName, setFormName] = useState('');
const [formEmail, setFormEmail] = useState('');
const [formPhone, setFormPhone] = useState('');
const [formAddress, setFormAddress] = useState('');
const [formTimezone, setFormTimezone] = useState('Asia/Jakarta');
const [formLanguage, setFormLanguage] = useState('id');

useEffect(() => {
  if (generalSettings) {
    setFormName(generalSettings.name);
    setFormEmail(generalSettings.email ?? '');
    setFormPhone(generalSettings.phone ?? '');
    setFormAddress(generalSettings.address ?? '');
    setFormTimezone(generalSettings.timezone);
    setFormLanguage(generalSettings.default_language);
  }
}, [generalSettings]);
```

- [ ] **Step 4: Add save handler**

```typescript
const handleSaveGeneral = () => {
  updateSettings.mutate({
    name: formName,
    email: formEmail || null,
    phone: formPhone || null,
    address: formAddress || null,
    timezone: formTimezone,
    default_language: formLanguage,
  }, {
    onSuccess: () => {
      toast.success(t('common.saveChanges') + ' ✓');
      // If language changed, also update i18n
      if (formLanguage !== i18n.language) {
        i18n.changeLanguage(formLanguage);
        localStorage.setItem('sinaloka-lang', formLanguage);
        document.documentElement.lang = formLanguage;
      }
    },
    onError: () => toast.error(t('settings.general.saveFailed') || 'Failed to save settings'),
  });
};
```

- [ ] **Step 5: Rewrite the General tab form**

Replace the existing General tab content with:
- Loading skeleton when `isLoadingGeneral` is true
- Institution Name input bound to `formName`
- Support Email input bound to `formEmail`
- **Phone** input bound to `formPhone` (NEW — currently missing)
- **Address** input bound to `formAddress` (NEW — currently missing)
- Timezone dropdown with IANA values: `<option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>`, etc.
- Language dropdown bound to `formLanguage` — uses localStorage key `'sinaloka-lang'` (fix the existing bug that uses `'language'`)
- "Save Changes" button calls `handleSaveGeneral`, disabled when `updateSettings.isPending`
- Danger Zone section stays as-is (static for now)

- [ ] **Step 6: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 7: Manual test**

1. Start backend + frontend
2. Login as admin
3. Go to Settings > General tab
4. Verify fields are pre-populated from the API
5. Change institution name → Save → verify toast appears
6. Refresh page → verify name persists
7. Change timezone → Save → verify it persists
8. Change language → Save → verify i18n switches AND it persists on refresh

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/pages/Settings.tsx
git commit -m "feat(platform): wire General Settings tab to API with load/save functionality"
```

---

### Task 11: Add Translation Keys for New Settings Strings

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add missing keys for phone, address, and save feedback**

Add to `settings.general` in `id.json`:
```json
"phone": "Telepon",
"address": "Alamat",
"addressPlaceholder": "Jl. Pendidikan No. 1",
"saveFailed": "Gagal menyimpan pengaturan",
"saveSuccess": "Pengaturan berhasil disimpan"
```

Add equivalent in `en.json`:
```json
"phone": "Phone",
"address": "Address",
"addressPlaceholder": "123 Education Street",
"saveFailed": "Failed to save settings",
"saveSuccess": "Settings saved successfully"
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add translation keys for General Settings phone/address/toast"
```

---

## Chunk 4: Final Verification

### Task 12: Full Build + Integration Test

- [ ] **Step 1: Backend type check**

```bash
cd sinaloka-backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Frontend type check**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Frontend production build**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: End-to-end smoke test**

Start both backend and frontend. Verify:

1. Login as admin → `/api/auth/me` returns `institution.timezone` and `institution.default_language`
2. Navigate to Settings → General tab loads data from API
3. All 6 fields visible: name, email, phone, address, timezone, language
4. Edit institution name → Save → refresh → name persists
5. Change timezone to "Asia/Singapore" → Save → verify persists
6. Change language to English → Save → verify i18n switches + persists
7. Open incognito/new browser → login → verify institution default language is applied (no localStorage)
8. TUTOR role cannot access `/api/settings/general` (403)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete General Settings backend + frontend integration"
```
