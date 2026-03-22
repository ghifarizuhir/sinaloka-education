import { motion } from "motion/react";
import { Users, GraduationCap, CalendarCheck, Wallet } from "lucide-react";
import { cn } from "../../lib/utils";

const STATS = [
  { label: "Total Siswa", value: "—", icon: Users, color: "bg-blue-50 text-blue-600" },
  { label: "Tutor Aktif", value: "—", icon: GraduationCap, color: "bg-purple-50 text-purple-600" },
  { label: "Kehadiran Hari Ini", value: "—", icon: CalendarCheck, color: "bg-green-50 text-green-600" },
  { label: "Pendapatan Bulan Ini", value: "—", icon: Wallet, color: "bg-amber-50 text-amber-600" },
];

const SCHEDULE = [
  { time: "08:00", subject: "Matematika SMA", tutor: "Pak Budi", students: 8 },
  { time: "10:00", subject: "Fisika Kelas 11", tutor: "Bu Sari", students: 5 },
  { time: "13:00", subject: "B. Inggris SMP", tutor: "Mr. Andi", students: 12 },
  { time: "15:00", subject: "Kimia Kelas 12", tutor: "Bu Rina", students: 6 },
];

export default function DashboardDemo() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {/* Browser chrome */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md border border-gray-200 px-3 py-1 text-[11px] text-gray-400 max-w-xs">
              platform.sinaloka.com/dashboard
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {STATS.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.03, y: -2 }}
                className="rounded-xl border border-gray-100 bg-white p-4 cursor-default transition-shadow hover:shadow-md"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", stat.color)}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-[11px] text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Schedule table */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Jadwal Hari Ini</div>
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2">Jam</th>
                    <th className="px-4 py-2">Mata Pelajaran</th>
                    <th className="px-4 py-2 hidden sm:table-cell">Tutor</th>
                    <th className="px-4 py-2 text-right">Siswa</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE.map((row) => (
                    <tr key={row.time} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{row.time}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.subject}</td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{row.tutor}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">
                          {row.students}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
