import { Reveal } from "./shared/Reveal";
import { PAIN_POINTS } from "../lib/constants";

export function ProblemSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-red-100/20 blur-[100px] pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-red-500 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Kenal nggak?
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Masih pakai spreadsheet & WhatsApp group?
          </h2>
          <p className="mt-4 text-[#666] text-base leading-relaxed">
            Kebanyakan pemilik bimbel masih kelola semuanya manual. Hasilnya?
            Waktu habis buat administrasi, bukan untuk hal yang paling penting.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {PAIN_POINTS.map((pain, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="group bg-[#FFF8F8] border border-red-100 rounded-xl px-5 py-4 flex items-start gap-3 hover:bg-red-50 hover:border-red-200 transition-all cursor-default">
                <span className="text-lg leading-none mt-0.5 shrink-0 group-hover:scale-110 transition-transform">
                  {pain.icon}
                </span>
                <span className="text-sm text-[#555] leading-snug font-semibold group-hover:text-[#333] transition-colors">
                  {pain.text}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-24 -left-24 w-[300px] h-[300px] rounded-full bg-red-50/30 blur-[80px] pointer-events-none" />
    </section>
  );
}
