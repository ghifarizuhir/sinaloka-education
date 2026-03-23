# Move Registration from Landing to Platform

## Context

Registration for tutors and students currently lives in `sinaloka-landing` at `/register/:slug`. Now that per-institution subdomains (`*.sinaloka.com`) are deployed via Cloudflare Worker proxy, registration belongs in `sinaloka-platform` — accessed directly on the institution's subdomain (e.g., `bimbel-cerdas.sinaloka.com/register`).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry flow | `/welcome` → "Daftar" → `/register` | Keep `/welcome` as institution front door, `/register` as internal route |
| Landing cleanup | Remove registration entirely | All institutions have subdomains, no fallback needed |
| URL format | `/register` (no slug param) | Institution identity comes from subdomain via `InstitutionContext` |
| UI approach | Reuse platform UI components | Consistent with app, auto dark mode, faster to build |
| Post-success action | Success message + "Masuk" button → `/login` | Natural next step for users |

## Design

### 1. Routing & Auth (sinaloka-platform)

Add `/register` as a public route in `App.tsx`, outside `ProtectedRoute` wrapper, alongside `/welcome` and `/login`. Lazy-loaded.

Update `InstitutionLanding.tsx` (`/welcome`): change "Daftar" link from external `sinaloka.com/register/{slug}` to internal navigation to `/register`. Remove the `registration_enabled` guard on the button — always show "Daftar". The register page itself handles the `closed` state when both registration types are disabled. This avoids the current bug where `registration_enabled` only reflects `student_enabled`, hiding the button even when tutor registration is open.

### 2. Register Page (sinaloka-platform)

**New files:**
- `src/pages/Register/index.tsx` — page component
- `src/pages/Register/useRegisterPage.ts` — custom hook (state machine, form state, validation, API calls)

**State machine:**
```
loading → error | closed | role-select | form → success
```

**Null-slug guard:** If `slug` is null (SuperAdmin mode on `platform.sinaloka.com`), show a message: "Halaman ini hanya tersedia dari subdomain institusi" with a link back to `/`. Do not fetch registration info.

**Flow:**
1. On mount: get `slug` from `InstitutionContext`. If null → show slug guard. Otherwise fetch `GET /api/register/:slug`
2. **Closed detection:** If response has `student_enabled === false && tutor_enabled === false` → go to `closed` state. This is determined from the GET response, not from a POST 403.
3. If only one role enabled → skip role-select, go directly to form
3. Role select: two Cards — "Daftar sebagai Murid" / "Daftar sebagai Tutor"
4. Form: uses platform UI components (`Input`, `Button`, `Card` from `src/components/ui/`)
5. Submit: `POST /api/register/:slug/student` or `/tutor`
6. Success: confirmation message + "Masuk" button navigating to `/login`

**Student form fields:** name (required), grade (required), parent_name (required), parent_phone (required), email (required), phone (optional), parent_email (optional)

**Tutor form fields:** name (required), email (required), phone (optional), subject_names (required, comma-separated string input → split/trim/filter to array before POST), experience_years (optional)

**Validation:** inline in hook — required fields, email format, experience_years non-negative number.

**Error handling:**
- 409 → "Data dengan email ini sudah terdaftar"
- 429 → "Terlalu banyak percobaan"
- 403 → "Pendaftaran saat ini tidak tersedia" (admin disabled registration between page load and submit)
- 400 → server message or generic validation error
- Other → generic error message

**i18n:** No — public page for prospective students/tutors, Indonesian only (consistent with current landing behavior).

**Dark mode:** Automatic via platform UI components.

### 3. Service Layer (sinaloka-platform)

Add public registration functions to existing `src/services/registration.service.ts`:
- `getRegistrationInfo(slug: string)` → `GET /api/register/:slug`
- `submitStudentRegistration(slug: string, data)` → `POST /api/register/:slug/student`
- `submitTutorRegistration(slug: string, data)` → `POST /api/register/:slug/tutor`

These are unauthenticated calls (no JWT needed). The existing `api` instance from `src/lib/api.ts` attaches JWT via interceptor, but since these endpoints are `@Public()` on the backend, a missing or present token does not affect the response. However, to be clean: if the api instance throws when no token exists in localStorage, use a plain `axios` call instead. Verify during implementation.

### 4. Cleanup Landing (sinaloka-landing)

- Delete `src/pages/RegisterPage.tsx`
- Remove `/register/:slug` route and lazy import from `src/App.tsx`

### 5. Backend

No changes. Public API endpoints `/api/register/:slug`, `/api/register/:slug/student`, `/api/register/:slug/tutor` remain as-is.

## Out of Scope

- Redesigning the registration form UX
- Adding i18n to the registration page
- Changing backend registration API
- Modifying admin registration management page
