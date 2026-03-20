import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { PartnerMarquee } from "../components/PartnerMarquee";
import { ProblemSection } from "../components/ProblemSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { HowItWorks } from "../components/HowItWorks";
import { OutcomeMetrics } from "../components/OutcomeMetrics";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import { FloatingWhatsApp } from "../components/FloatingWhatsApp";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden relative bg-white">
      {/* Background grid — starts after hero */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <Navbar />
      <Hero />
      <PartnerMarquee />
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
