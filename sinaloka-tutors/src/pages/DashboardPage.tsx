import React from 'react';
import { ChevronRight, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { ScheduleCard } from '../components/ScheduleCard';
import type { ClassSchedule, Payout } from '../types';

interface DashboardPageProps {
  firstName: string;
  upcomingClasses: ClassSchedule[];
  pendingPayout: number;
  scheduleLoading: boolean;
  onOpenAttendance: (id: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onViewAllSchedule: () => void;
}

export function DashboardPage({
  firstName,
  upcomingClasses,
  pendingPayout,
  scheduleLoading,
  onOpenAttendance,
  onReschedule,
  onCancel,
  onViewAllSchedule,
}: DashboardPageProps) {
  return (
    <div className="space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Halo, {firstName}!</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Jadwal Mengajar Kamu</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-lime-400 p-5 rounded-xl text-black">
          <div className="flex justify-between items-start mb-4">
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pending</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1">Total Payout</p>
          <p className="text-xl font-bold tracking-tight">Rp {pendingPayout.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-white">
          <div className="flex justify-between items-start mb-4">
            <CalendarIcon className="w-6 h-6 text-lime-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Today</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1 text-zinc-400">Sesi Mengajar</p>
          <p className="text-xl font-bold tracking-tight">{upcomingClasses.length} Kelas</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold">Jadwal Hari Ini</h2>
          <button onClick={onViewAllSchedule} className="text-lime-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {scheduleLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : upcomingClasses.length > 0 ? (
          upcomingClasses.slice(0, 2).map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              onOpenAttendance={onOpenAttendance}
              onReschedule={onReschedule}
              onCancel={onCancel}
            />
          ))
        ) : (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">Gak ada jadwal buat hari ini. <br/>Waktunya istirahat!</p>
          </div>
        )}
      </div>
    </div>
  );
}
