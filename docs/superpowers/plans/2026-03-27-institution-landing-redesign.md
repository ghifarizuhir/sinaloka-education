# Institution Landing Page Redesign — Bold Geometric

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the per-institution landing page (`{slug}.sinaloka.com`) from dark/flat to a Bold Geometric light theme with strong visual hierarchy.

**Architecture:** Pure frontend component rewrites in `sinaloka-platform/src/pages/public/`. No backend, API, or data model changes. Each component receives the same props, returns null for empty data. Brand color applied via inline styles with hex opacity suffixes.

**Tech Stack:** React 19, Tailwind CSS v4, Motion (Framer Motion), Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-27-institution-landing-redesign-design.md`

---

## File Map

All files under `sinaloka-platform/src/pages/public/`:

| File | Action | Responsibility |
|------|--------|----------------|
| `LandingPage.tsx` | Modify | Remove dark bg classes from wrapper |
| `components/LandingHero.tsx` | Rewrite | Bold Geometric hero with brand_color bg, geometric circles, glassmorphism logo |
| `components/LandingStats.tsx` | Rewrite | Overlapping white bar with 3 connected cells |
| `components/LandingFeatures.tsx` | Rewrite | Left-border accent cards on white bg |
| `components/LandingSubjects.tsx` | Rewrite | Pill badges on off-white bg |
| `components/LandingAbout.tsx` | Rewrite | 2-column layout (heading left, text right) |
| `components/LandingGallery.tsx` | Rewrite | Bento grid with hover zoom + caption overlay |
| `components/LandingContact.tsx` | Rewrite | Brand-tinted contact cards + social hover |
| `components/LandingFooterCTA.tsx` | Rewrite | Full brand_color bg with geometric circles |
| `components/WhatsAppFAB.tsx` | Rewrite | Green FAB with pulse ring + tooltip |

---

### Task 1: LandingPage wrapper + LandingHero + LandingStats

**Files:**
- Modify: `sinaloka-platform/src/pages/public/LandingPage.tsx`
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingHero.tsx`
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingStats.tsx`

- [ ] **Step 1: Update LandingPage wrapper**

In `sinaloka-platform/src/pages/public/LandingPage.tsx`, change the wrapper div from dark to light:

```tsx
// Change this line:
<div className="min-h-screen bg-zinc-950 text-zinc-100">

// To:
<div className="min-h-screen bg-white text-gray-900">
```

- [ ] **Step 2: Rewrite LandingHero**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingHero.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import type { LandingPageData } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface LandingHeroProps {
  data: LandingPageData;
}

export function LandingHero({ data }: LandingHeroProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const tagline = data.landing_tagline ?? data.description;
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');

  return (
    <section
      className="relative min-h-[50vh] flex items-center justify-center px-6 py-20 overflow-hidden"
      style={{ backgroundColor: brandColor }}
    >
      {/* Gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent 40%, transparent)',
        }}
      />

      {/* Geometric decorative circles */}
      <div
        className="absolute -top-10 -right-10 w-[200px] h-[200px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
      />
      <div
        className="absolute top-20 -right-16 w-[120px] h-[120px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      />
      <div
        className="absolute -bottom-16 -left-8 w-[160px] h-[160px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
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
              className="w-16 h-16 rounded-xl object-cover shadow-2xl ring-2 backdrop-blur"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                ringColor: 'rgba(255,255,255,0.3)',
              }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center shadow-2xl text-2xl font-bold backdrop-blur ring-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                ringColor: 'rgba(255,255,255,0.3)',
              }}
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        {/* Institution name */}
        <motion.h1
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4"
        >
          {data.name}
        </motion.h1>

        {/* Tagline */}
        {tagline && (
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg max-w-xl leading-relaxed mb-8"
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
              className="font-bold sm:min-w-[160px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
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

- [ ] **Step 3: Rewrite LandingStats**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingStats.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

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
}

export function LandingStats({ stats, brandColor }: LandingStatsProps) {
  const { t } = useTranslation();

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
      <div
        className="flex bg-white border border-gray-100 overflow-hidden"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderRadius: '0.75rem' }}
      >
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              'flex-1 text-center py-5 px-3',
              i < items.length - 1 && 'border-r border-gray-100'
            )}
          >
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {item.value}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 4: Verify build passes**

```bash
cd sinaloka-platform && npm run lint
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/public/LandingPage.tsx \
       sinaloka-platform/src/pages/public/components/LandingHero.tsx \
       sinaloka-platform/src/pages/public/components/LandingStats.tsx
git commit -m "feat(platform): redesign institution landing hero + stats (Bold Geometric)"
```

---

### Task 2: LandingFeatures + LandingSubjects

**Files:**
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingFeatures.tsx`
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingSubjects.tsx`

- [ ] **Step 1: Rewrite LandingFeatures**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingFeatures.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { icons, type LucideIcon } from 'lucide-react';
import type { LandingFeature } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFeaturesProps {
  features: LandingFeature[] | null;
  brandColor: string | null;
}

export function LandingFeatures({ features, brandColor }: LandingFeaturesProps) {
  const { t } = useTranslation();

  if (!features || features.length === 0) return null;

  const color = brandColor ?? '#14b8a6';

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-10"
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
                className="rounded-xl p-6"
                style={{
                  backgroundColor: `${color}0d`,
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}26` }}
                  >
                    {Icon ? (
                      <Icon size={20} style={{ color }} />
                    ) : (
                      <span className="text-sm font-bold" style={{ color }}>?</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
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

- [ ] **Step 2: Rewrite LandingSubjects**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingSubjects.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingSubjectsProps {
  subjects: { id: string; name: string }[];
  brandColor: string | null;
}

export function LandingSubjects({ subjects, brandColor }: LandingSubjectsProps) {
  const { t } = useTranslation();

  if (subjects.length === 0) return null;

  const color = brandColor ?? '#14b8a6';

  return (
    <section className="px-6 py-16" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-10"
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
              className="px-4 py-2 rounded-full text-sm text-gray-700 font-medium bg-white transition-colors cursor-default"
              style={{
                border: `2px solid ${color}33`,
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = `${color}1a`;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
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

**Note:** `LandingSubjects` now accepts `brandColor` prop — update the call in `LandingPage.tsx`:

```tsx
// In LandingPage.tsx, change:
<LandingSubjects subjects={data.subjects} />

// To:
<LandingSubjects subjects={data.subjects} brandColor={data.brand_color} />
```

- [ ] **Step 3: Verify build passes**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/public/LandingPage.tsx \
       sinaloka-platform/src/pages/public/components/LandingFeatures.tsx \
       sinaloka-platform/src/pages/public/components/LandingSubjects.tsx
git commit -m "feat(platform): redesign landing features + subjects sections"
```

---

### Task 3: LandingAbout + LandingGallery

**Files:**
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingAbout.tsx`
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingGallery.tsx`

- [ ] **Step 1: Rewrite LandingAbout**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingAbout.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingAboutProps {
  text: string | null;
  brandColor: string | null;
}

export function LandingAbout({ text, brandColor }: LandingAboutProps) {
  const { t } = useTranslation();

  if (!text) return null;

  const color = brandColor ?? '#14b8a6';
  const isShort = text.length < 100;

  if (isShort) {
    return (
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            {t('landingPage.about')}
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="w-16 h-1 rounded-full mx-auto mb-6"
            style={{ backgroundColor: color }}
          />
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-gray-600 leading-relaxed whitespace-pre-line"
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
            <h2 className="text-2xl font-bold text-gray-900">
              {t('landingPage.about')}
            </h2>
            <div
              className="w-16 h-1 rounded-full mt-3"
              style={{ backgroundColor: color }}
            />
          </motion.div>
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-gray-600 leading-relaxed whitespace-pre-line"
          >
            {text}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
```

**Note:** `LandingAbout` now accepts `brandColor` prop — update the call in `LandingPage.tsx`:

```tsx
// In LandingPage.tsx, change:
<LandingAbout text={data.landing_about} />

// To:
<LandingAbout text={data.landing_about} brandColor={data.brand_color} />
```

- [ ] **Step 2: Rewrite LandingGallery**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingGallery.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import type { GalleryImage } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingGalleryProps {
  images: GalleryImage[] | null;
}

export function LandingGallery({ images }: LandingGalleryProps) {
  const { t } = useTranslation();

  if (!images || images.length === 0) return null;

  const sorted = [...images].sort((a, b) => a.order - b.order);

  return (
    <section className="px-6 py-16" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-10"
        >
          {t('landingPage.gallery')}
        </motion.h2>
        <div
          className={cn(
            'grid gap-3',
            sorted.length === 1
              ? 'grid-cols-1'
              : sorted.length === 2
                ? 'grid-cols-2 sm:grid-cols-3'
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
}: {
  image: GalleryImage;
  index: number;
  isFirst: boolean;
  isSingle: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      {...fadeInUp}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      className={cn(
        'relative rounded-xl overflow-hidden group cursor-default',
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

- [ ] **Step 3: Verify build passes**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/public/LandingPage.tsx \
       sinaloka-platform/src/pages/public/components/LandingAbout.tsx \
       sinaloka-platform/src/pages/public/components/LandingGallery.tsx
git commit -m "feat(platform): redesign landing about + gallery sections"
```

---

### Task 4: LandingContact + LandingFooterCTA

**Files:**
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingContact.tsx`
- Rewrite: `sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx`

- [ ] **Step 1: Rewrite LandingContact**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingContact.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import type { LandingPageData } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingContactProps {
  data: LandingPageData;
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

export function LandingContact({ data }: LandingContactProps) {
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
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
          className="text-2xl font-bold text-gray-900 text-center mb-10"
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
                  className="flex items-center gap-3 rounded-xl p-4 transition-colors"
                  style={{ backgroundColor: `${brandColor}0d` }}
                  onMouseOver={(e) => {
                    if (item.href) (e.currentTarget as HTMLElement).style.backgroundColor = `${brandColor}1a`;
                  }}
                  onMouseOut={(e) => {
                    if (item.href) (e.currentTarget as HTMLElement).style.backgroundColor = `${brandColor}0d`;
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
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                  style={{}}
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

- [ ] **Step 2: Rewrite LandingFooterCTA**

Replace entire content of `sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import type { LandingPageData } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFooterCTAProps {
  data: LandingPageData;
}

export function LandingFooterCTA({ data }: LandingFooterCTAProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');

  return (
    <section
      className="relative px-6 py-20 overflow-hidden"
      style={{ backgroundColor: brandColor }}
    >
      {/* Geometric decorative circles */}
      <div
        className="absolute -top-8 -left-8 w-[160px] h-[160px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.12)' }}
      />
      <div
        className="absolute -bottom-12 -right-12 w-[200px] h-[200px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      />
      <div
        className="absolute top-1/2 -right-6 w-[100px] h-[100px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-white mb-3"
        >
          {t('landingPage.ready')}
        </motion.h2>
        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
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
              className="font-bold sm:min-w-[180px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
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

- [ ] **Step 3: Verify build passes**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/public/components/LandingContact.tsx \
       sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx
git commit -m "feat(platform): redesign landing contact + footer CTA sections"
```

---

### Task 5: WhatsAppFAB + Final build verification

**Files:**
- Rewrite: `sinaloka-platform/src/pages/public/components/WhatsAppFAB.tsx`

- [ ] **Step 1: Rewrite WhatsAppFAB**

Replace entire content of `sinaloka-platform/src/pages/public/components/WhatsAppFAB.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface WhatsAppFABProps {
  number: string | null;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WhatsAppFAB({ number }: WhatsAppFABProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  if (!number) return null;

  const normalized = number.startsWith('0')
    ? `62${number.slice(1)}`
    : number;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip */}
      <div
        className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium transition-all duration-200 whitespace-nowrap"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
          pointerEvents: 'none',
        }}
      >
        {t('landingPage.whatsappChat')}
      </div>

      {/* FAB button */}
      <a
        href={`https://wa.me/${normalized}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-14 h-14 rounded-full bg-green-500 shadow-lg hover:shadow-xl flex items-center justify-center text-white transition-shadow"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-green-500/30 animate-[fab-ping_2s_ease-out_infinite]" />

        <WhatsAppIcon className="w-7 h-7 relative z-10" />
      </a>

      <style>{`
        @keyframes fab-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Full build verification**

```bash
cd sinaloka-platform && npm run lint && npm run build
```

Expected: No TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/public/components/WhatsAppFAB.tsx
git commit -m "feat(platform): redesign landing WhatsApp FAB with pulse + tooltip"
```

---

### Task 6: Visual review with Playwright

**Files:** None (visual verification only)

- [ ] **Step 1: Start dev server**

```bash
cd sinaloka-platform && npm run dev &
```

- [ ] **Step 2: Navigate to a test institution landing page**

Use MCP Playwright to navigate to the institution landing page and take a screenshot to verify the Bold Geometric design renders correctly. Check:
- Hero has full brand_color background with geometric circles
- Stats bar overlaps hero bottom with white card
- Features have left-border accent
- Subjects show as pills on off-white
- Gallery uses bento grid
- Contact cards have brand tint
- Footer CTA matches hero style
- WhatsApp FAB is green with pulse

- [ ] **Step 3: Final commit (if any adjustments needed)**

```bash
git add -A sinaloka-platform/src/pages/public/
git commit -m "fix(platform): polish institution landing page redesign"
```
