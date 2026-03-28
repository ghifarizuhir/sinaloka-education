import React from 'react';
import { isSameDay, parseISO } from 'date-fns';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Session, SessionStatus } from '@/src/types/session';

interface CalendarDayProps {
  currentDate: Date;
  sessions: Session[];
  onSelectSession: (id: string) => void;
  getSubjectColor: (subject?: string) => string;
  getStatusBorder: (status: SessionStatus) => string;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  currentDate,
  sessions,
  onSelectSession,
  getSubjectColor,
  getStatusBorder,
}) => {
  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-[400px] h-full flex flex-col">
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex flex-col">
            {Array.from({ length: 16 }, (_, i) => i + 6).map(hour => {
              const hourSessions = sessions.filter(s => {
                try {
                  return isSameDay(parseISO(s.date), currentDate) && parseInt(s.start_time.split(':')[0]) === hour;
                } catch { return false; }
              });
              return (
                <div key={hour} className="flex-1 border-b border-border flex">
                  <div className="w-20 shrink-0 border-r border-border flex items-start justify-center pt-2">
                    <span className="text-[10px] font-bold text-muted-foreground">{hour}:00</span>
                  </div>
                  <div className="flex-1 relative p-1 space-y-1">
                    {hourSessions.map(s => {
                      const isCancelled = s.status === 'CANCELLED';
                      return (
                        <div
                          key={s.id}
                          onClick={() => onSelectSession(s.id)}
                          className={cn(
                            "rounded-lg p-2 border shadow-sm text-[10px] cursor-pointer hover:scale-[1.01] transition-all",
                            isCancelled ? "bg-muted text-muted-foreground border-border line-through" : getSubjectColor(s.class?.subject),
                            !isCancelled && getStatusBorder(s.status)
                          )}
                        >
                          <div className="font-bold truncate">{s.class?.name ?? '—'}</div>
                          <div className="opacity-70">{s.start_time} - {s.end_time}</div>
                          {s.class?.tutor && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <User size={8} /> {s.class.tutor.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
