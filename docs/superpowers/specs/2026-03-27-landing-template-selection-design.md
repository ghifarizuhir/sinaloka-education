# Landing Page Template Selection

**Date:** 2026-03-27
**Status:** Draft
**Scope:** Medium (multi-file, 2 modules, no breaking changes)

## Goal

Allow institutions to differentiate their public landing pages by choosing from 3 visual templates. Currently all institutions share the same "Bold Geometric" design — only content and brand color vary. Adding template selection gives each institution a distinct visual identity without requiring custom CSS or layout changes.

## Requirements

- 3 templates for initial release: **Bold Geometric** (existing), **Soft & Friendly**, **Clean & Minimal**
- Templates differ in **visual style only** — border radius, shadows, font weights, hero style, card style, pill style
- Section layout and order remain fixed: Hero → Stats → Features → Subjects → About → Gallery → Contact → FooterCTA
- `brand_color` continues to serve as the accent color across all templates
- Template selector added to Landing tab in Settings (new "Theme" section)
- Static thumbnail cards for selection — no live preview
- Backward compatible: existing institutions default to `bold-geometric`

## Non-Goals

- No custom CSS or font selection
- No section reordering or visibility toggles
- No live preview in settings
- No template marketplace or user-created templates
- No changes to `sinaloka-landing` (marketing site)

## Design

### 1. Data Model

Add one field to the `Institution` model in Prisma:

```prisma
landing_template  String?  @default("bold-geometric") @db.VarChar(30)
```

Valid values: `"bold-geometric"` | `"soft-friendly"` | `"clean-minimal"`

Migration: `ALTER TABLE institution ADD COLUMN landing_template VARCHAR(30) DEFAULT 'bold-geometric'`. All existing institutions get `bold-geometric` automatically.

### 2. Backend Changes

**`settings.dto.ts`** — Add `landing_template` to `UpdateLandingDto` Zod schema:

```ts
landing_template: z.enum(['bold-geometric', 'soft-friendly', 'clean-minimal']).optional()
```

**`settings.service.ts`** — Include `landing_template` in the `getLanding` query select and `updateLanding` data payload. No new endpoint needed — rides on existing `PATCH /settings/landing`.

**`institution.service.ts`** — Include `landing_template` in `findLandingBySlug` select so the public landing page receives it.

### 3. Template Config System

New file: `sinaloka-platform/src/pages/public/templates/template-config.ts`

Defines a `TemplateConfig` interface and a config object per template. Each config maps Tailwind classes to UI elements:

```ts
type TemplateId = 'bold-geometric' | 'soft-friendly' | 'clean-minimal'

interface TemplateConfig {
  id: TemplateId
  name: string
  description: string
  hero: { wrapper: string; title: string; subtitle: string; cta: string }
  stats: { card: string; number: string }
  features: { card: string; icon: string }
  subjects: { pill: string }
  about: { wrapper: string; title: string }
  gallery: { wrapper: string; image: string }
  contact: { card: string; button: string }
  footerCta: { wrapper: string; button: string }
}
```

A `getTemplateConfig(id: TemplateId): TemplateConfig` function returns the config, defaulting to `bold-geometric` if `id` is null/undefined.

### 4. Template Style Definitions

Each template's visual identity:

#### Bold Geometric (existing)
- Border radius: 8px (`rounded-lg`)
- Font weight headings: 700-800 (`font-bold` / `font-extrabold`)
- Hero: gradient fill using brand color (`bg-gradient-to-br`)
- Cards: border accent with brand color (`border-2 border-brand`)
- Subject pills: brand color border on light brand bg
- Vibe: confident, modern, strong

#### Soft & Friendly
- Border radius: 16-24px (`rounded-2xl` / `rounded-3xl`)
- Font weight headings: 500-600 (`font-medium` / `font-semibold`)
- Hero: warm vertical gradient, softer brand tint (`bg-gradient-to-b`)
- Cards: soft shadow, no border (`shadow-md rounded-2xl`)
- Subject pills: multi-tinted pastels
- Vibe: warm, approachable, personal

#### Clean & Minimal
- Border radius: 2-4px (`rounded` / `rounded-sm`)
- Font weight headings: 400-500 (`font-normal` / `font-medium`)
- Hero: flat white/light background with bottom border
- Cards: subtle background fill, no shadow (`bg-slate-50 rounded`)
- Subject pills: monochrome gray
- Vibe: elegant, premium, professional

### 5. Template Selector UI (Settings)

Add a "Theme" section in the Landing tab, positioned after "Status" and before "Hero" in the sidebar nav.

**Component: `TemplateSelector.tsx`**
- 3 horizontal cards (desktop) / stacked (mobile)
- Each card shows: inline HTML/CSS mini mockup (not image assets) + template name + 1-line description
- Active card: ring highlight + checkmark indicator
- Click to select → marks form as dirty → save via existing sticky save bar
- Field sent as part of `PATCH /settings/landing` payload

**Changes to existing components:**
- `SectionNav.tsx` — add "Theme" entry with palette icon
- `LandingTab.tsx` — add Theme section, manage `landing_template` in form state

### 6. Landing Page Rendering

**`LandingPage.tsx`** — Read `landing_template` from API response, resolve config via `getTemplateConfig()`, pass config object to each section component.

**Each section component** (`LandingHero`, `LandingStats`, `LandingFeatures`, `LandingSubjects`, `LandingAbout`, `LandingGallery`, `LandingContact`, `LandingFooterCTA`) — Accept `template` config prop, replace hardcoded Tailwind classes with classes from config using `cn()`.

Example refactor pattern:
```diff
- <div className="border-2 border-teal-500 rounded-lg ...">
+ <div className={cn(config.features.card, ...)}>
```

**Fallback:** If `landing_template` is null/undefined, default to `bold-geometric`. Ensures zero breaking change for existing institutions.

**Animations:** Framer Motion fade-in-up animations remain identical across all templates.

## Files Changed

| App | File | Change |
|-----|------|--------|
| Backend | `prisma/schema.prisma` | +1 field `landing_template` |
| Backend | `src/modules/settings/settings.dto.ts` | +1 field in Zod schema |
| Backend | `src/modules/settings/settings.service.ts` | Include in query & update |
| Backend | `src/modules/institution/institution.service.ts` | Include in `findLandingBySlug` |
| Platform | `src/pages/public/templates/template-config.ts` | **New** — 3 template configs |
| Platform | `src/pages/Settings/tabs/components/TemplateSelector.tsx` | **New** — card selector |
| Platform | `src/pages/Settings/tabs/LandingTab.tsx` | +Theme section, +state |
| Platform | `src/pages/Settings/tabs/components/SectionNav.tsx` | +Theme entry |
| Platform | `src/pages/public/LandingPage.tsx` | Resolve template, pass config |
| Platform | `src/pages/public/components/LandingHero.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingStats.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingFeatures.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingSubjects.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingAbout.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingGallery.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingContact.tsx` | Use config classes |
| Platform | `src/pages/public/components/LandingFooterCTA.tsx` | Use config classes |
