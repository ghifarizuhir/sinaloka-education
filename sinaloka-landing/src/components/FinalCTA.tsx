import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-accent-950 py-24 lg:py-32">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 opacity-[0.05]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="cta-dots"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="16" cy="16" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-dots)" />
        </svg>
      </div>
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[450px] h-[450px] rounded-full bg-accent-400/15 blur-[100px] pointer-events-none" />

      {/* Diagonal accent lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[100px] -left-[50px] w-[1px] h-[600px] bg-gradient-to-b from-transparent via-accent-400/15 to-transparent rotate-[-20deg]" />
        <div className="absolute -bottom-[100px] -right-[50px] w-[1px] h-[600px] bg-gradient-to-b from-transparent via-accent-300/10 to-transparent rotate-[-20deg]" />
      </div>

      <div className="relative z-10 max-w-[640px] mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Siap ngurusin bimbel
            <br />
            <span className="text-accent-400">tanpa pusing?</span>
          </h2>
          <p className="mt-6 text-accent-200/70 text-base md:text-lg">
            150+ bimbel sudah merasakan bedanya. Ceritakan kebutuhan Anda — kami
            bantu dari awal, gratis.
          </p>

          <div className="mt-10">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 bg-accent-500 hover:bg-accent-400 text-accent-950 font-semibold px-8 py-4 rounded-lg text-base transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Chat Sekarang via WhatsApp
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-accent-300/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Gratis untuk bimbel kecil
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Setup dibantu tim kami
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Batal kapan saja
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
