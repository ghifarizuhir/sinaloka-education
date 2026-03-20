import { Reveal } from "./shared/Reveal";
import { STEPS } from "../lib/constants";

export function HowItWorks() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden bg-accent-950">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 opacity-[0.05]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="how-dots"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="16" cy="16" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#how-dots)" />
        </svg>
      </div>
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent-600/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent-400/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-400 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Cara Mulai
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-white">
            3 langkah, langsung jalan.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="absolute top-12 left-[16.67%] right-[16.67%] hidden md:flex items-center">
            <div className="flex-1 border-t-2 border-dashed border-accent-400/20" />
            <div className="w-2 h-2 rounded-full bg-accent-400/30 mx-1" />
            <div className="flex-1 border-t-2 border-dashed border-accent-400/20" />
          </div>

          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.12}>
              <div className="relative bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/[0.10] hover:border-white/20 transition-all duration-300">
                {/* Step number pill */}
                <div className="w-8 h-8 rounded-full bg-accent-400/15 text-accent-400 font-bold text-sm flex items-center justify-center mb-4 relative z-10">
                  {step.num}
                </div>
                <step.icon size={24} className="text-accent-400 mb-3" />
                <h3 className="font-semibold text-white text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-accent-200/70 leading-relaxed">
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
