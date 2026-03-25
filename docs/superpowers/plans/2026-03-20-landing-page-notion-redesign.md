# Landing Page Notion-Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Sinaloka landing page from warm/playful to Notion-clean aesthetic with teal accent, while refactoring the monolithic 1,272-line App.tsx into separate component files.

**Architecture:** Extract all inline data into `lib/constants.ts`, shared components into `components/shared/`, and each of the 10 sections + floating button into individual component files. The new `App.tsx` will be a thin shell that imports and composes all sections. The Tailwind theme is replaced entirely (OKLch warm/brand palette → hex-based accent palette with Plus Jakarta Sans).

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4 (@theme syntax), Motion (Framer Motion v12), Lucide React, Vite 8

**Spec:** `docs/superpowers/specs/2026-03-20-landing-page-notion-redesign-design.md`

---

## File Structure

```
sinaloka-landing/
├── index.html                          # MODIFY: swap Google Fonts
├── src/
│   ├── App.tsx                         # REWRITE: thin composition shell (~30 lines)
│   ├── main.tsx                        # UNCHANGED
│   ├── index.css                       # REWRITE: new theme + base rules
│   ├── lib/
│   │   └── constants.ts                # CREATE: all extracted data
│   ├── components/
│   │   ├── Navbar.tsx                  # CREATE: sticky nav
│   │   ├── Hero.tsx                    # CREATE: centered hero
│   │   ├── ProblemSection.tsx          # CREATE: dark pain points
│   │   ├── FeaturesSection.tsx         # CREATE: feature grid
│   │   ├── HowItWorks.tsx             # CREATE: 3-step flow
│   │   ├── OutcomeMetrics.tsx          # CREATE: metric cards
│   │   ├── Pricing.tsx                 # CREATE: pricing table
│   │   ├── FAQ.tsx                     # CREATE: accordion
│   │   ├── FinalCTA.tsx               # CREATE: dark CTA
│   │   ├── Footer.tsx                  # CREATE: light footer
│   │   ├── FloatingWhatsApp.tsx        # CREATE: floating button
│   │   └── shared/
│   │       ├── Reveal.tsx              # CREATE: scroll animation wrapper
│   │       └── WhatsAppIcon.tsx        # CREATE: WA SVG icon
```

---

### Task 1: Foundation — Google Fonts, Tailwind Theme, index.css

**Files:**
- Modify: `sinaloka-landing/index.html`
- Rewrite: `sinaloka-landing/src/index.css`

- [ ] **Step 1: Update Google Fonts in index.html**

Replace the current font link (Bricolage Grotesque + Instrument Serif) with Plus Jakarta Sans:

```html
<!-- REPLACE this line in index.html (line 11): -->
<!-- OLD: <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" /> -->

<!-- NEW: -->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Rewrite index.css with new Tailwind theme**

Replace the entire `sinaloka-landing/src/index.css` with:

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

@layer base {
  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: var(--font-sans);
    color: #666666;
    background: #ffffff;
    line-height: 1.6;
    margin: 0;
    overflow-x: hidden;
  }

  ::selection {
    background: var(--color-accent-100);
    color: var(--color-accent-900);
  }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
}
```

This removes: `brand-*`, `warm-*`, `wa-*` colors, `font-display`, `font-body`, `.grain`, `.diagonal-top`, `.diagonal-bottom`, `.float-*`, `.wa-glow`, `.wa-pulse`, and all associated keyframes.

- [ ] **Step 3: Verify the theme compiles**

Run: `cd sinaloka-landing && npx vite build --mode development 2>&1 | head -20`

This will fail because App.tsx still references old classes, but it confirms the CSS itself is valid. If you see CSS parse errors, fix them before proceeding.

- [ ] **Step 4: Commit foundation**

```bash
cd sinaloka-landing
git add index.html src/index.css
git commit -m "refactor(landing): replace Tailwind theme with Notion-clean palette and Plus Jakarta Sans"
```

---

### Task 2: Constants and Shared Components

**Files:**
- Create: `sinaloka-landing/src/lib/constants.ts`
- Create: `sinaloka-landing/src/components/shared/Reveal.tsx`
- Create: `sinaloka-landing/src/components/shared/WhatsAppIcon.tsx`

- [ ] **Step 1: Create lib/constants.ts**

Extract all data from App.tsx lines 22-23, 419-426, 487-537, 626-645, 700-725, 796-845, 959-980, 1148-1190.

```typescript
import type { LucideIcon } from "lucide-react";
import {
  Users,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Shield,
  MessageCircle,
  Phone,
  Zap,
  GraduationCap,
} from "lucide-react";

export const WHATSAPP_NUMBER = "62895358468523";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Halo%2C%20saya%20tertarik%20dengan%20Sinaloka%20untuk%20bimbel%20saya`;

export const NAV_LINKS = [
  { href: "#features", label: "Fitur" },
  { href: "#results", label: "Hasil" },
  { href: "#pricing", label: "Harga" },
  { href: "#faq", label: "FAQ" },
] as const;

export const PAIN_POINTS = [
  { text: "Data siswa tercecer di spreadsheet", icon: "📋" },
  { text: "Jadwal bentrok karena koordinasi manual", icon: "📅" },
  { text: "Orang tua komplain — nggak tahu progress anak", icon: "😤" },
  { text: "Gaji tutor salah hitung tiap bulan", icon: "💸" },
  { text: "Pembayaran siswa susah dilacak", icon: "🔍" },
  { text: "Waktu habis buat admin, bukan mengajar", icon: "⏰" },
] as const;

export interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  highlighted?: boolean;
}

export const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "Siswa & Tutor",
    desc: "Semua data rapi di satu tempat. Enrollment, profil, progress — tinggal klik.",
  },
  {
    icon: CalendarCheck,
    title: "Jadwal & Absensi",
    desc: "Atur jadwal, kirim reminder otomatis, catat kehadiran real-time. Nggak ada yang terlewat.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran & Gaji",
    desc: "Tagihan otomatis, terima bayaran online, hitung gaji tutor tanpa Excel. Transparan.",
    highlighted: true,
  },
  {
    icon: MessageCircle,
    title: "Portal Orang Tua",
    desc: "Orang tua pantau kehadiran, jadwal, dan pembayaran langsung dari HP. Mereka tenang, Anda tenang.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Analitik",
    desc: "Dashboard visual: pendapatan, kehadiran, growth siswa. Keputusan berdasarkan data, bukan feeling.",
  },
  {
    icon: Shield,
    title: "Aman & Multi-Cabang",
    desc: "Data tiap cabang terisolasi. Mau expand? Tinggal tambah — kelola dari satu akun.",
  },
];

export interface Step {
  num: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export const STEPS: Step[] = [
  {
    num: "01",
    title: "Chat kami via WhatsApp",
    desc: "Ceritakan kebutuhan bimbel Anda. Kami bantu setup dari awal — gratis.",
    icon: Phone,
  },
  {
    num: "02",
    title: "Kami setup-kan untuk Anda",
    desc: "Tim kami input data, atur jadwal, dan pastikan semuanya siap pakai. Anda tinggal jalan.",
    icon: Zap,
  },
  {
    num: "03",
    title: "Bimbel jalan, Anda fokus mengajar",
    desc: "Absensi otomatis, pembayaran terlacak, orang tua bisa pantau sendiri. Semua beres.",
    icon: GraduationCap,
  },
];

export interface Metric {
  number: string;
  unit: string;
  label: string;
  note: string;
}

export const METRICS: Metric[] = [
  {
    number: "3 jam",
    unit: "/hari",
    label: "Waktu admin yang terhemat",
    note: "Rata-rata dari data pengguna aktif",
  },
  {
    number: "85%",
    unit: "",
    label: "Lebih sedikit kesalahan tagihan",
    note: "Dibanding proses manual",
  },
  {
    number: "2x",
    unit: "",
    label: "Lebih cepat follow-up orang tua",
    note: "Dengan portal orang tua real-time",
  },
  {
    number: "10",
    unit: "menit",
    label: "Setup sampai siap pakai",
    note: "Dibantu langsung oleh tim kami",
  },
];

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    desc: "Untuk bimbel kecil yang baru mulai go digital",
    features: [
      "Hingga 50 siswa",
      "1 admin, 5 tutor",
      "Jadwal & absensi",
      "Portal orang tua",
      "Email support",
    ],
    cta: "Tanya via WhatsApp",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "Rp 299rb",
    period: "/bulan",
    desc: "Bimbel yang berkembang dan butuh kontrol penuh",
    features: [
      "Siswa unlimited",
      "Admin & tutor unlimited",
      "Pembayaran online",
      "Laporan & analitik",
      "Multi-cabang (hingga 3)",
      "WhatsApp integration",
      "Priority support",
    ],
    cta: "Chat untuk Demo",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Jaringan bimbel besar dengan kebutuhan khusus",
    features: [
      "Semua fitur Professional",
      "Cabang unlimited",
      "Custom integration",
      "Dedicated account manager",
      "SLA guarantee",
      "Onboarding & training",
    ],
    cta: "Hubungi Kami",
    highlighted: false,
  },
];

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Apakah data bimbel saya aman?",
    a: "Sangat aman. Kami pakai enkripsi dan server tersertifikasi. Data setiap lembaga terisolasi — nggak ada yang bisa akses data Anda kecuali Anda sendiri.",
  },
  {
    q: "Berapa lama proses setup?",
    a: "10 menit untuk setup dasar. Kalau Anda punya data di spreadsheet, tim kami bantu import — biasanya selesai dalam 1 hari.",
  },
  {
    q: "Tutor dan orang tua perlu download app?",
    a: "Nggak perlu. Sinaloka bisa diakses langsung dari browser HP. Cukup buka link, login, selesai.",
  },
  {
    q: "Bisa untuk bimbel multi-cabang?",
    a: "Bisa! Paket Professional support hingga 3 cabang, Enterprise untuk unlimited. Semua dimonitor dari satu dashboard.",
  },
  {
    q: "Bagaimana kalau saya nggak puas?",
    a: "Mulai aja gratis tanpa kartu kredit. Untuk paket berbayar, ada jaminan uang kembali 30 hari — no questions asked.",
  },
];

export const FOOTER_LINKS = {
  produk: [
    { label: "Fitur", href: "#features" },
    { label: "Harga", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  perusahaan: [
    { label: "Tentang Kami", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Kontak", href: WHATSAPP_URL },
  ],
  legal: [
    { label: "Kebijakan Privasi", href: "#" },
    { label: "Syarat & Ketentuan", href: "#" },
  ],
} as const;

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "WhatsApp", href: WHATSAPP_URL, external: true },
] as const;
```

- [ ] **Step 2: Create components/shared/WhatsAppIcon.tsx**

```tsx
export function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.913.913l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.347 0-4.542-.673-6.405-1.828l-.447-.272-2.644.886.886-2.644-.272-.447A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  );
}
```

- [ ] **Step 3: Create components/shared/Reveal.tsx**

```tsx
import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useInView } from "motion/react";

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const initial = {
    opacity: 0,
    y: direction === "up" ? 32 : 0,
    x: direction === "left" ? -32 : direction === "right" ? 32 : 0,
  };
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Commit shared components**

```bash
cd sinaloka-landing
git add src/lib/constants.ts src/components/shared/Reveal.tsx src/components/shared/WhatsAppIcon.tsx
git commit -m "refactor(landing): extract constants and shared components"
```

---

### Task 3: Navbar Component

**Files:**
- Create: `sinaloka-landing/src/components/Navbar.tsx`

- [ ] **Step 1: Create Navbar.tsx**

```tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL, NAV_LINKS } from "../lib/constants";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-[#E5E5E5]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#" className="text-xl font-bold text-[#111]">
          Sinaloka
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#666]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-accent-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Hubungi Kami
          </a>
        </div>

        <button
          className="md:hidden p-2 text-[#111]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/98 backdrop-blur-md border-b border-[#E5E5E5] overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-medium text-[#333] py-3 border-b border-[#F0F0F0]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-accent-600 text-white font-semibold text-sm px-5 py-3 rounded-lg mt-4"
                onClick={() => setMobileOpen(false)}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Hubungi via WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/Navbar.tsx && git commit -m "feat(landing): add Notion-style Navbar component"
```

---

### Task 4: Hero Component

**Files:**
- Create: `sinaloka-landing/src/components/Hero.tsx`

- [ ] **Step 1: Create Hero.tsx**

```tsx
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function Hero() {
  return (
    <section className="py-24 lg:py-32 pt-32 lg:pt-40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        {/* Centered text content */}
        <div className="max-w-[720px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center bg-accent-50 border border-accent-100 text-accent-600 text-xs font-medium px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase"
          >
            Platform Manajemen Bimbel #1
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-[#111]"
          >
            Ngurusin bimbel
            <br />
            nggak harus ribet.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 text-lg text-[#666] max-w-[480px] mx-auto leading-relaxed"
          >
            Jadwal, absensi, pembayaran, sampai laporan ke orang tua &mdash;
            semua beres dari satu tempat.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-7 py-3.5 rounded-lg text-base transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Hubungi Kami
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
            <a
              href="#features"
              className="text-[#666] hover:text-accent-600 font-medium text-sm border border-[#E5E5E5] px-7 py-3.5 rounded-lg transition-colors"
            >
              Lihat Fitur
            </a>
          </motion.div>
        </div>

        {/* Product screenshot placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 max-w-[960px] mx-auto"
        >
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-lg">
            <div className="bg-[#F8F8F8] rounded-lg aspect-video flex items-center justify-center text-[#999] text-sm">
              Dashboard Preview
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/Hero.tsx && git commit -m "feat(landing): add centered Hero component with screenshot placeholder"
```

---

### Task 5: ProblemSection Component

**Files:**
- Create: `sinaloka-landing/src/components/ProblemSection.tsx`

- [ ] **Step 1: Create ProblemSection.tsx**

```tsx
import { Reveal } from "./shared/Reveal";
import { PAIN_POINTS } from "../lib/constants";

export function ProblemSection() {
  return (
    <section className="bg-[#111] py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-400 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Kenal nggak?
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-white">
            Masih pakai spreadsheet & WhatsApp group?
          </h2>
          <p className="mt-4 text-white/50 text-base leading-relaxed">
            Kebanyakan pemilik bimbel masih kelola semuanya manual. Hasilnya?
            Waktu habis buat administrasi, bukan untuk hal yang paling penting.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {PAIN_POINTS.map((pain, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4 flex items-start gap-3 hover:bg-white/[0.07] transition-colors">
                <span className="text-lg leading-none mt-0.5 shrink-0">
                  {pain.icon}
                </span>
                <span className="text-sm text-white/70 leading-snug font-semibold">
                  {pain.text}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/ProblemSection.tsx && git commit -m "feat(landing): add dark ProblemSection component"
```

---

### Task 6: FeaturesSection Component

**Files:**
- Create: `sinaloka-landing/src/components/FeaturesSection.tsx`

- [ ] **Step 1: Create FeaturesSection.tsx**

```tsx
import { Reveal } from "./shared/Reveal";
import { FEATURES } from "../lib/constants";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Fitur Lengkap
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Semua yang bimbel Anda butuhkan, dalam satu tempat.
          </h2>
          <p className="mt-4 text-[#666] text-base leading-relaxed">
            Dirancang khusus untuk operasional bimbingan belajar — bukan
            software generik yang dipaksakan.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div
                className={`rounded-xl p-8 h-full transition-all duration-300 ${
                  f.highlighted
                    ? "bg-accent-600 text-white"
                    : "bg-[#F8F8F8] border border-[#E5E5E5] hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    f.highlighted
                      ? "bg-white/15"
                      : "bg-accent-50 border border-accent-100"
                  }`}
                >
                  <f.icon
                    size={20}
                    className={f.highlighted ? "text-white" : "text-accent-600"}
                  />
                </div>
                <h3
                  className={`font-semibold text-lg mb-2 ${
                    f.highlighted ? "text-white" : "text-[#111]"
                  }`}
                >
                  {f.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    f.highlighted ? "text-accent-100" : "text-[#666]"
                  }`}
                >
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/FeaturesSection.tsx && git commit -m "feat(landing): add FeaturesSection grid component"
```

---

### Task 7: HowItWorks Component

**Files:**
- Create: `sinaloka-landing/src/components/HowItWorks.tsx`

- [ ] **Step 1: Create HowItWorks.tsx**

```tsx
import { Reveal } from "./shared/Reveal";
import { STEPS } from "../lib/constants";

export function HowItWorks() {
  return (
    <section className="py-24 lg:py-32 bg-[#F8F8F8]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Cara Mulai
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            3 langkah, langsung jalan.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="absolute top-8 left-[16.67%] right-[16.67%] border-t border-dashed border-[#E5E5E5] hidden md:block" />

          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.12}>
              <div className="relative bg-white rounded-xl p-8 border border-[#E5E5E5]">
                {/* Step number pill */}
                <div className="w-8 h-8 rounded-full bg-accent-50 text-accent-600 font-bold text-sm flex items-center justify-center mb-4 relative z-10">
                  {step.num}
                </div>
                <step.icon size={20} className="text-accent-600 mb-3" />
                <h3 className="font-semibold text-[#111] text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/HowItWorks.tsx && git commit -m "feat(landing): add HowItWorks step cards component"
```

---

### Task 8: OutcomeMetrics Component

**Files:**
- Create: `sinaloka-landing/src/components/OutcomeMetrics.tsx`

- [ ] **Step 1: Create OutcomeMetrics.tsx**

```tsx
import { Reveal } from "./shared/Reveal";
import { METRICS } from "../lib/constants";

export function OutcomeMetrics() {
  return (
    <section id="results" className="py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Hasil Nyata
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Bukan janji kosong. Ini data dari pengguna kami.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div
                className={`rounded-xl p-6 h-full ${
                  i === 0
                    ? "bg-accent-600 text-white"
                    : "bg-white border border-[#E5E5E5]"
                }`}
              >
                <div
                  className={`text-4xl font-extrabold leading-none ${
                    i === 0 ? "text-white" : "text-[#111]"
                  }`}
                >
                  {m.number}
                  {m.unit && (
                    <span
                      className={`text-lg font-normal ml-1 ${
                        i === 0 ? "text-accent-200" : "text-[#999]"
                      }`}
                    >
                      {m.unit}
                    </span>
                  )}
                </div>
                <div
                  className={`mt-3 text-sm font-medium ${
                    i === 0 ? "text-accent-100" : "text-[#333]"
                  }`}
                >
                  {m.label}
                </div>
                <div
                  className={`mt-2 text-xs ${
                    i === 0 ? "text-accent-200/60" : "text-[#999]"
                  }`}
                >
                  {m.note}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/OutcomeMetrics.tsx && git commit -m "feat(landing): add OutcomeMetrics cards component"
```

---

### Task 9: Pricing Component

**Files:**
- Create: `sinaloka-landing/src/components/Pricing.tsx`

- [ ] **Step 1: Create Pricing.tsx**

```tsx
import { CheckCircle2 } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL, PRICING_TIERS } from "../lib/constants";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Harga Transparan
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Investasi kecil, dampak besar untuk bimbel Anda.
          </h2>
          <p className="mt-3 text-[#666] text-sm">
            Mulai gratis. Upgrade kapan saja. Tanpa biaya tersembunyi.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PRICING_TIERS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.1}>
              <div
                className={`rounded-xl p-8 flex flex-col transition-all ${
                  plan.highlighted
                    ? "border-2 border-accent-600 shadow-lg bg-white"
                    : "bg-white border border-[#E5E5E5]"
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex self-start bg-accent-50 text-accent-600 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1 rounded-full mb-4">
                    Paling Populer
                  </div>
                )}
                <div className="text-xs font-semibold tracking-wide uppercase text-accent-600">
                  {plan.name}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#111]">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-[#999]">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#666]">{plan.desc}</p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        size={15}
                        className="mt-0.5 shrink-0 text-accent-600"
                      />
                      <span className="text-[#444]">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-lg transition-colors bg-accent-600 hover:bg-accent-700 text-white"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/Pricing.tsx && git commit -m "feat(landing): add Pricing cards component"
```

---

### Task 10: FAQ Component

**Files:**
- Create: `sinaloka-landing/src/components/FAQ.tsx`

- [ ] **Step 1: Create FAQ.tsx**

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { FAQ_ITEMS } from "../lib/constants";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            FAQ
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Ada pertanyaan? Kami jawab.
          </h2>
          <p className="mt-4 text-[#666] text-sm leading-relaxed">
            Masih ragu atau butuh info lebih? Chat langsung aja — kami senang bantu.
          </p>
        </Reveal>

        <div className="max-w-[720px] mx-auto space-y-0 divide-y divide-[#E5E5E5]">
          {FAQ_ITEMS.map((faq, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span
                    className={`font-semibold text-base pr-4 transition-colors ${
                      open === i ? "text-accent-600" : "text-[#111]"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={18} className="text-[#999] shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm text-[#666] leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/FAQ.tsx && git commit -m "feat(landing): add FAQ accordion component"
```

---

### Task 11: FinalCTA Component

**Files:**
- Create: `sinaloka-landing/src/components/FinalCTA.tsx`

- [ ] **Step 1: Create FinalCTA.tsx**

```tsx
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function FinalCTA() {
  return (
    <section className="bg-[#111] py-24 lg:py-32">
      <div className="max-w-[640px] mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Siap ngurusin bimbel tanpa pusing?
          </h2>
          <p className="mt-6 text-white/50 text-base md:text-lg">
            150+ bimbel sudah merasakan bedanya. Ceritakan kebutuhan Anda — kami
            bantu dari awal, gratis.
          </p>

          <div className="mt-10">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-8 py-4 rounded-lg text-base transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Chat Sekarang via WhatsApp
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Gratis untuk bimbel kecil
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Setup dibantu tim kami
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Batal kapan saja
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/FinalCTA.tsx && git commit -m "feat(landing): add dark FinalCTA component"
```

---

### Task 12: Footer Component

**Files:**
- Create: `sinaloka-landing/src/components/Footer.tsx`

- [ ] **Step 1: Create Footer.tsx**

```tsx
import { FOOTER_LINKS, SOCIAL_LINKS } from "../lib/constants";

export function Footer() {
  const columns = [
    { title: "Produk", links: FOOTER_LINKS.produk },
    { title: "Perusahaan", links: FOOTER_LINKS.perusahaan },
    { title: "Legal", links: FOOTER_LINKS.legal },
  ];

  return (
    <footer className="bg-[#FAFAFA] border-t border-[#E5E5E5] py-16">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-bold text-[#111]">Sinaloka</span>
            <p className="mt-3 text-sm text-[#999] leading-relaxed max-w-xs">
              Platform manajemen bimbingan belajar #1 di Indonesia.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[#666] hover:text-[#111] transition-colors"
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-[#E5E5E5] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#BBB]">
            &copy; {new Date().getFullYear()} Sinaloka. Hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-6 text-xs text-[#BBB]">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#666] transition-colors"
                {...("external" in link && link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/Footer.tsx && git commit -m "feat(landing): add light Footer component"
```

---

### Task 13: FloatingWhatsApp Component

**Files:**
- Create: `sinaloka-landing/src/components/FloatingWhatsApp.tsx`

- [ ] **Step 1: Create FloatingWhatsApp.tsx**

```tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent-600 hover:bg-accent-700 flex items-center justify-center text-white shadow-lg transition-colors"
          aria-label="Chat via WhatsApp"
        >
          <WhatsAppIcon className="w-7 h-7" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/components/FloatingWhatsApp.tsx && git commit -m "feat(landing): add FloatingWhatsApp button component"
```

---

### Task 14: Rewrite App.tsx as Thin Shell

**Files:**
- Rewrite: `sinaloka-landing/src/App.tsx`

- [ ] **Step 1: Replace App.tsx with composition shell**

Replace the entire 1,272-line `sinaloka-landing/src/App.tsx` with:

```tsx
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { ProblemSection } from "./components/ProblemSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorks } from "./components/HowItWorks";
import { OutcomeMetrics } from "./components/OutcomeMetrics";
import { Pricing } from "./components/Pricing";
import { FAQ } from "./components/FAQ";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";
import { FloatingWhatsApp } from "./components/FloatingWhatsApp";

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorks />
      <OutcomeMetrics />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
```

This is 24 lines — well under the 50-line target.

- [ ] **Step 2: Commit**

```bash
cd sinaloka-landing && git add src/App.tsx && git commit -m "refactor(landing): replace monolithic App.tsx with thin composition shell"
```

---

### Task 15: Build Verification and Fixes

**Files:**
- Potentially modify any created file if there are build errors

- [ ] **Step 1: Run TypeScript type check**

```bash
cd sinaloka-landing && npx tsc --noEmit
```

Expected: No errors. If there are type errors, fix them in the affected component files.

- [ ] **Step 2: Run ESLint**

```bash
cd sinaloka-landing && npm run lint
```

Expected: No errors. Fix any lint issues.

- [ ] **Step 3: Run production build**

```bash
cd sinaloka-landing && npm run build
```

Expected: Build succeeds with no errors. The `dist/` folder is created.

- [ ] **Step 4: Visual smoke test**

```bash
cd sinaloka-landing && npm run dev
```

Open `http://localhost:4000` in the browser and verify:
1. All 10 sections render in order
2. Navbar is sticky with backdrop blur on scroll
3. Plus Jakarta Sans font is loading (check in browser DevTools)
4. Teal accent color (#0d9488) appears on CTAs, badges, highlighted cards
5. White background (no warm beige)
6. No diagonal clip-paths or floating shapes
7. FAQ accordion expands/collapses
8. Floating WhatsApp button appears after scrolling past 400px
9. All WhatsApp links open correctly
10. Mobile responsive at 375px width

- [ ] **Step 5: Fix any issues found and commit**

```bash
cd sinaloka-landing
git add -A
git commit -m "fix(landing): resolve build and type issues from redesign"
```

- [ ] **Step 6: Final commit if all checks pass**

```bash
cd sinaloka-landing
git add -A
git commit -m "feat(landing): complete Notion-style redesign with component refactor"
```
