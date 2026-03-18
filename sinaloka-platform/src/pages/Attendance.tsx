import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  MessageSquare,
  Paperclip,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Save,
  Bell,
  BellOff,
  FileText,
  MoreVertical,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { format, isSameDay, isBefore, startOfDay, addDays, subDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Card, Button, Badge, Switch, Input, Label } from '../components/UI';
import { cn, formatDate } from '../lib/utils';
import { useAttendanceBySession, useAttendanceSummary, useUpdateAttendance } from '@/src/hooks/useAttendance';
import { useSessions, useSessionStudents } from '@/src/hooks/useSessions';
import type { Attendance as AttendanceRecord, AttendanceStatus, UpdateAttendanceDto } from '@/src/types/attendance';
import type { Session, SessionStudent } from '@/src/types/session';

const SESSION_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  COMPLETED: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  CANCELLED: 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
  RESCHEDULE_REQUESTED: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
};

export const Attendance = () => {
  const { t, i18n } = useTranslation();

  const STATUS_LABEL: Record<AttendanceStatus, string> = {
    PRESENT: t('attendance.present'),
    ABSENT: t('attendance.absent'),
    LATE: t('attendance.late'),
  };

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [focusedAttendanceId, setFocusedAttendanceId] = useState<string | null>(null);
  // Local pending changes before save
  const [pendingChanges, setPendingChanges] = useState<Record<string, UpdateAttendanceDto>>({});
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  // Format date for API query
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Queries
  const sessionsQuery = useSessions({
    limit: 100,
    date_from: dateStr,
    date_to: dateStr,
  });
  const attendanceQuery = useAttendanceBySession(selectedSessionId ?? '');
  const studentsQuery = useSessionStudents(selectedSessionId);

  const sessions: Session[] = sessionsQuery.data?.data ?? [];
  const attendanceRecords: AttendanceRecord[] = attendanceQuery.data ?? [];
  const sessionStudents: SessionStudent[] = studentsQuery.data?.students ?? [];

  // Selected session object
  const selectedSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);

  // Determine if editing is locked (completed or past date)
  const isSessionLocked = useMemo(() => {
    if (!selectedSession) return false;
    if (selectedSession.status === 'COMPLETED') return true;
    try {
      const sessionDate = parseISO(selectedSession.date);
      return isBefore(startOfDay(sessionDate), startOfDay(new Date()));
    } catch { return false; }
  }, [selectedSession]);

  // Mutation
  const updateAttendance = useUpdateAttendance();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedAttendanceId || isSessionLocked) return;
      const key = e.key.toLowerCase();
      if (!['p', 'a', 'l'].includes(key)) return;

      let status: AttendanceStatus = 'PRESENT';
      if (key === 'a') status = 'ABSENT';
      if (key === 'l') status = 'LATE';

      setPendingChanges(prev => ({
        ...prev,
        [focusedAttendanceId]: { ...(prev[focusedAttendanceId] ?? {}), status },
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedAttendanceId]);

  const getEffectiveStatus = (record: AttendanceRecord): AttendanceStatus => {
    return (pendingChanges[record.id]?.status ?? record.status) as AttendanceStatus;
  };

  const getEffectiveHomework = (record: AttendanceRecord): boolean => {
    return pendingChanges[record.id]?.homework_done ?? record.homework_done;
  };

  const getEffectiveNotes = (record: AttendanceRecord): string => {
    return pendingChanges[record.id]?.notes ?? record.notes ?? '';
  };

  const setLocalStatus = (id: string, status: AttendanceStatus) => {
    setPendingChanges(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), status } }));
  };

  const setLocalHomework = (id: string, homework_done: boolean) => {
    setPendingChanges(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), homework_done } }));
  };

  const setLocalNotes = (id: string, notes: string) => {
    setPendingChanges(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), notes } }));
  };

  const bulkMarkAll = (status: AttendanceStatus) => {
    const updates: Record<string, UpdateAttendanceDto> = {};
    sessionStudents.filter(s => s.attendance_id !== null).forEach(s => { updates[s.attendance_id!] = { ...(pendingChanges[s.attendance_id!] ?? {}), status }; });
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };

  const saveAttendance = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) return;

    try {
      await Promise.all(entries.map(([id, data]) => updateAttendance.mutateAsync({ id, data })));
      setPendingChanges({});
      toast.success(t('attendance.toast.saved'));
    } catch {
      toast.error(t('attendance.toast.saveError'));
    }
  };

  const studentsWithAttendance = sessionStudents.filter(s => s.attendance_id !== null);
  const presentCount = studentsWithAttendance.filter(s => (pendingChanges[s.attendance_id!]?.status ?? s.status) === 'PRESENT').length;
  const absentCount = studentsWithAttendance.filter(s => (pendingChanges[s.attendance_id!]?.status ?? s.status) === 'ABSENT').length;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('attendance.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('attendance.subtitle')}</p>
        </div>
        <Button variant="outline" className="gap-2">
          <History size={18} />
          {t('attendance.viewHistory')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Date Picker & Sessions List */}
        <div className="lg:col-span-4 space-y-6">
          {/* Date Picker */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{t('attendance.selectDate')}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-2 py-1 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 rounded-md"
                >
                  {t('common.today')}
                </button>
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <CalendarIcon size={18} className="text-zinc-400" />
              <span className="text-sm font-medium">{formatDate(format(selectedDate, 'yyyy-MM-dd'), i18n.language)}</span>
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">{t('attendance.sessions')}</h3>

            {sessionsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <Card className="py-12 text-center border-dashed border-2">
                <p className="text-sm text-zinc-500">{t('attendance.noSessionsForDate')}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => {
                  let sessionDateObj: Date;
                  try { sessionDateObj = parseISO(session.date); } catch { sessionDateObj = new Date(); }
                  const isIncomplete = isBefore(startOfDay(sessionDateObj), startOfDay(new Date())) && session.status === 'SCHEDULED';
                  const tutorName = session.class?.tutor?.name ?? '—';
                  const className = session.class?.name ?? '—';

                  return (
                    <button
                      key={session.id}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setPendingChanges({});
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                        selectedSessionId === session.id
                          ? "bg-zinc-900 border-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
                          : "bg-white border-zinc-100 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700",
                        isIncomplete && "border-red-200 dark:border-red-900/30"
                      )}
                    >
                      {isIncomplete && (
                        <div className="absolute top-0 right-0 p-1 bg-red-500 text-white">
                          <AlertCircle size={10} />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          selectedSessionId === session.id
                            ? "bg-white/20 text-white dark:bg-zinc-900/10 dark:text-zinc-900"
                            : SESSION_STATUS_COLOR[session.status] ?? 'bg-zinc-100 text-zinc-500'
                        )}>
                          {session.status}
                        </span>
                        <span className={cn(
                          "text-[10px] font-medium opacity-70",
                          selectedSessionId === session.id ? "text-white dark:text-zinc-900" : "text-zinc-500"
                        )}>
                          {session.start_time} - {session.end_time}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm mb-1 truncate">{className}</h4>
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-xs opacity-70",
                          selectedSessionId === session.id ? "text-white dark:text-zinc-900" : "text-zinc-500"
                        )}>
                          {tutorName}
                        </p>
                        {isIncomplete && (
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">{t('attendance.incomplete')}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Attendance Panel */}
        <div className="lg:col-span-8">
          {selectedSession ? (
            <div className="space-y-6">
              <Card className="p-0 overflow-hidden">
                {/* Session Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold tracking-tight">{selectedSession.class?.name ?? '—'}</h3>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          SESSION_STATUS_COLOR[selectedSession.status] ?? 'bg-zinc-100 text-zinc-500'
                        )}>
                          {selectedSession.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} />
                          <span>{selectedSession.class?.tutor?.name ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon size={14} />
                          <span>
                            {formatDate(selectedSession.date, i18n.language)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          <span>{selectedSession.start_time} - {selectedSession.end_time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {presentCount}
                          <span className="text-zinc-300 dark:text-zinc-700 mx-1">/</span>
                          {sessionStudents.length}
                        </span>
                        <span className="text-xs font-medium text-zinc-500">{t('attendance.present')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold">{t('attendance.studentList')}</h4>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold text-zinc-500">
                        <Info size={10} />
                        {t('attendance.keyboardHint')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isSessionLocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-8"
                          onClick={() => bulkMarkAll('PRESENT')}
                        >
                          {t('attendance.markAllPresent')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {(attendanceQuery.isLoading || studentsQuery.isLoading) ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : sessionStudents.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-sm">
                      {t('attendance.noRecords')}
                    </div>
                  ) : (
                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('attendance.table.student')}</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('attendance.table.status')}</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">{t('attendance.table.hw')}</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('attendance.table.notes')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {sessionStudents.map((student) => {
                            const hasAttendance = student.attendance_id !== null;
                            const effectiveStatus = hasAttendance
                              ? (pendingChanges[student.attendance_id!]?.status ?? student.status) as AttendanceStatus
                              : null;
                            const effectiveHw = hasAttendance
                              ? (pendingChanges[student.attendance_id!]?.homework_done ?? student.homework_done)
                              : false;
                            const effectiveNotes = hasAttendance
                              ? (pendingChanges[student.attendance_id!]?.notes ?? student.notes ?? '')
                              : '';
                            return (
                              <tr
                                key={student.id}
                                onFocus={() => hasAttendance && setFocusedAttendanceId(student.attendance_id)}
                                onBlur={() => setFocusedAttendanceId(null)}
                                tabIndex={hasAttendance ? 0 : undefined}
                                className={cn(
                                  "transition-colors outline-none",
                                  hasAttendance
                                    ? cn("hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30", focusedAttendanceId === student.attendance_id && "bg-zinc-50 dark:bg-zinc-900 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700")
                                    : "opacity-60"
                                )}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{student.name}</span>
                                    {student.grade && <span className="text-[10px] text-zinc-500">{student.grade}</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {hasAttendance ? (
                                    <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-1">
                                      {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map((status) => (
                                        <button
                                          key={status}
                                          onClick={() => !isSessionLocked && setLocalStatus(student.attendance_id!, status)}
                                          disabled={isSessionLocked}
                                          className={cn(
                                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                            effectiveStatus === status
                                              ? status === 'PRESENT' ? "bg-emerald-500 text-white shadow-sm" :
                                                status === 'ABSENT' ? "bg-rose-500 text-white shadow-sm" :
                                                "bg-amber-500 text-white shadow-sm"
                                              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
                                            isSessionLocked && "cursor-not-allowed opacity-60"
                                          )}
                                        >
                                          {STATUS_LABEL[status][0]}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('attendance.pending', 'Pending')}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {hasAttendance ? (
                                    <input
                                      type="checkbox"
                                      className={cn("w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900", isSessionLocked && "cursor-not-allowed opacity-60")}
                                      checked={effectiveHw}
                                      disabled={isSessionLocked}
                                      onChange={(e) => setLocalHomework(student.attendance_id!, e.target.checked)}
                                    />
                                  ) : (
                                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {hasAttendance ? (
                                    <Input
                                      className="h-8 text-xs w-32"
                                      placeholder={t('attendance.notePlaceholder')}
                                      value={effectiveNotes}
                                      disabled={isSessionLocked}
                                      onChange={(e) => setLocalNotes(student.attendance_id!, e.target.value)}
                                    />
                                  ) : (
                                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Bar */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  {isSessionLocked ? (
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                      <Lock size={14} />
                      {selectedSession?.status === 'COMPLETED' ? t('attendance.completedLocked') : t('attendance.pastLocked')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs">
                      <Unlock size={14} />
                      {t('attendance.editingEnabled')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <Button
                      size="sm"
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                      onClick={saveAttendance}
                      disabled={updateAttendance.isPending}
                    >
                      {updateAttendance.isPending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      {t('attendance.saveAttendance')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Card className="py-32 flex flex-col items-center justify-center text-center border-dashed border-2">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <ClipboardCheck size={32} className="text-zinc-300" />
              </div>
              <h3 className="font-bold text-lg mb-1">{t('attendance.noSessionSelected')}</h3>
              <p className="text-sm text-zinc-500 max-w-xs">{t('attendance.noSessionSelectedHint')}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      <AnimatePresence>
        {hasUnsavedChanges && selectedSession && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/10 dark:border-black/10">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-60">{t('attendance.unsavedChanges')}</span>
                  <span className="text-sm font-bold">
                    {t('attendance.presentCount', { present: presentCount, absent: absentCount })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-none text-white dark:text-zinc-900"
                  onClick={() => setPendingChanges({})}
                >
                  {t('common.discard')}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 border-none text-white gap-2"
                  onClick={saveAttendance}
                  disabled={updateAttendance.isPending}
                >
                  {updateAttendance.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {t('attendance.saveAttendance')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
