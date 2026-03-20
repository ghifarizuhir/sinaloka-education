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
