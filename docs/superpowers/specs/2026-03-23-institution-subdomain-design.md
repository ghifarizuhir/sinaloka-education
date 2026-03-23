# Institution Subdomain Design Spec

## Overview

Setiap institusi di Sinaloka mendapat subdomain sendiri di bawah `*.sinaloka.com` (contoh: `bimbelcerdas.sinaloka.com`). Subdomain digunakan untuk branding (landing page kustom per institusi) dan isolasi (user hanya bisa login di subdomain institusi mereka).

Scope: hanya **sinaloka-platform** (admin dashboard). Parent dan tutors app tidak terpengaruh.

## Goals

1. **Branding** — setiap institusi punya URL dan landing page sendiri dengan logo, nama, deskripsi, warna tema, dan background image
2. **Isolasi** — user hanya bisa login di subdomain institusi mereka; login di subdomain lain ditolak
3. **Future-ready** — arsitektur mendukung custom domain di masa depan (tidak di-implement sekarang)

## Non-Goals

- Custom domain per institusi (future feature)
- Subdomain untuk parent app atau tutors app
- Per-institution theming di dalam dashboard (hanya di landing page dan login page)

## Architecture

### Approach: Cloudflare Wildcard DNS + Pages

```
User buka bimbelcerdas.sinaloka.com
  → Cloudflare DNS: *.sinaloka.com → Cloudflare Pages (sinaloka-platform)
  → React app loads → extract "bimbelcerdas" dari hostname
  → GET /api/institutions/public/bimbelcerdas (public endpoint)
  → Render branded landing page
```

Satu build, satu deploy — sama seperti sekarang. Slug resolution terjadi di runtime (frontend).

### Reserved Subdomains

Subdomain berikut di-reserve dan tidak boleh dipakai sebagai institution slug:

`platform`, `parent`, `tutors`, `api`, `www`, `mail`, `ftp`, `admin`, `app`, `dashboard`

DNS records yang sudah ada (`platform`, `parent`, `tutors`, `api`) tetap intact — DNS resolves specific records sebelum wildcard.

## Section 1: Database Schema Changes

### New fields on Institution model

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `description` | `String?` | `null` | Deskripsi singkat institusi untuk landing page |
| `brand_color` | `String?` | `null` | Hex color utama (fallback: zinc/neutral) |
| `background_image_url` | `String?` | `null` | Background image URL untuk landing page |

Fields ditambahkan langsung di model Prisma (bukan di `settings` JSON) supaya typed dan queryable.

### Prisma schema change

```prisma
model Institution {
  // ... existing fields ...
  description          String?
  brand_color          String?
  background_image_url String?
  // ... existing relations ...
}
```

### Migration

Standard `prisma migrate dev` — semua field nullable, tidak ada data migration yang diperlukan. Existing institutions akan punya `null` untuk field baru (landing page render fallback/default).

### Slug validation

Validasi di `InstitutionService` saat `create()` dan `update()`:
- Slug tidak boleh match reserved words list
- Existing check: slug sudah unique di DB (Prisma `@unique` constraint)
- Perlu jalankan one-time check apakah ada institution slug yang sudah conflict dengan reserved words

## Section 2: Backend API Changes

### 2a. Public endpoint: `GET /api/institutions/public/:slug`

Endpoint baru (terpisah dari `/api/register/:slug`) untuk resolve institusi di subdomain.

```
GET /api/institutions/public/:slug

Response 200:
{
  "name": "Bimbel Cerdas",
  "slug": "bimbelcerdas",
  "logo_url": "/uploads/logo.png",
  "description": "Bimbingan belajar terbaik di Jakarta",
  "brand_color": "#2563eb",
  "background_image_url": "/uploads/bg.jpg",
  "registration_enabled": true
}

Response 404:
{ "message": "Institution not found" }
```

- Decorated with `@Public()` — no auth required
- Rate limited via `@RateLimit()` or `RateLimitGuard`
- Returns 404 if slug not found or institution is not active (`is_active: false`)
- `registration_enabled` derived from `settings.registration.student_enabled`

### 2b. Login endpoint — add optional `slug`

Modify `LoginSchema` and `AuthService.login()`:

```typescript
// auth.dto.ts
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  slug: z.string().optional(),  // NEW
});
```

Login logic with slug:

| Condition | Behavior |
|-----------|----------|
| `slug` provided + user belongs to that institution | Login succeeds |
| `slug` provided + user does NOT belong to that institution | Reject: "Akun tidak terdaftar di institusi ini" |
| `slug` provided + user is SUPER_ADMIN | Reject: "Silakan login di platform.sinaloka.com" |
| `slug` not provided + user is SUPER_ADMIN | Login succeeds (backward compatible) |
| `slug` not provided + user is regular (ADMIN/TUTOR) | Reject: "Silakan akses melalui subdomain institusi Anda" |

Validation happens after password check to avoid leaking which institution a user belongs to.

#### Migration & Transition Strategy

Enforcing slug-based login is a **breaking change** for existing ADMIN/TUTOR users who currently login at `platform.sinaloka.com`. Rollout strategy:

1. **Phase 1 (deploy)**: `slug` is optional. If not provided, login works as before (backward compatible). Subdomain login is available but not enforced.
2. **Phase 2 (notify)**: Admin users receive notification/email with their institution's subdomain URL. Dashboard shows banner: "Mulai [tanggal], login hanya bisa dilakukan melalui [subdomain].sinaloka.com"
3. **Phase 3 (enforce)**: After grace period (2 weeks), enforce slug requirement — `platform.sinaloka.com` becomes SUPER_ADMIN only.

The `slug` optional field in LoginSchema supports both phases. A feature flag `ENFORCE_SUBDOMAIN_LOGIN` (env var, default `false`) controls whether Phase 1 or Phase 3 behavior is active. This avoids a hard cutover.

### 2c. CORS — dynamic origin validation

Replace static comma-separated list with dynamic function:

```typescript
// main.ts
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests

    const allowed = corsOrigins.split(',').map(o => o.trim());
    const url = new URL(origin);
    const isSubdomain = url.hostname.endsWith('.sinaloka.com');

    if (allowed.includes(origin) || isSubdomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

For production: `*.sinaloka.com` subdomains are always allowed. Existing static list still works for dev/other origins.

Environment variable `CORS_WILDCARD_DOMAIN` (optional, default: `sinaloka.com`) to make the wildcard domain configurable rather than hardcoded. Add to `.env.example` with documentation.

### 2d. Reserved slug validation

In `InstitutionService`:

```typescript
const RESERVED_SLUGS = [
  'platform', 'parent', 'tutors', 'api', 'www',
  'mail', 'ftp', 'admin', 'app', 'dashboard',
];

// In create() and update() methods
if (RESERVED_SLUGS.includes(slug)) {
  throw new BadRequestException('This slug is reserved and cannot be used');
}
```

## Section 3: Frontend Architecture

### 3a. Slug extraction — `src/lib/subdomain.ts`

```typescript
const RESERVED_SUBDOMAINS = [
  'platform', 'parent', 'tutors', 'api', 'www',
  'mail', 'ftp', 'admin', 'app', 'dashboard',
];

export function getInstitutionSlug(): string | null {
  const hostname = window.location.hostname;

  // Dev: localhost or IP — no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Dev: subdomain.localhost (e.g., bimbelcerdas.localhost)
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.replace('.localhost', '');
    return RESERVED_SUBDOMAINS.includes(slug) ? null : slug;
  }

  // Production: slug.sinaloka.com
  const parts = hostname.split('.');
  if (parts.length === 3 && hostname.endsWith('.sinaloka.com')) {
    const slug = parts[0];
    return RESERVED_SUBDOMAINS.includes(slug) ? null : slug;
  }

  return null;
}

export function isReservedSubdomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length === 3 && hostname.endsWith('.sinaloka.com')) {
    return RESERVED_SUBDOMAINS.includes(parts[0]);
  }
  return false;
}
```

### 3b. Institution Context — `src/contexts/InstitutionContext.tsx`

New context provider that wraps the entire app:

```typescript
interface InstitutionPublicData {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_color: string | null;
  background_image_url: string | null;
  registration_enabled: boolean;
}

interface InstitutionContextType {
  institution: InstitutionPublicData | null;
  isLoading: boolean;
  error: 'not_found' | 'network_error' | null;
  slug: string | null;
  isSuperAdminMode: boolean; // true when on platform.sinaloka.com or localhost
}
```

Flow:
1. On mount, extract slug from hostname
2. If slug exists → fetch `GET /api/institutions/public/:slug`
   - Success → set institution data
   - 404 → set error `not_found`
3. If slug is null → set `isSuperAdminMode: true`

### 3c. Routing changes — `src/App.tsx`

Frontend routing handles `platform.sinaloka.com` for non-SUPER_ADMIN users **before** login — during Phase 1 (grace period), the login form is shown normally with a banner suggesting the subdomain URL; during Phase 3 (enforced), a `SubdomainRequired` page is shown instead of the login form.

```
<InstitutionProvider>
  <AuthProvider>
    <BrowserRouter>
      {slug && !authenticated → <InstitutionLandingPage />}
      {slug && authenticated → <Routes> (existing dashboard routes)}
      {!slug && isSuperAdminMode → <Routes> (existing routes, SUPER_ADMIN only)}
      {!slug && !isSuperAdminMode → <SubdomainRequired /> (message: "Silakan akses melalui subdomain institusi Anda")}
      {error === 'not_found' → <InstitutionNotFound />}
    </BrowserRouter>
  </AuthProvider>
</InstitutionProvider>
```

### 3d. New pages

**`InstitutionLandingPage`** — branded landing page per institusi:
- Hero section with background image (or gradient fallback)
- Institution logo + name + description
- Brand color applied as accent
- "Login" button → navigates to `/login`
- "Daftar" button (if registration enabled) → navigates to registration

**`InstitutionNotFound`** — shown when slug doesn't match any institution:
- "Institusi tidak ditemukan" message
- Link to `sinaloka.com`

### 3e. Login page modifications — `src/pages/Login.tsx`

- Read institution data from `InstitutionContext`
- If institution exists: show institution logo + name instead of generic Sinaloka branding
- Apply `brand_color` as accent color
- Pass `slug` to `login()` call
- Handle new error cases:
  - "Akun tidak terdaftar di institusi ini"
  - "Silakan akses melalui subdomain institusi Anda" (shown on `platform.sinaloka.com` for non-SUPER_ADMIN)

### 3f. New service — `src/services/institutionPublic.ts`

```typescript
export async function getPublicInstitution(slug: string): Promise<InstitutionPublicData> {
  const response = await api.get(`/api/institutions/public/${slug}`);
  return response.data;
}
```

### 3g. Files summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/subdomain.ts` | **New** | Slug extraction + reserved check |
| `src/contexts/InstitutionContext.tsx` | **New** | Institution branding state |
| `src/pages/InstitutionLanding.tsx` | **New** | Landing page per institusi |
| `src/pages/InstitutionNotFound.tsx` | **New** | 404 page untuk slug tidak valid |
| `src/services/institutionPublic.ts` | **New** | Public API call |
| `src/App.tsx` | **Modify** | Wrap InstitutionProvider, conditional routing |
| `src/pages/Login.tsx` | **Modify** | Accept branding, pass slug |
| `src/contexts/AuthContext.tsx` | **Modify** | Pass slug to login call |
| `vite.config.ts` | **Modify** | Add `.sinaloka.com` + `.localhost` to allowedHosts |

## Section 4: Deployment & Infrastructure

### 4a. Cloudflare DNS

Domain `sinaloka.com` uses Cloudflare as authoritative nameserver (DNS managed in Cloudflare dashboard, not Hostinger). Add wildcard DNS record in **Cloudflare DNS**:

```
*.sinaloka.com  CNAME  sinaloka-platform.pages.dev  (Proxied)
```

**Important**: The wildcard record must be **proxied** (orange cloud) in Cloudflare, not DNS-only, so that Cloudflare can provision SSL and route to Pages. Existing specific records (`platform`, `parent`, `tutors`, `api`) take priority over wildcard — no conflict.

**SSL**: Cloudflare Universal SSL covers `*.sinaloka.com` automatically when the wildcard record is proxied. No additional certificate configuration needed.

### 4b. Cloudflare Pages

Add `*.sinaloka.com` as custom domain on the `sinaloka-platform` Cloudflare Pages project. SSL is automatically provisioned by Cloudflare for wildcard domains.

### 4c. CI/CD — no changes

- Build process unchanged (single build, single deploy)
- `deploy-frontend.yml` unchanged
- Slug resolution is runtime (frontend), not build time

### 4d. Backend CORS env var

Update Railway `CORS_ORIGINS` to include production origins. Wildcard subdomains handled by dynamic CORS function — no need to list each institution.

### 4e. Local development

Add to `/etc/hosts` for local testing:

```
127.0.0.1  bimbelcerdas.localhost
127.0.0.1  lembagapintar.localhost
```

Add `.sinaloka.com` and `.localhost` to `vite.config.ts` `allowedHosts`.

## Section 5: Security & Edge Cases

### Login isolation matrix

| User Role | Subdomain | Behavior |
|-----------|-----------|----------|
| ADMIN/TUTOR | Correct institution subdomain | Login success |
| ADMIN/TUTOR | Wrong institution subdomain | Reject: "Akun tidak terdaftar di institusi ini" |
| ADMIN/TUTOR | `platform.sinaloka.com` | Reject: "Silakan akses melalui subdomain institusi Anda" |
| SUPER_ADMIN | `platform.sinaloka.com` | Login success |
| SUPER_ADMIN | Any institution subdomain | Reject: "Silakan login di platform.sinaloka.com" |

### Invalid slug handling

| Scenario | Behavior |
|----------|----------|
| `nonexistent.sinaloka.com` | Render "Institusi tidak ditemukan" + link to sinaloka.com |
| `platform.sinaloka.com` | Reserved → SUPER_ADMIN mode |
| `api.sinaloka.com` | Reserved → DNS points to Railway (not Pages) |

### Session & token isolation

- `localStorage` at `bimbelcerdas.sinaloka.com` is NOT accessible from `lembagapintar.sinaloka.com` (different origin)
- Provides natural session isolation without additional implementation

### Rate limiting

- `GET /api/institutions/public/:slug` rate limited (30 requests per minute per IP) to prevent slug enumeration
- Login endpoint already rate limited (5 attempts per 15 minutes)

### Reserved slug enforcement

- Backend validates on institution create/update — rejects reserved slugs
- One-time migration check: run SQL query `SELECT id, slug FROM institutions WHERE slug IN ('platform','parent','tutors','api','www','mail','ftp','admin','app','dashboard');` — if any results, rename those slugs before deploying

## Testing Strategy

### Backend

- Unit tests for reserved slug validation in `InstitutionService`
- Unit tests for login with slug validation in `AuthService`
- Unit tests for public institution endpoint
- Test CORS dynamic origin function

### Frontend

- Unit test `getInstitutionSlug()` for all hostname patterns
- Build verification (`npm run build`)
- Manual testing with `/etc/hosts` subdomain setup

### E2E (manual for MVP)

- Login flow on institution subdomain
- Login rejection on wrong subdomain
- SUPER_ADMIN flow on `platform.sinaloka.com`
- Landing page rendering with branding data
- Invalid slug shows 404 page
