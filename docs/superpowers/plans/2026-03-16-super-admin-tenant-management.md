# Super Admin Tenant Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a super admin area to sinaloka-platform for managing institutions, their admins, and impersonating institutions for troubleshooting.

**Architecture:** Dual layout approach — SUPER_ADMIN gets `/super/*` routes with own sidebar layout. Impersonation injects `institution_id` via Axios interceptor into existing institution-scoped routes. Backend changes are minimal: add `is_active` to institution, enhance existing endpoints, add one summary endpoint.

**Tech Stack:** NestJS + Prisma (backend), React + TanStack Query + TailwindCSS v4 + React Router (frontend)

**Spec:** `docs/superpowers/specs/2026-03-16-super-admin-tenant-management-design.md`

---

## Chunk 1: Backend — Schema, DTOs, and Service Changes

### Task 1: Add `is_active` field to Institution schema and migrate

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma` (institution model)

- [ ] **Step 1: Add `is_active` to institution model in schema**

In `sinaloka-backend/prisma/schema.prisma`, find the `institution` model and add:

```prisma
  is_active     Boolean   @default(true)
```

Add it after `default_language` field, before the relation fields.

- [ ] **Step 2: Create and apply migration**

Run:
```bash
cd sinaloka-backend && npx prisma migrate dev --name add_institution_is_active
```

Expected: Migration created and applied. The `DEFAULT true` ensures existing rows remain active.

- [ ] **Step 3: Regenerate Prisma client**

Run:
```bash
cd sinaloka-backend && npm run prisma:generate
```

Expected: Prisma client regenerated with `is_active` field on institution.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/prisma/
git commit -m "feat(schema): add is_active field to institution model"
```

---

### Task 2: Update Institution DTOs

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.dto.ts`

- [ ] **Step 1: Read current DTOs**

Read `sinaloka-backend/src/modules/institution/institution.dto.ts` to see existing schema definitions.

- [ ] **Step 2: Update CreateInstitutionSchema**

**IMPORTANT:** The codebase uses `z.infer<typeof Schema>` for DTO types, NOT `createZodDto` classes. Preserve all existing validation constraints (`.max(255)`, `.max(500)`, etc.). Only ADD the new fields to the existing schema — do not rewrite the whole thing.

Add these fields to the existing `CreateInstitutionSchema`:

```typescript
  timezone: z.string().optional(),
  default_language: z.string().optional(),
  admin: z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
    })
    .optional(),
```

The existing fields (`name`, `address`, `phone`, `email`, `logo_url`, `settings`) must remain unchanged with their current constraints.

The resulting type export stays as:
```typescript
export type CreateInstitutionDto = z.infer<typeof CreateInstitutionSchema>;
```

- [ ] **Step 3: Update UpdateInstitutionSchema**

Add these fields to the existing `UpdateInstitutionSchema` (preserving all existing fields and constraints):

```typescript
  timezone: z.string().optional().nullable(),
  default_language: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
```

The type export stays as:
```typescript
export type UpdateInstitutionDto = z.infer<typeof UpdateInstitutionSchema>;
```

- [ ] **Step 4: Verify build compiles**

Run:
```bash
cd sinaloka-backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/institution/institution.dto.ts
git commit -m "feat(institution): add timezone, default_language, admin, is_active to DTOs"
```

---

### Task 3: Update Institution Service — include admins, atomic create, summary, disable delete

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.service.ts`

- [ ] **Step 1: Read current service**

Read `sinaloka-backend/src/modules/institution/institution.service.ts` for current implementation.

- [ ] **Step 2: Enhance `findAll` to include admin users**

In the `findAll` method, add `include` to the Prisma query:

```typescript
const include = {
  users: {
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true },
  },
};
```

Add this `include` to both the `findMany` call and ensure it's part of the returned data. The existing pagination pattern should be preserved.

- [ ] **Step 3: Enhance `findOne` to include admin users**

Same `include` object added to the `findUnique` call in `findOne`.

- [ ] **Step 4: Enhance `create` for atomic institution + admin creation**

Modify the `create` method to accept the `admin` field from the DTO. If `admin` is provided, use `prisma.$transaction` to create both the institution and the admin user atomically:

```typescript
async create(data: CreateInstitutionDto) {
  const { admin, ...institutionData } = data;
  const slug = await this.generateUniqueSlug(institutionData.name);

  if (admin) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    return this.prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({
        data: { ...institutionData, slug },
      });
      await tx.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          password_hash: hashedPassword,
          role: 'ADMIN',
          institution_id: institution.id,
        },
      });
      return tx.institution.findUnique({
        where: { id: institution.id },
        include: {
          users: {
            where: { role: 'ADMIN' },
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  }

  return this.prisma.institution.create({
    data: { ...institutionData, slug },
  });
}
```

Import `bcrypt` at the top: `import * as bcrypt from 'bcrypt';`

- [ ] **Step 5: Add `getSummary` method**

Add a new method for the institution summary endpoint:

```typescript
async getSummary(institutionId: string) {
  const [studentCount, tutorCount, adminCount, activeClassCount] =
    await Promise.all([
      this.prisma.student.count({ where: { institution_id: institutionId } }),
      this.prisma.tutor.count({ where: { institution_id: institutionId } }),
      this.prisma.user.count({
        where: { institution_id: institutionId, role: 'ADMIN' },
      }),
      this.prisma.class.count({
        where: { institution_id: institutionId, status: 'ACTIVE' },
      }),
    ]);

  return { studentCount, tutorCount, adminCount, activeClassCount };
}
```

Note: The `Class` model uses a `status` field with enum `ClassStatus` (`ACTIVE`, `ARCHIVED`), not a boolean `is_active`.

- [ ] **Step 6: Disable `remove` method**

Replace the `remove` method body to return a 403:

```typescript
async remove(id: string) {
  throw new ForbiddenException(
    'Institution deletion is not supported. Use deactivation instead.',
  );
}
```

Import `ForbiddenException` from `@nestjs/common`.

- [ ] **Step 7: Verify build compiles**

Run:
```bash
cd sinaloka-backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add sinaloka-backend/src/modules/institution/institution.service.ts
git commit -m "feat(institution): add admin include, atomic create, summary, disable delete"
```

---

### Task 4: Update Institution Controller — add summary endpoint

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.controller.ts`

- [ ] **Step 1: Read current controller**

Read `sinaloka-backend/src/modules/institution/institution.controller.ts`.

- [ ] **Step 2: Add summary endpoint**

Add a new GET endpoint for institution summary. Place it BEFORE the `:id` route to avoid route conflicts:

```typescript
@Get(':id/summary')
async getSummary(@Param('id') id: string) {
  return this.institutionService.getSummary(id);
}
```

- [ ] **Step 3: Verify build compiles**

Run:
```bash
cd sinaloka-backend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/institution/institution.controller.ts
git commit -m "feat(institution): add GET summary endpoint"
```

---

### Task 5: Update Auth Service — check institution.is_active on login and refresh

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Read current auth service**

Read `sinaloka-backend/src/modules/auth/auth.service.ts`.

- [ ] **Step 2: Add institution include to login query**

In the `login()` method, find the `prisma.user.findUnique` call (currently has no `include`). Change it to:

```typescript
const user = await this.prisma.user.findUnique({
  where: { email: dto.email },
  include: { institution: true },
});
```

This makes `user.institution` available as a nested object (or `null` for SUPER_ADMIN). Then, after the existing user validation checks (password check, is_active check), add:

```typescript
if (user.institution && !user.institution.is_active) {
  throw new ForbiddenException(
    'Your institution has been deactivated. Contact support.',
  );
}
```

Add `ForbiddenException` to the existing `@nestjs/common` import (currently only imports `Injectable`, `UnauthorizedException`, `Logger`).

- [ ] **Step 3: Add institution check to refresh flow**

In the `refresh()` method, find the refresh token lookup query (uses `findFirst` on `refresh_token` model with `include: { user: true }`). Change the include to:

```typescript
include: { user: { include: { institution: true } } }
```

Then after the existing user validation, add the same `is_active` check:

```typescript
if (tokenRecord.user.institution && !tokenRecord.user.institution.is_active) {
  throw new ForbiddenException(
    'Your institution has been deactivated. Contact support.',
  );
}
```

- [ ] **Step 4: Verify build compiles**

Run:
```bash
cd sinaloka-backend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/auth/auth.service.ts
git commit -m "feat(auth): check institution.is_active on login and token refresh"
```

---

### Task 6: Update User Service and DTO — add role and status filters

**Files:**
- Modify: `sinaloka-backend/src/modules/user/user.service.ts`
- Modify: `sinaloka-backend/src/modules/user/user.dto.ts`

- [ ] **Step 1: Read current user service and DTOs**

Read `sinaloka-backend/src/modules/user/user.service.ts` and `sinaloka-backend/src/modules/user/user.dto.ts`.

- [ ] **Step 2: Add query params to user DTO**

In the user DTO file, add or extend a query schema for filtering:

```typescript
export const UserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TUTOR', 'PARENT']).optional(),
  is_active: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  institution_id: z.string().uuid().optional(),
});

export type UserQueryDto = z.infer<typeof UserQuerySchema>;
```

This is a superset of the existing pagination fields (`page`, `limit`, `search`) with added `role`, `is_active`, and `institution_id` filters. The `is_active` uses a string→boolean transform because query params arrive as strings.

- [ ] **Step 3: Update `findAll` in user service**

Modify the `findAll` method to accept the new query params and build the `where` clause:

```typescript
async findAll(institutionId: string | null, query: UserQueryDto) {
  const where: any = {};

  if (institutionId) {
    where.institution_id = institutionId;
  } else if (query.institution_id) {
    where.institution_id = query.institution_id;
  }

  if (query.role) {
    where.role = query.role;
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // ... rest of pagination logic unchanged
}
```

- [ ] **Step 4: Update user controller to use new DTO**

In `sinaloka-backend/src/modules/user/user.controller.ts`:
1. Import `UserQuerySchema` and `UserQueryDto` from `./user.dto`
2. Update the `findAll` method's `@Query()` decorator to use `UserQuerySchema` validation:
   ```typescript
   @Get()
   findAll(
     @CurrentUser() user: JwtPayload,
     @Query(new ZodValidationPipe(UserQuerySchema)) query: UserQueryDto,
   ) {
     return this.userService.findAll(user.institutionId, query);
   }
   ```
3. The existing destructuring in `findAll` (`page`, `limit`, `search`) still works because `UserQuerySchema` is a superset of those fields.

- [ ] **Step 5: Verify build compiles**

Run:
```bash
cd sinaloka-backend && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/user/
git commit -m "feat(user): add role, status, institution_id query filters"
```

---

## Chunk 2: Frontend — Types, API Layer, Auth Context, and Routing

### Task 7: Update frontend types

**Files:**
- Modify: `sinaloka-platform/src/types/auth.ts`
- Create: `sinaloka-platform/src/types/institution.ts`

- [ ] **Step 1: Read current auth types**

Read `sinaloka-platform/src/types/auth.ts`.

- [ ] **Step 2: Make `User.institution` nullable**

In `src/types/auth.ts`, change the `institution` field from required to nullable:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR';
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  institution: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    timezone: string;
    default_language: string;
  } | null;
}
```

- [ ] **Step 3: Create institution types**

Create `sinaloka-platform/src/types/institution.ts`:

```typescript
export interface InstitutionAdmin {
  id: string;
  name: string;
  email: string;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: Record<string, any> | null;
  timezone: string;
  default_language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users?: InstitutionAdmin[];
}

export interface InstitutionSummary {
  studentCount: number;
  tutorCount: number;
  adminCount: number;
  activeClassCount: number;
}

export interface CreateInstitutionPayload {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  timezone?: string;
  default_language?: string;
  admin?: {
    name: string;
    email: string;
    password: string;
  };
}

export interface UpdateInstitutionPayload {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  timezone?: string | null;
  default_language?: string | null;
  is_active?: boolean;
}
```

- [ ] **Step 4: Audit existing code for `user.institution` null safety**

Search all files in `sinaloka-platform/src/` that reference `user.institution` (without optional chaining). Key places to check:
- `src/contexts/AuthContext.tsx` — `applyInstitutionLanguage` uses `profile.institution.default_language`
- `src/components/Layout.tsx` — may display institution name

Add optional chaining (`user?.institution?.name`) or null guards where needed.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/
git commit -m "feat(types): add institution types, make User.institution nullable"
```

---

### Task 8: Create institution service and hooks

**Files:**
- Create: `sinaloka-platform/src/services/institutions.service.ts`
- Create: `sinaloka-platform/src/hooks/useInstitutions.ts`

- [ ] **Step 1: Read existing service pattern**

Read `sinaloka-platform/src/services/payments.service.ts` as reference.

- [ ] **Step 2: Create institutions service**

Create `sinaloka-platform/src/services/institutions.service.ts`:

```typescript
import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type {
  Institution,
  InstitutionSummary,
  CreateInstitutionPayload,
  UpdateInstitutionPayload,
} from '@/src/types/institution';

export const institutionsService = {
  getAll: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Institution>>('/api/admin/institutions', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Institution>(`/api/admin/institutions/${id}`).then((r) => r.data),

  create: (data: CreateInstitutionPayload) =>
    api.post<Institution>('/api/admin/institutions', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateInstitutionPayload }) =>
    api.patch<Institution>(`/api/admin/institutions/${id}`, data).then((r) => r.data),

  getSummary: (id: string) =>
    api.get<InstitutionSummary>(`/api/admin/institutions/${id}/summary`).then((r) => r.data),
};
```

- [ ] **Step 3: Create institutions hooks**

Create `sinaloka-platform/src/hooks/useInstitutions.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionsService } from '@/src/services/institutions.service';

export function useInstitutions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['institutions', params],
    queryFn: () => institutionsService.getAll(params),
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institutions', id],
    queryFn: () => institutionsService.getById(id),
    enabled: !!id,
  });
}

export function useInstitutionSummary(id: string) {
  return useQuery({
    queryKey: ['institutions', id, 'summary'],
    queryFn: () => institutionsService.getSummary(id),
    enabled: !!id,
  });
}

export function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: institutionsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: institutionsService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/services/institutions.service.ts sinaloka-platform/src/hooks/useInstitutions.ts
git commit -m "feat(platform): add institutions service and TanStack Query hooks"
```

---

### Task 9: Add impersonation state to AuthContext

**Files:**
- Modify: `sinaloka-platform/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Read current AuthContext**

Read `sinaloka-platform/src/contexts/AuthContext.tsx`.

- [ ] **Step 2: Add impersonation types and state**

Add to the `AuthContextType` interface:

```typescript
impersonatedInstitution: { id: string; name: string } | null;
enterInstitution: (id: string, name: string) => void;
exitInstitution: () => void;
isImpersonating: boolean;
```

- [ ] **Step 3: Implement impersonation state**

Inside the `AuthProvider` component, add:

```typescript
const [impersonatedInstitution, setImpersonatedInstitution] = useState<{
  id: string;
  name: string;
} | null>(() => {
  const stored = sessionStorage.getItem('impersonatedInstitution');
  return stored ? JSON.parse(stored) : null;
});

const enterInstitution = useCallback((id: string, name: string) => {
  const value = { id, name };
  setImpersonatedInstitution(value);
  sessionStorage.setItem('impersonatedInstitution', JSON.stringify(value));
}, []);

const exitInstitution = useCallback(() => {
  setImpersonatedInstitution(null);
  sessionStorage.removeItem('impersonatedInstitution');
}, []);

const isImpersonating = impersonatedInstitution !== null;
```

Include all new values in the context provider value object.

- [ ] **Step 4: Update `logout` to clear impersonation state**

In the existing `logout` callback, add `sessionStorage.removeItem('impersonatedInstitution')` before or after clearing tokens. Also reset the impersonation state:

```typescript
const logout = useCallback(async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  try { if (refreshToken) await authService.logout(refreshToken); } catch { /* ignore */ }
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('impersonatedInstitution');
  setImpersonatedInstitution(null);
  setUser(null);
}, []);
```

- [ ] **Step 5: Make `login` return the user profile**

Currently `login` returns `Promise<void>`. Change it to return the profile so callers can check the role for redirect:

```typescript
const login = useCallback(async (email: string, password: string): Promise<User> => {
  const tokens = await authService.login({ email, password });
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
  const profile = await authService.getMe();
  setUser(profile);
  applyInstitutionLanguage(profile);
  return profile;
}, []);
```

Update the `AuthContextType` interface to match: `login: (email: string, password: string) => Promise<User>;`

- [ ] **Step 6: Fix null safety for `applyInstitutionLanguage`**

The existing `applyInstitutionLanguage` function already uses optional chaining (`profile.institution?.default_language`) — verify this is the case. If not, add the null check:

```typescript
if (!localStorage.getItem('sinaloka-lang') && profile.institution?.default_language) {
  // existing logic
}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run:
```bash
cd sinaloka-platform && npx tsc --noEmit
```

Fix any null safety issues that arise from the `User.institution` type change.

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/contexts/AuthContext.tsx
git commit -m "feat(auth): add impersonation state to AuthContext"
```

---

### Task 10: Update Axios interceptor for impersonation

**Files:**
- Modify: `sinaloka-platform/src/lib/api.ts`

- [ ] **Step 1: Read current API setup**

Read `sinaloka-platform/src/lib/api.ts`.

- [ ] **Step 2: Add institution_id injection to request interceptor**

In the existing request interceptor, after the auth header logic, add:

```typescript
try {
  const impersonated = sessionStorage.getItem('impersonatedInstitution');
  if (impersonated) {
    const { id } = JSON.parse(impersonated);
    config.params = { ...config.params, institution_id: id };
  }
} catch {
  // ignore malformed sessionStorage data
}
```

This reads directly from sessionStorage (not context) so it works without React context access. The `config.params` approach merges correctly with existing query parameters.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/lib/api.ts
git commit -m "feat(api): inject institution_id param during impersonation"
```

---

### Task 11: Create SuperAdminRoute guard and SuperAdminLayout

**Files:**
- Create: `sinaloka-platform/src/components/SuperAdminRoute.tsx`
- Create: `sinaloka-platform/src/components/SuperAdminLayout.tsx`
- Create: `sinaloka-platform/src/components/ImpersonationBanner.tsx`

- [ ] **Step 1: Read existing Layout and ProtectedRoute**

Read `sinaloka-platform/src/components/Layout.tsx` and `sinaloka-platform/src/components/ProtectedRoute.tsx` for patterns.

- [ ] **Step 2: Create SuperAdminRoute**

Create `sinaloka-platform/src/components/SuperAdminRoute.tsx`:

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function SuperAdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // or skeleton loader matching ProtectedRoute
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 3: Create SuperAdminLayout**

Create `sinaloka-platform/src/components/SuperAdminLayout.tsx`. Follow the same patterns as `Layout.tsx` but with a simpler sidebar. Specific requirements:

**Sidebar nav items (exactly two):**
- Institutions — `Building2` icon from lucide-react, href: `/super/institutions`
- Users — `Users` icon from lucide-react, href: `/super/users`

**Title mapping for the header** (same pattern as Layout.tsx's `pageTitles`):
- `/super/institutions` → "Institutions"
- `/super/institutions/new` → "Create Institution"
- `/super/institutions/:id` → "Institution Detail"
- `/super/users` → "Users"

**What to include from existing Layout:**
- Collapsible sidebar (minimized state)
- Dark mode toggle
- Language toggle (id/en)
- User avatar + logout in header
- Same zinc palette, Inter font, spacing

**What to NOT include:**
- No "Pro Plan" storage widget
- No notification bell
- No search input in header (not needed for 5-20 institutions)

**Sidebar header:** Show "Sinaloka" as the main title with a small "Super Admin" subtitle badge below it.

Render `<Outlet />` for child route content.

- [ ] **Step 4: Create ImpersonationBanner**

Create `sinaloka-platform/src/components/ImpersonationBanner.tsx`:

```typescript
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ImpersonationBanner() {
  const { impersonatedInstitution, exitInstitution } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!impersonatedInstitution) return null;

  const handleExit = () => {
    exitInstitution();
    navigate('/super/institutions');
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-semibold">{t('superAdmin.viewingAs')}:</span>
        <span>{impersonatedInstitution.name}</span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 bg-amber-950 text-amber-500 px-3 py-1 rounded text-xs font-medium hover:bg-amber-900 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('superAdmin.exitToSuperAdmin')}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Add ImpersonationBanner to existing Layout**

In `sinaloka-platform/src/components/Layout.tsx`, import and render `ImpersonationBanner` at the very top of the main content area (before the header), so it appears above everything when impersonation is active.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/components/SuperAdminRoute.tsx sinaloka-platform/src/components/SuperAdminLayout.tsx sinaloka-platform/src/components/ImpersonationBanner.tsx sinaloka-platform/src/components/Layout.tsx
git commit -m "feat(platform): add SuperAdminLayout, SuperAdminRoute, ImpersonationBanner"
```

---

### Task 12: Update routing and login redirect

**Files:**
- Modify: `sinaloka-platform/src/App.tsx` ← routes are defined HERE, not in `main.tsx`
- Modify: `sinaloka-platform/src/components/ProtectedRoute.tsx`
- Modify: `sinaloka-platform/src/pages/Login.tsx`

- [ ] **Step 1: Read current routing setup**

Read `sinaloka-platform/src/App.tsx` and `sinaloka-platform/src/pages/Login.tsx`.

- [ ] **Step 1.5: Create placeholder page files**

Create empty placeholder exports so TypeScript compiles before the actual pages are built in Chunk 3:

```bash
mkdir -p sinaloka-platform/src/pages/SuperAdmin
```

Create these 4 files with minimal default exports:
- `sinaloka-platform/src/pages/SuperAdmin/Institutions.tsx` → `export default function Institutions() { return <div>Institutions</div>; }`
- `sinaloka-platform/src/pages/SuperAdmin/InstitutionForm.tsx` → `export default function InstitutionForm() { return <div>InstitutionForm</div>; }`
- `sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx` → `export default function InstitutionDetail() { return <div>InstitutionDetail</div>; }`
- `sinaloka-platform/src/pages/SuperAdmin/Users.tsx` → `export default function SuperAdminUsers() { return <div>Users</div>; }`

- [ ] **Step 2: Add super admin routes to App.tsx**

**IMPORTANT:** The `/super` route tree must be a **sibling** of the existing `<Route element={<ProtectedRoute />}>`, NOT nested inside it. This is because `SuperAdminRoute` handles its own auth check.

In `sinaloka-platform/src/App.tsx`, add imports and the new route block:

```typescript
import SuperAdminRoute from './components/SuperAdminRoute';
import SuperAdminLayout from './components/SuperAdminLayout';
import Institutions from './pages/SuperAdmin/Institutions';
import InstitutionForm from './pages/SuperAdmin/InstitutionForm';
import InstitutionDetail from './pages/SuperAdmin/InstitutionDetail';
import SuperAdminUsers from './pages/SuperAdmin/Users';

// Inside <Routes>, BEFORE the ProtectedRoute block:
<Route path="/super" element={<SuperAdminRoute />}>
  <Route element={<SuperAdminLayout />}>
    <Route path="institutions" element={<Institutions />} />
    <Route path="institutions/new" element={<InstitutionForm />} />
    <Route path="institutions/:id" element={<InstitutionDetail />} />
    <Route path="users" element={<SuperAdminUsers />} />
  </Route>
</Route>
```

The resulting route structure in App.tsx should be:
```
<Routes>
  <Route path="/login" ... />
  <Route path="/super" element={<SuperAdminRoute />}>  ← NEW sibling
    ...
  </Route>
  <Route element={<ProtectedRoute />}>                  ← existing
    <Route element={<Layout />}>
      ...
    </Route>
  </Route>
</Routes>
```

Note: `institutions/new` must be before `institutions/:id` in the route config.

- [ ] **Step 3: Update ProtectedRoute for SUPER_ADMIN redirect**

In `ProtectedRoute.tsx`, add logic: if user is SUPER_ADMIN and not impersonating, redirect to `/super/institutions`. This prevents SUPER_ADMIN from accidentally landing on institution-scoped pages:

```typescript
import { useAuth } from '@/src/hooks/useAuth';

// Inside the component:
const { user, isAuthenticated, isLoading, isImpersonating } = useAuth();

if (!isLoading && isAuthenticated && user?.role === 'SUPER_ADMIN' && !isImpersonating) {
  return <Navigate to="/super/institutions" replace />;
}
```

- [ ] **Step 4: Update Login redirect**

In `Login.tsx`, the `login()` now returns the user profile (changed in Task 9). Update `handleSubmit`:

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsSubmitting(true);
  try {
    const profile = await login(email, password);
    if (profile.role === 'SUPER_ADMIN') {
      navigate('/super/institutions', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      t('login.defaultError');
    setError(message);
  } finally {
    setIsSubmitting(false);
  }
};
```

Also update the "already authenticated" check at the top of the Login page:

```typescript
if (!authLoading && isAuthenticated) {
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/super/institutions" replace />;
  }
  return <Navigate to="/" replace />;
}
```

This requires destructuring `user` from `useAuth()` (add it to the existing destructure).

- [ ] **Step 5: Verify TypeScript compiles**

Run:
```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/App.tsx sinaloka-platform/src/components/ProtectedRoute.tsx sinaloka-platform/src/pages/Login.tsx sinaloka-platform/src/pages/SuperAdmin/
git commit -m "feat(routing): add /super routes, SUPER_ADMIN redirect logic"
```

---

## Chunk 3: Frontend — Super Admin Pages

### Task 13: Institution List page

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/Institutions.tsx`

- [ ] **Step 1: Read existing page pattern**

Read `sinaloka-platform/src/pages/Students.tsx` (first 150 lines) for table page patterns.

- [ ] **Step 2: Create Institutions page**

Create `sinaloka-platform/src/pages/SuperAdmin/Institutions.tsx`:

Key elements:
- Page title: "Institutions" with subtitle "Manage all tutoring institutions"
- "Create Institution" button (links to `/super/institutions/new`)
- Search input for filtering by name
- Table with columns: Name (with slug), Admin(s), Status (badge), Created, Actions
- Each row has "Edit" link (→ `/super/institutions/:id`) and "Enter" button (triggers `enterInstitution`)
- Use `useInstitutions()` hook for data fetching
- Use `useAuth().enterInstitution` for impersonation
- Navigate to `/` after entering institution (dashboard is at root path `/`, not `/dashboard`)
- Follow existing table styling patterns (zinc borders, hover states)
- Pagination at bottom

Use the same component patterns as Students page: motion for animations, Badge for status, etc.

Status badge:
- Active: green badge (`bg-green-500/10 text-green-500`)
- Inactive: gray badge (`bg-zinc-500/10 text-zinc-400`)

- [ ] **Step 3: Verify it renders**

Start the dev server and navigate to `/super/institutions`. Verify the page loads (may show empty state or error if backend isn't running).

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/Institutions.tsx
git commit -m "feat(platform): add institution list page for super admin"
```

---

### Task 14: Institution Create/Edit Form page

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/InstitutionForm.tsx`

- [ ] **Step 1: Create InstitutionForm page**

Create `sinaloka-platform/src/pages/SuperAdmin/InstitutionForm.tsx`:

This component supports two modes:
- **Standalone create mode** — rendered at `/super/institutions/new`, shows full form + "First Admin" section
- **Embedded edit mode** — rendered inside InstitutionDetail's General tab, receives institution data via props

**Mode detection:** Accept an optional `institution` prop (`Institution | undefined`). If prop is provided → edit mode. If not → create mode (standalone at `/super/institutions/new`). Do NOT use `useParams().id` for mode detection since the embedded case inherits the parent route's `:id` param which would be confusing.

Key elements:
- In create mode: institution fields + "First Admin" section (name, email, password)
- In edit mode: institution fields + is_active toggle + "Danger Zone" (deactivate button)
- Form fields: Name, Address, Phone, Email, Timezone (select), Default Language (select)
- Slug displayed as read-only in edit mode (fetched from API)
- Use `useCreateInstitution()` and `useUpdateInstitution()` mutations
- Toast on success, navigate to `/super/institutions` or institution detail
- Use existing Input, Label, Button component patterns from the codebase

Timezone dropdown values: common Indonesian timezones (Asia/Jakarta, Asia/Makassar, Asia/Jayapura, etc.)
Language dropdown: `id` (Indonesian), `en` (English)

Danger Zone (edit mode only):
- Red-bordered section at bottom
- "Deactivate Institution" button with confirmation dialog
- Calls `useUpdateInstitution` with `{ is_active: false }`

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/InstitutionForm.tsx
git commit -m "feat(platform): add institution create/edit form"
```

---

### Task 15: Institution Detail page (tabbed)

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx`

- [ ] **Step 1: Create InstitutionDetail page**

Create `sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx`:

Three tabs: General, Admins, Overview.

Key elements:
- Use `useParams().id` to get institution ID
- Use `useInstitution(id)` to fetch institution data
- Tab navigation (simple button group, no library needed — follow existing patterns if any tabs exist in codebase)
- "Enter Institution" button in the header area

**General tab:**
- Renders `InstitutionForm` in edit mode (pass institution data as prop, or let it fetch via useInstitution)
- Or: inline the edit form fields directly here

**Admins tab:**
- Table of admin users (from `institution.users` relation)
- Columns: Name, Email, Status
- "Add Admin" button → modal with form (name, email, password)
- Uses existing `POST /api/admin/users` endpoint with `institution_id` set to this institution's ID
- The user creation should use the existing user service/hook if available, or create inline API call

**Overview tab:**
- Use `useInstitutionSummary(id)` hook
- Display 4 stat cards: Students, Tutors, Admins, Active Classes
- Simple grid of cards with count numbers (match existing dashboard stat card pattern)

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx
git commit -m "feat(platform): add institution detail page with tabs"
```

---

### Task 16: Create users service and hooks for super admin

**Files:**
- Create: `sinaloka-platform/src/services/users.service.ts`
- Create: `sinaloka-platform/src/hooks/useUsers.ts`

- [ ] **Step 1: Create users service**

Create `sinaloka-platform/src/services/users.service.ts`:

```typescript
import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR' | 'PARENT';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  institution: { id: string; name: string } | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  institution_id: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
}

export const usersService = {
  getAll: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<AdminUser>>('/api/admin/users', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<AdminUser>(`/api/admin/users/${id}`).then((r) => r.data),

  create: (data: CreateUserPayload) =>
    api.post<AdminUser>('/api/admin/users', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
    api.patch<AdminUser>(`/api/admin/users/${id}`, data).then((r) => r.data),
};
```

- [ ] **Step 2: Create users hooks**

Create `sinaloka-platform/src/hooks/useUsers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/src/services/users.service';

export function useUsers(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersService.getAll(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/services/users.service.ts sinaloka-platform/src/hooks/useUsers.ts
git commit -m "feat(platform): add users service and hooks for super admin"
```

---

### Task 17: Cross-Institution Users page

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/Users.tsx`

- [ ] **Step 1: Create Users page**

Create `sinaloka-platform/src/pages/SuperAdmin/Users.tsx`:

Key elements:
- Page title: "Users" with subtitle "Manage users across all institutions"
- "Create Admin" button
- Filters: Role dropdown (Admin/Tutor/Parent), Institution dropdown, Status dropdown (Active/Inactive)
- Search input
- Table columns: Name, Email, Role (badge), Institution, Status (badge), Last Login
- Admin rows: clickable to open edit modal (name, email, toggle active, reset password)
- Tutor/Parent rows: read-only (no click action, or view-only modal)

Use the `useUsers()` hook (created in Task 16) and `usersService` for API calls. Query params: `role`, `is_active`, `institution_id`, `search`, `page`, `limit`.

For the institution filter dropdown, fetch all institutions using `useInstitutions()`.

"Create Admin" modal:
- Fields: Name, Email, Password, Institution (dropdown)
- Uses `POST /api/admin/users` with `role: 'ADMIN'` and selected `institution_id`

Edit Admin modal:
- Fields: Name, Email, Active toggle
- Reset password option (if the endpoint exists) or just password field
- Uses `PATCH /api/admin/users/:id`

Role badges:
- ADMIN: blue
- TUTOR: purple
- PARENT: amber

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/Users.tsx
git commit -m "feat(platform): add cross-institution users page"
```

---

### Task 18: Add i18n translation keys

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Read current locale files**

Read `sinaloka-platform/src/locales/en.json` and `sinaloka-platform/src/locales/id.json` to understand key structure.

- [ ] **Step 2: Add super admin keys to en.json**

Add a `superAdmin` section:

```json
"superAdmin": {
  "institutions": "Institutions",
  "institutionsDesc": "Manage all tutoring institutions",
  "users": "Users",
  "usersDesc": "Manage users across all institutions",
  "createInstitution": "Create Institution",
  "editInstitution": "Edit Institution",
  "institutionName": "Institution Name",
  "institutionSlug": "Slug",
  "institutionAddress": "Address",
  "institutionPhone": "Phone",
  "institutionEmail": "Email",
  "institutionTimezone": "Timezone",
  "institutionLanguage": "Default Language",
  "institutionLogo": "Logo",
  "firstAdmin": "First Admin",
  "adminName": "Admin Name",
  "adminEmail": "Admin Email",
  "adminPassword": "Admin Password",
  "enterInstitution": "Enter",
  "viewingAs": "Viewing as",
  "exitToSuperAdmin": "Exit to Super Admin",
  "deactivateInstitution": "Deactivate Institution",
  "deactivateConfirm": "Are you sure you want to deactivate this institution? All users will be unable to log in.",
  "activateInstitution": "Activate Institution",
  "institutionDeactivated": "Institution deactivated",
  "institutionActivated": "Institution activated",
  "institutionCreated": "Institution created successfully",
  "institutionUpdated": "Institution updated successfully",
  "general": "General",
  "admins": "Admins",
  "overview": "Overview",
  "addAdmin": "Add Admin",
  "createAdmin": "Create Admin",
  "students": "Students",
  "tutors": "Tutors",
  "activeClasses": "Active Classes",
  "dangerZone": "Danger Zone",
  "deletionNotSupported": "Institution deletion is not supported. Use deactivation instead.",
  "noInstitutions": "No institutions found",
  "noUsers": "No users found"
}
```

- [ ] **Step 3: Add super admin keys to id.json**

Add the Indonesian translations for the same `superAdmin` section:

```json
"superAdmin": {
  "institutions": "Institusi",
  "institutionsDesc": "Kelola semua institusi bimbingan belajar",
  "users": "Pengguna",
  "usersDesc": "Kelola pengguna di seluruh institusi",
  "createInstitution": "Buat Institusi",
  "editInstitution": "Edit Institusi",
  "institutionName": "Nama Institusi",
  "institutionSlug": "Slug",
  "institutionAddress": "Alamat",
  "institutionPhone": "Telepon",
  "institutionEmail": "Email",
  "institutionTimezone": "Zona Waktu",
  "institutionLanguage": "Bahasa Default",
  "institutionLogo": "Logo",
  "firstAdmin": "Admin Pertama",
  "adminName": "Nama Admin",
  "adminEmail": "Email Admin",
  "adminPassword": "Password Admin",
  "enterInstitution": "Masuk",
  "viewingAs": "Melihat sebagai",
  "exitToSuperAdmin": "Keluar ke Super Admin",
  "deactivateInstitution": "Nonaktifkan Institusi",
  "deactivateConfirm": "Apakah Anda yakin ingin menonaktifkan institusi ini? Semua pengguna tidak akan bisa masuk.",
  "activateInstitution": "Aktifkan Institusi",
  "institutionDeactivated": "Institusi dinonaktifkan",
  "institutionActivated": "Institusi diaktifkan",
  "institutionCreated": "Institusi berhasil dibuat",
  "institutionUpdated": "Institusi berhasil diperbarui",
  "general": "Umum",
  "admins": "Admin",
  "overview": "Ringkasan",
  "addAdmin": "Tambah Admin",
  "createAdmin": "Buat Admin",
  "students": "Siswa",
  "tutors": "Tutor",
  "activeClasses": "Kelas Aktif",
  "dangerZone": "Zona Berbahaya",
  "deletionNotSupported": "Penghapusan institusi tidak didukung. Gunakan nonaktifkan sebagai gantinya.",
  "noInstitutions": "Tidak ada institusi ditemukan",
  "noUsers": "Tidak ada pengguna ditemukan"
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(i18n): add super admin translation keys (en + id)"
```

---

### Task 19: Final integration verification

- [ ] **Step 1: Run backend build**

```bash
cd sinaloka-backend && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 2: Run frontend build**

```bash
cd sinaloka-platform && npm run build
```

Expected: No build errors.

- [ ] **Step 3: Run backend lint**

```bash
cd sinaloka-backend && npm run lint
```

Expected: No lint errors (or only pre-existing ones).

- [ ] **Step 4: Run frontend lint**

```bash
cd sinaloka-platform && npm run lint
```

Expected: No lint errors.

- [ ] **Step 5: Manual smoke test**

Start both backend and frontend dev servers. Test:
1. Login as SUPER_ADMIN → should redirect to `/super/institutions`
2. Institution list loads with correct data
3. Create new institution with first admin
4. Edit institution, toggle active/inactive
5. Click "Enter" on an institution → should redirect to `/` (dashboard) with amber banner
6. Click "Exit" on banner → returns to `/super/institutions`
7. Navigate to `/super/users` → cross-institution user list loads
8. Create a new admin user for an institution
9. Login as regular ADMIN → should redirect to `/` (not `/super`)
10. Login as user from deactivated institution → should get error message

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: super admin tenant management - integration fixes"
```
