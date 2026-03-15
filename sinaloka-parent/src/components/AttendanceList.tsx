import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { AttendanceRecord, AttendanceSummary } from '../types';

const STATUS_CONFIG = {
  PRESENT: { icon: CheckCircle2, color: 'text-lime-400', label: 'Hadir' },
  ABSENT: { icon: XCircle, color: 'text-red-400', label: 'Absen' },
  LATE: { icon: Clock, color: 'text-orange-400', label: 'Telat' },
};

export function AttendanceList({ data, summary }: { data: AttendanceRecord[]; summary: AttendanceSummary | null }) {
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-lime-400">{summary.attendance_rate}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kehadiran</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{summary.homework_rate}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">PR Selesai</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{summary.present + summary.absent + summary.late}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Sesi</p>
          </div>
        </div>
      )}
      {data.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">Belum ada data kehadiran.</p>
        </div>
      ) : (
        data.map((record) => {
          const config = STATUS_CONFIG[record.status];
          const Icon = config.icon;
          return (
            <div key={record.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{record.session.class.subject}</p>
                <p className="text-xs text-zinc-500">{format(new Date(record.session.date), 'dd MMM yyyy')} · {record.session.start_time}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                {record.homework_done && <p className="text-[10px] text-lime-400">PR ✓</p>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
