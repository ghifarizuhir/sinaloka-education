import { Reveal } from "./shared/Reveal";
import { FEATURES } from "../lib/constants";
import { cn } from "../lib/utils";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full bg-accent-100/20 blur-[100px] pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
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
                className={cn(
                  "rounded-xl p-8 h-full transition-all duration-300",
                  f.highlighted
                    ? "bg-accent-600 text-white"
                    : "bg-[#F8F8F8] border border-[#E5E5E5] hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
                    f.highlighted ? "bg-white/15" : "bg-accent-50 border border-accent-100"
                  )}
                >
                  <f.icon
                    size={24}
                    className={f.highlighted ? "text-white" : "text-accent-600"}
                  />
                </div>
                <h3
                  className={cn("font-semibold text-lg mb-2", f.highlighted ? "text-white" : "text-[#111]")}
                >
                  {f.title}
                </h3>
                <p
                  className={cn("text-sm leading-relaxed", f.highlighted ? "text-accent-100" : "text-[#666]")}
                >
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-20 -left-40 w-[400px] h-[400px] rounded-full bg-accent-50/30 blur-[80px] pointer-events-none" />
    </section>
  );
}
