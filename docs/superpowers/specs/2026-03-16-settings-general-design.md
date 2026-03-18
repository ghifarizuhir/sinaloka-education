# General Settings Design — sinaloka-platform + sinaloka-backend

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Wire up the General tab in Settings to persist institution configuration via a new backend settings module

## Overview

Make the General Settings tab functional. ADMINs can update their institution's name, email, phone, address, timezone, and default language. A new backend settings module provides dedicated endpoints scoped to the authenticated user's institution. Timezone and default language are stored as explicit database columns because they affect business logic across the platform.

## Database Schema Changes

Add two explicit columns to the `institution` table:

```prisma
model Institution {
  // ... existing fields (name, slug, address, phone, email, logo_url, settings)
  timezone         String  @default("Asia/Jakarta")
  default_language String  @default("id")
}
```

**Migration:** Single `ALTER TABLE` adding two columns with defaults. No data loss, backward compatible.

**Storage decisions:**

| Field | Storage | Rationale |
|-------|---------|-----------|
| name | Existing `name` column | Already exists |
| email | Existing `email` column | Already exists |
| phone | Existing `phone` column | Already exists |
| address | Existing `address` column | Already exists |
| timezone | New `timezone` column | Affects date display, future scheduling logic |
| default_language | New `default_language` column | Affects i18n initialization for new users |

The existing `settings: Json?` field remains for future UI preferences and feature flags.

**Note:** `logo_url` is excluded from General Settings — it belongs to the Branding tab (separate sub-project).

## Backend — Settings Module

### Module Structure

```
src/modules/settings/
  settings.module.ts       — NestJS module, imports PrismaService
  settings.controller.ts   — routes under /api/settings
  settings.service.ts      — business logic
  settings.dto.ts          — Zod validation schemas
```

**Registration:** `SettingsModule` must be added to the `imports` array in `app.module.ts`.

### Endpoints

```
GET   /api/settings/general   → returns current general settings
PATCH /api/settings/general   → updates general settings
```

**Access:** `ADMIN` and `SUPER_ADMIN` roles (read + write). TUTORs do not have access — they receive timezone/language via the `/api/auth/me` response instead.

**Tenant scoping:** Follow existing codebase pattern — controller uses `@CurrentUser()` to get `user.institutionId` and passes it to the service as the first argument. This is consistent with how StudentController, ClassController, etc. work.

### GET /api/settings/general — Response

```json
{
  "name": "Bimbel Cerdas",
  "email": "info@cerdas.id",
  "phone": "08111111111",
  "address": null,
  "timezone": "Asia/Jakarta",
  "default_language": "id"
}
```

### PATCH /api/settings/general — Request Body

All fields optional:

```json
{
  "name": "Bimbel Cerdas Updated",
  "email": "support@cerdas.id",
  "phone": "08111111112",
  "address": "Jl. Pendidikan No. 1",
  "timezone": "Asia/Jakarta",
  "default_language": "id"
}
```

### Validation (Zod)

```typescript
const GeneralSettingsUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  timezone: z.enum([
    'Asia/Jakarta',
    'Asia/Singapore',
    'Asia/Makassar',
    'Asia/Jayapura',
    'UTC'
  ]).optional(),
  default_language: z.enum(['id', 'en']).optional(),
});
```

### Error Responses

Standard NestJS error format:
- `400 Bad Request` — Zod validation failure (invalid email, name too long, etc.)
- `404 Not Found` — institution not found (should not happen with valid JWT)
- `401 Unauthorized` / `403 Forbidden` — missing or insufficient role

No optimistic concurrency control — last write wins. Acceptable for settings (low contention).

### Service Implementation

- `getGeneral(institutionId: string)` — Prisma `findUnique`, select only general fields, throw `NotFoundException` if not found
- `updateGeneral(institutionId: string, dto)` — Prisma `update` with the DTO fields, return updated record

## Frontend Integration

### New Files

**`src/services/settings.service.ts`**

```typescript
export const settingsService = {
  getGeneral: () => api.get('/api/settings/general').then(r => r.data),
  updateGeneral: (data: UpdateGeneralSettingsDto) =>
    api.patch('/api/settings/general', data).then(r => r.data),
};
```

**`src/hooks/useSettings.ts`**

```typescript
export function useGeneralSettings() {
  return useQuery({ queryKey: ['settings', 'general'], queryFn: settingsService.getGeneral });
}

export function useUpdateGeneralSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateGeneral,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'general'] });
      qc.invalidateQueries({ queryKey: ['auth'] }); // refresh auth context so institution name/timezone stays in sync
    },
  });
}
```

**`src/types/settings.ts`**

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

### Settings.tsx — General Tab Changes

- Load settings via `useGeneralSettings()` on mount
- Pre-populate form fields from API response (use empty string for null values in inputs)
- Add **phone** and **address** input fields (currently missing from the UI mockup)
- Track form state with `useState` for each field
- "Save Changes" button calls `useUpdateGeneralSettings` mutation
- Loading skeleton while fetching
- Success toast on save, error toast on failure
- Timezone dropdown: `<option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>` — display label is human-readable, `value` is the IANA timezone string that matches the Zod enum
- Language dropdown triggers both API save AND `i18n.changeLanguage()` + localStorage update
- **Important:** Language localStorage key must be `'sinaloka-lang'` (matching `i18n.ts`), NOT `'language'` (current bug in Settings.tsx mockup)
- Disable Save button when no changes detected or mutation is pending

### Auth Context Enrichment

**Backend:** Update `getProfile()` in `auth.service.ts` to include `institution.timezone` and `institution.default_language` in the `/api/auth/me` response. Specifically, add these to the Prisma `select` for institution:

```typescript
institution: {
  select: {
    id: true,
    name: true,
    slug: true,
    logo_url: true,
    timezone: true,         // add
    default_language: true, // add
  },
},
```

**Frontend:** Update the `User` type in `src/types/auth.ts`:

```typescript
institution: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;        // new
  default_language: string; // new
}
```

### i18n Initialization Priority

Update `src/lib/i18n.ts` to support institution default:

```
1. localStorage('sinaloka-lang')     → user override (if set)
2. institution.default_language      → from auth context on login
3. 'id'                              → hardcoded fallback
```

On successful login, if localStorage has no `sinaloka-lang` key, read `default_language` from the auth response and set it as the active language via `i18n.changeLanguage()`.

## Cross-Platform Effects

### Timezone — Progressive Approach

- **Now:** Store timezone in DB, return it in API responses. Frontend can use it for display formatting.
- **Later:** When features need it (automated scheduling, notifications, report generation), the data is already available in the DB.
- **No changes** to existing session time storage (remains "14:00" strings), attendance timestamps, or dashboard relative times.

### Default Language

- **New users / fresh browsers:** Read institution `default_language` from auth context, apply as i18n language
- **Existing users with localStorage:** No change — localStorage takes priority
- **Email templates:** No change now — could consume institution language in future
- **PDF reports:** Could use institution language when generating — future concern

### Institution Name/Email

- Tutor invitation emails already use `institution.name` from DB — updating name in Settings propagates automatically
- Sidebar brand name stays hardcoded "Sinaloka" (product name, not institution name) — no change
- Email sender uses `EMAIL_FROM` env var — separate concern, no change
- **After save:** Auth context is invalidated (via `queryKey: ['auth']`), so the institution name in the header/sidebar refreshes without requiring re-login

### Stale Data Prevention

When settings are saved successfully, the mutation `onSuccess` invalidates both the `['settings', 'general']` and `['auth']` query keys. This ensures:
- The settings form shows the latest saved values
- The auth context (used by Layout for institution name) reflects the updated data

## Bug Fixes (Pre-existing)

- **localStorage key mismatch:** Settings.tsx currently writes `localStorage.setItem('language', lang)` but `i18n.ts` reads `localStorage.getItem('sinaloka-lang')`. Fix: Settings.tsx must use the key `'sinaloka-lang'` consistently.

## Constraints

- No backend timezone conversion logic — display-only for now
- Existing institution CRUD (`/api/admin/institutions`) stays unchanged for SUPER_ADMIN operations
- The `settings: Json?` field is not used by General Settings — reserved for future tabs
- Supported timezones limited to Indonesian zones + UTC + Singapore for now
- Logo management is excluded — belongs to Branding tab (separate sub-project)
- TUTORs access timezone/language via `/api/auth/me`, not via `/api/settings`
