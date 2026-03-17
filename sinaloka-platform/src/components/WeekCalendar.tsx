import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { User } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Session, SessionStatus } from '@/src/types/session';

interface WeekCalendarProps {
  sessions: Session[];
  weekDays: Date[];
  onSelectSession: (sessionId: string) => void;
  getSubjectColor: (subject?: string) => string;
  getStatusBorder: (status: SessionStatus) => string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

export function WeekCalendar({
  sessions,
  weekDays,
  onSelectSession,
  getSubjectColor,
  getStatusBorder,
}: WeekCalendarProps) {
  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-[800px] h-full flex flex-col">
        {/* Day Headers */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-20 shrink-0" />
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className="flex-1 text-center py-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mx-auto mt-0.5',
                  isSameDay(day, new Date())
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex flex-col">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 border-b border-zinc-100 dark:border-zinc-800 flex"
              >
                {/* Time label */}
                <div className="w-20 shrink-0 border-r border-zinc-100 dark:border-zinc-800 flex items-start justify-center pt-2">
                  <span className="text-[10px] font-bold text-zinc-400">
                    {hour}:00
                  </span>
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const cellSessions = sessions.filter((s) => {
                    try {
                      return (
                        isSameDay(parseISO(s.date), day) &&
                        parseInt(s.start_time.split(':')[0]) === hour
                      );
                    } catch {
                      return false;
                    }
                  });

                  return (
                    <div
                      key={day.toString()}
                      className="flex-1 relative p-0.5 space-y-0.5 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0"
                    >
                      {cellSessions.map((s) => {
                        const isCancelled = s.status === 'CANCELLED';
                        return (
                          <div
                            key={s.id}
                            onClick={() => onSelectSession(s.id)}
                            className={cn(
                              'rounded-md p-1.5 border shadow-sm text-[9px] cursor-pointer hover:scale-[1.02] transition-all',
                              isCancelled
                                ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 line-through'
                                : getSubjectColor(s.class?.subject),
                              !isCancelled && getStatusBorder(s.status)
                            )}
                          >
                            <div className="font-bold truncate">
                              {s.class?.name ?? '—'}
                            </div>
                            <div className="opacity-70">
                              {s.start_time} - {s.end_time}
                            </div>
                            {s.class?.tutor && (
                              <div className="mt-0.5 flex items-center gap-0.5 truncate">
                                <User size={7} /> {s.class.tutor.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
