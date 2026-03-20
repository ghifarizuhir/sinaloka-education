import { CheckCircle2 } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL, PRICING_TIERS } from "../lib/constants";
import { cn } from "../lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-50/40 blur-[120px] pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            Harga Transparan
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Investasi kecil, dampak besar untuk bimbel Anda.
          </h2>
          <p className="mt-3 text-[#666] text-sm">
            Mulai gratis. Upgrade kapan saja. Tanpa biaya tersembunyi.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PRICING_TIERS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.1}>
              <div
                className={cn(
                  "rounded-xl p-8 flex flex-col transition-all",
                  plan.highlighted
                    ? "border-2 border-accent-600 shadow-lg bg-white"
                    : "bg-white border border-[#E5E5E5]"
                )}
              >
                {plan.highlighted && (
                  <div className="inline-flex self-start bg-accent-50 text-accent-600 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1 rounded-full mb-4">
                    Paling Populer
                  </div>
                )}
                <div className="text-xs font-semibold tracking-wide uppercase text-accent-600">
                  {plan.name}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#111]">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-[#999]">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#666]">{plan.desc}</p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        size={15}
                        className="mt-0.5 shrink-0 text-accent-600"
                      />
                      <span className="text-[#444]">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-lg transition-colors bg-accent-600 hover:bg-accent-700 text-white"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-32 -right-32 w-[350px] h-[350px] rounded-full bg-accent-100/20 blur-[90px] pointer-events-none" />
    </section>
  );
}
