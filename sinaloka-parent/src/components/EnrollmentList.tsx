import React from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';
import type { EnrollmentRecord } from '../types';
import { ErrorState } from './ErrorState';

const DAY_LABELS: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab', Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab', Sunday: 'Min',
};

interface EnrollmentListProps {
  data: EnrollmentRecord[];
  error?: string | null;
  onRetry?: () => void;
}

export function EnrollmentList({ data, error, onRetry }: EnrollmentListProps) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <BookOpen className="w-7 h-7 opacity-40" />
        </div>
        <p className="text-sm font-medium text-foreground/70">Belum terdaftar di kelas</p>
        <p className="text-xs mt-1">Hubungi institusi untuk pendaftaran</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((enrollment, index) => (
        <motion.div
          key={enrollment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.25 }}
          className="bg-card border border-border rounded-lg p-4 shadow-sm"
        >
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
        </motion.div>
      ))}
    </div>
  );
}
