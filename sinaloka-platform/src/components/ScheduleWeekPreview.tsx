import React from 'react';
import { cn } from '../lib/utils';
import type { ClassScheduleItem, Class } from '../types/class';

const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_SHORT: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab',
  Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab', Sunday: 'Min',
};

const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface ScheduleWeekPreviewProps {
  currentSchedules: ClassScheduleItem[];
  tutorClasses: Class[];
  currentClassId?: string;
}

export const ScheduleWeekPreview: React.FC<ScheduleWeekPreviewProps> = ({
  currentSchedules,
  tutorClasses,
  currentClassId,
}) => {
  const otherClasses = tutorClasses.filter(c => c.id !== currentClassId);

  const hasConflict = (schedule: ClassScheduleItem): string | null => {
    for (const cls of otherClasses) {
      for (const s of cls.schedules) {
        if (
          s.day === schedule.day &&
          schedule.start_time < s.end_time &&
          s.start_time < schedule.end_time
        ) {
          return cls.name;
        }
      }
    }
    return null;
  };

  const getBlockStyle = (startTime: string, endTime: string) => {
    const startMin = parseTime(startTime) - START_HOUR * 60;
    const endMin = parseTime(endTime) - START_HOUR * 60;
    return {
      top: `${(startMin / TOTAL_MINUTES) * 100}%`,
      height: `${((endMin - startMin) / TOTAL_MINUTES) * 100}%`,
    };
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
        {/* Header */}
        <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-1" />
        {PREVIEW_DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-l border-zinc-200 dark:border-zinc-800">
            {DAY_SHORT[day]}
          </div>
        ))}

        {/* Time grid */}
        <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * 40}px` }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 text-[10px] text-zinc-400 pr-1 text-right"
              style={{ top: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>

        {PREVIEW_DAYS.map(day => (
          <div
            key={day}
            className="relative border-l border-zinc-200 dark:border-zinc-800"
            style={{ height: `${(END_HOUR - START_HOUR) * 40}px` }}
          >
            {/* Hour gridlines */}
            {hours.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800/50"
                style={{ top: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
              />
            ))}

            {/* Tutor's other class blocks (gray) */}
            {otherClasses.flatMap(cls =>
              cls.schedules
                .filter(s => s.day === day)
                .map(s => (
                  <div
                    key={`${cls.id}-${s.day}`}
                    className="absolute left-0.5 right-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[9px] px-1 overflow-hidden text-zinc-600 dark:text-zinc-300 z-10"
                    style={getBlockStyle(s.start_time, s.end_time)}
                    title={`${cls.name}: ${s.start_time}-${s.end_time}`}
                  >
                    {cls.name}
                  </div>
                ))
            )}

            {/* Current class blocks (blue or red if conflict) */}
            {currentSchedules
              .filter(s => s.day === day)
              .map(s => {
                const conflictWith = hasConflict(s);
                return (
                  <div
                    key={`current-${s.day}`}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded text-[9px] px-1 font-medium z-20 border',
                      conflictWith
                        ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    )}
                    style={getBlockStyle(s.start_time, s.end_time)}
                    title={conflictWith ? `Bentrok dengan ${conflictWith}` : `${s.start_time}-${s.end_time}`}
                  >
                    {s.start_time}
                    {conflictWith && ' ⚠'}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};
