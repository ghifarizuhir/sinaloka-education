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
