import React from 'react';
import type { EnrollmentRecord } from '../types';

const DAY_LABELS: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab', Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab', Sunday: 'Min',
};

export function EnrollmentList({ data }: { data: EnrollmentRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-muted border border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Belum ada pendaftaran aktif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((enrollment) => (
        <div key={enrollment.id} className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-foreground">{enrollment.class.subject}</p>
              <p className="text-xs text-muted-foreground">{enrollment.class.name}</p>
            </div>
            <p className="text-sm font-bold text-primary">Rp {enrollment.class.fee.toLocaleString('id-ID')}</p>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {enrollment.class.schedules.map((s) => (
              <span key={s.day} className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded">
                {DAY_LABELS[s.day] ?? s.day} {s.start_time}–{s.end_time}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Tutor: {enrollment.class.tutor.user.name}</p>
        </div>
      ))}
    </div>
  );
}
