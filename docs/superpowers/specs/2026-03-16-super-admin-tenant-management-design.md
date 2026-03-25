# Super Admin Tenant Management — Design Spec

## Overview

Add a super admin area to the existing sinaloka-platform for managing institutions (tenants). SUPER_ADMIN users get a dedicated route tree (`/super/*`) with its own layout, while retaining the ability to "impersonate" any institution and use the existing admin interface on their behalf.

**Scale:** 5–20 institutions. No self-service onboarding, usage metering, or per-tenant billing.

**Primary goal:** Operational control — create/configure institutions, manage their admins, troubleshoot by entering an institution's context.

## Approach: Dual Layout with Route Prefix

SUPER_ADMIN gets a separate route tree (`/super/*`) with its own sidebar. When impersonating an institution, they're redirected to the existing platform routes with institution context injected. An amber banner indicates impersonation is active.

### Why this approach

- Clean separation: no conditional spaghetti in existing pages
- Impersonation is intuitive: you're either managing institutions or acting within one
- Minimal impact on existing codebase

## Routing & Layout

### Route Structure

```
/login                          → existing login (shared)
/super/                         → SuperAdminLayout
  /super/institutions           → Institution list (compact table)
  /super/institutions/new       → Create institution + first admin  ← declared BEFORE :id
  /super/institutions/:id       → Institution detail/edit (tabbed)
  /super/users                  → Cross-institution user list

/dashboard                      → existing AdminLayout (institution-scoped)
/students, /classes, etc.       → existing routes (unchanged)
```

**Route ordering note:** `/super/institutions/new` must be declared before `/super/institutions/:id` in the React Router config to prevent `:id` from matching the literal string "new".

### Login Flow

- After login, check `user.role`:
  - `SUPER_ADMIN` → redirect to `/super/institutions`
  - `ADMIN` / `TUTOR` → redirect to `/dashboard` (current behavior)

### SuperAdminLayout

- Own sidebar with two nav items: Institutions, Users
- Same visual style as existing platform Layout (zinc palette, Inter font, Lucide icons)
- No institution-scoped nav items

### Route Protection

- `/super/*` routes wrapped in a guard: `role === SUPER_ADMIN`
- Existing institution-scoped routes: if SUPER_ADMIN without impersonation context → redirect to `/super/institutions`
- Existing institution-scoped routes: if SUPER_ADMIN with impersonation → allow (acting as institution admin)

## Institution Management

### Institution List (`/super/institutions`)

- **Layout:** Compact table
- **Columns:** Name (with slug below), Admin(s), Status (active/inactive badge), Created date, Actions (Edit · Enter)
- **Features:** Search by name, "Create Institution" button
- **Pagination:** Included for good practice, though not strictly needed at current scale

### Institution Create (`/super/institutions/new`)

- **Form fields:**
  - Name (required)
  - Slug (auto-generated from name by backend, displayed as read-only on edit)
  - Address, Phone, Email
  - Logo upload
  - Timezone (dropdown, default "Asia/Jakarta")
  - Default language (dropdown: id/en)
- **First admin creation:** On the same form, fields for the institution's first admin user (name, email, password) so the institution is immediately usable after creation
- **Backend:** Single `POST /api/admin/institutions` endpoint enhanced to accept an optional `admin` nested object (`{ name, email, password }`). Uses a Prisma transaction to create both institution and admin user atomically — if admin creation fails, the institution is rolled back.

### Institution Detail (`/super/institutions/:id`)

- **Tabbed layout with three tabs:**
  - **General** — edit form (same fields as create, plus active/inactive toggle)
  - **Admins** — list of admin users for this institution, "Add Admin" button to create new admin (uses existing `POST /api/admin/users` with the institution's ID)
  - **Overview** — read-only quick stats: student count, tutor count, active class count
- **Danger Zone** (bottom of General tab): Deactivate institution only. Hard deletion is not supported — institutions have cascading relations (users, students, classes, payments, etc.) and deleting would risk data loss. Deactivation (`is_active = false`) is the safe approach at this scale.

## User Management

### Cross-Institution Users Page (`/super/users`)

- **Table columns:** Name, Email, Role, Institution, Status (active/inactive), Last Login
- **Filters:** Role (Admin/Tutor/Parent), Institution (dropdown), Status
- **Search:** By name or email
- **Permissions:**
  - Admin users: clickable to edit (name, email, reset password, toggle active)
  - Tutor/Parent users: read-only view only
- **"Create Admin" button:** Opens form with institution dropdown to assign the new admin

## Impersonation

### Flow

1. SUPER_ADMIN clicks "Enter" on institution list or "Enter Institution" on detail page
2. `impersonatedInstitution` state is set in AuthContext: `{ id, name }`
3. State persisted to `sessionStorage` (survives refresh, scoped to tab)
4. User is redirected to `/dashboard` — now seeing the institution's admin interface
5. Amber banner at the top: "Viewing as: [Institution Name]" with "Exit to Super Admin" button
6. Clicking "Exit" clears impersonation state and redirects to `/super/institutions`

### API Layer

- When impersonation is active, the Axios request interceptor injects `institution_id` via `config.params` (not URL string manipulation) so it merges correctly with existing query parameters (pagination, search, etc.)
- The backend TenantInterceptor already handles this for SUPER_ADMIN: it reads the query param and sets `request.tenantId`
- No JWT changes needed — the existing SUPER_ADMIN token works as-is

### Impersonation Banner

- Fixed amber/yellow bar at the top of the existing AdminLayout
- Pushes content down (not overlapping)
- Shows institution name and exit button
- Only rendered when `isImpersonating` is true in AuthContext

### What impersonation does NOT do

- Does not change the JWT token
- Does not create an audit trail (out of scope)
- Does not restrict SUPER_ADMIN actions — they have full admin capabilities

## Backend Changes

### Existing Endpoints (modifications needed)

- `GET /api/admin/institutions` — enhance response to include admin users (use Prisma `include` for users with `role: ADMIN`), so the institution list can show the "Admin(s)" column
- `GET /api/admin/institutions/:id` — enhance to include admin users relation
- `POST /api/admin/institutions` — enhance to accept optional `admin` nested object for atomic institution + first admin creation (Prisma transaction)
- `PATCH /api/admin/institutions/:id` — add `is_active` to `UpdateInstitutionSchema` DTO (used for both general edits and deactivation — no separate status endpoint needed)
- `DELETE /api/admin/institutions/:id` — return `403 Forbidden` with message "Institution deletion is not supported. Use deactivation instead." to prevent accidental data loss from cascading deletes
- `GET /api/admin/users` — add query param support for `role` and `status` filters (currently only supports `search` and tenant scoping)
- TenantInterceptor `?institution_id` handling — no changes needed

### New Endpoints

1. **`GET /api/admin/institutions/:id/summary`**
   - Returns: `{ studentCount, tutorCount, adminCount, activeClassCount }`
   - Role: SUPER_ADMIN only
   - Purpose: Overview tab on institution detail page

### DTO Changes

- `CreateInstitutionSchema`: add optional fields `timezone`, `default_language`, and optional nested `admin` object (`{ name, email, password }`). Note: `slug` is auto-generated from name by the backend — do not accept it in the DTO to avoid uniqueness conflicts
- `UpdateInstitutionSchema`: add `is_active` boolean field
- `UserQuerySchema` (or equivalent): add optional `role` and `is_active` filter params

### Schema Change

- Add `is_active` Boolean field to the `institution` model (default: `true`)
- Migration to add the column with `DEFAULT true` so all existing institution rows remain active

### Login & Token Refresh Change

- In `auth.service.ts`, both `login()` and `refresh()` methods:
  - Add `include: { institution: true }` to the Prisma user query (currently not included)
  - After credential/token validation, check if `user.institution` exists and `user.institution.is_active === false`
  - Throw `ForbiddenException('Your institution has been deactivated. Contact support.')`
  - SUPER_ADMIN users (no institution) are unaffected
  - This ensures deactivated institutions are blocked immediately, not just on next login
  - Note: existing short-lived access tokens (15min) will continue to work until expiry after deactivation — this is acceptable for the current scale

## Frontend File Structure

### New Files

```
src/
  components/
    SuperAdminLayout.tsx         → layout with sidebar (Institutions, Users)
    SuperAdminRoute.tsx          → route guard: SUPER_ADMIN only
    ImpersonationBanner.tsx      → amber banner shown during impersonation
  pages/
    SuperAdmin/
      Institutions.tsx           → institution list table
      InstitutionForm.tsx        → create/edit form (shared)
      InstitutionDetail.tsx      → detail page with tabs
      Users.tsx                  → cross-institution user list
  services/
    institutions.service.ts      → API calls for institution CRUD + summary
  hooks/
    useInstitutions.ts           → TanStack Query hooks
  types/
    institution.ts               → Institution type definition
```

### Modified Files

```
src/contexts/AuthContext.tsx      → add impersonation state + helpers
src/components/Layout.tsx        → render ImpersonationBanner when active
src/lib/api.ts                   → inject institution_id via config.params when impersonating
src/main.tsx (or router)         → add /super/* routes
src/components/ProtectedRoute.tsx → redirect SUPER_ADMIN to /super if no impersonation
src/types/auth.ts                → make User.institution nullable (institution: { ... } | null)
src/locales/en.json              → add super admin translation keys
src/locales/id.json              → add super admin translation keys
```

### Type Changes

The `User` interface in `src/types/auth.ts` must change `institution` from required to nullable (`institution: { ... } | null`) since SUPER_ADMIN users have `institution_id: null`. All existing code accessing `user.institution` must be audited for null safety.

### AuthContext Additions

```typescript
// New state
impersonatedInstitution: { id: string; name: string } | null

// New methods
enterInstitution(id: string, name: string): void   // set state + sessionStorage
exitInstitution(): void                              // clear state + redirect
isImpersonating: boolean                             // computed getter
```

## Patterns & Conventions

- Follow existing table/form patterns from Students, Classes pages
- Same service layer pattern (Axios wrapper functions)
- Same TanStack Query hook pattern (useQuery/useMutation)
- Sonner toast for success/error feedback
- Lucide icons for sidebar navigation
- Zinc palette, Inter typography — identical to existing platform styling
- i18n: add keys to both en.json and id.json for all new UI text
