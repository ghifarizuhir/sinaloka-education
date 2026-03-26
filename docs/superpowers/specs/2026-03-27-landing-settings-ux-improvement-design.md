# Landing Page Settings UX Improvement

**Date:** 2026-03-27
**Scope:** Frontend only (sinaloka-platform)
**Impact domain:** User-facing UX → Medium scope

## Problem

The Landing tab in admin Settings has two UX issues:

1. **Form terlalu panjang** — 6 card sections stacked vertically require excessive scrolling. No way to jump between sections.
2. **Kurang intuitif** — Admin doesn't understand what each section looks like on the actual landing page. No visual context for the form fields they're filling in.

## Solution

Refactor LandingTab from a single-column vertical form into a **two-column layout** with:
- **Left:** Sticky sidebar navigation with section links and completion indicators
- **Right:** Form sections, each prefixed with a static illustration showing where the section appears on the landing page

## Detailed Design

### 1. Layout Structure

```
┌──────────────────────────────────────────────────┐
│  Landing Page Settings                           │
├────────┬─────────────────────────────────────────┤
│ Sidebar│  Section Cards (scrollable)             │
│ (sticky│                                         │
│  200px)│  ┌─────────────────────────────────┐    │
│        │  │ 🌐 Status                       │    │
│ [●] Sta│  │ Toggle + URL                    │    │
│ [●] Her│  └─────────────────────────────────┘    │
│ [○] Abo│                                         │
│ [●] Fea│  ┌─────────────────────────────────┐    │
│ [○] Gal│  │ 🏠 Hero                         │    │
│ [●] Con│  │ ┌─ illustration ──────────────┐ │    │
│        │  │ │  visual hint of hero section│ │    │
│        │  │ └─────────────────────────────┘ │    │
│        │  │ Tagline: [___________] 0/200    │    │
│        │  │ CTA:     [___________]          │    │
│        │  └─────────────────────────────────┘    │
│        │                                         │
│        │  ┌─────────────────────────────────┐    │
│        │  │ 📝 About                        │    │
│        │  │ ...                              │    │
│        │  └─────────────────────────────────┘    │
│        │                ... more sections        │
├────────┴─────────────────────────────────────────┤
│                              [Save Changes]      │
└──────────────────────────────────────────────────┘
```

**Desktop (≥768px):** Two-column layout as shown above.
**Mobile (<768px):** Sidebar collapses into a horizontal scrollable pill-tab bar, sticky at the top of the section content.

### 2. Sidebar Navigation (SectionNav)

A new `SectionNav` component renders a sticky sidebar with:

**Items (in order matching the landing page):**

| Key | Icon | Label | Completion logic |
|-----|------|-------|------------------|
| `status` | Globe | Status | Always filled (has toggle) |
| `hero` | Layout | Hero | `tagline` or `cta_text` is non-empty |
| `about` | FileText | About | `about` is non-empty |
| `features` | Star | Features | `features.length > 0` |
| `gallery` | Image | Gallery | `gallery.length > 0` |
| `contact` | Phone | Contact | `whatsapp` or any social link is non-empty |

**Behavior:**
- Click an item → `document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' })` with offset for sticky elements
- Active section tracked via `IntersectionObserver` on each section card, updating which sidebar item is highlighted
- Completion indicator: small colored dot (green = filled, amber = empty) next to each label

**Mobile variant:**
- Horizontal flex row with `overflow-x: auto`, each item as a pill/chip
- Sticky at top (`sticky top-0 z-10`)
- Active pill gets primary color background

### 3. Static Illustrations (SectionIllustration)

A reusable `SectionIllustration` component that renders a visual hint block above the form fields of each section.

**Structure per section:**
```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐    │
│  │     SVG / CSS illustration   │    │
│  │  showing this section's      │    │
│  │  position on landing page    │    │
│  └──────────────────────────────┘    │
│  💡 "This section appears as the     │
│      main banner at the top of       │
│      your landing page"              │
└──────────────────────────────────────┘
```

**Implementation:** Pure CSS/Tailwind wireframe illustrations (no external images needed). Each illustration is a simplified wireframe of the landing page with the relevant section highlighted. Built with divs and Tailwind classes.

**Illustration content per section:**

| Section | Illustration | Caption |
|---------|-------------|---------|
| Hero | Wireframe: colored banner at top with logo placeholder, text lines, button | "Banner utama di bagian atas landing page. Pengunjung melihat ini pertama kali." |
| About | Wireframe: full page with "about" section highlighted in middle | "Deskripsi institusi yang tampil di tengah halaman." |
| Features | Wireframe: 2×2 grid of feature cards highlighted | "Keunggulan institusi ditampilkan sebagai kartu fitur." |
| Gallery | Wireframe: image grid highlighted | "Galeri foto ditampilkan sebagai grid gambar." |
| Contact | Wireframe: contact section + social icons at bottom | "Informasi kontak dan sosial media di bagian bawah." |

Status section does not need an illustration (it's just a toggle + URL).

### 4. File Changes

| File | Change |
|------|--------|
| `pages/Settings/tabs/LandingTab.tsx` | Refactor to 2-column layout. Add `id` attributes to each section card for scroll targeting. Wrap content in responsive grid. Add IntersectionObserver logic. |
| `pages/Settings/tabs/components/SectionNav.tsx` | **New.** Sticky sidebar with section items, active tracking, completion dots. Mobile pill variant. |
| `pages/Settings/tabs/components/SectionIllustration.tsx` | **New.** Renders CSS wireframe illustration + caption for a given section key. |
| `FeatureRepeater.tsx` | No changes. |
| `GalleryUploader.tsx` | No changes. |

### 5. Out of Scope

- No live/dynamic preview rendering
- No backend API changes
- No Prisma schema changes
- No changes to the public landing page
- New i18n keys needed for illustration captions — add under `settings.landing.hints.*` namespace (e.g., `settings.landing.hints.hero`, `settings.landing.hints.about`, etc.)
