# Bilingual i18n Design — sinaloka-platform

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Add Indonesian (default) and English language support to sinaloka-platform

## Overview

Add bilingual support to the sinaloka-platform admin dashboard using react-i18next. Default language is Bahasa Indonesia. Language preference is stored in localStorage (browser-level, no backend changes). Users can switch languages via a toggle in the header bar.

## Architecture

### Dependencies

- `i18next` — core i18n framework
- `react-i18next` — React bindings (`initReactI18next` plugin, `useTranslation` hook)

### File Structure

```
src/
  lib/
    i18n.ts              ← i18next initialization + config
    utils.ts             ← updated formatDate() and formatCurrency() with locale param
  locales/
    id.json              ← Bahasa Indonesia translations (default)
    en.json              ← English translations
```

### Initialization (`src/lib/i18n.ts`)

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '../locales/id.json';
import en from '../locales/en.json';

const savedLang = localStorage.getItem('sinaloka-lang') || 'id';

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
});

export default i18n;
```

Using `initReactI18next` plugin means **no explicit `I18nextProvider` wrapper is needed** — the `useTranslation()` hook works globally once initialized.

### App Integration (`src/main.tsx`)

- Import `src/lib/i18n.ts` as side-effect (`import './lib/i18n'`) before app renders
- No provider wrapper needed thanks to `initReactI18next`

### Language Switcher (`src/components/Layout.tsx`)

- Toggle button in header bar, next to dark mode toggle (follow same pattern as existing dark mode toggle)
- Displays `ID` or `EN` as current language indicator
- On click:
  1. Calls `i18n.changeLanguage(newLang)`
  2. Writes to `localStorage.setItem('sinaloka-lang', newLang)`
  3. Updates `document.documentElement.lang = newLang` (accessibility)
- No page reload required — React re-renders via i18next reactivity

## Translation File Structure

Keys organized by feature namespace:

```json
{
  "common": {
    "save": "...",
    "cancel": "...",
    "delete": "...",
    "search": "...",
    "loading": "...",
    "noData": "...",
    "confirm": "...",
    "status": {
      "active": "...",
      "inactive": "..."
    }
  },
  "nav": {
    "dashboard": "...",
    "students": "...",
    "tutors": "...",
    "classes": "...",
    "schedules": "...",
    "enrollments": "...",
    "attendance": "...",
    "finance": "...",
    "settings": "..."
  },
  "dashboard": { ... },
  "students": { ... },
  "tutors": { ... },
  "classes": { ... },
  "schedules": { ... },
  "enrollments": { ... },
  "attendance": { ... },
  "finance": { ... },
  "settings": { ... },
  "login": { ... },
  "notFound": { ... }
}
```

### Key Naming Convention

- Feature namespace as prefix: `students.title`, `nav.dashboard`
- Form labels: `{feature}.form.{field}` — e.g., `students.form.name`, `students.form.email`
- Table headers: `{feature}.table.{column}` — e.g., `students.table.grade`
- Actions: `{feature}.{action}` — e.g., `students.addStudent`, `students.export`
- Toasts: `{feature}.toast.{action}` — e.g., `students.toast.deleteSuccess`
- Modal titles: `{feature}.modal.{name}` — e.g., `students.modal.deleteTitle`

### Interpolation

Dynamic values use i18next interpolation:

```json
{ "deleteSuccess": "{{name}} berhasil dihapus" }
```

```tsx
t('students.toast.deleteSuccess', { name: student.name })
```

### Pluralization

Indonesian does not use grammatical plurals so `id.json` uses flat strings. English translations use i18next plural suffixes where needed:

```json
// en.json
{
  "students": {
    "selected": "{{count}} student selected",
    "selected_plural": "{{count}} students selected"
  }
}
```

## Date & Currency Formatting

### formatDate

Move existing `formatDate()` from Students.tsx → `src/lib/utils.ts` as a shared helper. Accepts locale from caller for React reactivity:

```ts
export function formatDate(dateStr: string | null | undefined, lang: string = 'id'): string {
  if (!dateStr) return '—';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
```

Usage in components (reactive to language changes):

```tsx
const { i18n } = useTranslation();
formatDate(student.enrolled_at, i18n.language);
```

### date-fns Locale Handling

Pages using `date-fns` `format()` (Attendance, Schedules) must pass the correct locale object:

```ts
import { id, enUS } from 'date-fns/locale';

const dateFnsLocale = i18n.language === 'id' ? id : enUS;
format(date, 'EEEE, MMM d, yyyy', { locale: dateFnsLocale });
```

### formatCurrency

Two variants needed:

**Full format** — for payment/payout amounts (used in Finance pages, Classes fee):

```ts
export function formatCurrency(amount: number, lang: string = 'id'): string {
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}
```

**Abbreviated format** — for Dashboard stats (keeps existing `Rp 1.5M` / `Rp 500K` behavior):

```ts
export function formatCurrencyShort(amount: number, lang: string = 'id'): string {
  // Existing Dashboard abbreviation logic, locale-aware number separators
}
```

Both functions accept `lang` parameter from `i18n.language` for React reactivity. Consolidate all `formatCurrency` usages across Dashboard.tsx and Classes.tsx into these shared helpers.

## Migration Scope

### Pages to migrate (14 + layout + components):

| Area | Est. strings | Notes |
|------|-------------|-------|
| Layout/Nav | ~25 | Menu labels, section titles, page title map, search, logout |
| Dashboard | ~35 | Stats, headers, quick actions, activity |
| Students | ~40 | Table, forms, modals, toasts, import modal |
| Tutors | ~30 | Table, invite flow, forms, toasts |
| Classes | ~25 | Forms, subjects, schedule labels |
| Enrollments | ~25 | Status labels, import modal, filters |
| Attendance | ~20 | Status badges, table headers |
| Schedules | ~15 | Calendar labels, status |
| Finance (3 pages) | ~35 | Payment/payout/expense labels |
| Settings | ~30 | Tabs, forms, descriptions |
| Login | ~10 | Form labels, button, error |
| NotFound | ~5 | 404 message |
| ReportPreviewModal | ~5 | Modal content |
| Common/shared | ~20 | Buttons, statuses, confirmations |
| **Total** | **~320** | **Per language** |

### String types to translate:

- UI headings and descriptions
- Form labels and placeholders
- Button text
- Toast messages (success/error) — including fallback strings in API error handlers
- Table column headers
- Modal titles and body text
- Badge/status labels
- Navigation labels and page titles (including the Layout page title map object)
- Filter options and dropdown labels
- Validation messages (client-side)
- `document.title` per page

### NOT translated:

- Backend API error responses (server-side messages)
- Prisma model/field names
- Console logs
- Code comments

## Migration Strategy

Page-by-page extraction:

1. Install dependencies (`i18next`, `react-i18next`)
2. Create `src/lib/i18n.ts` with `initReactI18next` initialization
3. Create `src/locales/id.json` and `src/locales/en.json` with common + nav keys
4. Import i18n in `src/main.tsx` (side-effect import)
5. Add language toggle to `Layout.tsx` header (follow dark mode toggle pattern)
6. Move `formatDate` and `formatCurrency` to `src/lib/utils.ts` with `lang` parameter
7. Consolidate `formatCurrency` usages (Dashboard + Classes) into shared helpers
8. Migrate pages one by one: extract strings → add to both JSON files → replace with `t()` calls
9. Update date-fns `format()` calls to pass locale object
10. Migration order: Layout → Login → Dashboard → Students → Tutors → Classes → Schedules → Enrollments → Attendance → Finance pages → Settings → NotFound → ReportPreviewModal

## Follow-up Concerns

- **E2E tests:** Playwright tests assert on visible text. After migration, tests will need updating to match Indonesian text (default language) or set language to English in test fixtures. Flag as separate task.
- **Bundle size:** Both JSON files (~320 strings each) are small (<15KB total). Static imports via Vite — no async loading needed.

## Constraints

- Default language: `id` (Bahasa Indonesia)
- Storage: localStorage only (key: `sinaloka-lang`)
- No backend changes required
- No lazy loading (two small JSON files bundled statically)
- Currency is always IDR — only number formatting changes by locale
- `document.documentElement.lang` updated on language switch for accessibility
