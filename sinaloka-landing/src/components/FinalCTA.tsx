import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "./shared/Reveal";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function FinalCTA() {
  return (
    <section className="bg-[#111] py-24 lg:py-32">
      <div className="max-w-[640px] mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Siap ngurusin bimbel tanpa pusing?
          </h2>
          <p className="mt-6 text-white/50 text-base md:text-lg">
            150+ bimbel sudah merasakan bedanya. Ceritakan kebutuhan Anda — kami
            bantu dari awal, gratis.
          </p>

          <div className="mt-10">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-8 py-4 rounded-lg text-base transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Chat Sekarang via WhatsApp
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
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
