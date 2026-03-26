import { lazy, Suspense } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { ProblemSection } from "../components/ProblemSection";
import { FeaturesSection } from "../components/FeaturesSection";

const InteractiveDemo = lazy(() => import("../components/InteractiveDemo"));
import { HowItWorks } from "../components/HowItWorks";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import { FloatingWhatsApp } from "../components/FloatingWhatsApp";
import { PageMeta } from "../components/shared/PageMeta";
import { FAQ_ITEMS } from "../lib/constants";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden relative bg-white">
      <PageMeta
        title="Sinaloka — Platform Manajemen Bimbel #1 di Indonesia"
        description="Platform manajemen bimbingan belajar untuk mengelola siswa, tutor, jadwal, dan pembayaran dari satu tempat. Gratis 2 bulan, tanpa kontrak."
        canonicalPath="/"
      />

      {/* Structured Data: Organization */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Sinaloka",
        "url": "https://sinaloka.com",
        "logo": "https://sinaloka.com/favicon.svg",
        "description": "Platform manajemen bimbingan belajar untuk mengelola siswa, tutor, jadwal, dan pembayaran.",
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "sales",
          "url": "https://wa.me/6285121094946",
          "availableLanguage": "Indonesian",
        },
      }) }} />

      {/* Structured Data: WebSite */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Sinaloka",
        "url": "https://sinaloka.com",
      }) }} />

      {/* Structured Data: SoftwareApplication */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Sinaloka",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Platform manajemen bimbingan belajar untuk mengelola siswa, tutor, jadwal, dan pembayaran dari satu tempat.",
        "url": "https://sinaloka.com",
        "offers": [
          { "@type": "Offer", "name": "Starter", "price": "199000", "priceCurrency": "IDR", "description": "Hingga 40 siswa, 5 tutor, pembayaran online, gratis 2 bulan" },
          { "@type": "Offer", "name": "Growth", "price": "399000", "priceCurrency": "IDR", "description": "Hingga 100 siswa, 15 tutor, WA auto-reminder, laporan PDF, gratis 2 bulan" },
        ],
      }) }} />

      {/* Structured Data: FAQPage */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          "name": item.q,
          "acceptedAnswer": { "@type": "Answer", "text": item.a },
        })),
      }) }} />

      <Navbar />
      <Hero />
      <ProblemSection />
      <Suspense fallback={null}>
        <InteractiveDemo />
      </Suspense>
      <FeaturesSection />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingWhatsApp />
    </main>
  );
}
