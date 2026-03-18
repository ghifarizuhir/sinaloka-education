import React from 'react';
import { WeekCalendar } from '../../components/WeekCalendar';
import type { Session, SessionStatus } from '@/src/types/session';

interface CalendarWeekProps {
  sessions: Session[];
  weekDays: Date[];
  onSelectSession: (id: string) => void;
  getSubjectColor: (subject?: string) => string;
  getStatusBorder: (status: SessionStatus) => string;
}

export const CalendarWeek: React.FC<CalendarWeekProps> = ({
  sessions,
  weekDays,
  onSelectSession,
  getSubjectColor,
  getStatusBorder,
}) => {
  return (
    <WeekCalendar
      sessions={sessions}
      weekDays={weekDays}
      onSelectSession={onSelectSession}
      getSubjectColor={getSubjectColor}
      getStatusBorder={getStatusBorder}
    />
  );
};
