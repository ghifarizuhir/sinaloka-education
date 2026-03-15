import React from 'react';
import { ScheduleCard } from '../components/ScheduleCard';
import type { ClassSchedule } from '../types';
import { cn } from '../lib/utils';

type ScheduleFilter = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | undefined;

const filterOptions = [
  { label: 'Upcoming', value: 'SCHEDULED' as const },
  { label: 'Completed', value: 'COMPLETED' as const },
  { label: 'Cancelled', value: 'CANCELLED' as const },
];

interface SchedulePageProps {
  schedule: ClassSchedule[];
  scheduleLoading: boolean;
  activeFilter: ScheduleFilter;
  onSetFilter: (filter: ScheduleFilter) => void;
  onOpenAttendance: (id: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onViewDetail: (id: string) => void;
}

export function SchedulePage({
  schedule,
  scheduleLoading,
  activeFilter,
  onSetFilter,
  onOpenAttendance,
  onReschedule,
  onCancel,
  onViewDetail,
}: SchedulePageProps) {
  return (
    <div className="space-y-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Jadwal Mengajar</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Manajemen sesi dan absensi</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => onSetFilter(activeFilter === f.value ? undefined : f.value)}
            className={cn(
              'px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
              activeFilter === f.value
                ? 'bg-lime-400 text-black'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div>
        {scheduleLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : schedule.length > 0 ? (
          schedule.map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              onOpenAttendance={onOpenAttendance}
              onReschedule={onReschedule}
              onCancel={onCancel}
              onViewDetail={onViewDetail}
            />
          ))
        ) : (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">Tidak ada jadwal ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
