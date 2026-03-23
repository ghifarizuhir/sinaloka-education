import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { SessionRecord } from '../types';
import { cn } from '../lib/utils';
import { ErrorState } from './ErrorState';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-info-muted text-info',
  COMPLETED: 'bg-success-muted text-success',
  CANCELLED: 'bg-destructive-muted text-destructive',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Dijadwalkan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

interface SessionListProps {
  data: SessionRecord[];
  error?: string | null;
  onRetry?: () => void;
}

export function SessionList({ data, error, onRetry }: SessionListProps) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <Clock className="w-7 h-7 opacity-40" />
        </div>
        <p className="text-sm font-medium text-foreground/70">Belum ada sesi terjadwal</p>
        <p className="text-xs mt-1">Pastikan anak sudah terdaftar di kelas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((session, index) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.25 }}
          className="bg-card border border-border rounded-lg p-4 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-foreground">{session.class.subject}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'dd MMM yyyy', { locale: localeId })} · {session.start_time}–{session.end_time}</p>
            </div>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", STATUS_COLORS[session.status] ?? 'bg-muted text-muted-foreground')}>
              {STATUS_LABELS[session.status] ?? session.status}
            </span>
          </div>
          {session.topic_covered && (
            <div className="mt-2 flex items-start gap-2">
              <BookOpen className="w-3 h-3 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">{session.topic_covered}</p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
