import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { useStudentAttendance } from '@/src/hooks/useAttendance';
import type { AttendanceStatus } from '@/src/types/attendance';

interface StudentAttendanceTabProps {
  studentId: string;
}

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  ABSENT: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  LATE: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
};

export const StudentAttendanceTab: React.FC<StudentAttendanceTabProps> = ({ studentId }) => {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const dateFrom = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data, isLoading } = useStudentAttendance(studentId, {
    date_from: dateFrom,
    date_to: dateTo,
  });

  const summary = data?.summary;
  const records = data?.records ?? [];

  return (
    <div className="space-y-6">
      {/* Month Picker */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold min-w-[140px] text-center">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Percent size={18} className="mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{summary.attendance_rate}%</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.rate', 'Rate')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">{summary.present}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.presentLabel', 'Present')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <XCircle size={18} className="mx-auto mb-1 text-rose-500" />
            <p className="text-2xl font-bold text-rose-600">{summary.absent}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.absentLabel', 'Absent')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <Clock size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{summary.late}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.lateLabel', 'Late')}
            </p>
          </Card>
        </div>
      ) : null}

      {/* Session Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed border-2">
          <EmptyState
            icon={CalendarIcon}
            title={t('students.detail.noAttendance', 'Belum ada data kehadiran untuk bulan ini')}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.date', 'Date')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('students.detail.class', 'Class')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.time', 'Time')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                  {t('attendance.table.hw', 'HW')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.notes', 'Notes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">
                    {formatDate(record.session.date, i18n.language)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {record.session.class.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {record.session.start_time} - {record.session.end_time}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      STATUS_STYLE[record.status]
                    )}>
                      {t(`attendance.${record.status.toLowerCase()}`, record.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {record.homework_done ? (
                      <CheckCircle size={16} className="mx-auto text-emerald-500" />
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 max-w-[200px] truncate">
                    {record.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
