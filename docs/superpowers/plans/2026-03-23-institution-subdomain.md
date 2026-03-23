# Institution Subdomain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each institution its own subdomain under `*.sinaloka.com` with a branded landing page and login isolation.

**Architecture:** Cloudflare wildcard DNS routes `*.sinaloka.com` to the same Cloudflare Pages project. The React frontend extracts the slug from the hostname, fetches institution branding via a new public API endpoint, and renders a branded landing/login page. Login is scoped to the institution's subdomain — users can only log in at their own institution's subdomain. `platform.sinaloka.com` is reserved for SUPER_ADMIN.

**Tech Stack:** NestJS (backend), Prisma/PostgreSQL, React + Vite + TailwindCSS (frontend), Cloudflare Pages + DNS

**Spec:** `docs/superpowers/specs/2026-03-23-institution-subdomain-design.md`

**Worktree:** `/home/zet/Project/sinaloka/.worktrees/institution-subdomain`

**Scope note:** This plan implements Phase 1 only (slug optional, `ENFORCE_SUBDOMAIN_LOGIN=false`). Phase 2 (notification banner to inform users of their subdomain URL) and Phase 3 (enforce slug requirement) are out of scope.

**Post-deploy checklist (manual, after merge):**
1. Add wildcard DNS record in Cloudflare: `*.sinaloka.com CNAME sinaloka-platform.pages.dev` (Proxied)
2. Add `*.sinaloka.com` as custom domain on Cloudflare Pages project `sinaloka-platform`
3. Set `CORS_WILDCARD_DOMAIN=sinaloka.com` in Railway env vars
4. Verify SSL works on a test subdomain (e.g., `test.sinaloka.com`)

---

## Task 1: Database Schema — Add branding fields + migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma:139-183`

- [ ] **Step 1: Add new fields to Institution model**

In `sinaloka-backend/prisma/schema.prisma`, add these fields after `logo_url` (line 146):

```prisma
  description          String?
  brand_color          String?
  background_image_url String?
```

The model should look like:
```prisma
model Institution {
  id         String   @id @default(uuid())
  name       String
  slug       String   @unique
  address    String?
  phone      String?
  email      String?
  logo_url   String?
  description          String?
  brand_color          String?
  background_image_url String?
  settings         Json?
  // ... rest unchanged
```

- [ ] **Step 2: Generate migration**

```bash
cd sinaloka-backend
npx prisma migrate dev --name add_institution_branding_fields
```

Expected: Migration created in `prisma/migrations/` with `ALTER TABLE "institutions" ADD COLUMN "description" TEXT, ADD COLUMN "brand_color" TEXT, ADD COLUMN "background_image_url" TEXT;`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run prisma:generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(backend): add institution branding fields (description, brand_color, background_image_url)"
```

---

## Task 2: Backend — Reserved slug validation

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.service.ts:77-121` (create), `123-136` (update), `159-185` (generateUniqueSlug)
- Test: `sinaloka-backend/src/modules/institution/institution.service.spec.ts`

- [ ] **Step 1: Write failing test for reserved slug rejection**

Add to `sinaloka-backend/src/modules/institution/institution.service.spec.ts`, inside the `describe('create')` block:

```typescript
it('should reject reserved slugs', async () => {
  await expect(
    service.create({ name: 'Platform', address: null, phone: null, email: null }),
  ).rejects.toThrow(BadRequestException);
});

it('should reject slug that generates a reserved word', async () => {
  await expect(
    service.create({ name: 'Admin', address: null, phone: null, email: null }),
  ).rejects.toThrow(BadRequestException);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sinaloka-backend
npm test -- --testPathPattern=institution.service.spec
```

Expected: FAIL — no reserved slug check exists yet.

- [ ] **Step 3: Implement reserved slug validation**

In `sinaloka-backend/src/modules/institution/institution.service.ts`, add the constant at the top of the class (after the constructor):

```typescript
private static readonly RESERVED_SLUGS = [
  'platform', 'parent', 'tutors', 'api', 'www',
  'mail', 'ftp', 'admin', 'app', 'dashboard',
];
```

Then modify `generateUniqueSlug()` method (line 159) to check reserved slugs before returning:

```typescript
private async generateUniqueSlug(
  name: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (InstitutionService.RESERVED_SLUGS.includes(baseSlug)) {
    throw new BadRequestException(
      `The name "${name}" generates a reserved slug "${baseSlug}" and cannot be used`,
    );
  }

  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await this.prisma.institution.findUnique({
      where: { slug },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}
```

Add `BadRequestException` to the imports from `@nestjs/common` at the top of the file if not already imported.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=institution.service.spec
```

Expected: New tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/institution/institution.service.ts src/modules/institution/institution.service.spec.ts
git commit -m "feat(backend): reject reserved slugs in institution create/update"
```

---

## Task 3: Backend — Public institution endpoint

**Files:**
- Create: `sinaloka-backend/src/modules/institution/institution-public.controller.ts`
- Modify: `sinaloka-backend/src/modules/institution/institution.service.ts` (add `findBySlugPublic` method)
- Modify: `sinaloka-backend/src/modules/institution/institution.module.ts` (register new controller)
- Modify: `sinaloka-backend/src/modules/institution/institution.dto.ts` (add branding fields to UpdateSchema)
- Test: `sinaloka-backend/src/modules/institution/institution.service.spec.ts`

- [ ] **Step 1: Write failing test for findBySlugPublic**

Add to `sinaloka-backend/src/modules/institution/institution.service.spec.ts`:

```typescript
describe('findBySlugPublic', () => {
  it('should return public institution data by slug', async () => {
    const mockInstitution = {
      name: 'Test Bimbel',
      slug: 'test-bimbel',
      logo_url: null,
      description: 'A test institution',
      brand_color: '#2563eb',
      background_image_url: null,
      settings: { registration: { student_enabled: true } },
      is_active: true,
    };
    prisma.institution.findFirst.mockResolvedValue(mockInstitution as any);

    const result = await service.findBySlugPublic('test-bimbel');
    expect(result).toEqual({
      name: 'Test Bimbel',
      slug: 'test-bimbel',
      logo_url: null,
      description: 'A test institution',
      brand_color: '#2563eb',
      background_image_url: null,
      registration_enabled: true,
    });
  });

  it('should throw NotFoundException for unknown slug', async () => {
    prisma.institution.findFirst.mockResolvedValue(null);
    await expect(service.findBySlugPublic('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException for inactive institution', async () => {
    prisma.institution.findFirst.mockResolvedValue(null); // findFirst with is_active: true returns null
    await expect(service.findBySlugPublic('inactive-inst')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=institution.service.spec
```

Expected: FAIL — `findBySlugPublic` method doesn't exist.

- [ ] **Step 3: Implement findBySlugPublic in service**

Add to `sinaloka-backend/src/modules/institution/institution.service.ts`:

```typescript
async findBySlugPublic(slug: string) {
  const institution = await this.prisma.institution.findFirst({
    where: { slug, is_active: true },
    select: {
      name: true,
      slug: true,
      logo_url: true,
      description: true,
      brand_color: true,
      background_image_url: true,
      settings: true,
    },
  });

  if (!institution) {
    throw new NotFoundException('Institution not found');
  }

  const settings = institution.settings as Record<string, any> | null;
  const registrationEnabled = settings?.registration?.student_enabled ?? false;

  return {
    name: institution.name,
    slug: institution.slug,
    logo_url: institution.logo_url,
    description: institution.description,
    brand_color: institution.brand_color,
    background_image_url: institution.background_image_url,
    registration_enabled: registrationEnabled,
  };
}
```

Add `NotFoundException` to imports if not already imported.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=institution.service.spec
```

Expected: PASS.

- [ ] **Step 5: Create public controller**

Create `sinaloka-backend/src/modules/institution/institution-public.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  RateLimitGuard,
  RateLimit,
} from '../../common/guards/rate-limit.guard.js';
import { InstitutionService } from './institution.service.js';

@Controller('institutions/public')
@Public()
@UseGuards(RateLimitGuard)
export class InstitutionPublicController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get(':slug')
  @RateLimit(30, 60 * 1000) // 30 requests per minute
  async getBySlug(@Param('slug') slug: string) {
    return this.institutionService.findBySlugPublic(slug);
  }
}
```

- [ ] **Step 6: Register controller in module**

In `sinaloka-backend/src/modules/institution/institution.module.ts`, add the new controller:

```typescript
import { Module } from '@nestjs/common';
import { InstitutionController } from './institution.controller.js';
import { InstitutionPublicController } from './institution-public.controller.js';
import { InstitutionService } from './institution.service.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';

@Module({
  controllers: [InstitutionController, InstitutionPublicController],
  providers: [InstitutionService, RateLimitGuard],
  exports: [InstitutionService],
})
export class InstitutionModule {}
```

- [ ] **Step 7: Add branding fields to UpdateInstitutionSchema**

In `sinaloka-backend/src/modules/institution/institution.dto.ts`, add to `UpdateInstitutionSchema`:

```typescript
description: z.string().max(500).nullable().optional(),
brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').nullable().optional(),
background_image_url: z.string().url().nullable().optional(),
```

- [ ] **Step 8: Verify build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 9: Commit**

```bash
git add src/modules/institution/
git commit -m "feat(backend): add public institution endpoint and branding DTO fields"
```

---

## Task 4: Backend — Login with slug validation

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.dto.ts:3-6`
- Modify: `sinaloka-backend/src/modules/auth/auth.service.ts:42-115`
- Modify: `sinaloka-backend/.env.example`
- Test: `sinaloka-backend/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing tests for slug-based login**

Add to `sinaloka-backend/src/modules/auth/auth.service.spec.ts`, inside the `describe('login')` block:

```typescript
it('should succeed when slug matches user institution', async () => {
  prisma.user.findUnique.mockResolvedValue({
    ...mockUser,
    institution: { ...mockUser.institution, slug: 'bimbelcerdas' },
  } as any);
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  prisma.refreshToken.create.mockResolvedValue({} as any);
  prisma.user.update.mockResolvedValue({} as any);

  const result = await service.login({
    email: 'admin@test.com',
    password: 'password',
    slug: 'bimbelcerdas',
  });
  expect(result).toHaveProperty('access_token');
});

it('should reject when slug does not match user institution', async () => {
  prisma.user.findUnique.mockResolvedValue({
    ...mockUser,
    institution: { ...mockUser.institution, slug: 'other-inst' },
  } as any);
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);

  await expect(
    service.login({
      email: 'admin@test.com',
      password: 'password',
      slug: 'bimbelcerdas',
    }),
  ).rejects.toThrow(UnauthorizedException);
});

it('should reject SUPER_ADMIN login with slug', async () => {
  prisma.user.findUnique.mockResolvedValue({
    ...mockUser,
    role: 'SUPER_ADMIN',
    institution_id: null,
    institution: null,
  } as any);
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);

  await expect(
    service.login({
      email: 'super@test.com',
      password: 'password',
      slug: 'bimbelcerdas',
    }),
  ).rejects.toThrow(UnauthorizedException);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=auth.service.spec
```

Expected: FAIL — `slug` not accepted in LoginDto.

- [ ] **Step 3: Add slug to LoginSchema**

In `sinaloka-backend/src/modules/auth/auth.dto.ts`, modify `LoginSchema`:

```typescript
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  slug: z.string().optional(),
});
```

- [ ] **Step 4: Add slug validation to login method**

In `sinaloka-backend/src/modules/auth/auth.service.ts`, add validation after password check (after line 72, before the `// Update last_login_at` comment at line 74):

```typescript
    // Subdomain slug validation
    if (dto.slug) {
      // SUPER_ADMIN must login at platform.sinaloka.com (no slug)
      if (user.role === 'SUPER_ADMIN') {
        throw new UnauthorizedException(
          'Silakan login di platform.sinaloka.com',
        );
      }
      // Verify user belongs to the institution matching this slug
      if (!user.institution || user.institution.slug !== dto.slug) {
        throw new UnauthorizedException(
          'Akun tidak terdaftar di institusi ini',
        );
      }
    } else {
      // No slug provided — check enforcement
      const enforceSubdomain = this.configService.get<string>(
        'ENFORCE_SUBDOMAIN_LOGIN',
        'false',
      );
      if (
        enforceSubdomain === 'true' &&
        user.role !== 'SUPER_ADMIN'
      ) {
        throw new UnauthorizedException(
          'Silakan akses melalui subdomain institusi Anda',
        );
      }
    }
```

- [ ] **Step 5: Add env vars to .env.example**

Append to `sinaloka-backend/.env.example`:

```
# Subdomain feature
ENFORCE_SUBDOMAIN_LOGIN=false
CORS_WILDCARD_DOMAIN=sinaloka.com
```

- [ ] **Step 6: Run tests**

```bash
npm test -- --testPathPattern=auth.service.spec
```

Expected: All tests PASS.

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/auth/auth.dto.ts src/modules/auth/auth.service.ts .env.example
git commit -m "feat(backend): add slug validation to login for subdomain isolation"
```

---

## Task 5: Backend — Dynamic CORS for wildcard subdomains

**Files:**
- Modify: `sinaloka-backend/src/main.ts:11-19`

- [ ] **Step 1: Update CORS configuration**

In `sinaloka-backend/src/main.ts`, replace the CORS block (lines 11-19):

```typescript
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
  const wildcardDomain = configService.get<string>(
    'CORS_WILDCARD_DOMAIN',
    '',
  );

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (non-browser, e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      // Check static allowed origins
      const allowed = corsOrigins
        ? corsOrigins.split(',').map((o) => o.trim())
        : [];

      if (allowed.length === 0 && !wildcardDomain) {
        // No restrictions configured — allow all (backward compatible)
        return callback(null, true);
      }

      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      // Check wildcard subdomain
      if (wildcardDomain) {
        try {
          const url = new URL(origin);
          if (url.hostname.endsWith(`.${wildcardDomain}`)) {
            return callback(null, true);
          }
        } catch {
          // malformed origin — reject
        }
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(backend): add dynamic CORS with wildcard subdomain support"
```

---

## Task 6: Frontend — Slug extraction utility

**Files:**
- Create: `sinaloka-platform/src/lib/subdomain.ts`

- [ ] **Step 1: Create subdomain utility**

Create `sinaloka-platform/src/lib/subdomain.ts`:

```typescript
const RESERVED_SUBDOMAINS = [
  'platform',
  'parent',
  'tutors',
  'api',
  'www',
  'mail',
  'ftp',
  'admin',
  'app',
  'dashboard',
];

/**
 * Extract institution slug from the current hostname.
 * Returns null if on a reserved subdomain, localhost, or IP address.
 *
 * Examples:
 *   "bimbelcerdas.sinaloka.com" → "bimbelcerdas"
 *   "platform.sinaloka.com"     → null (reserved)
 *   "localhost"                  → null
 *   "bimbelcerdas.localhost"     → "bimbelcerdas" (dev)
 */
export function getInstitutionSlug(): string | null {
  const hostname = window.location.hostname;

  // Dev: plain localhost or IP address — no subdomain
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

/**
 * Returns true if the current hostname is a reserved subdomain
 * (e.g., platform.sinaloka.com).
 */
export function isReservedSubdomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length === 3 && hostname.endsWith('.sinaloka.com')) {
    return RESERVED_SUBDOMAINS.includes(parts[0]);
  }
  return false;
}
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform
npm run lint
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/subdomain.ts
git commit -m "feat(platform): add subdomain slug extraction utility"
```

---

## Task 7: Frontend — Institution public service + types

**Files:**
- Create: `sinaloka-platform/src/services/institutionPublic.service.ts`
- Modify: `sinaloka-platform/src/types/auth.ts:1-4` (add slug to LoginRequest)
- Create: `sinaloka-platform/src/types/institution-public.ts`

- [ ] **Step 1: Create InstitutionPublicData type**

Create `sinaloka-platform/src/types/institution-public.ts`:

```typescript
export interface InstitutionPublicData {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_color: string | null;
  background_image_url: string | null;
  registration_enabled: boolean;
}
```

- [ ] **Step 2: Create public institution service**

Create `sinaloka-platform/src/services/institutionPublic.service.ts`:

```typescript
import api from '@/src/lib/api';
import type { InstitutionPublicData } from '@/src/types/institution-public';

export const institutionPublicService = {
  getBySlug: (slug: string) =>
    api
      .get<InstitutionPublicData>(`/api/institutions/public/${slug}`)
      .then((r) => r.data),
};
```

- [ ] **Step 3: Add optional slug to LoginRequest**

In `sinaloka-platform/src/types/auth.ts`, modify `LoginRequest`:

```typescript
export interface LoginRequest {
  email: string;
  password: string;
  slug?: string;
}
```

- [ ] **Step 4: Verify build**

```bash
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/types/institution-public.ts src/services/institutionPublic.service.ts src/types/auth.ts
git commit -m "feat(platform): add institution public service and types"
```

---

## Task 8: Frontend — InstitutionContext provider

**Files:**
- Create: `sinaloka-platform/src/contexts/InstitutionContext.tsx`

- [ ] **Step 1: Create InstitutionContext**

Create `sinaloka-platform/src/contexts/InstitutionContext.tsx`:

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getInstitutionSlug } from '@/src/lib/subdomain';
import { institutionPublicService } from '@/src/services/institutionPublic.service';
import type { InstitutionPublicData } from '@/src/types/institution-public';

interface InstitutionContextType {
  institution: InstitutionPublicData | null;
  isLoading: boolean;
  error: 'not_found' | 'network_error' | null;
  slug: string | null;
  isSuperAdminMode: boolean;
}

const InstitutionContext = createContext<InstitutionContextType>({
  institution: null,
  isLoading: true,
  error: null,
  slug: null,
  isSuperAdminMode: false,
});

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState<InstitutionPublicData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'network_error' | null>(
    null,
  );

  const slug = getInstitutionSlug();
  // No slug = either reserved subdomain (platform.sinaloka.com), localhost, or IP
  const isSuperAdminMode = slug === null;

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    institutionPublicService
      .getBySlug(slug)
      .then((data) => {
        setInstitution(data);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError('not_found');
        } else {
          setError('network_error');
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  return (
    <InstitutionContext.Provider
      value={{ institution, isLoading, error, slug, isSuperAdminMode }}
    >
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  return useContext(InstitutionContext);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/InstitutionContext.tsx
git commit -m "feat(platform): add InstitutionContext for subdomain resolution"
```

---

## Task 9: Frontend — Institution landing page + not-found page

**Files:**
- Create: `sinaloka-platform/src/pages/InstitutionLanding.tsx`
- Create: `sinaloka-platform/src/pages/InstitutionNotFound.tsx`

- [ ] **Step 1: Create InstitutionLanding page**

Create `sinaloka-platform/src/pages/InstitutionLanding.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { Button } from '@/src/components/UI';

export function InstitutionLanding() {
  const { institution } = useInstitution();
  const navigate = useNavigate();

  if (!institution) return null;

  const brandColor = institution.brand_color || '#18181b'; // zinc-900 fallback
  const bgImage = institution.background_image_url;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Background */}
      {bgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${brandColor} 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${brandColor} 0%, transparent 50%)`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        {institution.logo_url ? (
          <img
            src={institution.logo_url}
            alt={institution.name}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg text-white text-2xl font-bold"
            style={{ backgroundColor: brandColor }}
          >
            {institution.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <h1
          className={`text-3xl font-bold mb-3 ${bgImage ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}
        >
          {institution.name}
        </h1>

        {/* Description */}
        {institution.description && (
          <p
            className={`text-base mb-8 ${bgImage ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            {institution.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            style={{ backgroundColor: brandColor }}
            className="text-white"
          >
            Masuk
          </Button>
          {institution.registration_enabled && (
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                window.open(
                  `https://sinaloka.com/register/${institution.slug}`,
                  '_blank',
                )
              }
              className={bgImage ? 'border-white/30 text-white hover:bg-white/10' : ''}
            >
              Daftar
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p
        className={`absolute bottom-4 text-xs ${bgImage ? 'text-white/40' : 'text-zinc-400 dark:text-zinc-600'}`}
      >
        Powered by Sinaloka
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create InstitutionNotFound page**

Create `sinaloka-platform/src/pages/InstitutionNotFound.tsx`:

```typescript
export function InstitutionNotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <span className="text-2xl">?</span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Institusi tidak ditemukan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Subdomain yang Anda akses tidak terdaftar di Sinaloka.
        </p>
        <a
          href="https://sinaloka.com"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100 underline hover:no-underline"
        >
          Kunjungi sinaloka.com
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/InstitutionLanding.tsx src/pages/InstitutionNotFound.tsx
git commit -m "feat(platform): add institution landing page and not-found page"
```

---

## Task 10: Frontend — Wire up App.tsx, AuthContext, Login with subdomain

**Files:**
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/contexts/AuthContext.tsx:17,68-77`
- Modify: `sinaloka-platform/src/pages/Login.tsx`
- Modify: `sinaloka-platform/vite.config.ts:18-19`

- [ ] **Step 1: Update AuthContext to accept slug in login**

In `sinaloka-platform/src/contexts/AuthContext.tsx`:

Change the `login` type in the interface (line 17):
```typescript
login: (email: string, password: string, slug?: string) => Promise<User>;
```

Change the login implementation (line 68):
```typescript
const login = useCallback(async (email: string, password: string, slug?: string): Promise<User> => {
  const tokens = await authService.login({ email, password, slug });
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
  const profile = await authService.getMe();
  setUser(profile);
  setMustChangePassword(profile.must_change_password);
  applyInstitutionLanguage(profile);
  return profile;
}, []);
```

- [ ] **Step 2: Update App.tsx to wrap with InstitutionProvider and add routing**

Replace the entire `sinaloka-platform/src/App.tsx`:

```typescript
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';

// --- Providers ---
import { InstitutionProvider, useInstitution } from './contexts/InstitutionContext';

// --- Components ---
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import SuperAdminLayout from './components/SuperAdminLayout';

// --- Pages ---
import { Login } from './pages/Login';
import { InstitutionLanding } from './pages/InstitutionLanding';
import { InstitutionNotFound } from './pages/InstitutionNotFound';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Tutors } from './pages/Tutors';
import { Classes } from './pages/Classes';
import { Schedules } from './pages/Schedules';
import { Enrollments } from './pages/Enrollments';
import { Attendance } from './pages/Attendance';
import { FinanceOverview } from './pages/Finance/FinanceOverview';
import { StudentPayments } from './pages/Finance/StudentPayments';
import { TutorPayouts } from './pages/Finance/TutorPayouts';
import { OperatingExpenses } from './pages/Finance/OperatingExpenses';
import { SettingsPage } from './pages/Settings/index';
import { NotFound } from './pages/NotFound';
import { WhatsApp } from './pages/WhatsApp';
import { Registrations } from './pages/Registrations';
import Notifications from './pages/Notifications';
import { AuditLog } from './pages/AuditLog';

// --- Super Admin Pages ---
import Institutions from './pages/SuperAdmin/Institutions';
import InstitutionForm from './pages/SuperAdmin/InstitutionForm';
import InstitutionDetail from './pages/SuperAdmin/InstitutionDetail';
import SuperAdminUsers from './pages/SuperAdmin/Users';
import UpgradeRequests from './pages/SuperAdmin/UpgradeRequests';
import SubscriptionManagement from './pages/SuperAdmin/SubscriptionManagement';
import Settlements from './pages/SuperAdmin/Settlements';

function InstitutionGate({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = useInstitution();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (error === 'not_found') {
    return <InstitutionNotFound />;
  }

  if (error === 'network_error') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-500">Gagal memuat data institusi. Silakan coba lagi.</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm underline text-zinc-700 dark:text-zinc-300">
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <InstitutionProvider>
      <InstitutionGate>
        <Router>
          <Routes>
            <Route path="/welcome" element={<InstitutionLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/super" element={<SuperAdminRoute />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="institutions" element={<Institutions />} />
                <Route path="institutions/new" element={<InstitutionForm />} />
                <Route path="institutions/:id" element={<InstitutionDetail />} />
                <Route path="users" element={<SuperAdminUsers />} />
                <Route path="upgrade-requests" element={<UpgradeRequests />} />
                <Route path="subscriptions" element={<SubscriptionManagement />} />
                <Route path="settlements" element={<Settlements />} />
                <Route path="audit-logs" element={<AuditLog />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/tutors" element={<Tutors />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/schedules" element={<Schedules />} />
                <Route path="/enrollments" element={<Enrollments />} />
                <Route path="/registrations" element={<Registrations />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/finance" element={<FinanceOverview />} />
                <Route path="/finance/payments" element={<StudentPayments />} />
                <Route path="/finance/payouts" element={<TutorPayouts />} />
                <Route path="/finance/expenses" element={<OperatingExpenses />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/audit-logs" element={<AuditLog />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </InstitutionGate>
    </InstitutionProvider>
  );
}
```

Note: The `InstitutionLanding` page is at `/welcome`. The Login page at `/login` will handle the redirect for unauthenticated users on institution subdomains.

- [ ] **Step 3: Update Login page to use institution context**

In `sinaloka-platform/src/pages/Login.tsx`, apply these changes:

Add import at the top:
```typescript
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { Navigate as RouterNavigate } from 'react-router-dom';
```

Inside the component, after the existing hooks, add:
```typescript
const { institution, slug, isSuperAdminMode } = useInstitution();
```

Modify `handleSubmit` to pass slug:
```typescript
const profile = await login(email, password, slug || undefined);
```

Redirect unauthenticated users on institution subdomain to `/welcome` if they hit `/login` directly — OR better: show institution branding on the login page itself. Update the branding section (lines 62-72):

```typescript
{/* Logo / Branding */}
<div className="flex flex-col items-center mb-8">
  {institution?.logo_url ? (
    <img
      src={institution.logo_url}
      alt={institution.name}
      className="w-12 h-12 rounded-xl mb-4 shadow-lg object-cover"
    />
  ) : (
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg ${!institution?.brand_color ? 'bg-zinc-900 dark:bg-zinc-100' : ''}`}
      style={institution?.brand_color ? { backgroundColor: institution.brand_color } : undefined}
    >
      {institution ? (
        <span className="text-white font-bold text-lg">
          {institution.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <div className="w-6 h-6 bg-white dark:bg-zinc-900 rounded-sm rotate-45" />
      )}
    </div>
  )}
  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
    {institution?.name || t('login.title')}
  </h1>
  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
    {institution ? 'Masuk ke dashboard' : t('login.subtitle')}
  </p>
</div>
```

**Important:** The Login page needs a full rewrite that properly integrates the institution context. The implementing agent should read the complete current Login.tsx and InstitutionContext, then produce a clean merged version. The key changes are:
1. Import and use `useInstitution()` hook
2. Pass `slug` to `login()` call
3. Replace hardcoded branding with institution-aware branding (logo, name, brand_color)
4. Show institution-specific error messages

- [ ] **Step 4: Update vite.config.ts allowedHosts**

In `sinaloka-platform/vite.config.ts`, modify the `allowedHosts` array (line 19):

```typescript
allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.sinaloka.com', '.localhost'],
```

- [ ] **Step 5: Verify full build**

```bash
cd sinaloka-platform
npm run lint
npm run build
```

Expected: Both pass without errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/contexts/AuthContext.tsx src/pages/Login.tsx vite.config.ts
git commit -m "feat(platform): wire up subdomain routing, branded login, and institution gate"
```

---

## Task 11: Full build verification + backend lint

**Files:** None (verification only)

- [ ] **Step 1: Run backend checks**

```bash
cd sinaloka-backend
npm run lint
npm run build
```

- [ ] **Step 2: Run platform checks**

```bash
cd sinaloka-platform
npm run lint
npm run build
```

- [ ] **Step 3: Run backend tests**

```bash
cd sinaloka-backend
npm test -- --ci
```

Check that newly added tests pass. Pre-existing failures (33 suites) are expected and not caused by this feature.

- [ ] **Step 4: Final commit if any fixes needed**

If build or lint revealed issues, fix and commit:

```bash
git commit -m "fix: resolve lint/build issues from subdomain feature"
```
