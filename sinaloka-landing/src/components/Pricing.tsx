import { Reveal } from "./shared/Reveal";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
      <circle cx="9" cy="9" r="9" fill="#E6FAF2" />
      <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
      <circle cx="9" cy="9" r="9" fill="#F3F4F6" />
      <path d="M6 9H12" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
      <circle cx="9" cy="9" r="9" fill="#FFF7ED" />
      <circle cx="9" cy="9" r="4" stroke="#F59E0B" strokeWidth="1.2" />
      <path d="M9 7.5V9L10 10" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature data (inline)                                              */
/* ------------------------------------------------------------------ */

type FeatureIcon = "check" | "dash" | "clock";

interface Feature {
  text: string;
  icon: FeatureIcon;
  note?: string;
  bold?: boolean;
  highlight?: boolean;
}

const features: Record<string, Feature[]> = {
  starter: [
    { text: "Hingga 40 siswa", icon: "check" },
    { text: "Hingga 5 tutor", icon: "check" },
    { text: "1 admin", icon: "check" },
    { text: "Jadwal, kelas & absensi", icon: "check" },
    { text: "Enrollment lifecycle", icon: "check" },
    { text: "Pembayaran online (QRIS, VA)", icon: "check" },
    { text: "Orang tua bayar via app", icon: "check" },
    { text: "Invoice PDF otomatis", icon: "check" },
    { text: "Gaji tutor + slip PDF", icon: "check" },
    { text: "Catat pengeluaran", icon: "check" },
    { text: "App tutor & orang tua", icon: "check" },
    { text: "Landing page bimbel", icon: "check" },
    { text: "WA reminder (manual)", icon: "check" },
    { text: "WA auto-reminder harian", icon: "dash", note: "Hanya di Growth" },
    { text: "Laporan PDF & CSV export", icon: "dash", note: "Hanya di Growth" },
    { text: "Analitik keuangan", icon: "dash", note: "Hanya di Growth" },
  ],
  growth: [
    { text: "Hingga 100 siswa", icon: "check" },
    { text: "Hingga 15 tutor", icon: "check" },
    { text: "3 admin", icon: "check" },
    { text: "Semua fitur Starter", icon: "check", bold: true },
    { text: "WA auto-reminder harian", icon: "check", highlight: true },
    { text: "Billing per sesi & bulanan", icon: "check", highlight: true },
    { text: "Pengeluaran berulang otomatis", icon: "check", highlight: true },
    { text: "Laporan PDF (absensi, keuangan)", icon: "check", highlight: true },
    { text: "CSV export lengkap", icon: "check", highlight: true },
    { text: "Analitik keuangan & breakdown", icon: "check", highlight: true },
    { text: "Audit trail lengkap", icon: "check", highlight: true },
    { text: "Bilingual (ID + EN)", icon: "check" },
    { text: "Settings lengkap (billing, akademik)", icon: "check" },
    { text: "Priority support via WhatsApp", icon: "check" },
  ],
  business: [
    { text: "Siswa & tutor unlimited", icon: "check" },
    { text: "Admin unlimited", icon: "check" },
    { text: "Semua fitur Growth", icon: "check", bold: true },
    { text: "Assessment kompetensi tutor", icon: "clock" },
    { text: "Badge verified per mapel", icon: "clock" },
    { text: "Bank soal eksakta SMA", icon: "clock" },
    { text: "AI gap analysis siswa", icon: "clock" },
    { text: "Multi-cabang", icon: "clock" },
    { text: "Dedicated onboarding", icon: "clock" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Icon resolver                                                      */
/* ------------------------------------------------------------------ */

function IconComponent({ type }: { type: FeatureIcon }) {
  if (type === "check") return <CheckIcon />;
  if (type === "dash") return <DashIcon />;
  if (type === "clock") return <ClockIcon />;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Pricing() {
  return (
    <section id="harga" className="relative py-20 px-4 overflow-hidden" style={{ background: "#FAFBFC" }}>
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <Reveal className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-5"
            style={{ background: "#E6FAF2", color: "#059669", letterSpacing: "0.12em" }}
          >
            Harga Transparan
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" style={{ lineHeight: 1.2 }}>
            Mulai gratis 2 bulan.
            <br />
            <span style={{ color: "#059669" }}>Bayar kalau sudah cocok.</span>
          </h2>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Semua paket termasuk pembayaran online — orang tua bayar langsung via QRIS &amp; Virtual Account. Tanpa
            biaya tersembunyi.
          </p>
        </Reveal>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* STARTER */}
          <Reveal delay={0}>
            <div
              className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col h-full"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="mb-6">
                <span
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: "#6B7280", letterSpacing: "0.1em" }}
                >
                  Starter
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-gray-900">Rp 199rb</span>
                  <span className="text-gray-400 text-sm">/bulan</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  Untuk bimbel yang baru mulai go digital. Semua kebutuhan operasional harian.
                </p>
              </div>

              {/* Trial badge */}
              <div
                className="rounded-lg px-3 py-2.5 mb-6 flex items-center gap-2"
                style={{ background: "#ECFDF5", border: "1px solid #D1FAE5" }}
              >
                <span style={{ fontSize: "16px" }}>🎁</span>
                <span className="text-xs font-medium" style={{ color: "#065F46" }}>
                  Gratis 2 bulan pertama — langsung aktif
                </span>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {features.starter.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <IconComponent type={f.icon} />
                    <span className={cn("text-sm", f.icon === "dash" ? "text-gray-400" : "text-gray-700")}>
                      {f.text}
                      {f.note && <span className="text-xs text-gray-400 ml-1">({f.note})</span>}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all bg-gray-900 hover:bg-gray-800 text-white"
              >
                Coba Gratis 2 Bulan
              </a>
            </div>
          </Reveal>

          {/* GROWTH — highlighted */}
          <Reveal delay={0.1}>
            <div
              className="relative bg-white rounded-2xl p-7 flex flex-col h-full"
              style={{
                border: "2px solid #059669",
                boxShadow: "0 8px 30px rgba(5, 150, 105, 0.12), 0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Popular badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="px-4 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ background: "#059669", letterSpacing: "0.05em" }}
                >
                  PALING POPULER
                </span>
              </div>

              <div className="mb-6">
                <span
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: "#059669", letterSpacing: "0.1em" }}
                >
                  Growth
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-gray-900">Rp 399rb</span>
                  <span className="text-gray-400 text-sm">/bulan</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  Untuk bimbel yang berkembang. Automation mengurangi kerjaan manual.
                </p>
              </div>

              {/* Trial badge */}
              <div
                className="rounded-lg px-3 py-2.5 mb-6 flex items-center gap-2"
                style={{ background: "#ECFDF5", border: "1px solid #D1FAE5" }}
              >
                <span style={{ fontSize: "16px" }}>🎁</span>
                <span className="text-xs font-medium" style={{ color: "#065F46" }}>
                  Gratis 2 bulan pertama — langsung aktif
                </span>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {features.growth.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <IconComponent type={f.icon} />
                    <span
                      className={cn(
                        "text-sm",
                        f.bold && "font-semibold text-gray-900",
                        f.highlight ? "text-gray-800" : "text-gray-700"
                      )}
                    >
                      {f.text}
                      {f.highlight && (
                        <span
                          className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: "#ECFDF5", color: "#059669" }}
                        >
                          BARU
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all text-white"
                style={{ background: "#059669" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#047857")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#059669")}
              >
                Coba Gratis 2 Bulan
              </a>
            </div>
          </Reveal>

          {/* BUSINESS — coming soon */}
          <Reveal delay={0.2}>
            <div
              className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col h-full relative overflow-hidden"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              {/* Coming soon overlay pattern */}
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-5"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, #6B7280, #6B7280 2px, transparent 2px, transparent 12px)",
                }}
              />

              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "#6B7280", letterSpacing: "0.1em" }}
                  >
                    Business
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold"
                    style={{ background: "#FFF7ED", color: "#D97706" }}
                  >
                    SEGERA HADIR
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-gray-400">TBA</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  Assessment tutor, AI gap analysis siswa, dan multi-cabang. Sedang dikembangkan.
                </p>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {features.business.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <IconComponent type={f.icon} />
                    <span
                      className={cn(
                        "text-sm",
                        f.bold && "font-semibold text-gray-900",
                        f.icon === "clock" ? "text-gray-400" : "text-gray-700"
                      )}
                    >
                      {f.text}
                      {f.icon === "clock" && <span className="text-xs text-amber-500 ml-1">(coming soon)</span>}
                    </span>
                  </div>
                ))}
              </div>

              <button
                disabled
                className="mt-8 block w-full text-center py-3.5 rounded-xl font-semibold text-sm cursor-not-allowed"
                style={{ background: "#F3F4F6", color: "#9CA3AF" }}
              >
                Segera Hadir
              </button>
            </div>
          </Reveal>
        </div>

        {/* Bottom notes */}
        <Reveal className="mt-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1L10.2 5.5L15 6.2L11.5 9.6L12.4 14.4L8 12.1L3.6 14.4L4.5 9.6L1 6.2L5.8 5.5L8 1Z"
                  fill="#F59E0B"
                />
              </svg>
              Semua paket termasuk pembayaran online
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="14" rx="3" stroke="#9CA3AF" strokeWidth="1.2" />
                <path
                  d="M4.5 8L7 10.5L11.5 5.5"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Tanpa kontrak — berhenti kapan saja
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                  stroke="#9CA3AF"
                  strokeWidth="1.2"
                />
                <path d="M8 5V8L10 10" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Setup kurang dari 15 menit
            </span>
          </div>
        </Reveal>

        {/* CTA bottom */}
        <Reveal className="mt-10 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Masih ragu? Jadwalkan demo 15 menit — kami tunjukkan langsung.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 hover:border-gray-400"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Chat untuk Demo
          </a>
        </Reveal>
      </div>
    </section>
  );
}
