import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { ProblemSection } from "../components/ProblemSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { HowItWorks } from "../components/HowItWorks";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import { FloatingWhatsApp } from "../components/FloatingWhatsApp";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden relative bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      {/* InteractiveDemo will be added in Task 4 */}
      <FeaturesSection />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
