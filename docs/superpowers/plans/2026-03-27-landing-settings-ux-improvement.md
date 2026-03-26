# Landing Settings UX Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Landing tab in admin Settings by adding a sticky sidebar navigation with scroll-to behavior and static section illustrations for visual guidance.

**Architecture:** Refactor `LandingTab` from a single-column vertical layout to a two-column layout (sidebar + content). Add two new components: `SectionNav` (sticky sidebar with active tracking via IntersectionObserver) and `SectionIllustration` (CSS wireframe hints per section). Mobile: sidebar collapses to horizontal sticky pill tabs.

**Tech Stack:** React, Tailwind CSS v4, Lucide icons, IntersectionObserver API, i18next

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/Settings/tabs/components/SectionNav.tsx` | Create | Sticky sidebar nav with section items, active tracking, completion dots, mobile pill variant |
| `src/pages/Settings/tabs/components/SectionIllustration.tsx` | Create | CSS wireframe illustration + caption per section key |
| `src/pages/Settings/tabs/LandingTab.tsx` | Modify | Refactor to 2-column grid layout, add section `id` attributes, integrate SectionNav + SectionIllustration |
| `src/locales/en.json` | Modify | Add `settings.landing.hints.*` i18n keys for illustration captions |
| `src/locales/id.json` | Modify | Add `settings.landing.hints.*` i18n keys (Bahasa Indonesia) |

---

### Task 1: Add i18n keys for section hints

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json` (settings.landing section)
- Modify: `sinaloka-platform/src/locales/id.json` (settings.landing section)

- [ ] **Step 1: Add English hint keys**

Add inside `settings.landing` object in `src/locales/en.json`:

```json
"hints": {
  "hero": "The main banner at the top of your landing page. Visitors see this first.",
  "about": "Your institution description displayed in the middle of the page.",
  "features": "Your institution's key strengths shown as feature cards.",
  "gallery": "Photo gallery displayed as an image grid.",
  "contact": "Contact info and social media links at the bottom of the page."
}
```

- [ ] **Step 2: Add Indonesian hint keys**

Add inside `settings.landing` object in `src/locales/id.json`:

```json
"hints": {
  "hero": "Banner utama di bagian atas landing page. Pengunjung melihat ini pertama kali.",
  "about": "Deskripsi institusi yang tampil di tengah halaman.",
  "features": "Keunggulan institusi ditampilkan sebagai kartu fitur.",
  "gallery": "Galeri foto ditampilkan sebagai grid gambar.",
  "contact": "Informasi kontak dan sosial media di bagian bawah halaman."
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add i18n hint keys for landing settings illustrations"
```

---

### Task 2: Create SectionIllustration component

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/components/SectionIllustration.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';

type SectionKey = 'hero' | 'about' | 'features' | 'gallery' | 'contact';

interface SectionIllustrationProps {
  sectionKey: SectionKey;
}

function HeroWireframe() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Banner */}
      <div className="w-full h-16 rounded-md bg-teal-500/80 flex flex-col items-center justify-center gap-1">
        <div className="w-6 h-6 rounded-full bg-white/30" />
        <div className="w-24 h-1.5 rounded-full bg-white/60" />
        <div className="w-14 h-3 rounded bg-white/90 mt-0.5" />
      </div>
      {/* Rest of page faded */}
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
    </div>
  );
}

function AboutWireframe() {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Top of page faded */}
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
      {/* About section highlighted */}
      <div className="w-full rounded-md border-2 border-teal-500/40 bg-teal-50 dark:bg-teal-900/20 p-2 space-y-1">
        <div className="w-12 h-1.5 rounded-full bg-teal-500/60 mx-auto" />
        <div className="w-full h-1 rounded bg-teal-500/30" />
        <div className="w-3/4 h-1 rounded bg-teal-500/30" />
        <div className="w-5/6 h-1 rounded bg-teal-500/30" />
      </div>
      {/* Bottom faded */}
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
    </div>
  );
}

function FeaturesWireframe() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
      {/* Features grid highlighted */}
      <div className="grid grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded border-2 border-teal-500/40 bg-teal-50 dark:bg-teal-900/20 p-1.5 flex items-center gap-1"
          >
            <div className="w-3 h-3 rounded bg-teal-500/50 shrink-0" />
            <div className="space-y-0.5 flex-1">
              <div className="w-full h-1 rounded bg-teal-500/40" />
              <div className="w-2/3 h-1 rounded bg-teal-500/25" />
            </div>
          </div>
        ))}
      </div>
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
    </div>
  );
}

function GalleryWireframe() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
      {/* Gallery grid highlighted */}
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="aspect-square rounded border-2 border-teal-500/40 bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center"
          >
            <div className="w-3 h-2 rounded-sm bg-teal-500/40" />
          </div>
        ))}
      </div>
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
    </div>
  );
}

function ContactWireframe() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="w-full space-y-1 opacity-30">
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-600" />
      </div>
      {/* Contact section highlighted at bottom */}
      <div className="w-full rounded-md border-2 border-teal-500/40 bg-teal-50 dark:bg-teal-900/20 p-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-teal-500/50" />
          <div className="w-16 h-1 rounded bg-teal-500/40" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-teal-500/30" />
          ))}
        </div>
      </div>
    </div>
  );
}

const wireframes: Record<SectionKey, () => React.JSX.Element> = {
  hero: HeroWireframe,
  about: AboutWireframe,
  features: FeaturesWireframe,
  gallery: GalleryWireframe,
  contact: ContactWireframe,
};

export function SectionIllustration({ sectionKey }: SectionIllustrationProps) {
  const { t } = useTranslation();
  const Wireframe = wireframes[sectionKey];

  return (
    <div className="mb-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3">
      <div className="w-40 mx-auto mb-2">
        <Wireframe />
      </div>
      <div className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <Lightbulb size={12} className="shrink-0 mt-0.5 text-amber-500" />
        <span>{t(`settings.landing.hints.${sectionKey}`)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/tabs/components/SectionIllustration.tsx
git commit -m "feat(platform): add SectionIllustration component with CSS wireframes"
```

---

### Task 3: Create SectionNav component

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/components/SectionNav.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Layout, FileText, Star, Image, Phone } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { LandingFeature, SocialLinks } from '@/src/types/landing';

export interface SectionItem {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  isFilled: boolean;
}

interface SectionNavProps {
  tagline: string;
  about: string;
  features: LandingFeature[];
  gallery: { length: number };
  whatsapp: string;
  social: SocialLinks;
}

function buildSections(props: SectionNavProps): SectionItem[] {
  const { tagline, about, features, gallery, whatsapp, social } = props;
  return [
    { id: 'landing-status', icon: Globe, labelKey: 'settings.landing.title', isFilled: true },
    { id: 'landing-hero', icon: Layout, labelKey: 'settings.landing.tagline', isFilled: !!(tagline) },
    { id: 'landing-about', icon: FileText, labelKey: 'settings.landing.about', isFilled: !!(about) },
    { id: 'landing-features', icon: Star, labelKey: 'settings.landing.features', isFilled: features.length > 0 },
    { id: 'landing-gallery', icon: Image, labelKey: 'settings.landing.gallery', isFilled: gallery.length > 0 },
    { id: 'landing-contact', icon: Phone, labelKey: 'settings.landing.socialLinks', isFilled: !!(whatsapp) || Object.values(social).some(Boolean) },
  ];
}

export function SectionNav(props: SectionNavProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('landing-status');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sections = buildSections(props);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    elements.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100; // account for sticky header
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block w-48 shrink-0">
        <div className="sticky top-28 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-2 font-medium">
            Sections
          </p>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                )}
              >
                <Icon size={14} />
                <span className="truncate flex-1">{t(section.labelKey)}</span>
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    section.isFilled ? 'bg-emerald-500' : 'bg-amber-400',
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile horizontal pills */}
      <nav className="md:hidden sticky top-16 z-10 bg-white dark:bg-zinc-950 -mx-1 px-1 pb-2 pt-1 overflow-x-auto">
        <div className="flex gap-1.5">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
                )}
              >
                <Icon size={12} />
                {t(section.labelKey)}
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    section.isFilled ? 'bg-emerald-500' : 'bg-amber-400',
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/tabs/components/SectionNav.tsx
git commit -m "feat(platform): add SectionNav component with scroll-to and active tracking"
```

---

### Task 4: Refactor LandingTab to two-column layout

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx`

- [ ] **Step 1: Update imports**

At the top of `LandingTab.tsx`, add the new component imports after the existing imports:

```tsx
import { SectionNav } from './components/SectionNav';
import { SectionIllustration } from './components/SectionIllustration';
```

- [ ] **Step 2: Replace the return JSX**

Replace the entire `return (` block (lines 104-258) with the two-column layout. The form state, handlers, and all logic above `return` stay unchanged. The new return:

```tsx
  return (
    <div>
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <SectionNav
          tagline={tagline}
          about={about}
          features={features}
          gallery={{ length: gallery.length }}
          whatsapp={whatsapp}
          social={social}
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Status */}
          <Card id="landing-status">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-zinc-400" />
              <h3 className="text-lg font-bold dark:text-zinc-100">{t('settings.landing.title')}</h3>
            </div>
            <p className="text-sm text-zinc-500 mb-4">{t('settings.landing.description')}</p>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium dark:text-zinc-200">{t('settings.landing.enabled')}</p>
                <p className="text-xs text-zinc-400">{t('settings.landing.enabledHint')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings?.landing_enabled ?? false}
                onClick={() => handleToggle(!settings?.landing_enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings?.landing_enabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings?.landing_enabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-md text-sm">
              <span className="text-zinc-500 truncate flex-1">{landingUrl}</span>
              <button type="button" onClick={handleCopyUrl} className="text-primary hover:underline text-xs">
                <Copy size={14} />
              </button>
              <a
                href={landingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-primary text-xs ${!settings?.landing_enabled ? 'pointer-events-none opacity-40' : ''}`}
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </Card>

          {/* Hero Content */}
          <Card id="landing-hero">
            <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">Hero</h3>
            <SectionIllustration sectionKey="hero" />
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.tagline')}</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={t('settings.landing.taglinePlaceholder')}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                />
                <p className="text-xs text-zinc-400 text-right">{tagline.length}/200</p>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.ctaText')}</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder={t('settings.landing.ctaDefault')}
                  maxLength={50}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                />
              </div>
            </div>
          </Card>

          {/* About */}
          <Card id="landing-about">
            <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.about')}</h3>
            <SectionIllustration sectionKey="about" />
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder={t('settings.landing.aboutPlaceholder')}
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md resize-none"
            />
            <p className="text-xs text-zinc-400 text-right">{about.length}/2000</p>
          </Card>

          {/* Features */}
          <Card id="landing-features">
            <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.features')}</h3>
            <SectionIllustration sectionKey="features" />
            <FeatureRepeater features={features} onChange={setFeatures} />
          </Card>

          {/* Gallery */}
          <Card id="landing-gallery">
            <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.gallery')}</h3>
            <SectionIllustration sectionKey="gallery" />
            <GalleryUploader images={gallery} onChange={setGallery} />
          </Card>

          {/* Contact & Social */}
          <Card id="landing-contact">
            <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.socialLinks')}</h3>
            <SectionIllustration sectionKey="contact" />
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.whatsapp')}</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  maxLength={20}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                />
                <p className="text-xs text-zinc-400">{t('settings.landing.whatsappHint')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['instagram', 'tiktok', 'facebook', 'youtube', 'website'] as const).map((platform) => (
                  <div key={platform}>
                    <label className="text-xs text-zinc-500 mb-1 block capitalize">{platform}</label>
                    <input
                      type="text"
                      value={social[platform] ?? ''}
                      onChange={(e) => setSocial({ ...social, [platform]: e.target.value })}
                      placeholder={platform === 'instagram' || platform === 'tiktok' ? '@username' : 'https://...'}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </div>
        </div>
      </div>

      <ConfirmChangesModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSave}
        changes={collectChanges(
          detectScalarChange(t('settings.landing.tagline'), initialRef.current?.landing_tagline ?? '', tagline),
          detectScalarChange(t('settings.landing.about'), initialRef.current?.landing_about ?? '', about),
          detectScalarChange(t('settings.landing.ctaText'), initialRef.current?.landing_cta_text ?? '', ctaText),
          detectScalarChange(t('settings.landing.whatsapp'), initialRef.current?.whatsapp_number ?? '', whatsapp),
        )}
        isLoading={updateSettings.isPending}
      />
    </div>
  );
```

Key changes from original:
- Outer wrapper is `<div>` containing the flex layout + modal (modal must be outside flex)
- Added `<SectionNav>` as the left column
- Content area wrapped in `<div className="flex-1 min-w-0 space-y-6">`
- Each `<Card>` gets an `id` attribute matching the SectionNav ids
- `<SectionIllustration>` added after each section's `h3` heading (except Status which has no illustration)
- All form fields, handlers, and ConfirmChangesModal are identical to original

Note: The `Card` component accepts `...props` (spread onto the div), so `id` will be passed through to the DOM element. Verify this by checking `src/components/ui/card.tsx` — it uses `React.HTMLAttributes<HTMLDivElement>`.

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Verify dev server renders correctly**

Run: `cd sinaloka-platform && npm run dev`

Open `http://localhost:3000/settings?tab=landing` and verify:
- Desktop: sidebar visible on left, content on right
- Clicking sidebar items scrolls to the correct section
- Active section highlights in sidebar while scrolling
- Illustrations appear above each section's form fields
- Completion dots show green/amber correctly
- Mobile: resize browser < 768px, horizontal pills appear at top
- Save button and ConfirmChangesModal still work

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx
git commit -m "feat(platform): refactor LandingTab to two-column layout with sidebar nav and illustrations"
```

---

### Task 5: Build verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd sinaloka-platform && npm run lint`
Expected: No errors

- [ ] **Step 2: Run production build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit any fixes if needed**

If build reveals issues, fix and commit:

```bash
git add -A sinaloka-platform/src/pages/Settings/tabs/
git commit -m "fix(platform): resolve build issues in landing settings refactor"
```
