import React from 'react';
import { Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { SessionRecord } from '../types';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-info-muted text-info',
  COMPLETED: 'bg-success-muted text-success',
  CANCELLED: 'bg-destructive-muted text-destructive',
};

export function SessionList({ data }: { data: SessionRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-muted border border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Belum ada data sesi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((session) => (
        <div key={session.id} className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-foreground">{session.class.subject}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'dd MMM yyyy')} · {session.start_time}–{session.end_time}</p>
            </div>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", STATUS_COLORS[session.status] ?? 'bg-muted text-muted-foreground')}>
              {session.status}
            </span>
          </div>
          {session.topic_covered && (
            <div className="mt-2 flex items-start gap-2">
              <BookOpen className="w-3 h-3 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">{session.topic_covered}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
