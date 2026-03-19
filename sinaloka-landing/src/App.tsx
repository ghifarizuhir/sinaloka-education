import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "motion/react";
import {
  Users,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Shield,
  MessageCircle,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Clock,
  Menu,
  X,
  TrendingUp,
  Zap,
  Phone,
} from "lucide-react";

const WA_LINK =
  "https://wa.me/62895358468523?text=Halo%2C%20saya%20tertarik%20dengan%20Sinaloka%20untuk%20bimbel%20saya";

/* ─── WhatsApp Icon ─── */
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.913.913l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.347 0-4.542-.673-6.405-1.828l-.447-.272-2.644.886.886-2.644-.272-.447A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  );
}

/* ─── Reveal on scroll ─── */
function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const initial = {
    opacity: 0,
    y: direction === "up" ? 32 : 0,
    x: direction === "left" ? -32 : direction === "right" ? 32 : 0,
  };
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Decorative Shape ─── */
function Shape({
  className,
  variant = "circle",
}: {
  className: string;
  variant?: "circle" | "ring" | "square" | "dots";
}) {
  if (variant === "ring")
    return (
      <div
        className={`rounded-full border-2 border-brand-300/30 ${className}`}
      />
    );
  if (variant === "square")
    return (
      <div className={`rounded-xl rotate-12 bg-brand-200/20 ${className}`} />
    );
  if (variant === "dots")
    return (
      <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-300/30" />
        ))}
      </div>
    );
  return <div className={`rounded-full bg-brand-200/25 ${className}`} />;
}

/* ═══════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-warm-50/85 backdrop-blur-xl shadow-[0_1px_0_0] shadow-warm-200/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-white font-display text-lg font-bold leading-none">
              S
            </span>
          </div>
          <span className="font-display text-xl text-warm-900 italic">
            Sinaloka
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-warm-500 tracking-wide">
          <a href="#features" className="hover:text-brand-600 transition-colors">Fitur</a>
          <a href="#results" className="hover:text-brand-600 transition-colors">Hasil</a>
          <a href="#pricing" className="hover:text-brand-600 transition-colors">Harga</a>
          <a href="#faq" className="hover:text-brand-600 transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-wa hover:bg-wa-dark text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all wa-glow"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Hubungi Kami
          </a>
        </div>

        <button
          className="md:hidden p-2 text-warm-700"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-warm-50/98 backdrop-blur-xl border-b border-warm-200 overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 space-y-1">
              {[
                { href: "#features", label: "Fitur" },
                { href: "#results", label: "Hasil" },
                { href: "#pricing", label: "Harga" },
                { href: "#faq", label: "FAQ" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-medium text-warm-700 py-3 border-b border-warm-100"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-wa text-white font-semibold text-sm px-5 py-3 rounded-full mt-4"
                onClick={() => setMobileOpen(false)}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Hubungi via WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   HERO — Asymmetric split layout
   ═══════════════════════════════════════════ */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden min-h-[90vh] flex items-center grain"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 20% 50%, oklch(0.94 0.05 180 / 0.5) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 85% 30%, oklch(0.92 0.06 160 / 0.3) 0%, transparent 60%),
          var(--color-warm-50)
        `,
      }}
    >
      {/* Floating shapes */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <Shape className="absolute top-24 right-[12%] w-40 h-40 float-slow" />
        <Shape className="absolute top-[60%] right-[8%] w-16 h-16 float-slower" variant="ring" />
        <Shape className="absolute top-32 left-[55%] w-10 h-10 float-slowest" variant="square" />
        <Shape className="absolute bottom-32 left-[45%] float-slow" variant="dots" />
        <Shape className="absolute bottom-20 right-[30%] w-6 h-6 float-slower" />
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-20 md:pt-32 md:pb-24 w-full">
        <div className="grid lg:grid-cols-[1fr,0.85fr] gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-brand-100/50 border border-brand-200/50 text-brand-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 tracking-wide"
            >
              <Shield size={13} />
              DIPERCAYA 150+ BIMBEL DI INDONESIA
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.05] tracking-tight text-warm-950"
            >
              Ngurusin bimbel
              <br />
              <em className="text-brand-500">nggak harus ribet.</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-5 text-base md:text-lg text-warm-500 max-w-lg leading-relaxed"
            >
              Jadwal, absensi, pembayaran, sampai laporan ke orang tua &mdash;
              semua beres dari satu tempat. Biar Anda fokus yang penting:{" "}
              <strong className="text-warm-800">mengajar.</strong>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 bg-wa hover:bg-wa-dark text-white font-semibold px-7 py-4 rounded-full text-base transition-all wa-glow"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Chat via WhatsApp
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </a>
              <a
                href="#features"
                className="text-warm-500 hover:text-brand-600 font-medium text-sm flex items-center gap-1.5 transition-colors"
              >
                Lihat Fitur
                <ChevronDown size={15} />
              </a>
            </motion.div>

            {/* Micro proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-10 flex items-center gap-2 text-xs text-warm-400"
            >
              <CheckCircle2 size={14} className="text-brand-500" />
              Gratis untuk bimbel kecil &middot; Setup 10 menit &middot; Tanpa kartu kredit
            </motion.div>
          </div>

          {/* Right — floating stat constellation */}
          <div className="relative hidden lg:block h-[480px]">
            {/* Stat cards — deliberately staggered, not in a grid */}
            <motion.div
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="absolute top-4 left-8 bg-white/80 backdrop-blur-lg border border-warm-200/50 rounded-2xl p-5 shadow-xl shadow-warm-900/5 w-52 float-slow"
            >
              <GraduationCap size={20} className="text-brand-500 mb-2" />
              <div className="font-display text-3xl text-warm-900">150+</div>
              <div className="text-xs text-warm-500 mt-0.5">Bimbel Terdaftar</div>
              <div className="mt-3 h-1.5 rounded-full bg-warm-100 overflow-hidden">
                <div className="h-full w-[78%] rounded-full bg-brand-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, rotate: 1 }}
              animate={{ opacity: 1, y: 0, rotate: 1 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="absolute top-8 right-0 bg-white/80 backdrop-blur-lg border border-warm-200/50 rounded-2xl p-5 shadow-xl shadow-warm-900/5 w-48 float-slower"
            >
              <Users size={20} className="text-brand-500 mb-2" />
              <div className="font-display text-3xl text-warm-900">12rb+</div>
              <div className="text-xs text-warm-500 mt-0.5">Siswa Dikelola</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-brand-600 font-medium">
                <TrendingUp size={12} /> +24% bulan ini
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 2 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="absolute top-48 left-0 bg-brand-500 text-white rounded-2xl p-5 shadow-xl shadow-brand-500/20 w-56 float-slowest"
            >
              <Clock size={20} className="text-brand-200 mb-2" />
              <div className="font-display text-3xl">3 jam</div>
              <div className="text-xs text-brand-200 mt-0.5">
                Admin terhemat per hari
              </div>
              <div className="mt-3 text-[10px] text-brand-200/70 border-t border-brand-400/30 pt-2">
                Rata-rata dari data pengguna kami
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: -1 }}
              transition={{ delay: 0.75, duration: 0.7 }}
              className="absolute bottom-12 right-4 bg-white/80 backdrop-blur-lg border border-warm-200/50 rounded-2xl p-5 shadow-xl shadow-warm-900/5 w-52 float-slow"
            >
              <CheckCircle2 size={20} className="text-brand-500 mb-2" />
              <div className="font-display text-3xl text-warm-900">98%</div>
              <div className="text-xs text-warm-500 mt-0.5">
                Puas & lanjut berlangganan
              </div>
            </motion.div>

            {/* Connecting decorative line */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 480"
              fill="none"
            >
              <path
                d="M120 80 C200 120, 280 100, 340 80 C380 160, 200 200, 100 260 C60 320, 200 360, 300 400"
                stroke="oklch(0.88 0.08 180 / 0.3)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            </svg>
          </div>
        </div>

        {/* Mobile stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="lg:hidden grid grid-cols-2 gap-3 mt-10"
        >
          {[
            { val: "150+", label: "Bimbel", icon: GraduationCap },
            { val: "12rb+", label: "Siswa", icon: Users },
            { val: "3 jam", label: "Terhemat/hari", icon: Clock },
            { val: "98%", label: "Puas", icon: CheckCircle2 },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/70 backdrop-blur border border-warm-200/50 rounded-xl p-4 flex items-center gap-3"
            >
              <s.icon size={18} className="text-brand-500 shrink-0" />
              <div>
                <div className="font-display text-xl text-warm-900 leading-none">
                  {s.val}
                </div>
                <div className="text-[11px] text-warm-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   PROBLEM — Dark angled section
   ═══════════════════════════════════════════ */
function ProblemSection() {
  const pains = [
    { text: "Data siswa tercecer di spreadsheet", icon: "📋" },
    { text: "Jadwal bentrok karena koordinasi manual", icon: "📅" },
    { text: "Orang tua komplain — nggak tahu progress anak", icon: "😤" },
    { text: "Gaji tutor salah hitung tiap bulan", icon: "💸" },
    { text: "Pembayaran siswa susah dilacak", icon: "🔍" },
    { text: "Waktu habis buat admin, bukan mengajar", icon: "⏰" },
  ];

  return (
    <section className="bg-brand-950 diagonal-top diagonal-bottom grain relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.15) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 md:py-28">
        <div className="grid lg:grid-cols-[1fr,1.2fr] gap-12 lg:gap-20 items-center">
          {/* Left — heading */}
          <Reveal direction="left">
            <p className="text-brand-400 font-semibold text-xs tracking-[0.15em] uppercase mb-4">
              Kenal nggak?
            </p>
            <h2 className="font-display text-3xl md:text-[2.75rem] leading-[1.1] text-white">
              Masih pakai spreadsheet
              <br />
              <em className="text-brand-300">& WhatsApp group?</em>
            </h2>
            <p className="mt-5 text-brand-300/60 text-base leading-relaxed max-w-md">
              Kebanyakan pemilik bimbel masih kelola semuanya manual. Hasilnya?
              Waktu habis buat administrasi, bukan untuk hal yang paling penting.
            </p>
          </Reveal>

          {/* Right — pain cards, staggered 2-col */}
          <div className="grid grid-cols-2 gap-3">
            {pains.map((pain, i) => (
              <Reveal
                key={i}
                delay={i * 0.07}
                className={i % 3 === 0 ? "col-span-2 sm:col-span-1" : ""}
              >
                <div className="bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3.5 flex items-start gap-3 hover:bg-white/[0.07] transition-colors">
                  <span className="text-lg leading-none mt-0.5 shrink-0">
                    {pain.icon}
                  </span>
                  <span className="text-sm text-white/70 leading-snug">
                    {pain.text}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FEATURES — Bento grid
   ═══════════════════════════════════════════ */
function FeaturesSection() {
  const features = [
    {
      icon: Users,
      title: "Siswa & Tutor",
      desc: "Semua data rapi di satu tempat. Enrollment, profil, progress — tinggal klik.",
      color: "bg-brand-50 border-brand-100",
      iconColor: "text-brand-600",
      span: "md:col-span-2 lg:col-span-1",
    },
    {
      icon: CalendarCheck,
      title: "Jadwal & Absensi",
      desc: "Atur jadwal, kirim reminder otomatis, catat kehadiran real-time. Nggak ada yang terlewat.",
      color: "bg-white border-warm-200/60",
      iconColor: "text-brand-600",
      span: "",
    },
    {
      icon: CreditCard,
      title: "Pembayaran & Gaji",
      desc: "Tagihan otomatis, terima bayaran online, hitung gaji tutor tanpa Excel. Transparan.",
      color: "bg-brand-500 border-brand-500",
      iconColor: "text-brand-200",
      isHighlight: true,
      span: "",
    },
    {
      icon: MessageCircle,
      title: "Portal Orang Tua",
      desc: "Orang tua pantau kehadiran, jadwal, dan pembayaran langsung dari HP. Mereka tenang, Anda tenang.",
      color: "bg-white border-warm-200/60",
      iconColor: "text-brand-600",
      span: "lg:col-span-2",
    },
    {
      icon: BarChart3,
      title: "Laporan & Analitik",
      desc: "Dashboard visual: pendapatan, kehadiran, growth siswa. Keputusan berdasarkan data, bukan feeling.",
      color: "bg-warm-100/50 border-warm-200/40",
      iconColor: "text-brand-600",
      span: "",
    },
    {
      icon: Shield,
      title: "Aman & Multi-Cabang",
      desc: "Data tiap cabang terisolasi. Mau expand? Tinggal tambah — kelola dari satu akun.",
      color: "bg-white border-warm-200/60",
      iconColor: "text-brand-600",
      span: "",
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[0.4fr,1fr] gap-12 lg:gap-20">
          {/* Left — sticky heading */}
          <Reveal direction="left" className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-brand-600 font-semibold text-xs tracking-[0.15em] uppercase mb-4">
              Fitur Lengkap
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-warm-900 leading-tight">
              Semua yang bimbel
              <br />
              Anda butuhkan,
              <br />
              <em className="text-brand-500">dalam satu tempat.</em>
            </h2>
            <p className="mt-4 text-warm-500 text-sm leading-relaxed max-w-xs">
              Dirancang khusus untuk operasional bimbingan belajar — bukan
              software generik yang dipaksakan.
            </p>
          </Reveal>

          {/* Right — bento grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 0.06}
                className={f.span}
              >
                <div
                  className={`group rounded-2xl p-6 border transition-all duration-300 h-full ${
                    f.color
                  } ${
                    (f as { isHighlight?: boolean }).isHighlight
                      ? "shadow-xl shadow-brand-500/15 hover:shadow-2xl hover:shadow-brand-500/20"
                      : "hover:shadow-lg hover:shadow-warm-900/5 hover:-translate-y-0.5"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      (f as { isHighlight?: boolean }).isHighlight
                        ? "bg-white/15"
                        : "bg-brand-100/60 border border-brand-200/40"
                    }`}
                  >
                    <f.icon
                      size={20}
                      className={
                        (f as { isHighlight?: boolean }).isHighlight
                          ? "text-white"
                          : f.iconColor
                      }
                    />
                  </div>
                  <h3
                    className={`font-semibold text-base mb-1.5 ${
                      (f as { isHighlight?: boolean }).isHighlight
                        ? "text-white"
                        : "text-warm-900"
                    }`}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      (f as { isHighlight?: boolean }).isHighlight
                        ? "text-brand-100"
                        : "text-warm-500"
                    }`}
                  >
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   HOW IT WORKS — Horizontal cards
   ═══════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Chat kami via WhatsApp",
      desc: "Ceritakan kebutuhan bimbel Anda. Kami bantu setup dari awal — gratis.",
      icon: Phone,
    },
    {
      num: "02",
      title: "Kami setup-kan untuk Anda",
      desc: "Tim kami input data, atur jadwal, dan pastikan semuanya siap pakai. Anda tinggal jalan.",
      icon: Zap,
    },
    {
      num: "03",
      title: "Bimbel jalan, Anda fokus mengajar",
      desc: "Absensi otomatis, pembayaran terlacak, orang tua bisa pantau sendiri. Semua beres.",
      icon: GraduationCap,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-warm-100/40 relative overflow-hidden">
      <Shape className="absolute -top-20 -right-20 w-72 h-72 opacity-40" />
      <Shape
        className="absolute bottom-10 -left-16 w-48 h-48 opacity-30"
        variant="ring"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal className="text-center max-w-xl mx-auto mb-16">
          <p className="text-brand-600 font-semibold text-xs tracking-[0.15em] uppercase mb-4">
            Cara Mulai
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-warm-900 leading-tight">
            3 langkah,{" "}
            <em className="text-brand-500">langsung jalan.</em>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="absolute top-12 left-[16.67%] right-[16.67%] h-px bg-brand-200/50 hidden md:block" />

          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.12}>
              <div className="relative bg-white rounded-2xl p-7 border border-warm-200/50 shadow-sm hover:shadow-md transition-shadow">
                {/* Step number circle */}
                <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-display text-lg flex items-center justify-center mb-5 relative z-10">
                  {step.num}
                </div>
                <step.icon
                  size={18}
                  className="text-brand-400 mb-3"
                />
                <h3 className="font-semibold text-warm-900 text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-warm-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   OUTCOME METRICS — Big number asymmetric grid
   ═══════════════════════════════════════════ */
function OutcomeMetrics() {
  const metrics = [
    {
      number: "3 jam",
      unit: "/hari",
      label: "Waktu admin yang terhemat",
      note: "Rata-rata dari data pengguna aktif",
    },
    {
      number: "85%",
      unit: "",
      label: "Lebih sedikit kesalahan tagihan",
      note: "Dibanding proses manual",
    },
    {
      number: "2x",
      unit: "",
      label: "Lebih cepat follow-up orang tua",
      note: "Dengan portal orang tua real-time",
    },
    {
      number: "10",
      unit: "menit",
      label: "Setup sampai siap pakai",
      note: "Dibantu langsung oleh tim kami",
    },
  ];

  return (
    <section id="results" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50/40 via-warm-50 to-brand-50/20" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal className="mb-16">
          <p className="text-brand-600 font-semibold text-xs tracking-[0.15em] uppercase mb-4">
            Hasil Nyata
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-warm-900 leading-tight max-w-lg">
            Bukan janji kosong.
            <br />
            <em className="text-brand-500">Ini data dari pengguna kami.</em>
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div
                className={`rounded-2xl p-6 h-full ${
                  i === 0
                    ? "bg-brand-500 text-white sm:row-span-1"
                    : "bg-white border border-warm-200/50"
                }`}
              >
                <div
                  className={`font-display text-4xl md:text-5xl leading-none ${
                    i === 0 ? "text-white" : "text-warm-900"
                  }`}
                >
                  {m.number}
                  {m.unit && (
                    <span
                      className={`text-lg font-body ml-1 ${
                        i === 0 ? "text-brand-200" : "text-warm-400"
                      }`}
                    >
                      {m.unit}
                    </span>
                  )}
                </div>
                <div
                  className={`mt-3 text-sm font-medium ${
                    i === 0 ? "text-brand-100" : "text-warm-700"
                  }`}
                >
                  {m.label}
                </div>
                <div
                  className={`mt-2 text-[11px] ${
                    i === 0 ? "text-brand-200/60" : "text-warm-400"
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

/* ═══════════════════════════════════════════
   PRICING — Asymmetric with highlight offset
   ═══════════════════════════════════════════ */
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "Gratis",
      period: "",
      desc: "Untuk bimbel kecil yang baru mulai go digital",
      features: [
        "Hingga 50 siswa",
        "1 admin, 5 tutor",
        "Jadwal & absensi",
        "Portal orang tua",
        "Email support",
      ],
      cta: "Tanya via WhatsApp",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "Rp 299rb",
      period: "/bulan",
      desc: "Bimbel yang berkembang dan butuh kontrol penuh",
      features: [
        "Siswa unlimited",
        "Admin & tutor unlimited",
        "Pembayaran online",
        "Laporan & analitik",
        "Multi-cabang (hingga 3)",
        "WhatsApp integration",
        "Priority support",
      ],
      cta: "Chat untuk Demo",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "Jaringan bimbel besar dengan kebutuhan khusus",
      features: [
        "Semua fitur Professional",
        "Cabang unlimited",
        "Custom integration",
        "Dedicated account manager",
        "SLA guarantee",
        "Onboarding & training",
      ],
      cta: "Hubungi Kami",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-warm-100/40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <Reveal className="mb-16">
          <p className="text-brand-600 font-semibold text-xs tracking-[0.15em] uppercase mb-4">
            Harga Transparan
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-warm-900 leading-tight">
            Investasi kecil,
            <br />
            <em className="text-brand-500">dampak besar untuk bimbel Anda.</em>
          </h2>
          <p className="mt-3 text-warm-500 text-sm">
            Mulai gratis. Upgrade kapan saja. Tanpa biaya tersembunyi.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.1}>
              <div
                className={`rounded-2xl p-7 flex flex-col transition-all ${
                  plan.highlighted
                    ? "bg-brand-950 text-white shadow-2xl shadow-brand-950/20 md:-mt-4 md:mb-4 ring-1 ring-brand-400/20"
                    : "bg-white border border-warm-200/50 shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-400 mb-4">
                    Paling Populer
                  </div>
                )}
                <div
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    plan.highlighted ? "text-brand-300" : "text-brand-600"
                  }`}
                >
                  {!plan.highlighted && plan.name}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className={`font-display text-4xl ${
                      plan.highlighted ? "text-white" : "text-warm-900"
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm ${
                        plan.highlighted ? "text-brand-300" : "text-warm-400"
                      }`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm ${
                    plan.highlighted ? "text-brand-300/70" : "text-warm-500"
                  }`}
                >
                  {plan.desc}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        size={15}
                        className={`mt-0.5 shrink-0 ${
                          plan.highlighted ? "text-brand-400" : "text-brand-500"
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? "text-white/80" : "text-warm-600"
                        }
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-7 flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-full transition-all ${
                    plan.highlighted
                      ? "bg-wa hover:bg-wa-dark text-white wa-glow"
                      : "bg-brand-500 hover:bg-brand-600 text-white"
                  }`}
                >
                  {plan.highlighted && <WhatsAppIcon className="w-4 h-4" />}
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FAQ — Split layout
   ═══════════════════════════════════════════ */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    {
      q: "Apakah data bimbel saya aman?",
      a: "Sangat aman. Kami pakai enkripsi dan server tersertifikasi. Data setiap lembaga terisolasi — nggak ada yang bisa akses data Anda kecuali Anda sendiri.",
    },
    {
      q: "Berapa lama proses setup?",
      a: "10 menit untuk setup dasar. Kalau Anda punya data di spreadsheet, tim kami bantu import — biasanya selesai dalam 1 hari.",
    },
    {
      q: "Tutor dan orang tua perlu download app?",
      a: "Nggak perlu. Sinaloka bisa diakses langsung dari browser HP. Cukup buka link, login, selesai.",
    },
    {
      q: "Bisa untuk bimbel multi-cabang?",
      a: "Bisa! Paket Professional support hingga 3 cabang, Enterprise untuk unlimited. Semua dimonitor dari satu dashboard.",
    },
    {
      q: "Bagaimana kalau saya nggak puas?",
      a: "Mulai aja gratis tanpa kartu kredit. Untuk paket berbayar, ada jaminan uang kembali 30 hari — no questions asked.",
    },
  ];

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[0.4fr,1fr] gap-12 lg:gap-20">
          {/* Left */}
          <Reveal direction="left" className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-brand-600 font-semibold text-xs tracking-[0.15em] uppercase mb-4">
              FAQ
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-warm-900 leading-tight">
              Ada pertanyaan?
              <br />
              <em className="text-brand-500">Kami jawab.</em>
            </h2>
            <p className="mt-4 text-warm-500 text-sm leading-relaxed max-w-xs">
              Masih ragu atau butuh info lebih? Chat langsung aja — kami senang
              bantu.
            </p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-wa hover:text-wa-dark transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Chat langsung
              <ArrowRight size={14} />
            </a>
          </Reveal>

          {/* Right — accordion */}
          <div className="space-y-2.5">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div
                  className={`rounded-xl border transition-colors ${
                    open === i
                      ? "bg-white border-brand-200/50 shadow-sm"
                      : "bg-white/50 border-warm-200/40 hover:bg-white"
                  }`}
                >
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-medium text-warm-800 text-sm pr-4">
                      {faq.q}
                    </span>
                    <motion.div
                      animate={{ rotate: open === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={18} className="text-warm-400 shrink-0" />
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
                        <p className="px-6 pb-5 text-sm text-warm-500 leading-relaxed">
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
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FINAL CTA — Full-width dark section
   ═══════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="bg-brand-950 diagonal-top grain relative overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.3) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full bg-brand-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 lg:px-10 py-24 md:py-32 text-center">
        <Reveal>
          <h2 className="font-display text-4xl md:text-6xl text-white leading-[1.08]">
            Siap ngurusin bimbel
            <br />
            <em className="text-brand-300">tanpa pusing?</em>
          </h2>
          <p className="mt-6 text-brand-300/60 text-base md:text-lg max-w-xl mx-auto">
            150+ bimbel sudah merasakan bedanya. Ceritakan kebutuhan Anda — kami
            bantu dari awal, gratis.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 bg-wa hover:bg-wa-dark text-white font-semibold px-8 py-4 rounded-full text-base transition-all wa-glow"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Chat Sekarang via WhatsApp
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-brand-300/40">
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

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-brand-950 border-t border-white/5 py-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-white font-display text-lg font-bold leading-none">
                  S
                </span>
              </div>
              <span className="font-display text-xl text-white italic">
                Sinaloka
              </span>
            </a>
            <p className="mt-3 text-sm text-brand-300/40 leading-relaxed max-w-xs">
              Platform manajemen bimbingan belajar #1 di Indonesia.
            </p>
          </div>

          {[
            {
              title: "Produk",
              links: [
                { label: "Fitur", href: "#features" },
                { label: "Harga", href: "#pricing" },
                { label: "FAQ", href: "#faq" },
              ],
            },
            {
              title: "Perusahaan",
              links: [
                { label: "Tentang Kami", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Kontak", href: WA_LINK },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Kebijakan Privasi", href: "#" },
                { label: "Syarat & Ketentuan", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold text-brand-300/50 uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-brand-300/40 hover:text-brand-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-brand-300/25">
            &copy; {new Date().getFullYear()} Sinaloka. Hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-6 text-[11px] text-brand-300/25">
            <a href="#" className="hover:text-brand-300/50 transition-colors">
              Instagram
            </a>
            <a href="#" className="hover:text-brand-300/50 transition-colors">
              LinkedIn
            </a>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-300/50 transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   FLOATING WA BUTTON
   ═══════════════════════════════════════════ */
function FloatingWA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-wa flex items-center justify-center text-white shadow-xl wa-pulse hover:bg-wa-dark transition-colors"
          aria-label="Chat via WhatsApp"
        >
          <WhatsAppIcon className="w-7 h-7" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   APP
   ═══════════════════════════════════════════ */
export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorks />
      <OutcomeMetrics />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingWA />
    </div>
  );
}
