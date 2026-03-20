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
              <div className="group bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4 flex items-start gap-3 hover:bg-white/[0.07] hover:border-white/20 transition-all cursor-default">
                <span className="text-lg leading-none mt-0.5 shrink-0 group-hover:scale-110 transition-transform">
                  {pain.icon}
                </span>
                <span className="text-sm text-white/70 leading-snug font-semibold group-hover:text-white/90 transition-colors">
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
