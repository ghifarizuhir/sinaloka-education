import { motion } from "motion/react";

const PARTNERS = [
  "Bimbel Cerdas Ilmu",
  "Bimbel Karya Pintar",
  "Bimbel Maju Bersama",
  "Bimbel Tunas Harapan",
  "Bimbel Cahaya Prestasi",
  "Bimbel Generasi Unggul",
  "Bimbel Sinar Edukasi",
  "Bimbel Rajawali",
  "Bimbel Prestasi Gemilang",
  "Bimbel Cipta Ilmu",
  "Bimbel Lentera Bangsa",
  "Bimbel Karsa Mandiri",
];

function MarqueeRow({
  direction = "left",
  speed = 35,
}: {
  direction?: "left" | "right";
  speed?: number;
}) {
  const list = [...PARTNERS, ...PARTNERS];
  const from = direction === "left" ? "0%" : "-50%";
  const to = direction === "left" ? "-50%" : "0%";

  return (
    <motion.div
      className="flex items-center gap-8 whitespace-nowrap"
      animate={{ x: [from, to] }}
      transition={{
        x: {
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        },
      }}
    >
      {list.map((name, i) => (
        <div
          key={`${name}-${i}`}
          className="flex items-center gap-8 shrink-0"
        >
          <span className="text-base font-bold text-[#C0C0C0] tracking-wide uppercase">
            {name}
          </span>
          <span className="text-accent-400/40 text-lg select-none">&bull;</span>
        </div>
      ))}
    </motion.div>
  );
}

export function PartnerMarquee() {
  return (
    <section className="relative bg-accent-950 py-10 overflow-hidden">
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-accent-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-accent-950 to-transparent z-10 pointer-events-none" />

      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-400/50 mb-6">
        Dipercaya Bimbel di Seluruh Indonesia
      </p>

      <div className="space-y-4">
        <MarqueeRow direction="left" speed={35} />
        <MarqueeRow direction="right" speed={40} />
      </div>
    </section>
  );
}
