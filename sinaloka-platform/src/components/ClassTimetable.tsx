import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Class, ScheduleDay } from '@/src/types/class';

const ROW_HEIGHT = 48;
const GUTTER_WIDTH = 60;

const DAYS: ScheduleDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DAY_SHORT: Record<ScheduleDay, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

const TIMETABLE_COLORS: Record<string, string> = {
  Mathematics: 'bg-blue-500 border-blue-600',
  Science: 'bg-emerald-500 border-emerald-600',
  English: 'bg-amber-500 border-amber-600',
  History: 'bg-purple-500 border-purple-600',
};

const DEFAULT_COLORS = [
  'bg-rose-500 border-rose-600',
  'bg-cyan-500 border-cyan-600',
  'bg-orange-500 border-orange-600',
  'bg-indigo-500 border-indigo-600',
  'bg-teal-500 border-teal-600',
  'bg-pink-500 border-pink-600',
];

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getColorForSubject(subject: string): string {
  if (TIMETABLE_COLORS[subject]) return TIMETABLE_COLORS[subject];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

interface TimetableBlock {
  cls: Class;
  day: ScheduleDay;
  startMin: number;
  endMin: number;
  colIndex: number;
  colTotal: number;
}

interface ClassTimetableProps {
  classes: Class[];
  onClassClick: (classId: string) => void;
}

export default function ClassTimetable({
  classes,
  onClassClick,
}: ClassTimetableProps) {
  const { t } = useTranslation();

  const { gridStartMin, gridEndMin, blocks } = useMemo(() => {
    if (classes.length === 0) {
      return { gridStartMin: 480, gridEndMin: 1020, blocks: [] };
    }

    // Find earliest/latest times
    let earliest = Infinity;
    let latest = -Infinity;

    const rawBlocks: Omit<TimetableBlock, 'colIndex' | 'colTotal'>[] = [];

    for (const cls of classes) {
      for (const schedule of cls.schedules) {
        const startMin = parseTime(schedule.start_time);
        const endMin = parseTime(schedule.end_time);
        if (startMin < earliest) earliest = startMin;
        if (endMin > latest) latest = endMin;
        const day = schedule.day as ScheduleDay;
        rawBlocks.push({ cls, day, startMin, endMin });
      }
    }

    // ±1 hour padding, snap to full hours
    const gStart = Math.floor((earliest - 60) / 60) * 60;
    const gEnd = Math.ceil((latest + 60) / 60) * 60;

    // Overlap detection per day
    const byDay: Record<string, Omit<TimetableBlock, 'colIndex' | 'colTotal'>[]> = {};
    for (const block of rawBlocks) {
      if (!byDay[block.day]) byDay[block.day] = [];
      byDay[block.day].push(block);
    }

    const finalBlocks: TimetableBlock[] = [];

    for (const day of DAYS) {
      const dayBlocks = byDay[day];
      if (!dayBlocks) continue;

      // Sort by start time
      dayBlocks.sort((a, b) => a.startMin - b.startMin);

      // Group overlapping blocks
      const groups: Omit<TimetableBlock, 'colIndex' | 'colTotal'>[][] = [];
      for (const block of dayBlocks) {
        let placed = false;
        for (const group of groups) {
          const overlaps = group.some(
            (g) => block.startMin < g.endMin && block.endMin > g.startMin
          );
          if (overlaps) {
            group.push(block);
            placed = true;
            break;
          }
        }
        if (!placed) {
          groups.push([block]);
        }
      }

      for (const group of groups) {
        const colTotal = group.length;
        group.forEach((block, colIndex) => {
          finalBlocks.push({ ...block, colIndex, colTotal });
        });
      }
    }

    return { gridStartMin: gStart, gridEndMin: gEnd, blocks: finalBlocks };
  }, [classes]);

  const totalRows = (gridEndMin - gridStartMin) / 30;

  const hourLabels = useMemo(() => {
    const labels: { min: number; label: string }[] = [];
    for (let m = gridStartMin; m < gridEndMin; m += 30) {
      labels.push({ min: m, label: formatHour(m) });
    }
    return labels;
  }, [gridStartMin, gridEndMin]);

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <Calendar className="mb-3 h-10 w-10" />
        <p className="text-sm">{t('classes.timetable.empty')}</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      style={{ maxHeight: 'calc(100vh - 420px)' }}
    >
      <div
        className="grid min-w-[800px]"
        style={{
          gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)`,
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        {DAYS.map((day) => (
          <div
            key={day}
            className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {DAY_SHORT[day]}
          </div>
        ))}

        {/* Time grid */}
        <div className="relative" style={{ height: totalRows * ROW_HEIGHT }}>
          {hourLabels.map(({ min, label }) => (
            <div
              key={min}
              className="absolute right-2 text-[10px] font-mono text-zinc-400"
              style={{
                top: ((min - gridStartMin) / 30) * ROW_HEIGHT,
                lineHeight: `${ROW_HEIGHT}px`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((day) => (
          <div
            key={day}
            className="relative border-l border-zinc-100 dark:border-zinc-900"
            style={{ height: totalRows * ROW_HEIGHT }}
          >
            {/* Grid lines */}
            {hourLabels.map(({ min }) => (
              <div
                key={min}
                className="absolute inset-x-0 border-t border-zinc-50 dark:border-zinc-900"
                style={{
                  top: ((min - gridStartMin) / 30) * ROW_HEIGHT,
                }}
              />
            ))}

            {/* Class blocks */}
            {blocks
              .filter((b) => b.day === day)
              .map((block) => {
                const top =
                  ((block.startMin - gridStartMin) / 30) * ROW_HEIGHT;
                const height =
                  ((block.endMin - block.startMin) / 30) * ROW_HEIGHT;
                const halfRowCount = (block.endMin - block.startMin) / 30;
                const subjectName = typeof block.cls.subject === 'string' ? block.cls.subject : block.cls.subject?.name ?? '';
                const color = getColorForSubject(subjectName);

                return (
                  <div
                    key={`${block.cls.id}-${block.day}`}
                    className={cn(
                      'absolute cursor-pointer overflow-hidden rounded-lg border-l-4 px-2 py-1 text-white shadow-sm transition-all hover:ring-2 hover:ring-white/50 hover:ring-offset-1',
                      color
                    )}
                    style={{
                      top,
                      height,
                      width: `calc(${100 / block.colTotal}% - 4px)`,
                      left: `${(block.colIndex * 100) / block.colTotal}%`,
                    }}
                    onClick={() => onClassClick(block.cls.id)}
                    title={`${block.cls.name} — ${subjectName}`}
                  >
                    <p className="truncate text-xs font-semibold leading-tight">
                      {block.cls.name}
                    </p>
                    {halfRowCount >= 1.5 && block.cls.tutor?.name && (
                      <p className="truncate text-[10px] leading-tight opacity-90">
                        {block.cls.tutor.name}
                      </p>
                    )}
                    {halfRowCount >= 2 && block.cls.room && (
                      <p className="truncate text-[10px] leading-tight opacity-75">
                        {block.cls.room}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
