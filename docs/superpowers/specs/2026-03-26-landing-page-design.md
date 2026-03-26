# Landing Page Feature — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Ref:** `docs/general/landing-page-spec.md` (original business spec)

---

## Summary

Fitur landing page publik untuk setiap institution. Admin bisa mengkustomisasi konten (tagline, about, features, gallery, social links) via Settings tab baru. Pengunjung melihat landing page di root path subdomain (`slug.sinaloka.com/`).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plan gating | Semua plan (termasuk STARTER) | Meningkatkan perceived value dan retention |
| Public endpoint | `GET /institutions/public/:slug/landing` (endpoint baru) | Tidak membebani existing endpoint |
| Gallery storage | Cloudflare R2 dari awal | Railway ephemeral disk tidak viable untuk production |
| Image compression | Server-side via `sharp` (max 1200px, quality 80%, webp) | Hemat storage R2, loading cepat |
| Caching | In-memory cache 5 menit per slug | Simple, zero dependency, cukup untuk traffic awal |
| Phasing | Satu fase (semua fitur sekaligus) | R2 sudah di-frontload, tidak ada alasan split |
| Routing | `/welcome` dihapus, root `/` jadi landing page | Clean, tidak ada duplikasi |
| Architecture | Monolith extension (extend existing modules) | Konsisten dengan codebase, reuse guards/interceptors |

---

## 1. Database Schema

### 1.1 New fields on Institution model

8 field baru langsung di tabel `Institution` (bukan di JSON `settings`), karena:
- Di-query dari public endpoint (efficient SELECT)
- `landing_enabled` perlu jadi kolom real untuk conditional logic
- Konsisten dengan field branding lain (`brand_color`, `background_image_url`)

| Field | Type | Attribute | Keterangan |
|-------|------|-----------|------------|
| `landing_enabled` | `Boolean` | `@default(false)` | Toggle landing publik |
| `landing_tagline` | `String?` | `@db.VarChar(200)` | Headline hero section |
| `landing_about` | `String?` | `@db.Text` | Section "Tentang Kami" |
| `landing_cta_text` | `String?` | `@db.VarChar(50)` | Custom CTA text (default: "Daftar Sekarang") |
| `whatsapp_number` | `String?` | `@db.VarChar(20)` | Nomor WA untuk floating button |
| `landing_features` | `Json?` | `@db.JsonB` | Array keunggulan (max 4) |
| `gallery_images` | `Json?` | `@db.JsonB` | Array foto galeri (max 6) |
| `social_links` | `Json?` | `@db.JsonB` | Object link sosmed |

### 1.2 JSON column shapes

**landing_features** — Array of `LandingFeature`, max 4, full-array replacement:
```typescript
interface LandingFeature {
  id: string;          // UUID, generated client-side
  icon: string;        // Lucide icon name (e.g. 'Users', 'BookOpen')
  title: string;       // Max 50 chars
  description: string; // Max 120 chars
}
```

**gallery_images** — Array of `GalleryImage`, max 6:
```typescript
interface GalleryImage {
  id: string;        // UUID
  url: string;       // R2 public URL
  caption?: string;  // Optional, max 100 chars
  order: number;     // Display order (0-5)
}
```

**social_links** — Flat object:
```typescript
interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
}
```

### 1.3 Migration

```bash
npx prisma migrate dev --name add_landing_page_fields
```

---

## 2. Backend API

### 2.1 Endpoints

| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `GET` | `/institutions/public/:slug/landing` | Public + RateLimit 30/min | Landing data + stats + subjects |
| `GET` | `/settings/landing` | Admin | Get landing settings |
| `PATCH` | `/settings/landing` | Admin | Update landing settings |
| `POST` | `/settings/landing/gallery` | Admin | Upload gallery image → R2 |
| `DELETE` | `/settings/landing/gallery/:imageId` | Admin | Delete gallery image dari R2 |

### 2.2 Public landing endpoint response

```typescript
interface LandingPageResponse {
  // Existing institution fields
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

  // New landing fields
  landing_enabled: boolean;
  landing_tagline: string | null;
  landing_about: string | null;
  landing_cta_text: string | null;
  whatsapp_number: string | null;
  landing_features: LandingFeature[] | null;
  gallery_images: GalleryImage[] | null;
  social_links: SocialLinks | null;

  // Computed (not stored)
  stats: {
    active_students: number;
    active_tutors: number;
    total_subjects: number;
  };

  // From Subject table
  subjects: { id: string; name: string }[];
}
```

Endpoint return data regardless of `landing_enabled` value — frontend handles redirect. Ini supaya admin bisa preview.

### 2.3 Stats computation

Aggregated via `prisma.$transaction` untuk parallel queries:
```typescript
const [institution, activeStudents, activeTutors, subjects] =
  await this.prisma.$transaction([
    this.prisma.institution.findUnique({
      where: { slug, is_active: true },
      select: { /* all landing fields */ },
    }),
    this.prisma.student.count({
      where: { institution_id: inst.id, status: 'ACTIVE' },
    }),
    this.prisma.tutor.count({
      where: { institution_id: inst.id, is_active: true },
    }),
    this.prisma.subject.findMany({
      where: { institution_id: inst.id },
      select: { id: true, name: true },
    }),
  ]);
```

### 2.4 Caching

In-memory cache (Map atau simple LRU) pada public landing endpoint:
- TTL: 5 menit per slug
- Invalidate: saat `PATCH /settings/landing` dipanggil untuk institution tersebut
- Key: `landing:{slug}`

### 2.5 Zod validation (UpdateLandingSettingsDto)

```typescript
const LandingFeatureSchema = z.object({
  id: z.string().uuid(),
  icon: z.string().min(1).max(30),
  title: z.string().min(1).max(50),
  description: z.string().min(1).max(120),
});

const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  caption: z.string().max(100).optional(),
  order: z.number().int().min(0).max(5),
});

const SocialLinksSchema = z.object({
  instagram: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
  youtube: z.string().max(200).optional(),
  website: z.string().url().max(200).optional(),
});

export const UpdateLandingSettingsSchema = z.object({
  landing_enabled: z.boolean().optional(),
  landing_tagline: z.string().max(200).optional().nullable(),
  landing_about: z.string().max(2000).optional().nullable(),
  landing_cta_text: z.string().max(50).optional().nullable(),
  whatsapp_number: z.string().max(20).optional().nullable(),
  landing_features: z.array(LandingFeatureSchema).max(4).optional().nullable(),
  gallery_images: z.array(GalleryImageSchema).max(6).optional().nullable(),
  social_links: SocialLinksSchema.optional().nullable(),
});
```

### 2.6 Controller placement

Extend existing controllers:
- Public endpoint → `InstitutionPublicController` (tambah method `getLanding`)
- Settings endpoints → `SettingsController` (tambah `getLandingSettings`, `updateLandingSettings`, `uploadGalleryImage`, `deleteGalleryImage`)

---

## 3. R2 Upload Service

### 3.1 New service: `R2UploadService`

Registered di `UploadModule` yang sudah ada. Generic enough untuk reuse (logo, avatar, dll).

**Dependencies:**
- `@aws-sdk/client-s3` — S3-compatible SDK untuk Cloudflare R2
- `sharp` — image processing/compression

### 3.2 Upload flow

```
Client POST multipart
→ Multer memory buffer (tidak save ke disk)
→ Validate: file type (jpg/png/webp), max size 2MB
→ sharp: resize max 1200px width, quality 80%, convert to webp
→ S3 PutObject ke R2: institutions/{institution_id}/gallery/{uuid}.webp
→ Return { id: uuid, url: R2_PUBLIC_URL/path }
```

### 3.3 Delete flow

```
DELETE /settings/landing/gallery/:imageId
→ Lookup imageId in institution.gallery_images
→ S3 DeleteObject dari R2
→ Remove entry dari gallery_images JSON array
→ Save institution
```

### 3.4 Environment variables

| Variable | Keterangan |
|----------|------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket name (e.g. `sinaloka-uploads`) |
| `R2_PUBLIC_URL` | Public bucket URL |

### 3.5 R2 path convention

```
institutions/{institution_id}/gallery/{uuid}.webp
```

---

## 4. Frontend — Settings Landing Tab

### 4.1 Pattern

Self-contained tab (seperti RegistrationTab) — manage state dan hooks sendiri, tidak bloat `useSettingsPage`.

### 4.2 Component tree

```
src/pages/Settings/tabs/
  LandingTab.tsx               # Self-contained tab component
  components/
    FeatureRepeater.tsx        # Add/edit/remove features (max 4)
    GalleryUploader.tsx        # Upload grid + preview + reorder
    IconPicker.tsx             # Lucide icon selector popup
```

### 4.3 Tab registration

Tambah entry di `SettingsPage` tabs array:
```typescript
{ key: 'landing', label: t('settings.landing'), icon: Globe }
```
Position: setelah Security (tab index 6).

### 4.4 Sections layout

| Section | Components | Behavior |
|---------|-----------|----------|
| Status | Toggle + URL display + copy/preview buttons | Toggle = immediate PATCH |
| Konten Hero | Input tagline (200 chars) + input CTA text | Char counter |
| Tentang Kami | Textarea (2000 chars) | Char counter |
| Keunggulan | FeatureRepeater (max 4 items: icon + title + description) | Add/remove/edit |
| Galeri Foto | GalleryUploader (max 6, grid, upload to R2) | Click/drag upload, preview |
| Kontak & Sosmed | Input WA + 4 social link inputs | WA validation (08/+62) |

### 4.5 Save behavior

- **Toggle `landing_enabled`**: Immediate PATCH (tanpa "Simpan"), sama seperti Registration toggles
- **Semua field lain**: ConfirmChangesModal dengan diff saat klik "Simpan Perubahan"
- **Gallery upload**: File di-upload ke R2 **langsung** saat dipilih/drop (immediate POST, user melihat preview). URL masuk local state. Saat "Simpan Perubahan", `gallery_images` array (termasuk URL baru) di-PATCH ke backend. Jika user cancel tanpa simpan, file orphan di R2 (acceptable, bisa cleanup berkala)

### 4.6 Hooks

```typescript
// New hook: useLandingSettings
const { data } = useQuery(['settings', 'landing'], settingsService.getLandingSettings);
const { mutate } = useMutation(settingsService.updateLandingSettings, {
  onSuccess: () => queryClient.invalidateQueries(['settings', 'landing']),
});
```

---

## 5. Frontend — Public Landing Page

### 5.1 Route change

| Before | After |
|--------|-------|
| `/welcome` → InstitutionLanding (hardcoded) | `/welcome` dihapus |
| `/` → redirect to `/dashboard` | `/` → LandingPage jika `landing_enabled`, else redirect `/login` |

### 5.2 Component tree

```
src/pages/public/
  LandingPage.tsx              # Main: fetch data, conditional render sections
  components/
    LandingHero.tsx            # S1: logo, name, tagline, desc, CTA
    LandingStats.tsx           # S2: 3 stat cards
    LandingFeatures.tsx        # S3: 2x2 grid features
    LandingSubjects.tsx        # S4: subject pills
    LandingAbout.tsx           # S5: about text
    LandingGallery.tsx         # S6: photo grid (3 cols)
    LandingContact.tsx         # S7: contact info + social icons
    LandingFooterCTA.tsx       # S8: final CTA + "Powered by Sinaloka"
    WhatsAppFAB.tsx            # Floating action button
```

### 5.3 Data flow

**Prerequisite:** Existing `GET /institutions/public/:slug` response harus di-extend untuk include `landing_enabled`. Ini supaya `InstitutionContext` (yang sudah fetch endpoint ini saat mount) bisa provide `landing_enabled` tanpa API call tambahan. `InstitutionPublicData` type di-update accordingly.

1. `LandingPage.tsx` checks `landing_enabled` from `InstitutionContext` (already available, no extra fetch)
2. If disabled → redirect to `/login`
3. If enabled → fetch `GET /institutions/public/:slug/landing` (full landing data)
4. Pass data as props to each section component
5. Sections with null/empty data are not rendered

### 5.4 Section visibility rules

| Section | Condition to show |
|---------|-------------------|
| S1: Hero | Always (minimal: name + logo) |
| S2: Stats | Always (auto-computed) |
| S3: Features | `landing_features` not null and length > 0 |
| S4: Subjects | `subjects` length > 0 |
| S5: About | `landing_about` not null |
| S6: Gallery | `gallery_images` not null and length > 0 |
| S7: Contact | At least one of: email, phone, address, social_links |
| S8: Footer CTA | Always |
| WhatsApp FAB | `whatsapp_number` not null |

### 5.5 Styling

- `brand_color` dipakai sebagai accent (CTA buttons, stat numbers, hero gradient tint)
- Dark theme (zinc palette) konsisten dengan design system
- Responsive: mobile-first, sections stack vertically
- Animations: entrance animations via `motion/react` (already used in current InstitutionLanding)
- "Powered by Sinaloka" selalu tampil, tidak bisa dihilangkan

### 5.6 CTA behavior

- "Daftar Sekarang" button → navigate to `/register` (shown only if `registration_enabled = true`)
- "Login" button → navigate to `/login` (always shown)
- WhatsApp FAB → `https://wa.me/{whatsapp_number}` (open in new tab)
- Footer CTA same behavior as Hero CTA

---

## 6. i18n

Tambah translation keys di `en.json` dan `id.json`:

**Settings tab keys** (`settings.landing.*`):
- Tab label, description, field labels, placeholders, hints, button text

**Public landing keys** (`landing.*`):
- Section headers ("Keunggulan Kami", "Mata Pelajaran", "Tentang Kami", etc.)
- Default CTA text, stats labels, footer text

---

## 7. Affected Systems

| System | Change | Impact |
|--------|--------|--------|
| Prisma schema | Add 8 fields to Institution | Migration needed |
| `findBySlugPublic` (backend) | Add `landing_enabled` to SELECT/response | Low — additive |
| InstitutionPublicController | Add `getLanding` method | Low — additive |
| SettingsController | Add 4 endpoints (landing CRUD + gallery) | Medium |
| SettingsService | Add landing settings methods | Medium |
| UploadModule | Add R2UploadService | Medium — new service |
| InstitutionPublicData type (frontend) | Add `landing_enabled` | Low |
| InstitutionContext (frontend) | Already provides institution data, no change needed | None |
| App.tsx routing | Remove `/welcome`, add `/` landing logic | Medium |
| Settings page | Add Landing Page tab | Medium |
| i18n files | Add translation keys | Low |

---

## 8. Business Rules

1. Landing page tersedia untuk semua plan (tanpa gating)
2. `landing_enabled` default `false` — bimbel baru redirect ke `/login`
3. `landing_features` max 4 items, full-array replacement
4. `gallery_images` max 6 items, max 2MB per image (raw), compressed to webp
5. `social_links` flat object, setiap platform optional
6. Stats selalu computed on request (tidak disimpan)
7. Public endpoint rate limit: 30 req/min per IP
8. Gallery R2 path: `institutions/{institution_id}/gallery/{uuid}.webp`
9. `landing_cta_text` null → frontend fallback "Daftar Sekarang"
10. `brand_color` = accent color (hex dengan `#`)
11. "Powered by Sinaloka" selalu tampil
12. Audit log otomatis via existing global interceptor
