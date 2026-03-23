import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Clock, CalendarOff } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { AttendanceRecord, AttendanceSummary } from '../types';
import { ErrorState } from './ErrorState';

const STATUS_CONFIG = {
  PRESENT: { icon: CheckCircle2, color: 'text-success', label: 'Hadir' },
  ABSENT: { icon: XCircle, color: 'text-destructive', label: 'Absen' },
  LATE: { icon: Clock, color: 'text-warning', label: 'Telat' },
};

interface AttendanceListProps {
  data: AttendanceRecord[];
  summary: AttendanceSummary | null;
  error?: string | null;
  onRetry?: () => void;
}

export function AttendanceList({ data, summary, error, onRetry }: AttendanceListProps) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

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
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <CalendarOff className="w-7 h-7 opacity-40" />
          </div>
          <p className="text-sm font-medium text-foreground/70">Belum ada data kehadiran</p>
          <p className="text-xs mt-1">Data akan muncul setelah sesi pertama</p>
        </div>
      ) : (
        data.map((record, index) => {
          const config = STATUS_CONFIG[record.status];
          const Icon = config.icon;
          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.25 }}
              className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 shadow-sm"
            >
              <Icon className={`w-5 h-5 ${config.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{record.session.class.subject}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(record.session.date), 'dd MMM yyyy', { locale: localeId })} · {record.session.start_time}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                {record.homework_done && <p className="text-[10px] text-success">PR ✓</p>}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
