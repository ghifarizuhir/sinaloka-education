import React from 'react';
import { Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { SessionRecord } from '../types';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-lime-500/20 text-lime-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

export function SessionList({ data }: { data: SessionRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Belum ada data sesi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((session) => (
        <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-white">{session.class.subject}</p>
              <p className="text-xs text-zinc-500">{format(new Date(session.date), 'dd MMM yyyy')} · {session.start_time}–{session.end_time}</p>
            </div>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", STATUS_COLORS[session.status] ?? 'bg-zinc-800 text-zinc-400')}>
              {session.status}
            </span>
          </div>
          {session.topic_covered && (
            <div className="mt-2 flex items-start gap-2">
              <BookOpen className="w-3 h-3 text-zinc-500 mt-0.5" />
              <p className="text-xs text-zinc-400">{session.topic_covered}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
