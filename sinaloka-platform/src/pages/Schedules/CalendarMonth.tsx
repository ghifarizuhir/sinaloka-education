import React from 'react';
import { format, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import type { Session, SessionStatus } from '@/src/types/session';
import type { TFunction } from 'i18next';

interface CalendarMonthProps {
  calendarDays: Date[];
  monthStart: Date;
  sessions: Session[];
  onSelectSession: (id: string) => void;
  getSubjectColor: (subject?: string) => string;
  getStatusBorder: (status: SessionStatus) => string;
  t: TFunction;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  calendarDays,
  monthStart,
  sessions,
  onSelectSession,
  getSubjectColor,
  getStatusBorder,
  t,
}) => {
  return (
    <>
      <div className="grid grid-cols-7 border-b border-border">
        {[
          t('schedules.calendar.sun'),
          t('schedules.calendar.mon'),
          t('schedules.calendar.tue'),
          t('schedules.calendar.wed'),
          t('schedules.calendar.thu'),
          t('schedules.calendar.fri'),
          t('schedules.calendar.sat'),
        ].map((day) => (
          <div key={day} className="py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {calendarDays.map((day) => {
          const daySessions = sessions.filter(s => {
            try { return isSameDay(parseISO(s.date), day); } catch { return false; }
          });
          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-[120px] p-2 border-r border-b border-border/50 transition-colors",
                !isSameMonth(day, monthStart) && "bg-muted/50",
                isSameDay(day, new Date()) && "bg-muted/30"
              )}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {daySessions.map(s => {
                  const isCancelled = s.status === 'CANCELLED';
                  const subject = s.class?.subject;
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectSession(s.id)}
                      className={cn(
                        "p-1.5 rounded-md text-[10px] font-medium truncate border transition-all hover:scale-[1.02] cursor-pointer",
                        isCancelled ? "bg-muted text-muted-foreground border-border line-through" : getSubjectColor(subject),
                        !isCancelled && getStatusBorder(s.status)
                      )}
                      title={`${s.class?.name ?? ''} (${s.start_time} - ${s.end_time})`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate">{s.class?.name ?? '—'}</span>
                      </div>
                      <div className="text-[8px] opacity-70">
                        <span>{s.start_time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
