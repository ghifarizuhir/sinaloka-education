import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 4, y: -1 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 8, y: x * 6 });
  };

  const handleMouseLeave = () => setTilt({ x: 4, y: -1 });

  return (
    <section className="py-24 lg:py-32 pt-32 lg:pt-40 relative overflow-hidden">
      {/* Background ornaments */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-accent-100/30 blur-[120px] pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent-200/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-[350px] h-[350px] rounded-full bg-accent-100/25 blur-[80px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
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
              className="text-[#666] hover:text-accent-600 hover:border-accent-200 font-medium text-sm border border-[#E5E5E5] px-7 py-3.5 rounded-lg transition-all"
            >
              Lihat Fitur
            </a>
          </motion.div>

          {/* Micro trust */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6 text-xs text-[#999]"
          >
            Dipercaya 150+ bimbel di seluruh Indonesia
          </motion.p>
        </div>

        {/* Dashboard mock preview — 3D perspective */}
        <motion.div
          initial={{ opacity: 0, y: 48, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 max-w-[960px] mx-auto"
          style={{ perspective: 1200 }}
        >
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.3s ease-out",
              boxShadow: `0 ${20 + tilt.x * 4}px 60px -15px rgba(0,0,0,0.12), 0 ${10 + tilt.x * 2}px 30px -8px rgba(13,148,136,0.08)`,
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F0F0F0] bg-[#FAFAFA]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-white border border-[#E5E5E5] rounded-md px-3 py-1 text-[10px] text-[#999] text-center">
                  platform.sinaloka.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="flex">
              {/* Sidebar */}
              <div className="hidden sm:block w-44 bg-[#FAFAFA] border-r border-[#F0F0F0] p-3 shrink-0">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-6 h-6 rounded-md bg-accent-600 flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">S</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#111]">Sinaloka</span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[8px] font-semibold text-[#BBB] uppercase tracking-wider px-2 mb-1">General</div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-accent-50 text-accent-600">
                    <div className="w-3 h-3 rounded bg-accent-100" />
                    <span className="text-[9px] font-semibold">Dashboard</span>
                  </div>
                  <div className="text-[8px] font-semibold text-[#BBB] uppercase tracking-wider px-2 mt-3 mb-1">Academics</div>
                  {["Siswa", "Tutor", "Kelas"].map((item) => (
                    <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#999] hover:bg-[#F0F0F0]">
                      <div className="w-3 h-3 rounded bg-[#E5E5E5]" />
                      <span className="text-[9px]">{item}</span>
                    </div>
                  ))}
                  <div className="text-[8px] font-semibold text-[#BBB] uppercase tracking-wider px-2 mt-3 mb-1">Operations</div>
                  {["Jadwal", "Absensi"].map((item) => (
                    <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#999]">
                      <div className="w-3 h-3 rounded bg-[#E5E5E5]" />
                      <span className="text-[9px]">{item}</span>
                    </div>
                  ))}
                  <div className="text-[8px] font-semibold text-[#BBB] uppercase tracking-wider px-2 mt-3 mb-1">Finance</div>
                  {["Pembayaran", "Gaji Tutor"].map((item) => (
                    <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#999]">
                      <div className="w-3 h-3 rounded bg-[#E5E5E5]" />
                      <span className="text-[9px]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 sm:p-5 bg-white min-h-[280px] sm:min-h-[340px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[11px] text-[#999]">Selamat pagi, Admin 👋</div>
                    <div className="text-sm font-bold text-[#111]">Dashboard</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#F0F0F0]" />
                    <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-accent-700">A</span>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                  {[
                    { label: "Total Siswa", value: "342", change: "+12%", color: "bg-blue-50 text-blue-600", dot: "bg-blue-400" },
                    { label: "Tutor Aktif", value: "28", change: "+3", color: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-400" },
                    { label: "Kehadiran", value: "94%", change: "+2%", color: "bg-amber-50 text-amber-600", dot: "bg-amber-400" },
                    { label: "Pendapatan", value: "Rp 48jt", change: "+18%", color: "bg-violet-50 text-violet-600", dot: "bg-violet-400" },
                  ].map((stat) => (
                    <div key={stat.label} className={`rounded-lg p-2.5 sm:p-3 ${stat.color}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                        <span className="text-[8px] sm:text-[9px] opacity-70">{stat.label}</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold">{stat.value}</div>
                      <div className="text-[8px] opacity-60 mt-0.5">{stat.change} bulan ini</div>
                    </div>
                  ))}
                </div>

                {/* Bottom row: Activity + Sessions */}
                <div className="grid sm:grid-cols-[1.5fr,1fr] gap-3">
                  {/* Recent activity */}
                  <div className="rounded-lg border border-[#F0F0F0] p-3">
                    <div className="text-[10px] font-semibold text-[#111] mb-2">Aktivitas Terbaru</div>
                    <div className="space-y-2">
                      {[
                        { text: "Rina membayar SPP Maret", time: "2 min", dot: "bg-emerald-400" },
                        { text: "Kelas Matematika dimulai", time: "15 min", dot: "bg-blue-400" },
                        { text: "Tutor baru: Pak Ahmad", time: "1 jam", dot: "bg-violet-400" },
                        { text: "Absensi Fisika tercatat", time: "2 jam", dot: "bg-amber-400" },
                      ].map((item) => (
                        <div key={item.text} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                          <span className="text-[9px] text-[#444] flex-1 truncate">{item.text}</span>
                          <span className="text-[8px] text-[#BBB] shrink-0">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming sessions */}
                  <div className="hidden sm:block rounded-lg border border-[#F0F0F0] p-3">
                    <div className="text-[10px] font-semibold text-[#111] mb-2">Jadwal Hari Ini</div>
                    <div className="space-y-2">
                      {[
                        { subject: "Matematika", tutor: "Bu Sari", time: "09:00" },
                        { subject: "Fisika", tutor: "Pak Dedi", time: "10:30" },
                        { subject: "B. Inggris", tutor: "Ms. Rina", time: "13:00" },
                      ].map((s) => (
                        <div key={s.subject} className="flex items-center justify-between">
                          <div>
                            <div className="text-[9px] font-semibold text-[#111]">{s.subject}</div>
                            <div className="text-[8px] text-[#999]">{s.tutor}</div>
                          </div>
                          <div className="text-[9px] text-accent-600 font-medium bg-accent-50 px-1.5 py-0.5 rounded">
                            {s.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
