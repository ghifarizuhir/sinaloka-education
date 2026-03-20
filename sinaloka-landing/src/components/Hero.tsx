import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function Hero() {
  return (
    <section className="py-24 lg:py-32 pt-32 lg:pt-40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        {/* Centered text content */}
        <div className="max-w-[720px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center bg-accent-50 border border-accent-100 text-accent-600 text-xs font-medium px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase"
          >
            Platform Manajemen Bimbel #1
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-[#111]"
          >
            Ngurusin bimbel
            <br />
            nggak harus ribet.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 text-lg text-[#666] max-w-[480px] mx-auto leading-relaxed"
          >
            Jadwal, absensi, pembayaran, sampai laporan ke orang tua &mdash;
            semua beres dari satu tempat.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-7 py-3.5 rounded-lg text-base transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Hubungi Kami
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
            <a
              href="#features"
              className="text-[#666] hover:text-accent-600 font-medium text-sm border border-[#E5E5E5] px-7 py-3.5 rounded-lg transition-colors"
            >
              Lihat Fitur
            </a>
          </motion.div>
        </div>

        {/* Product screenshot placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 max-w-[960px] mx-auto"
        >
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-lg">
            <div className="bg-[#F8F8F8] rounded-lg aspect-video flex items-center justify-center text-[#999] text-sm">
              Dashboard Preview
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
