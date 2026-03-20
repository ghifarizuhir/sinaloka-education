import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { FAQ_ITEMS } from "../lib/constants";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-accent-600 font-medium text-xs tracking-[0.15em] uppercase mb-4">
            FAQ
          </p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold leading-tight text-[#111]">
            Ada pertanyaan? Kami jawab.
          </h2>
          <p className="mt-4 text-[#666] text-sm leading-relaxed">
            Masih ragu atau butuh info lebih? Chat langsung aja — kami senang bantu.
          </p>
        </Reveal>

        <div className="max-w-[720px] mx-auto space-y-0 divide-y divide-[#E5E5E5]">
          {FAQ_ITEMS.map((faq, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span
                    className={`font-semibold text-base pr-4 transition-colors ${
                      open === i ? "text-accent-600" : "text-[#111]"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={18} className="text-[#999] shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm text-[#666] leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
