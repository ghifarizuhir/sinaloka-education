# Sinaloka Landing Page — Notion-Style Redesign

## Overview

Redesign the Sinaloka landing page from its current warm/playful aesthetic to a clean, Notion-inspired design. The page keeps all 10 existing sections but restyles them with extreme whitespace, minimal decoration, and a single teal accent color. Simultaneously refactor the monolithic 1,272-line `App.tsx` into separate component files.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Direction | Notion clean + teal accent |
| Typography | Plus Jakarta Sans (Google Fonts, weights 400–800) |
| Sections | Same 10 sections, restyled |
| Primary CTA | WhatsApp everywhere |
| Hero layout | Centered text + pill badge + product screenshot below |
| Color palette | White (#FAFAFA) bg, near-black (#111) text, teal (#0d9488) accent |
| Animation | Subtle fade+slide on scroll entry only |
| Code structure | Split into component files |

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#FFFFFF` | Page background (pure white) |
| `text-primary` | `#111111` | Headings |
| `text-secondary` | `#666666` | Body text |
| `text-tertiary` | `#999999` | Captions, labels |
| `accent` | `#0d9488` (teal-600) | CTAs, badges, highlights |
| `accent-light` | `#f0fdfa` | Badge backgrounds, hover states |
| `accent-border` | `#ccfbf1` | Badge borders, subtle accents |
| `border` | `#E5E5E5` | Dividers, card borders |
| `surface` | `#F8F8F8` | Card backgrounds, code blocks |
| `dark-section` | `#111111` | Problem section, Final CTA backgrounds |
| `dark-section-text` | `#FAFAFA` | Text on dark sections |

## Typography

- **Font**: Plus Jakarta Sans (variable, 400–800)
- **Hero heading**: 64px / 800 weight / -0.02em tracking / 1.1 line-height
- **Section heading**: 40px / 700 weight / -0.01em tracking / 1.2 line-height
- **Subheading**: 20px / 500 weight / 1.6 line-height / text-secondary color
- **Body**: 16px / 400 weight / 1.7 line-height / text-secondary color
- **Label/Badge**: 12px / 500 weight / uppercase / 1px letter-spacing / accent color
- **Nav links**: 14px / 500 weight / text-secondary color

## Section-by-Section Design

### 1. Navbar

- Sticky top, white background, subtle bottom border on scroll (`border-b border-[#E5E5E5]`)
- Backdrop blur (`backdrop-blur-md`) when scrolled
- Left: "Sinaloka" text-only logo (Plus Jakarta Sans, 700 weight, text-primary). Drop the teal icon box from current design — text only.
- Center/Right: 4 nav links (Fitur, Hasil, Harga, FAQ) + WhatsApp CTA button (teal bg, white text, rounded-lg)
- Mobile: hamburger menu, full-screen overlay with links
- Max-width container: `max-w-6xl mx-auto`
- Height: 64px

### 2. Hero

- Centered layout, max-width 720px for text content
- Top: Pill badge (`bg-accent-light border border-accent-border rounded-full px-4 py-1`) — "Platform Manajemen Bimbel #1"
- Heading: 64px, centered, 800 weight
- Subheading: 18px, text-secondary, max-width 480px, centered
- CTA row: WhatsApp button (teal, with WA icon) + "Lihat Fitur" ghost button (border only)
- Below CTAs: Product screenshot in a card frame (`bg-white border rounded-xl shadow-lg p-4`), max-width 960px
- Screenshot: use a placeholder for now — a white card frame with a light gray interior (`bg-[#F8F8F8] rounded-lg`) containing centered text "Dashboard Preview". Dimensions: full-width of container, aspect ratio ~16:9. Real screenshot can be swapped in later.
- Section padding: `py-24 lg:py-32`
- **Remove**: floating stat cards, decorative shapes, radial gradients, SVG connecting lines

### 3. Problem Section

- Dark background (`bg-[#111]` with white text) — keep the contrast
- **Remove**: diagonal clip-paths (use straight edges)
- Centered section heading + subheading
- 6 pain point cards in a 2-column grid (3 rows) on lg / 1-column on mobile
- Card style: semi-transparent white border (`border border-white/10`), `bg-white/5` background
- Each card: emoji icon + title (white, 600 weight) + description (text-white/70)
- **Remove**: sticky left heading layout, grid pattern background
- Section padding: `py-24 lg:py-32`

### 4. Features Section

- White background
- Centered section heading + subheading at top
- 3x2 grid of feature cards (lg) / 1-column (mobile)
- Card style: `bg-[#F8F8F8] rounded-xl p-8 border border-[#E5E5E5]`
- Each card: Lucide icon (teal, 24px) + title (18px, 600 weight) + description (text-secondary)
- One highlighted card (Pembayaran & Gaji): `bg-teal-600 text-white` with appropriate icon/text colors
- **Remove**: bento grid with mixed spans, sticky left sidebar layout
- Section padding: `py-24 lg:py-32`

### 5. How It Works

- Light surface background (`bg-[#F8F8F8]`)
- Centered heading + subheading
- 3 step cards in a row with step numbers
- Each card: Step number displayed as a small teal pill (`bg-accent-50 text-accent-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`) + Lucide icon (teal, 24px) below + title + description
- Thin connecting line between steps (horizontal, `border-t border-dashed border-[#E5E5E5]`) — desktop only, positioned at the center of the step number pills
- Cards: white background, border, rounded-xl, generous padding (`p-8`)
- Section padding: `py-24 lg:py-32`

### 6. Outcome Metrics

- White background
- Centered heading + subheading
- 4 metric cards in a row (lg) / 2x2 (md) / 1-column (mobile)
- First card highlighted: `bg-teal-600 text-white`
- Other cards: `bg-white border border-[#E5E5E5] rounded-xl`
- Each card: large number (36px, 800 weight) + label (14px, text-secondary)
- Section padding: `py-24 lg:py-32`

### 7. Pricing

- White background
- Centered heading + subheading
- 3 pricing cards in a row
- Card style: `bg-white border border-[#E5E5E5] rounded-xl p-8`
- Highlighted card (Professional): `border-2 border-teal-600` + teal "Populer" badge, subtle shadow
- Features list with teal checkmark icons
- WhatsApp CTA button on each card (all three cards include the WA icon in the button)
- **Remove**: offset margin on highlighted card, dark bg card, glow effects
- Section padding: `py-24 lg:py-32`

### 8. FAQ

- White background
- Centered heading + subheading at top
- Single-column accordion, max-width 720px centered
- Each item: clean border-bottom, question (16px, 600 weight) + chevron
- Open state: question text turns teal, chevron rotates, answer slides down
- **Remove**: sticky left heading, split layout
- Section padding: `py-24 lg:py-32`

### 9. Final CTA

- Dark background (`bg-[#111]`)
- Centered layout, max-width 640px
- Large heading (white, 40px, 700 weight)
- Subheading (white/70)
- WhatsApp CTA button (teal)
- 3 benefit items below (icon + text, white/70)
- **Remove**: decorative blur effects
- Section padding: `py-24 lg:py-32`

### 10. Footer

- `bg-[#FAFAFA]` with `border-t border-[#E5E5E5]`
- 4-column grid: logo/tagline + Produk + Perusahaan + Legal
- All text uses dark colors (text-primary for headings, text-secondary for links) — inverted from the current dark footer
- Link style: text-secondary, hover:text-primary
- Bottom: copyright + social links (keep as `#` placeholder hrefs for now)
- Section padding: `py-16`

### 11. Floating WhatsApp Button

- Fixed bottom-right, appears after scroll > 400px
- Teal circle with white WA icon
- Subtle shadow, scale animation on appear
- Pulse animation removed — keep it clean
- `z-50`

## Animation Approach

- **Keep**: `Reveal` component for scroll-triggered fade+slide (200-400ms, ease-out)
- **Keep**: Motion for navbar mobile menu (AnimatePresence)
- **Keep**: FAQ accordion expand/collapse
- **Keep**: Floating WA button appear/disappear (spring animation)
- **Remove**: floating Shape decorations, parallax scroll transforms, grain overlay, wa-glow, wa-pulse, diagonal clip-paths
- **Easing**: `[0.22, 1, 0.36, 1]` (keep existing cubic-bezier)

## File Structure

```
sinaloka-landing/src/
├── App.tsx                    # Layout shell, composes sections
├── main.tsx                   # Entry (unchanged)
├── index.css                  # Tailwind v4 theme config
├── components/
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── ProblemSection.tsx
│   ├── FeaturesSection.tsx
│   ├── HowItWorks.tsx
│   ├── OutcomeMetrics.tsx
│   ├── Pricing.tsx
│   ├── FAQ.tsx
│   ├── FinalCTA.tsx
│   ├── Footer.tsx
│   ├── FloatingWhatsApp.tsx
│   └── shared/
│       ├── Reveal.tsx         # Scroll animation wrapper
│       └── WhatsAppIcon.tsx   # WhatsApp SVG icon
└── lib/
    └── constants.ts           # WA number, nav links, feature data, pricing tiers, FAQ items
```

### constants.ts data

Extract from App.tsx into typed constants:
- `WHATSAPP_NUMBER` and `WHATSAPP_URL` (with pre-filled message)
- `NAV_LINKS` array
- `PAIN_POINTS` array (emoji, title, description)
- `FEATURES` array (icon component, title, description, highlighted flag)
- `STEPS` array (number, icon, title, description)
- `METRICS` array (value, label, highlighted flag)
- `PRICING_TIERS` array (name, price, features list, highlighted flag)
- `FAQ_ITEMS` array (question, answer)
- `FOOTER_LINKS` object (produk, perusahaan, legal arrays)
- `SOCIAL_LINKS` array

## Tailwind Theme (index.css)

Replace the current OKLch warm/brand palette with:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;

  --color-accent-50: #f0fdfa;
  --color-accent-100: #ccfbf1;
  --color-accent-200: #99f6e4;
  --color-accent-300: #5eead4;
  --color-accent-400: #2dd4bf;
  --color-accent-500: #14b8a6;
  --color-accent-600: #0d9488;
  --color-accent-700: #0f766e;
  --color-accent-800: #115e59;
  --color-accent-900: #134e4a;
  --color-accent-950: #042f2e;
}
```

Note: `@tailwindcss/vite` is a Vite plugin registered in `vite.config.ts`, NOT a CSS plugin — do not add `@plugin` for it in CSS.

**Preserve these `@layer base` rules** (update font token):
```css
@layer base {
  html { scroll-behavior: smooth; }
  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::selection {
    background: var(--color-accent-100);
    color: var(--color-accent-900);
  }
}
```

**Color migration map** (old → new):
- `bg-brand-*` / `text-brand-*` → `bg-accent-*` / `text-accent-*`
- `bg-warm-*` / `text-warm-*` → standard Tailwind neutrals or hardcoded values
- `bg-wa` / `text-wa` → `bg-accent-600` / `text-accent-600`
- `bg-wa-dark` / `text-wa-dark` → `bg-accent-700` / `text-accent-700`
- `font-display` → `font-sans` (single font family, no display font)
- `font-body` → `font-sans` (single font family)

Drop all `brand-*`, `warm-*`, and `wa-*` custom colors. Drop `--font-display` and `--font-body` theme tokens. Drop custom animation keyframes for `float-slow`, `float-slower`, `float-slowest`, `wa-pulse`. Drop `.grain`, `.diagonal-top`, `.diagonal-bottom` utilities. Drop `.wa-glow` — WhatsApp buttons use flat teal background with no glow or shadow effects.

## Dependencies

No changes to dependencies. Keep:
- `motion` (Framer Motion v12) — for Reveal, navbar, FAQ, floating button
- `lucide-react` — for all icons
- `react`, `react-dom`, `tailwindcss`, `@tailwindcss/vite`, `vite`

## Google Fonts

Update `index.html` to load Plus Jakarta Sans instead of Instrument Serif + Bricolage Grotesque:

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

## What's NOT Changing

- WhatsApp as primary CTA pattern (number, pre-filled messages)
- All Indonesian copy/text content
- Mobile-first responsive approach
- 10-section page structure
- Core feature list and pricing tiers
- FAQ content
- Motion library usage for animations
- Lucide icon library
- Vite + React + TypeScript stack

## Success Criteria

1. Landing page renders with Notion-clean aesthetic: white bg, teal accent, Plus Jakarta Sans
2. All 10 sections present and functional
3. App.tsx is under 50 lines (composition only)
4. Each section is its own component file
5. Shared data lives in `constants.ts`
6. All WhatsApp links work correctly
7. Responsive: looks good on mobile (375px), tablet (768px), and desktop (1280px+)
8. Scroll animations work (fade+slide via Reveal)
9. Navbar sticky with backdrop blur on scroll
10. FAQ accordion expands/collapses smoothly
11. Floating WA button appears after scroll > 400px
12. `npm run build` passes with no errors
13. `npm run lint` passes (ESLint)
14. `tsc --noEmit` passes (TypeScript type check)
