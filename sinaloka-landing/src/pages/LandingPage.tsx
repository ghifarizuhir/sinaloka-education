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

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden relative bg-white">
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
