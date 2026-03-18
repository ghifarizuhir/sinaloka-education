import React from 'react';
import type { EnrollmentRecord } from '../types';

const DAY_LABELS: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab', Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab', Sunday: 'Min',
};

export function EnrollmentList({ data }: { data: EnrollmentRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Belum ada pendaftaran aktif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((enrollment) => (
        <div key={enrollment.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-white">{enrollment.class.subject}</p>
              <p className="text-xs text-zinc-500">{enrollment.class.name}</p>
            </div>
            <p className="text-sm font-bold text-lime-400">Rp {enrollment.class.fee.toLocaleString('id-ID')}</p>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {enrollment.class.schedules.map((s) => (
              <span key={s.day} className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                {DAY_LABELS[s.day] ?? s.day} {s.start_time}–{s.end_time}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-500">Tutor: {enrollment.class.tutor.user.name}</p>
        </div>
      ))}
    </div>
  );
}
