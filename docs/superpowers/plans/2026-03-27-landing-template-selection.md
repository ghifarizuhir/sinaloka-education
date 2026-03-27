# Landing Template Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow institutions to choose from 3 visual templates (Bold Geometric, Soft & Friendly, Clean & Minimal) for their public landing page.

**Architecture:** Template configs are Tailwind class mappings stored in a single config file. Each landing section component reads classes from the active template config instead of hardcoding them. Backend stores the template ID as a string field on the Institution model. Settings UI adds a card-based template selector.

**Tech Stack:** Prisma (migration), NestJS (Zod DTO), React, Tailwind CSS, Framer Motion

---

## File Structure

| File | Responsibility |
|------|---------------|
| `sinaloka-backend/prisma/schema.prisma` | Add `landing_template` field to Institution model |
| `sinaloka-backend/src/modules/settings/settings.dto.ts` | Add `landing_template` to Zod validation |
| `sinaloka-backend/src/modules/settings/settings.service.ts` | Include `landing_template` in select/update |
| `sinaloka-backend/src/modules/institution/institution.service.ts` | Include `landing_template` in `findLandingBySlug` |
| `sinaloka-platform/src/types/landing.ts` | Add `landing_template` to TS types |
| `sinaloka-platform/src/pages/public/templates/template-config.ts` | **New** — template ID type, config interface, 3 template definitions, `getTemplateConfig()` |
| `sinaloka-platform/src/pages/Settings/tabs/components/TemplateSelector.tsx` | **New** — card selector component with inline mini mockups |
| `sinaloka-platform/src/pages/Settings/tabs/components/SectionNav.tsx` | Add "Theme" entry |
| `sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx` | Add Theme section, wire `landing_template` into form state and save |
| `sinaloka-platform/src/pages/public/LandingPage.tsx` | Resolve template config, pass to section components |
| `sinaloka-platform/src/pages/public/components/LandingHero.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingStats.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingFeatures.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingSubjects.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingAbout.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingGallery.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingContact.tsx` | Use template config classes |
| `sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx` | Use template config classes |

---

## Task 1: Database Migration — Add `landing_template` Field

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma:165-172`

- [ ] **Step 1: Add field to Prisma schema**

In `sinaloka-backend/prisma/schema.prisma`, inside the `Institution` model, add `landing_template` after `landing_enabled` (line 165):

```prisma
  landing_enabled       Boolean  @default(false)
  landing_template      String?  @default("bold-geometric") @db.VarChar(30)
  landing_tagline       String?  @db.VarChar(200)
```

- [ ] **Step 2: Create migration**

```bash
cd sinaloka-backend
npx prisma migrate dev --name add-landing-template
```

Expected: Migration created successfully, adds `landing_template VARCHAR(30) DEFAULT 'bold-geometric'` column.

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd sinaloka-backend
npm run prisma:generate
```

Expected: Prisma client regenerated with `landing_template` field available.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma sinaloka-backend/prisma/migrations/
git commit -m "feat(backend): add landing_template field to institution schema"
```

---

## Task 2: Backend — Update DTOs and Service

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.dto.ts:124-136`
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts:48-57,264-282`
- Modify: `sinaloka-backend/src/modules/institution/institution.service.ts:256-279`

- [ ] **Step 1: Add `landing_template` to Zod DTO**

In `sinaloka-backend/src/modules/settings/settings.dto.ts`, add `landing_template` to `UpdateLandingSettingsSchema` (after `landing_enabled` on line 125):

```ts
export const UpdateLandingSettingsSchema = z.object({
  landing_enabled: z.boolean().optional(),
  landing_template: z.enum(['bold-geometric', 'soft-friendly', 'clean-minimal']).optional().nullable(),
  landing_tagline: z.string().max(200).optional().nullable(),
  landing_about: z.string().max(2000).optional().nullable(),
  landing_cta_text: z.string().max(50).optional().nullable(),
  whatsapp_number: z.string().max(20).optional().nullable(),
  landing_features: z.array(LandingFeatureSchema).max(4).optional().nullable(),
  gallery_images: z.array(GalleryImageSchema).max(6).optional().nullable(),
  social_links: SocialLinksSchema.optional().nullable(),
});
```

- [ ] **Step 2: Add `landing_template` to `LANDING_SELECT`**

In `sinaloka-backend/src/modules/settings/settings.service.ts`, add to the `LANDING_SELECT` constant (line 48):

```ts
const LANDING_SELECT = {
  landing_enabled: true,
  landing_template: true,
  landing_tagline: true,
  landing_about: true,
  landing_cta_text: true,
  whatsapp_number: true,
  landing_features: true,
  gallery_images: true,
  social_links: true,
};
```

No other changes needed — `getLandingSettings` and `updateLandingSettings` already use `LANDING_SELECT` and pass `dto as any` to Prisma.

- [ ] **Step 3: Add `landing_template` to `findLandingBySlug` select**

In `sinaloka-backend/src/modules/institution/institution.service.ts`, inside `findLandingBySlug` method, find the `select` object (around line 258) and add `landing_template: true`:

```ts
select: {
  id: true,
  name: true,
  slug: true,
  logo_url: true,
  description: true,
  brand_color: true,
  background_image_url: true,
  email: true,
  phone: true,
  address: true,
  settings: true,
  landing_enabled: true,
  landing_template: true,
  landing_tagline: true,
  // ... rest unchanged
```

Also add `landing_template` to the response object assembly (around line 305):

Find the line where `landing_enabled` is included in the result and add `landing_template` right after it:

```ts
landing_enabled: institution.landing_enabled,
landing_template: institution.landing_template,
landing_tagline: institution.landing_tagline,
```

- [ ] **Step 4: Build to verify**

```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.dto.ts sinaloka-backend/src/modules/settings/settings.service.ts sinaloka-backend/src/modules/institution/institution.service.ts
git commit -m "feat(backend): add landing_template to DTOs and services"
```

---

## Task 3: Frontend Types — Add `landing_template`

**Files:**
- Modify: `sinaloka-platform/src/types/landing.ts`

- [ ] **Step 1: Add `landing_template` to all three interfaces**

In `sinaloka-platform/src/types/landing.ts`:

Add to `LandingSettings` (after line 24):
```ts
export interface LandingSettings {
  landing_enabled: boolean;
  landing_template: string | null;
  landing_tagline: string | null;
  // ... rest unchanged
}
```

Add to `UpdateLandingSettingsDto` (after line 35):
```ts
export interface UpdateLandingSettingsDto {
  landing_enabled?: boolean;
  landing_template?: string | null;
  landing_tagline?: string | null;
  // ... rest unchanged
}
```

Add to `LandingPageData` (after line 56):
```ts
export interface LandingPageData {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_color: string | null;
  background_image_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  registration_enabled: boolean;
  landing_enabled: boolean;
  landing_template: string | null;
  landing_tagline: string | null;
  // ... rest unchanged
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/types/landing.ts
git commit -m "feat(platform): add landing_template to TypeScript types"
```

---

## Task 4: Template Config System

**Files:**
- Create: `sinaloka-platform/src/pages/public/templates/template-config.ts`

- [ ] **Step 1: Create template config file**

Create `sinaloka-platform/src/pages/public/templates/template-config.ts`:

```ts
import type React from 'react';

export type TemplateId = 'bold-geometric' | 'soft-friendly' | 'clean-minimal';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  hero: {
    section: string;
    overlay: string;
    decorativeCircle: string;
    logoWrapper: string;
    title: string;
    tagline: string;
    ctaButton: string;
  };
  stats: {
    card: string;
    value: string;
    label: string;
  };
  features: {
    sectionTitle: string;
    card: string;
    cardStyle: (color: string) => React.CSSProperties;
    iconWrapper: string;
    iconWrapperStyle: (color: string) => React.CSSProperties;
    title: string;
    description: string;
  };
  subjects: {
    sectionBg: string;
    sectionTitle: string;
    pill: string;
    pillStyle: (color: string) => React.CSSProperties;
    pillHoverBg: (color: string) => string;
  };
  about: {
    sectionTitle: string;
    divider: string;
    text: string;
  };
  gallery: {
    sectionBg: string;
    sectionTitle: string;
    imageWrapper: string;
  };
  contact: {
    sectionTitle: string;
    contactCard: string;
    contactCardStyle: (color: string) => React.CSSProperties;
    contactCardHoverBg: (color: string) => string;
    socialButton: string;
  };
  footerCta: {
    section: string;
    decorativeCircle: string;
    title: string;
    subtitle: string;
    ctaButton: string;
  };
}

const boldGeometric: TemplateConfig = {
  id: 'bold-geometric',
  name: 'Bold Geometric',
  description: 'Tegas, modern, percaya diri',
  hero: {
    section: 'relative min-h-[50vh] flex items-center justify-center px-6 py-20 overflow-hidden',
    overlay: 'absolute inset-0 pointer-events-none',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none',
    logoWrapper: 'w-16 h-16 rounded-xl shadow-2xl ring-2 ring-white/30 backdrop-blur',
    title: 'text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4',
    tagline: 'text-lg max-w-xl leading-relaxed mb-8',
    ctaButton: 'font-bold sm:min-w-[160px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow',
  },
  stats: {
    card: 'flex bg-white border border-gray-100 overflow-hidden rounded-xl',
    value: 'text-2xl sm:text-3xl font-bold text-gray-900',
    label: 'text-xs text-gray-500 uppercase tracking-wide font-semibold mt-1',
  },
  features: {
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    card: 'rounded-xl p-6',
    cardStyle: (color: string) => ({
      backgroundColor: `${color}0d`,
      borderLeft: `4px solid ${color}`,
    }),
    iconWrapper: 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
    iconWrapperStyle: (color: string) => ({ backgroundColor: `${color}26` }),
    title: 'font-semibold text-gray-900 mb-1',
    description: 'text-sm text-gray-600 leading-relaxed',
  },
  subjects: {
    sectionBg: '#F9FAFB',
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    pill: 'px-4 py-2 rounded-full text-sm text-gray-700 font-medium bg-white transition-colors cursor-default',
    pillStyle: (color: string) => ({ border: `2px solid ${color}33` }),
    pillHoverBg: (color: string) => `${color}1a`,
  },
  about: {
    sectionTitle: 'text-2xl font-bold text-gray-900',
    divider: 'w-16 h-1 rounded-full',
    text: 'text-gray-600 leading-relaxed whitespace-pre-line',
  },
  gallery: {
    sectionBg: '#F9FAFB',
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    imageWrapper: 'relative rounded-xl overflow-hidden group cursor-default',
  },
  contact: {
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    contactCard: 'flex items-center gap-3 rounded-xl p-4 transition-colors',
    contactCardStyle: (color: string) => ({ backgroundColor: `${color}0d` }),
    contactCardHoverBg: (color: string) => `${color}1a`,
    socialButton: 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-colors',
  },
  footerCta: {
    section: 'relative px-6 py-20 overflow-hidden',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none',
    title: 'text-3xl font-bold text-white mb-3',
    subtitle: 'mb-8',
    ctaButton: 'font-bold sm:min-w-[180px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow',
  },
};

const softFriendly: TemplateConfig = {
  id: 'soft-friendly',
  name: 'Soft & Friendly',
  description: 'Hangat, approachable, ramah',
  hero: {
    section: 'relative min-h-[50vh] flex items-center justify-center px-6 py-20 overflow-hidden',
    overlay: 'absolute inset-0 pointer-events-none',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none opacity-60',
    logoWrapper: 'w-16 h-16 rounded-full shadow-xl ring-2 ring-white/20',
    title: 'text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-4',
    tagline: 'text-lg max-w-xl leading-relaxed mb-8',
    ctaButton: 'font-semibold sm:min-w-[160px] justify-center px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition-shadow',
  },
  stats: {
    card: 'flex bg-white overflow-hidden rounded-2xl shadow-md',
    value: 'text-2xl sm:text-3xl font-semibold text-gray-900',
    label: 'text-xs text-gray-500 uppercase tracking-wide font-medium mt-1',
  },
  features: {
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    card: 'rounded-2xl p-6 shadow-md bg-white',
    cardStyle: () => ({}),
    iconWrapper: 'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
    iconWrapperStyle: (color: string) => ({ backgroundColor: `${color}1a` }),
    title: 'font-semibold text-gray-900 mb-1',
    description: 'text-sm text-gray-600 leading-relaxed',
  },
  subjects: {
    sectionBg: '#FFFBF5',
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    pill: 'px-4 py-2 rounded-full text-sm text-gray-700 font-medium bg-white transition-colors cursor-default shadow-sm',
    pillStyle: () => ({}),
    pillHoverBg: (color: string) => `${color}1a`,
  },
  about: {
    sectionTitle: 'text-2xl font-semibold text-gray-900',
    divider: 'w-16 h-1 rounded-full',
    text: 'text-gray-600 leading-relaxed whitespace-pre-line',
  },
  gallery: {
    sectionBg: '#FFFBF5',
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    imageWrapper: 'relative rounded-2xl overflow-hidden group cursor-default shadow-sm',
  },
  contact: {
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    contactCard: 'flex items-center gap-3 rounded-2xl p-4 transition-colors shadow-sm bg-white',
    contactCardStyle: () => ({}),
    contactCardHoverBg: (color: string) => `${color}1a`,
    socialButton: 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-colors shadow-sm',
  },
  footerCta: {
    section: 'relative px-6 py-20 overflow-hidden',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none opacity-60',
    title: 'text-3xl font-semibold text-white mb-3',
    subtitle: 'mb-8',
    ctaButton: 'font-semibold sm:min-w-[180px] justify-center px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition-shadow',
  },
};

const cleanMinimal: TemplateConfig = {
  id: 'clean-minimal',
  name: 'Clean & Minimal',
  description: 'Elegan, profesional, tenang',
  hero: {
    section: 'relative min-h-[45vh] flex items-center justify-center px-6 py-16 overflow-hidden border-b border-white/10',
    overlay: 'absolute inset-0 pointer-events-none',
    decorativeCircle: 'hidden',
    logoWrapper: 'w-14 h-14 rounded shadow-lg ring-1 ring-white/10',
    title: 'text-3xl sm:text-4xl font-medium text-white tracking-tight mb-4',
    tagline: 'text-lg max-w-xl leading-relaxed mb-8',
    ctaButton: 'font-medium sm:min-w-[160px] justify-center px-8 py-3 rounded shadow-sm hover:shadow transition-shadow uppercase tracking-wide text-sm',
  },
  stats: {
    card: 'flex bg-white border border-gray-200 overflow-hidden rounded',
    value: 'text-2xl sm:text-3xl font-medium text-gray-900',
    label: 'text-xs text-gray-400 uppercase tracking-wider font-normal mt-1',
  },
  features: {
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    card: 'rounded p-6 bg-gray-50',
    cardStyle: () => ({}),
    iconWrapper: 'w-10 h-10 rounded flex items-center justify-center shrink-0 bg-gray-100',
    iconWrapperStyle: () => ({}),
    title: 'font-medium text-gray-900 mb-1',
    description: 'text-sm text-gray-500 leading-relaxed',
  },
  subjects: {
    sectionBg: '#FFFFFF',
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    pill: 'px-4 py-2 rounded text-sm text-gray-600 font-normal bg-gray-100 transition-colors cursor-default',
    pillStyle: () => ({}),
    pillHoverBg: () => '#e5e7eb',
  },
  about: {
    sectionTitle: 'text-2xl font-medium text-gray-900',
    divider: 'w-12 h-0.5 rounded-full',
    text: 'text-gray-500 leading-relaxed whitespace-pre-line',
  },
  gallery: {
    sectionBg: '#FFFFFF',
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    imageWrapper: 'relative rounded overflow-hidden group cursor-default',
  },
  contact: {
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    contactCard: 'flex items-center gap-3 rounded p-4 transition-colors bg-gray-50',
    contactCardStyle: () => ({}),
    contactCardHoverBg: () => '#e5e7eb',
    socialButton: 'w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 transition-colors',
  },
  footerCta: {
    section: 'relative px-6 py-16 overflow-hidden',
    decorativeCircle: 'hidden',
    title: 'text-2xl font-medium text-white mb-3',
    subtitle: 'mb-8',
    ctaButton: 'font-medium sm:min-w-[180px] justify-center px-8 py-3 rounded shadow-sm hover:shadow transition-shadow uppercase tracking-wide text-sm',
  },
};

const templates: Record<TemplateId, TemplateConfig> = {
  'bold-geometric': boldGeometric,
  'soft-friendly': softFriendly,
  'clean-minimal': cleanMinimal,
};

export const TEMPLATE_LIST = [boldGeometric, softFriendly, cleanMinimal] as const;

export function getTemplateConfig(id?: string | null): TemplateConfig {
  if (id && id in templates) {
    return templates[id as TemplateId];
  }
  return boldGeometric;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd sinaloka-platform
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to template-config.ts (there may be pre-existing errors from other files).

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/public/templates/template-config.ts
git commit -m "feat(platform): add template config system with 3 visual templates"
```

---

## Task 5: Refactor Landing Components to Use Template Config

**Files:**
- Modify: `sinaloka-platform/src/pages/public/LandingPage.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingHero.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingStats.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingFeatures.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingSubjects.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingAbout.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingGallery.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingContact.tsx`
- Modify: `sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx`

- [ ] **Step 1: Update LandingPage.tsx — resolve and pass template config**

Replace the full file `sinaloka-platform/src/pages/public/LandingPage.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { institutionPublicService } from '@/src/services/institutionPublic.service';
import { Skeleton } from '@/src/components/UI';
import { getTemplateConfig } from './templates/template-config';
import { LandingHero } from './components/LandingHero';
import { LandingStats } from './components/LandingStats';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingSubjects } from './components/LandingSubjects';
import { LandingAbout } from './components/LandingAbout';
import { LandingGallery } from './components/LandingGallery';
import { LandingContact } from './components/LandingContact';
import { LandingFooterCTA } from './components/LandingFooterCTA';
import { WhatsAppFAB } from './components/WhatsAppFAB';

export function LandingPage() {
  const { institution, slug } = useInstitution();

  const { data, isLoading } = useQuery({
    queryKey: ['landing', slug],
    queryFn: () => institutionPublicService.getLanding(slug!),
    enabled: !!slug && !!institution?.landing_enabled,
  });

  if (!institution?.landing_enabled) return <Navigate to="/login" replace />;

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  const template = getTemplateConfig(data.landing_template);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingHero data={data} template={template} />
      <LandingStats stats={data.stats} brandColor={data.brand_color} template={template} />
      <LandingFeatures features={data.landing_features} brandColor={data.brand_color} template={template} />
      <LandingSubjects subjects={data.subjects} brandColor={data.brand_color} template={template} />
      <LandingAbout text={data.landing_about} brandColor={data.brand_color} template={template} />
      <LandingGallery images={data.gallery_images} template={template} />
      <LandingContact data={data} template={template} />
      <LandingFooterCTA data={data} template={template} />
      <WhatsAppFAB number={data.whatsapp_number} />
    </div>
  );
}
```

- [ ] **Step 2: Update LandingHero.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingHero.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import type { LandingPageData } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface LandingHeroProps {
  data: LandingPageData;
  template: TemplateConfig;
}

export function LandingHero({ data, template }: LandingHeroProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const tagline = data.landing_tagline ?? data.description;
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');
  const tc = template.hero;

  return (
    <section
      className={tc.section}
      style={{ backgroundColor: brandColor }}
    >
      {/* Gradient overlay for depth */}
      <div
        className={tc.overlay}
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent 40%, transparent)',
        }}
      />

      {/* Decorative circles */}
      <div
        className={tc.decorativeCircle}
        style={{ borderColor: 'rgba(255,255,255,0.15)', top: '-2.5rem', right: '-2.5rem', width: '200px', height: '200px' }}
      />
      <div
        className={tc.decorativeCircle}
        style={{ borderColor: 'rgba(255,255,255,0.1)', top: '5rem', right: '-4rem', width: '120px', height: '120px' }}
      />
      <div
        className={tc.decorativeCircle}
        style={{ borderColor: 'rgba(255,255,255,0.1)', bottom: '-4rem', left: '-2rem', width: '160px', height: '160px' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          {data.logo_url ? (
            <img
              src={data.logo_url}
              alt={data.name}
              className={`${tc.logoWrapper} object-cover`}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            />
          ) : (
            <div
              className={`${tc.logoWrapper} flex items-center justify-center text-2xl font-bold`}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        {/* Institution name */}
        <motion.h1
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={tc.title}
        >
          {data.name}
        </motion.h1>

        {/* Tagline */}
        {tagline && (
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={tc.tagline}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            {tagline}
          </motion.p>
        )}

        {/* CTA */}
        {data.registration_enabled && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className={tc.ctaButton}
              style={{ backgroundColor: '#fff', color: brandColor }}
            >
              {ctaText}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update LandingStats.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingStats.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingStatsProps {
  stats: {
    active_students: number;
    active_tutors: number;
    total_subjects: number;
  };
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingStats({ stats, template }: LandingStatsProps) {
  const { t } = useTranslation();
  const tc = template.stats;

  const items = [
    { value: stats.active_students, label: t('landingPage.students') },
    { value: stats.active_tutors, label: t('landingPage.tutors') },
    { value: stats.total_subjects, label: t('landingPage.subjectsCount') },
  ];

  return (
    <motion.section
      {...fadeInUp}
      transition={{ duration: 0.5 }}
      className="-mt-8 relative z-10 mx-6 sm:mx-auto max-w-md"
    >
      <div className={tc.card} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              'flex-1 text-center py-5 px-3',
              i < items.length - 1 && 'border-r border-gray-100'
            )}
          >
            <div className={tc.value}>{item.value}</div>
            <div className={tc.label}>{item.label}</div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 4: Update LandingFeatures.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingFeatures.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { icons, type LucideIcon } from 'lucide-react';
import type { LandingFeature } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFeaturesProps {
  features: LandingFeature[] | null;
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingFeatures({ features, brandColor, template }: LandingFeaturesProps) {
  const { t } = useTranslation();

  if (!features || features.length === 0) return null;

  const color = brandColor ?? '#14b8a6';
  const tc = template.features;

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.sectionTitle}
        >
          {t('landingPage.features')}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, i) => {
            const Icon = (icons as Record<string, LucideIcon>)[feature.icon];
            return (
              <motion.div
                key={feature.id}
                {...fadeInUp}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={tc.card}
                style={tc.cardStyle(color)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={tc.iconWrapper}
                    style={tc.iconWrapperStyle(color)}
                  >
                    {Icon ? (
                      <Icon size={20} style={{ color }} />
                    ) : (
                      <span className="text-sm font-bold" style={{ color }}>?</span>
                    )}
                  </div>
                  <div>
                    <h3 className={tc.title}>{feature.title}</h3>
                    <p className={tc.description}>{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update LandingSubjects.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingSubjects.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingSubjectsProps {
  subjects: { id: string; name: string }[];
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingSubjects({ subjects, brandColor, template }: LandingSubjectsProps) {
  const { t } = useTranslation();

  if (subjects.length === 0) return null;

  const color = brandColor ?? '#14b8a6';
  const tc = template.subjects;

  return (
    <section className="px-6 py-16" style={{ backgroundColor: tc.sectionBg }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.sectionTitle}
        >
          {t('landingPage.subjects')}
        </motion.h2>
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {subjects.map((subject) => (
            <span
              key={subject.id}
              className={tc.pill}
              style={tc.pillStyle(color)}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = tc.pillHoverBg(color);
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '';
              }}
            >
              {subject.name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Update LandingAbout.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingAbout.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingAboutProps {
  text: string | null;
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingAbout({ text, brandColor, template }: LandingAboutProps) {
  const { t } = useTranslation();

  if (!text) return null;

  const color = brandColor ?? '#14b8a6';
  const tc = template.about;
  const isShort = text.length < 100;

  if (isShort) {
    return (
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className={`${tc.sectionTitle} mb-3`}
          >
            {t('landingPage.about')}
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.05, duration: 0.5 }}
            className={`${tc.divider} mx-auto mb-6`}
            style={{ backgroundColor: color }}
          />
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={tc.text}
          >
            {text}
          </motion.p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:gap-10">
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className="sm:w-1/3 shrink-0 mb-6 sm:mb-0"
          >
            <h2 className={tc.sectionTitle}>{t('landingPage.about')}</h2>
            <div
              className={`${tc.divider} mt-3`}
              style={{ backgroundColor: color }}
            />
          </motion.div>
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={tc.text}
          >
            {text}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Update LandingGallery.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingGallery.tsx`:

```tsx
import { useState } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import type { GalleryImage } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingGalleryProps {
  images: GalleryImage[] | null;
  template: TemplateConfig;
}

export function LandingGallery({ images, template }: LandingGalleryProps) {
  const { t } = useTranslation();
  const tc = template.gallery;

  if (!images || images.length === 0) return null;

  const sorted = [...images].sort((a, b) => a.order - b.order);

  return (
    <section className="px-6 py-16" style={{ backgroundColor: tc.sectionBg }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.sectionTitle}
        >
          {t('landingPage.gallery')}
        </motion.h2>
        <div
          className={cn(
            'grid gap-3',
            sorted.length === 1
              ? 'grid-cols-1'
              : 'grid-cols-2 sm:grid-cols-3'
          )}
        >
          {sorted.map((image, i) => (
            <GalleryItem
              key={image.id}
              image={image}
              index={i}
              isFirst={i === 0 && sorted.length >= 2}
              isSingle={sorted.length === 1}
              imageWrapperClass={tc.imageWrapper}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryItem({
  image,
  index,
  isFirst,
  isSingle,
  imageWrapperClass,
}: {
  key?: React.Key;
  image: GalleryImage;
  index: number;
  isFirst: boolean;
  isSingle: boolean;
  imageWrapperClass: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      {...fadeInUp}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      className={cn(
        imageWrapperClass,
        isFirst && 'col-span-2 row-span-2',
        isSingle && 'col-span-full',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={image.url}
        alt={image.caption ?? ''}
        className={cn(
          'w-full h-full object-cover transition-transform duration-300',
          (isFirst || isSingle) ? 'aspect-[16/10]' : 'aspect-square',
          hovered && 'scale-105'
        )}
      />
      {image.caption && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 px-3 py-2 transition-all duration-300',
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
          }}
        >
          <p className="text-white text-xs truncate">{image.caption}</p>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 8: Update LandingContact.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingContact.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import type { LandingPageData } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingContactProps {
  data: LandingPageData;
  template: TemplateConfig;
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.56a8.23 8.23 0 0 0 4.76 1.51V6.63a4.83 4.83 0 0 1-1-.06z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white" />
    </svg>
  );
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram' as const, Icon: InstagramIcon, urlPrefix: 'https://instagram.com/' },
  { key: 'tiktok' as const, Icon: TikTokIcon, urlPrefix: 'https://tiktok.com/@' },
  { key: 'facebook' as const, Icon: FacebookIcon, urlPrefix: 'https://facebook.com/' },
  { key: 'youtube' as const, Icon: YouTubeIcon, urlPrefix: 'https://youtube.com/@' },
  { key: 'website' as const, Icon: Globe, urlPrefix: '' },
] as const;

export function LandingContact({ data, template }: LandingContactProps) {
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const tc = template.contact;
  const hasContact = data.email || data.phone || data.address;
  const hasSocial = data.social_links &&
    Object.values(data.social_links).some(Boolean);

  if (!hasContact && !hasSocial) return null;

  const contactItems = [
    { icon: Mail, value: data.email, href: data.email ? `mailto:${data.email}` : undefined },
    { icon: Phone, value: data.phone, href: data.phone ? `tel:${data.phone}` : undefined },
    { icon: MapPin, value: data.address, href: undefined },
  ].filter((item) => item.value);

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.sectionTitle}
        >
          {t('landingPage.contact')}
        </motion.h2>

        {contactItems.length > 0 && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {contactItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div
                  className={tc.contactCard}
                  style={tc.contactCardStyle(brandColor)}
                  onMouseOver={(e) => {
                    if (item.href) (e.currentTarget as HTMLElement).style.backgroundColor = tc.contactCardHoverBg(brandColor);
                  }}
                  onMouseOut={(e) => {
                    if (item.href) (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  }}
                >
                  <Icon size={18} className="shrink-0" style={{ color: brandColor }} />
                  <span className="text-sm text-gray-700 break-all">{item.value}</span>
                </div>
              );
              return item.href ? (
                <a key={item.value} href={item.href} className="block">
                  {content}
                </a>
              ) : (
                <div key={item.value}>{content}</div>
              );
            })}
          </motion.div>
        )}

        {hasSocial && data.social_links && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center gap-3"
          >
            {SOCIAL_PLATFORMS.map(({ key, Icon, urlPrefix }) => {
              const handle = data.social_links?.[key];
              if (!handle) return null;
              const url = key === 'website'
                ? (handle.startsWith('http') ? handle : `https://${handle}`)
                : (handle.startsWith('http') ? handle : `${urlPrefix}${handle}`);
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={tc.socialButton}
                  onMouseOver={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = brandColor;
                    el.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = '';
                    el.style.color = '';
                  }}
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Update LandingFooterCTA.tsx**

Replace the full file `sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import type { LandingPageData } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFooterCTAProps {
  data: LandingPageData;
  template: TemplateConfig;
}

export function LandingFooterCTA({ data, template }: LandingFooterCTAProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');
  const tc = template.footerCta;

  return (
    <section
      className={tc.section}
      style={{ backgroundColor: brandColor }}
    >
      {/* Decorative circles */}
      <div
        className={tc.decorativeCircle}
        style={{ borderColor: 'rgba(255,255,255,0.12)', top: '-2rem', left: '-2rem', width: '160px', height: '160px' }}
      />
      <div
        className={tc.decorativeCircle}
        style={{ borderColor: 'rgba(255,255,255,0.1)', bottom: '-3rem', right: '-3rem', width: '200px', height: '200px' }}
      />
      <div
        className={tc.decorativeCircle}
        style={{ borderColor: 'rgba(255,255,255,0.08)', top: '50%', right: '-1.5rem', width: '100px', height: '100px' }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.title}
        >
          {t('landingPage.ready')}
        </motion.h2>
        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={tc.subtitle}
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {t('landingPage.readyDesc')}
        </motion.p>

        {data.registration_enabled && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className={tc.ctaButton}
              style={{ backgroundColor: '#fff', color: brandColor }}
            >
              {ctaText}
            </Button>
          </motion.div>
        )}

        {/* Powered by Sinaloka */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16 flex items-center justify-center gap-1.5"
        >
          <SinalokaLogo size={14} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('landingPage.poweredBy')}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 10: Build to verify all components compile**

```bash
cd sinaloka-platform
npm run build
```

Expected: Build succeeds. The landing page should look identical to before because `getTemplateConfig(null)` returns `bold-geometric` which matches the current hardcoded styles.

- [ ] **Step 11: Commit**

```bash
cd sinaloka-platform
git add src/pages/public/
git commit -m "refactor(platform): migrate landing page components to use template config"
```

---

## Task 6: Template Selector Component (Settings UI)

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/components/TemplateSelector.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/tabs/components/SectionNav.tsx:1-33`
- Modify: `sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx`

- [ ] **Step 1: Create TemplateSelector.tsx**

Create `sinaloka-platform/src/pages/Settings/tabs/components/TemplateSelector.tsx`:

```tsx
import { Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TEMPLATE_LIST, type TemplateId } from '@/src/pages/public/templates/template-config';

interface TemplateSelectorProps {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

function BoldGeometricThumb() {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-12 rounded-md bg-teal-500 flex flex-col items-center justify-center gap-0.5">
        <div className="w-4 h-4 rounded bg-white/40" />
        <div className="w-12 h-1 rounded bg-white/50" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded border-l-2 border-teal-500 bg-teal-50" />
        <div className="h-6 rounded border-l-2 border-teal-500 bg-teal-50" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-8 rounded-full border border-teal-300 bg-teal-50" />
        <div className="h-2 w-6 rounded-full border border-teal-300 bg-teal-50" />
      </div>
    </div>
  );
}

function SoftFriendlyThumb() {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-12 rounded-xl bg-gradient-to-b from-amber-200 to-orange-100 flex flex-col items-center justify-center gap-0.5">
        <div className="w-4 h-4 rounded-full bg-amber-400/60" />
        <div className="w-12 h-1 rounded bg-amber-600/30" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded-xl bg-white shadow-sm" />
        <div className="h-6 rounded-xl bg-white shadow-sm" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-8 rounded-full bg-amber-100" />
        <div className="h-2 w-6 rounded-full bg-pink-100" />
      </div>
    </div>
  );
}

function CleanMinimalThumb() {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-12 bg-slate-800 flex flex-col items-center justify-center gap-0.5 border-b border-slate-600">
        <div className="w-4 h-4 rounded-sm bg-white/20" />
        <div className="w-12 h-1 rounded bg-white/30" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded-sm bg-slate-100" />
        <div className="h-6 rounded-sm bg-slate-100" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-8 rounded-sm bg-slate-200" />
        <div className="h-2 w-6 rounded-sm bg-slate-200" />
      </div>
    </div>
  );
}

const thumbnails: Record<TemplateId, React.FC> = {
  'bold-geometric': BoldGeometricThumb,
  'soft-friendly': SoftFriendlyThumb,
  'clean-minimal': CleanMinimalThumb,
};

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TEMPLATE_LIST.map((tmpl) => {
        const isActive = value === tmpl.id;
        const Thumb = thumbnails[tmpl.id];
        return (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onChange(tmpl.id)}
            className={cn(
              'relative text-left rounded-lg border-2 p-3 transition-all',
              isActive
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
            )}
          >
            {isActive && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
            <div className="w-full mb-3 pointer-events-none">
              <Thumb />
            </div>
            <p className="text-sm font-medium dark:text-zinc-200">{tmpl.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tmpl.description}</p>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add "Theme" to SectionNav**

In `sinaloka-platform/src/pages/Settings/tabs/components/SectionNav.tsx`:

Add `Palette` to the icon import (line 3):
```ts
import { Globe, Palette, Layout, FileText, Star, Image, Phone } from 'lucide-react';
```

Update the `SectionNavProps` interface to accept `template` (add after line 20):
```ts
interface SectionNavProps {
  template: string;
  tagline: string;
  about: string;
  features: LandingFeature[];
  gallery: { length: number };
  whatsapp: string;
  social: SocialLinks;
}
```

In `buildSections`, add the Theme entry after Status (insert after line 26):
```ts
function buildSections(props: SectionNavProps): SectionItem[] {
  const { template, tagline, about, features, gallery, whatsapp, social } = props;
  return [
    { id: 'landing-status', icon: Globe, labelKey: 'settings.landing.title', isFilled: true },
    { id: 'landing-theme', icon: Palette, labelKey: 'settings.landing.theme', isFilled: !!template },
    { id: 'landing-hero', icon: Layout, labelKey: 'settings.landing.tagline', isFilled: !!(tagline) },
    { id: 'landing-about', icon: FileText, labelKey: 'settings.landing.about', isFilled: !!(about) },
    { id: 'landing-features', icon: Star, labelKey: 'settings.landing.features', isFilled: features.length > 0 },
    { id: 'landing-gallery', icon: Image, labelKey: 'settings.landing.gallery', isFilled: gallery.length > 0 },
    { id: 'landing-contact', icon: Phone, labelKey: 'settings.landing.socialLinks', isFilled: !!(whatsapp) || Object.values(social).some(Boolean) },
  ];
}
```

- [ ] **Step 3: Wire template into LandingTab.tsx**

In `sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx`:

Add imports (after line 13):
```ts
import { TemplateSelector } from './components/TemplateSelector';
import type { TemplateId } from '@/src/pages/public/templates/template-config';
```

Add template state (after line 32, the `social` state):
```ts
const [template, setTemplate] = useState<TemplateId>('bold-geometric');
```

In the `useEffect` that syncs from server (around line 39), add after setting `social`:
```ts
setTemplate((settings.landing_template as TemplateId) ?? 'bold-geometric');
```

Add `template` to the `hasChanges` check (add a line to the condition):
```ts
const hasChanges = !!(
  initialRef.current &&
  (template !== ((initialRef.current.landing_template as TemplateId) ?? 'bold-geometric') ||
    tagline !== (initialRef.current.landing_tagline ?? '') ||
    // ... rest unchanged
```

Add `template` to the `confirmSave` payload (add as first property in the `mutate` call):
```ts
updateSettings.mutate(
  {
    landing_template: template,
    landing_tagline: tagline || null,
    // ... rest unchanged
```

Pass `template` to `SectionNav`:
```ts
<SectionNav
  template={template}
  tagline={tagline}
  // ... rest unchanged
```

Add the Theme Card section after the Status Card (after the closing `</Card>` of `landing-status`, before the Hero Card):
```tsx
{/* Theme */}
<Card id="landing-theme">
  <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.theme')}</h3>
  <TemplateSelector value={template} onChange={setTemplate} />
</Card>
```

- [ ] **Step 4: Add i18n key for "Theme"**

Search for the landing i18n file and add the `theme` key. The key `settings.landing.theme` needs to be added to both English and Indonesian translation files.

Find the translation files:
```bash
cd sinaloka-platform
grep -rl "settings.landing.title" src/locales/
```

Add to the English file under `settings.landing`:
```json
"theme": "Theme"
```

Add to the Indonesian file under `settings.landing`:
```json
"theme": "Tema"
```

- [ ] **Step 5: Build to verify**

```bash
cd sinaloka-platform
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd sinaloka-platform
git add src/pages/Settings/ src/locales/
git commit -m "feat(platform): add template selector to landing settings"
```

---

## Task 7: Build & Verify End-to-End

**Files:** None (verification only)

- [ ] **Step 1: Build backend**

```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Build platform**

```bash
cd sinaloka-platform
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run backend tests**

```bash
cd sinaloka-backend
npm run test -- --ci
```

Expected: All tests pass (template field is optional with default, no existing tests should break).

- [ ] **Step 4: Run platform type check**

```bash
cd sinaloka-platform
npm run lint
```

Expected: No type errors.

- [ ] **Step 5: Commit (if any fixes were needed)**

Only if previous steps required fixes:
```bash
git add -A
git commit -m "fix(platform): address build issues in template selection"
```
