# Honest Landing Page Redesign — Design Spec

**Date**: 2026-03-22
**Status**: Draft
**Scope**: sinaloka-landing full content rewrite + Interactive Demo section

## Context

Sinaloka landing page saat ini menampilkan klaim yang tidak sesuai fakta:
- "150+ bimbel" dan "10.000+ siswa" — padahal baru launching
- "Platform #1 di Indonesia" — tanpa basis ranking
- 12 nama partner bimbel palsu di marquee
- Statistik "3 jam/hari terhemat", "85% lebih sedikit kesalahan" — tidak pernah diukur
- "Server tersertifikasi" — Railway standard, bukan certified
- "Jaminan uang kembali 30 hari" — belum ada policy formal
- Pricing tier lama (Gratis / Rp 150rb / Rp 500rb) — tidak sesuai pricing terbaru

## Goals

1. **Hapus semua klaim yang tidak factual** — angka palsu, partner palsu, statistik tidak terukur
2. **Tetap compelling** — fokus ke product demo dan pain point yang relatable
3. **Update pricing** — sesuai PricingSection.jsx (Starter Rp 199rb, Growth Rp 399rb, Business TBA)
4. **Tambah Interactive Demo** — menggantikan social proof dengan product proof
5. **Keep tone casual** dan visual style teal/emerald yang sudah ada

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Strategy | Product-led + Problem-led | Tunjukkan produk nyata, anchor ke pain point relatable |
| Social proof replacement | Interactive Demo | Baru launching, belum ada user numbers atau testimonial |
| Demo format | Interactive snippets | Lebih impactful dari screenshot statis |
| Demo features | QRIS Payment, Dashboard, Portal Ortu | 3 fitur yang paling differentiate dari spreadsheet |
| Visual tone | Teal/emerald refined (current) | Sudah established, professional |
| Pricing source | PricingSection.jsx | Starter Rp 199rb, Growth Rp 399rb, Business TBA |

## Section-by-Section Design

### 1. Navbar — Keep, minor update

**Changes:**
- Hapus nav links yang nonfunctional
- Keep: Fitur (`#fitur`), Harga (`#harga`), FAQ (`#faq`), CTA WhatsApp
- Update `#results` link → `#demo` (karena OutcomeMetrics diganti Interactive Demo)

**Nav links:**
```
Fitur | Demo | Harga | FAQ | [Hubungi Kami via WA]
```

### 2. Hero — Rewrite copy, keep layout

**Current problems:**
- Badge "Platform Manajemen Bimbel #1" — not factual
- Trust indicators "150+ bimbel", "10.000+ siswa" — fabricated
- Dashboard mock shows fake stats (342 siswa, Rp 48jt)

**New copy:**
- **Badge**: "Platform Manajemen Bimbel" (drop "#1")
- **Headline**: "Ngurusin bimbel nggak harus ribet." (keep — ini sudah bagus)
- **Subheadline**: "Jadwal, absensi, pembayaran, sampai laporan ke orang tua — semua beres dari satu tempat." (keep)
- **Trust indicators** (ganti):
  - "Gratis 2 bulan pertama"
  - "Setup < 15 menit"
  - "Tanpa kontrak"
- **Dashboard mock**: Keep sebagai visual teaser, tapi hapus specific fake numbers. Ganti dengan generic placeholder yang tidak mengklaim angka specific (misal: "Total Siswa", "Tutor Aktif", "Kehadiran", "Pendapatan" tanpa angka, atau dengan obvious placeholder "—")
- **CTA buttons**: "Coba Gratis 2 Bulan" (primary) + "Lihat Demo" (secondary, scroll ke #demo)

### 3. ProblemSection — Keep, minor polish

**Keep as-is.** Pain points sudah relatable dan jujur:
- Data siswa tercecer di spreadsheet
- Jadwal bentrok karena koordinasi manual
- Orang tua komplain — nggak tahu progress anak
- Gaji tutor salah hitung tiap bulan
- Pembayaran siswa susah dilacak
- Waktu habis buat admin, bukan mengajar

**Minor change:**
- Header text tetap: "Masih pakai spreadsheet & WhatsApp group?"
- Subtext tetap: fokus ke "waktu habis buat administrasi"

### 4. Interactive Demo — NEW (replaces PartnerMarquee + OutcomeMetrics)

**Section ID**: `#demo`
**Header**: "Lihat Langsung" / "Bukan janji — ini yang bisa Sinaloka lakukan."

**Layout**: Tabbed interface dengan 3 tabs

#### Tab 1: Pembayaran QRIS/VA
Animated walkthrough menunjukkan flow:
1. Admin buat tagihan → Invoice terkirim ke orang tua
2. Orang tua buka link → Scan QRIS atau pilih VA
3. Pembayaran masuk → Otomatis tercatat di dashboard admin

**Implementation**: CSS-animated step-by-step flow. Bukan screenshot statis, tapi curated mini-interaction:
- Phone frame mockup (orang tua side): menunjukkan QR code, status "Menunggu Pembayaran" → "Lunas"
- Dashboard frame (admin side): menunjukkan pembayaran masuk real-time
- Animated transition antara steps dengan subtle delays

#### Tab 2: Dashboard Overview
Interactive preview dashboard admin:
- Cards: Total Siswa, Tutor Aktif, Kehadiran Hari Ini, Pendapatan Bulan Ini
- Hover effect pada cards untuk menunjukkan detail
- Mini chart (attendance trend) — static tapi visually appealing
- Tabel ringkasan jadwal hari ini

**Implementation**: Static HTML/CSS mockup yang styled persis seperti platform asli, dengan hover interactions. Data yang ditampilkan adalah generic/demo data yang jelas merupakan contoh (bukan klaim angka real).

#### Tab 3: Portal Orang Tua
Phone frame mockup showing parent app:
- List anak dengan status kehadiran hari ini
- Jadwal minggu ini
- Status pembayaran (Lunas / Belum Bayar)
- Tombol "Bayar Sekarang"

**Implementation**: Phone-shaped frame dengan scrollable content di dalamnya. CSS-only animation yang menunjukkan parent scrolling through the app.

**Technical approach:**
- Semua demo content di-render sebagai React components
- Animasi menggunakan CSS transitions + `IntersectionObserver` untuk trigger saat scroll
- Tab switching via React state (no routing)
- Mobile responsive: tabs bisa di-swipe atau dropdown

### 5. FeaturesSection — Update content

**Keep 6-feature grid layout.** Update fitur list sesuai yang benar-benar production-ready:

| # | Title | Description | Status |
|---|-------|-------------|--------|
| 1 | Siswa & Tutor | Data enrollment, profil, dan progress — rapi di satu tempat. | Real |
| 2 | Jadwal & Absensi | Atur jadwal, catat kehadiran real-time, WA reminder otomatis. | Real (WA reminder confirmed live) |
| 3 | Pembayaran Online | Orang tua bayar via QRIS & VA langsung dari HP. Otomatis tercatat. | Real (Midtrans live) |
| 4 | Portal Orang Tua | Orang tua pantau kehadiran, jadwal, dan bayar langsung dari HP. | Real |
| 5 | Invoice & Slip Gaji | Invoice PDF otomatis untuk orang tua, slip gaji PDF untuk tutor. | Real |
| 6 | Catat Pengeluaran | Kelola pengeluaran bimbel. Tahu untung-rugi tanpa spreadsheet. | Real |

**Changes from current:**
- "Laporan & Analitik" → "Invoice & Slip Gaji" (lebih tangible, confirmed real)
- "Aman & Multi-Cabang" → "Catat Pengeluaran" (multi-cabang belum ada, pengeluaran sudah ada)
- Highlight on "Pembayaran Online" (the biggest differentiator)
- Copy tetap casual dan singkat

### 6. HowItWorks — Keep as-is

3-step flow sudah jujur dan clear:
1. Chat via WhatsApp
2. Tim kami setup-kan
3. Bimbel jalan, fokus mengajar

No changes needed.

### 7. Pricing — Replace with PricingSection.jsx content

**Full replacement** menggunakan struktur dari `docs/PricingSection.jsx`:

#### Starter — Rp 199rb/bulan
- Gratis 2 bulan pertama
- Hingga 40 siswa, 5 tutor, 1 admin
- Jadwal, kelas & absensi
- Enrollment lifecycle
- Pembayaran online (QRIS, VA)
- Orang tua bayar via app
- Invoice PDF otomatis
- Gaji tutor + slip PDF
- Catat pengeluaran
- App tutor & orang tua
- Landing page bimbel
- WA reminder (manual)
- Greyed out: WA auto-reminder, Laporan PDF & CSV, Analitik keuangan (Growth only)

#### Growth — Rp 399rb/bulan (Paling Populer)
- Gratis 2 bulan pertama
- Hingga 100 siswa, 15 tutor, 3 admin
- Semua fitur Starter +
- WA auto-reminder harian (NEW)
- 4 mode billing fleksibel (NEW)
- Pengeluaran berulang otomatis (NEW)
- Laporan PDF (absensi, keuangan) (NEW)
- CSV export lengkap (NEW)
- Analitik keuangan & breakdown (NEW)
- Audit trail lengkap (NEW)
- Bilingual (ID + EN)
- Settings lengkap
- Priority support via WhatsApp

#### Business — TBA (Segera Hadir)
- Siswa & tutor unlimited, admin unlimited
- Semua fitur Growth +
- Coming soon: Assessment kompetensi tutor, Badge verified, Bank soal, AI gap analysis, Multi-cabang
- Button disabled: "Segera Hadir"

**Bottom notes**: "Semua paket termasuk pembayaran online", "Tanpa kontrak — berhenti kapan saja", "Setup kurang dari 15 menit"

**CTA bottom**: "Masih ragu? Jadwalkan demo 15 menit — kami tunjukkan langsung." + WhatsApp button

**Note on "Paling Populer"**: Ini standard pricing psychology (anchoring ke middle tier). Acceptable karena ini pricing recommendation, bukan klaim data. Tapi kalau ingin extra honest, bisa diganti "RECOMMENDED" — keeping as-is per PricingSection.jsx reference.

### 8. FAQ — Rewrite answers

5 FAQ items, updated untuk kejujuran:

**Q: Apakah data bimbel saya aman?**
A: "Data disimpan di cloud server yang reliable dan selalu di-backup. Setiap bimbel datanya terisolasi — nggak ada bimbel lain yang bisa akses data Anda. Akses dibatasi dengan login dan role-based permission."
*(Hapus "server tersertifikasi" dan "enkripsi" — ganti dengan penjelasan yang benar: isolasi data per tenant, role-based access)*

**Q: Berapa lama proses setup?**
A: "Setup dasar bisa selesai kurang dari 15 menit. Kalau Anda punya data di spreadsheet, tim kami bantu import — biasanya selesai dalam 1 hari kerja."
*(Sedikit lebih realistis: "kurang dari 15 menit" instead of "10 menit")*

**Q: Tutor dan orang tua perlu download app?**
A: "Nggak perlu. Sinaloka bisa diakses langsung dari browser HP. Cukup buka link, login, selesai."
*(Keep — ini benar)*

**Q: Bisa untuk bimbel multi-cabang?**
A: "Belum — fitur multi-cabang sedang kami kembangkan untuk paket Business. Untuk saat ini, Sinaloka optimal untuk bimbel single-location."
*(Jujur bahwa multi-cabang belum ada)*

**Q: Kalau nggak cocok gimana?**
A: "Coba dulu gratis 2 bulan — tanpa kartu kredit, tanpa komitmen. Kalau nggak cocok, tinggal berhenti. Tanpa kontrak."
*(Hapus "jaminan uang kembali 30 hari" — ganti dengan free trial framing yang sudah ada)*

### 9. FinalCTA — Rewrite

**Headline**: "Siap ngurusin bimbel tanpa pusing?"
**Subtext**: "Coba sendiri — gratis 2 bulan, tanpa kartu kredit."
**Trust items**:
- "Gratis 2 bulan pertama"
- "Setup dibantu tim kami"
- "Batal kapan saja"
**CTA**: WhatsApp button "Mulai Sekarang"

### 10. Footer — Rewrite

**Tagline**: "Platform manajemen bimbingan belajar." (drop "#1 di Indonesia")

**Links — only keep functional ones:**
- Produk: Fitur (#fitur), Harga (#harga), FAQ (#faq)
- Kontak: WhatsApp link (functional)
- Hapus: "Tentang Kami" (#), "Blog" (#), "Kebijakan Privasi" (#), "Syarat & Ketentuan" (#) — semua nonfunctional

**Social links**: Keep hanya yang functional. Kalau Instagram/LinkedIn belum ada, hapus.

### 11. FloatingWhatsApp — Keep as-is
Tidak ada perubahan.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/lib/constants.ts` | **Major rewrite** | Update all copy, pricing, FAQ, features, nav links. Remove METRICS. |
| `src/components/Hero.tsx` | **Rewrite** | New trust indicators, remove fake numbers, update CTA |
| `src/components/PartnerMarquee.tsx` | **Delete** | Fake partners removed entirely |
| `src/components/OutcomeMetrics.tsx` | **Delete** | Fake statistics removed entirely |
| `src/components/InteractiveDemo.tsx` | **New file** | Tabbed demo with 3 interactive previews |
| `src/components/InteractiveDemo/PaymentDemo.tsx` | **New file** | QRIS/VA payment flow walkthrough |
| `src/components/InteractiveDemo/DashboardDemo.tsx` | **New file** | Dashboard overview preview |
| `src/components/InteractiveDemo/ParentPortalDemo.tsx` | **New file** | Parent app phone mockup |
| `src/components/FeaturesSection.tsx` | **Update** | New feature list (6 items, all real) |
| `src/components/Pricing.tsx` | **Major rewrite** | Match PricingSection.jsx structure |
| `src/components/FAQ.tsx` | **Update** | Honest FAQ answers |
| `src/components/FinalCTA.tsx` | **Rewrite** | Remove "150+ bimbel", new copy |
| `src/components/Footer.tsx` | **Rewrite** | Remove "#1", remove nonfunctional links |
| `src/components/Navbar.tsx` | **Update** | Update nav links |
| `src/pages/LandingPage.tsx` | **Update** | Remove PartnerMarquee & OutcomeMetrics, add InteractiveDemo |

## Section Order (final)

```
1. Navbar
2. Hero
3. ProblemSection
4. InteractiveDemo (NEW)
5. FeaturesSection
6. HowItWorks
7. Pricing
8. FAQ
9. FinalCTA
10. Footer
11. FloatingWhatsApp (floating, always visible)
```

## Out of Scope

- RegisterPage — functional, no marketing copy to fix
- Backend changes — none needed
- Other frontend apps (platform, tutors, parent) — not affected
- Creating actual "Tentang Kami", "Blog", or legal pages — separate task
- Mobile app / PWA — not in scope

## Technical Notes

- Interactive Demo animations should be CSS-first (transitions, keyframes) for performance
- Use `IntersectionObserver` via the existing `Reveal` component for scroll-triggered animations
- Tab state management via `useState` — no external state library needed
- All demo data must be clearly example data, not claims about real usage
- Phone frame mockup for Portal Ortu can use CSS `border-radius` + `aspect-ratio` trick
- Pricing component can be adapted from PricingSection.jsx reference (already well-structured)

## Design Principles

1. **Claim nothing we can't prove** — no numbers, no rankings, no fake partners
2. **Show, don't tell** — Interactive Demo > marketing copy
3. **Relatable problems > aspirational promises** — "spreadsheet chaos" resonates more than "150+ bimbel trust us"
4. **Honest about limitations** — multi-cabang belum ada? Bilang. Business tier belum ready? Mark "Segera Hadir"
5. **Let the product speak** — if the product is good, showing it is enough
