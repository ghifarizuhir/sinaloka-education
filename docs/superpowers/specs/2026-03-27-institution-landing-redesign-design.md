# Institution Landing Page Redesign — Bold Geometric

**Date:** 2026-03-27
**Scope:** Frontend-only redesign of `sinaloka-platform/src/pages/public/` components
**Direction:** Bold Geometric — energik, percaya diri, modern, light theme

## Context

PR #107 added per-institution landing pages served at `{slug}.sinaloka.com`. The current implementation is functional but visually flat — all sections use identical `bg-zinc-900 border-zinc-800` dark cards with uniform `fadeInUp` animations, creating a "list of data" feel rather than a landing page that sells.

This redesign transforms the visual presentation while keeping the exact same data model and backend API.

## Constraints

- **No data model changes** — same fields, same API, same settings tab
- **Light theme only** — all institutions get a light background
- **No navbar** — single-page, short enough to just scroll
- **Target audience:** Mixed — parents (SD/SMP) and students (SMA)
- **Brand color:** Each institution's `brand_color` is the primary accent throughout
- **Tech stack:** Same — React, Tailwind, Motion (Framer), Lucide icons

## Design System

### Color Strategy
- Page background: `white` alternating with `#F9FAFB` (off-white) between sections
- Primary accent: institution's `brand_color` (fallback `#14b8a6`)
- Text: `gray-900` (headings), `gray-600` (body), `gray-400` (secondary)
- Brand tints: `brand_color` at various opacities (`/5`, `/10`, `/15`, `/20`) for backgrounds

### Typography
- Keep existing font stack (inherits from platform's Tailwind config)
- Headings: `font-bold` to `font-extrabold`
- Section headings: `text-2xl` to `text-3xl`

### Signature Elements (Bold Geometric identity)
- **Geometric circles:** Decorative border-only circles (semi-transparent) in hero and footer CTA — provides texture and personality
- **Left border accent:** `4px solid brand_color` on feature cards — consistent visual marker
- **Overlapping stats bar:** Stats pulled up to overlap hero bottom — creates visual connection between sections
- **Inverted CTA buttons:** `bg-white text-brand_color` on colored backgrounds, `bg-brand_color text-white` on white backgrounds

### Animations
- Continue using `motion/react` (Framer Motion)
- `fadeInUp` with staggered delays for lists
- Gallery images: `hover:scale-105` with smooth transition
- WhatsApp FAB: pulse ring animation

## Section-by-Section Spec

### 1. Hero

```
Background:     brand_color (full)
                Subtle gradient overlay: slightly darker at top for depth
Decorative:     2-3 geometric circles (border-only, white/15) positioned
                at top-right and bottom-left, varying sizes (120-200px)
Layout:         Centered, vertical stack
Content:
  - Logo:       w-16 h-16, rounded-xl, glassmorphism container
                (bg-white/20, backdrop-blur, ring-2 ring-white/30)
                Image if logo_url, else letter fallback with same style
  - Name:       text-3xl sm:text-4xl font-extrabold text-white tracking-tight
  - Tagline:    text-lg text-white/80 max-w-xl text-center leading-relaxed
                Falls back to `description` if no tagline
  - CTA:        bg-white text-brand_color font-bold px-8 py-3.5 rounded-xl
                Only shown if registration_enabled
                shadow-lg hover:shadow-xl transition
Padding:        py-20 px-6, min-h-[50vh] flex items-center justify-center
Animation:      Staggered fadeInUp (logo → name → tagline → CTA)
```

### 2. Stats (overlapping hero)

```
Position:       -mt-8 relative z-10 (overlaps hero bottom)
Container:      mx-6 sm:mx-auto max-w-md
Layout:         3 connected cells in one bar
                Left cell: rounded-l-xl
                Right cell: rounded-r-xl
                Middle: no rounding
Styling:        bg-white, shadow-lg (0 4px 12px rgba(0,0,0,0.06))
                border: 1px solid gray-100
Content:        Number in text-2xl sm:text-3xl font-bold text-gray-900
                Label in text-xs text-gray-500 uppercase tracking-wide font-semibold
Animation:      fadeInUp as single unit
```

### 3. Features

```
Background:     white
Padding:        py-16 px-6
Heading:        "section heading style" — text-2xl font-bold text-gray-900
                centered, mb-10
Layout:         grid grid-cols-1 sm:grid-cols-2 gap-4, max-w-2xl mx-auto
Card:           bg-brand_color/5 rounded-xl p-6
                border-left: 4px solid brand_color
Content:
  - Icon:       w-10 h-10 rounded-lg bg-brand_color/15
                Lucide icon rendered at size 20, color brand_color
                Fallback "?" if icon name not found
  - Title:      font-semibold text-gray-900 mb-1
  - Desc:       text-sm text-gray-600 leading-relaxed
Returns null if no features
Animation:      Staggered fadeInUp per card
```

### 4. Subjects

```
Background:     #F9FAFB (off-white)
Padding:        py-16 px-6
Heading:        same section heading style, centered
Layout:         flex flex-wrap justify-center gap-3, max-w-2xl mx-auto
Pill:           bg-white border-2 border-brand_color/20 rounded-full
                px-4 py-2 text-sm text-gray-700 font-medium
                hover:bg-brand_color/10 transition
Returns null if empty
Animation:      Staggered fadeInUp per pill
```

### 5. About

```
Background:     white
Padding:        py-16 px-6
Container:      max-w-2xl mx-auto
Layout:         Desktop (sm+): 2 columns — left heading, right text
                Mobile or short text (<100 chars): centered single column
Left:           "Tentang Kami" text-2xl font-bold text-gray-900
                Decorative line below: w-16 h-1 bg-brand_color rounded-full mt-3
Right:          text-gray-600 leading-relaxed whitespace-pre-line
Returns null if no text
Animation:      fadeInUp for each column
```

### 6. Gallery

```
Background:     #F9FAFB (off-white)
Padding:        py-16 px-6
Heading:        same section heading style, centered
Container:      max-w-2xl mx-auto
Layout:         Bento grid — grid-cols-3 (mobile: grid-cols-2)
                First image: col-span-2 row-span-2, aspect-[16/10]
                Remaining: aspect-square
                Edge cases:
                  1 image  → single image, full width, aspect-[16/10]
                  2 images → first large (col-span-2), second square
                  3+ images → bento layout as described
Card:           rounded-xl overflow-hidden
Image:          object-cover, w-full h-full
Hover:          scale-105 transition-transform duration-300
Caption:        On hover — overlay at bottom with gradient (transparent → black/50)
                text-white text-xs px-3 py-2, translate-y from below
Returns null if no images
Animation:      Staggered fadeInUp per image
```

### 7. Contact + Social

```
Background:     white
Padding:        py-16 px-6
Heading:        same section heading style, centered
Container:      max-w-2xl mx-auto

Contact cards:
  Layout:       grid grid-cols-1 sm:grid-cols-3 gap-4
  Card:         bg-brand_color/5 rounded-xl p-4
                flex items-center gap-3
  Icon:         Lucide icon (Mail/Phone/MapPin), size 18, color brand_color
  Text:         text-sm text-gray-700 break-all
  Clickable:    email → mailto, phone → tel
                hover:bg-brand_color/10 transition

Social links:
  Layout:       flex justify-center gap-3, mt-8
  Button:       w-10 h-10 rounded-full bg-gray-100
                flex items-center justify-center
                text-gray-500
                hover:bg-brand_color hover:text-white transition-colors
  Icons:        Same inline SVGs as current (Instagram, TikTok, Facebook, YouTube)
                + website link with Globe icon from Lucide

Returns null if no contact and no social data
Animation:      fadeInUp for contact grid, then social row
```

### 8. Footer CTA

```
Background:     brand_color (full) — bookend with hero
Decorative:     Geometric circles again (same style as hero, different positions)
Padding:        py-20 px-6
Layout:         centered, max-w-2xl
Content:
  - Heading:    text-3xl font-bold text-white
                Uses landing_cta_text or i18n "Ready?" fallback
  - Subtitle:   text-white/70 mb-8
  - CTA:        bg-white text-brand_color font-bold rounded-xl
                px-8 py-3.5 shadow-lg
                Only if registration_enabled
  - Powered by: mt-16, flex items-center justify-center gap-1.5
                SinalokaLogo size 14 + text-xs text-white/40
Animation:      Staggered fadeInUp
```

### 9. WhatsApp FAB

```
Position:       fixed bottom-6 right-6 z-50
Button:         w-14 h-14 rounded-full bg-green-500
                shadow-lg hover:shadow-xl
                flex items-center justify-center
Icon:           WhatsApp SVG, white, w-7 h-7
Pulse:          Animated ring behind button
                @keyframes: scale 1→1.4, opacity 0.6→0
                ring: absolute inset-0 rounded-full bg-green-500/30
                animation: pulse 2s ease-out infinite
Tooltip:        On hover: small label "Chat WhatsApp" appears above
                bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg
                fade in with slight translate-y
Phone:          Normalize leading 0 → 62 (same as current)
Returns null if no number
```

## Migration Notes

- All changes are in `sinaloka-platform/src/pages/public/components/`
- `LandingPage.tsx` wrapper stays the same (section order, data flow, null-returns)
- No new dependencies needed — Motion, Lucide, Tailwind already available
- Remove dark theme classes (`bg-zinc-950`, `text-zinc-100`, `border-zinc-800`, `bg-zinc-900`) from all components
- `brand_color` usage pattern stays the same (inline `style={{ backgroundColor }}` with opacity via hex suffix)

## Files Changed

| File | Action |
|------|--------|
| `src/pages/public/LandingPage.tsx` | Update wrapper: remove `bg-zinc-950 text-zinc-100` |
| `src/pages/public/components/LandingHero.tsx` | Full rewrite — Bold Geometric hero |
| `src/pages/public/components/LandingStats.tsx` | Rewrite — overlapping bar style |
| `src/pages/public/components/LandingFeatures.tsx` | Rewrite — left-border cards, light bg |
| `src/pages/public/components/LandingSubjects.tsx` | Rewrite — pills on off-white |
| `src/pages/public/components/LandingAbout.tsx` | Rewrite — 2-column layout |
| `src/pages/public/components/LandingGallery.tsx` | Rewrite — bento grid, hover effects |
| `src/pages/public/components/LandingContact.tsx` | Rewrite — brand-tinted cards, social hover |
| `src/pages/public/components/LandingFooterCTA.tsx` | Rewrite — full-color footer, geometric |
| `src/pages/public/components/WhatsAppFAB.tsx` | Rewrite — green, pulse, tooltip |
