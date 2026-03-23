import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { AttendanceRecord, AttendanceSummary } from '../types';

const STATUS_CONFIG = {
  PRESENT: { icon: CheckCircle2, color: 'text-success', label: 'Hadir' },
  ABSENT: { icon: XCircle, color: 'text-destructive', label: 'Absen' },
  LATE: { icon: Clock, color: 'text-warning', label: 'Telat' },
};

export function AttendanceList({ data, summary }: { data: AttendanceRecord[]; summary: AttendanceSummary | null }) {
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-lg p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-primary">{summary.attendance_rate}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kehadiran</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{summary.homework_rate}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PR Selesai</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{summary.present + summary.absent + summary.late}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Sesi</p>
          </div>
        </div>
      )}
      {data.length === 0 ? (
        <div className="bg-muted border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">Belum ada data kehadiran.</p>
        </div>
      ) : (
        data.map((record) => {
          const config = STATUS_CONFIG[record.status];
          const Icon = config.icon;
          return (
            <div key={record.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 shadow-sm">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{record.session.class.subject}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(record.session.date), 'dd MMM yyyy')} · {record.session.start_time}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                {record.homework_done && <p className="text-[10px] text-success">PR ✓</p>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
