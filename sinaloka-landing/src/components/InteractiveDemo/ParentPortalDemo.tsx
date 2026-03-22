import { motion } from "motion/react";
import { cn } from "../../lib/utils";

const CHILDREN = [
  {
    name: "Ahmad Fauzi",
    grade: "Kelas 9",
    attendance: "Hadir",
    attendanceColor: "bg-green-100 text-green-700",
  },
  {
    name: "Aisyah Fauzi",
    grade: "Kelas 7",
    attendance: "Belum mulai",
    attendanceColor: "bg-gray-100 text-gray-500",
  },
];

const SCHEDULE = [
  { day: "Senin", subject: "Matematika", time: "15:00–16:30" },
  { day: "Rabu", subject: "B. Inggris", time: "15:00–16:30" },
  { day: "Jumat", subject: "Fisika", time: "13:00–14:30" },
];

const PAYMENTS = [
  { month: "Maret 2026", status: "Lunas", statusColor: "bg-green-100 text-green-700" },
  { month: "April 2026", status: "Belum Bayar", statusColor: "bg-orange-100 text-orange-700" },
];

export default function ParentPortalDemo() {
  return (
    <div className="flex justify-center">
      {/* Phone frame */}
      <div className="w-[300px] rounded-[2.5rem] border-[6px] border-gray-800 bg-white overflow-hidden shadow-xl">
        {/* Phone notch */}
        <div className="bg-gray-800 h-7 flex justify-center">
          <div className="w-24 h-3.5 bg-gray-700 rounded-b-xl" />
        </div>

        {/* App content — auto-scrolling */}
        <div className="h-[480px] overflow-hidden relative">
          <motion.div
            animate={{ y: [0, -80, -80, 0] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.3, 0.7, 1],
            }}
            className="p-4 space-y-5"
          >
            {/* Header */}
            <div>
              <div className="text-xs text-gray-400">Selamat pagi 👋</div>
              <div className="text-base font-bold text-gray-900">Ibu Fauzi</div>
            </div>

            {/* Children cards */}
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Anak Saya</div>
              <div className="space-y-2">
                {CHILDREN.map((child) => (
                  <div key={child.name} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{child.name}</div>
                      <div className="text-[11px] text-gray-400">{child.grade}</div>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", child.attendanceColor)}>
                      {child.attendance}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Jadwal Minggu Ini</div>
              <div className="space-y-1.5">
                {SCHEDULE.map((s) => (
                  <div key={s.day} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <div className="text-xs font-medium text-gray-700">{s.subject}</div>
                      <div className="text-[10px] text-gray-400">{s.day}</div>
                    </div>
                    <div className="text-[11px] text-gray-500">{s.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pembayaran</div>
              <div className="space-y-2">
                {PAYMENTS.map((p) => (
                  <div key={p.month} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                    <div className="text-xs text-gray-700">{p.month}</div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", p.statusColor)}>
                      {p.status}
                    </span>
                  </div>
                ))}
                <button className="w-full rounded-lg bg-accent-600 py-2.5 text-xs font-semibold text-white">
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Phone home indicator */}
        <div className="bg-white py-2 flex justify-center">
          <div className="w-28 h-1 rounded-full bg-gray-300" />
        </div>
      </div>
    </div>
  );
}
