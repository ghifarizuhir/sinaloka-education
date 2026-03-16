import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  List,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  User,
  ArrowUpRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  Info,
  Zap
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isValid,
  addDays,
  parseISO
} from 'date-fns';
import { toast } from 'sonner';
import { Card, Button, Badge, Modal, Drawer, Input, Label, Switch, Skeleton } from '../components/UI';
import { cn, formatDate } from '../lib/utils';
import { useSessions, useSession, useCreateSession, useUpdateSession, useDeleteSession, useGenerateSessions, useApproveReschedule } from '@/src/hooks/useSessions';
import { useClasses } from '@/src/hooks/useClasses';
import type { Session, CreateSessionDto, SessionStatus } from '@/src/types/session';

const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  'Science': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
  'English': 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800',
};

const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

function getSessionDate(session: Session): Date {
  return parseISO(session.date);
}

export const Schedules = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const STATUS_LABEL: Record<SessionStatus, string> = {
    SCHEDULED: t('schedules.status.scheduled'),
    COMPLETED: t('schedules.status.completed'),
    CANCELLED: t('schedules.status.cancelled'),
    RESCHEDULE_REQUESTED: t('schedules.status.rescheduleRequested'),
  };

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStatus, setFilterStatus] = useState<SessionStatus | ''>('');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [page] = useState(1);

  // Generate sessions state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genClassId, setGenClassId] = useState('');
  const [genDateFrom, setGenDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [genDateTo, setGenDateTo] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));

  // Modal state for create session
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');

  // Queries
  const sessionsQuery = useSessions({
    page,
    limit: 100,
    ...(filterDateFrom && { date_from: filterDateFrom }),
    ...(filterDateTo && { date_to: filterDateTo }),
    ...(filterClassId && { class_id: filterClassId }),
    ...(filterStatus && { status: filterStatus }),
  });
  const classesQuery = useClasses({ limit: 100 });

  const sessions: Session[] = sessionsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  // Mutations
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const generateSessions = useGenerateSessions();
  const approveReschedule = useApproveReschedule();

  const sessionDetail = useSession(selectedSessionId);
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;

  // Auto-set first class when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
    if (classes.length > 0 && !genClassId) {
      setGenClassId(classes[0].id);
    }
  }, [classes]);

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSubjectColor = (subject?: string) => {
    if (!subject) return '';
    return SUBJECT_COLORS[subject] || '';
  };

  function getStatusBorder(status: SessionStatus): string {
    switch (status) {
      case 'COMPLETED': return 'border-l-2 border-l-emerald-500';
      case 'RESCHEDULE_REQUESTED': return 'border-l-2 border-l-amber-500';
      default: return '';
    }
  }

  const handleCancelSession = (id: string) => {
    deleteSession.mutate(id, {
      onSuccess: () => toast.success(t('schedules.toast.sessionCancelled')),
      onError: () => toast.error(t('schedules.toast.cancelError')),
    });
  };

  const handleMarkAttendance = (sessionId: string) => {
    navigate('/attendance', { state: { sessionId } });
  };

  const handleApproveReschedule = (id: string) => {
    approveReschedule.mutate({ id, data: { approved: true } }, {
      onSuccess: () => toast.success(t('schedules.toast.rescheduleApproved')),
      onError: () => toast.error(t('schedules.toast.rescheduleError')),
    });
  };

  const handleCreateSession = () => {
    if (!selectedClassId) return;
    const dto: CreateSessionDto = {
      class_id: selectedClassId,
      date: selectedDate,
      start_time: startTime,
      end_time: endTime,
    };
    createSession.mutate(dto, {
      onSuccess: () => {
        toast.success(t('schedules.toast.sessionScheduled'));
        setShowModal(false);
      },
      onError: () => toast.error(t('schedules.toast.scheduleError')),
    });
  };

  const handleGenerate = () => {
    if (!genClassId) return;
    generateSessions.mutate({ class_id: genClassId, date_from: genDateFrom, date_to: genDateTo }, {
      onSuccess: () => {
        toast.success(t('schedules.toast.sessionsGenerated'));
        setShowGenerateModal(false);
      },
      onError: () => toast.error(t('schedules.toast.generateError')),
    });
  };

  const isLoading = sessionsQuery.isLoading;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('schedules.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('schedules.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
            <button
              onClick={() => setView('list')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'list' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'calendar' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}
            >
              <CalendarDays size={18} />
            </button>
          </div>
          <Button variant="outline" onClick={() => setShowGenerateModal(true)}>
            <Zap size={18} />
            {t('schedules.autoGenerate')}
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <CalendarClock size={18} />
            {t('schedules.scheduleSession')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="h-9 text-xs w-36"
          placeholder={t('schedules.form.dateFrom')}
        />
        <Input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="h-9 text-xs w-36"
          placeholder={t('schedules.form.dateTo')}
        />
        <select
          className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
        >
          <option value="">{t('schedules.filter.allClasses')}</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as SessionStatus | '')}
        >
          <option value="">{t('schedules.filter.allStatuses')}</option>
          <option value="SCHEDULED">{t('schedules.filter.scheduled')}</option>
          <option value="COMPLETED">{t('schedules.filter.completed')}</option>
          <option value="CANCELLED">{t('schedules.filter.cancelled')}</option>
          <option value="RESCHEDULE_REQUESTED">{t('schedules.filter.rescheduleRequested')}</option>
        </select>
      </div>

      {isLoading ? (
        <Card className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </Card>
      ) : view === 'list' ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('schedules.table.classSubject')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('schedules.table.tutor')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('schedules.table.dateTime')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('schedules.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">{t('schedules.noSessionsFound')}</td>
                  </tr>
                )}
                {sessions.map((session) => {
                  const isCancelled = session.status === 'CANCELLED';
                  const sessionDate = getSessionDate(session);
                  const subject = session.class?.subject;
                  const tutorName = session.class?.tutor?.name ?? '—';
                  const className = session.class?.name ?? '—';
                  return (
                    <tr
                      key={session.id}
                      className={cn(
                        "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer",
                        isCancelled && "opacity-50 grayscale-[0.5]"
                      )}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setActiveActionMenu(null);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-bold dark:text-zinc-200", isCancelled && "line-through")}>{className}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {subject && (
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", getSubjectColor(subject))}>
                                {subject}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <User size={14} className="text-zinc-400" />
                          {tutorName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium dark:text-zinc-200">
                            {isValid(sessionDate) ? formatDate(session.date, i18n.language) : session.date}
                          </span>
                          <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <Clock size={12} /> {session.start_time} - {session.end_time}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={session.status === 'COMPLETED' ? 'success' : session.status === 'CANCELLED' ? 'default' : 'warning'}>
                          {STATUS_LABEL[session.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => setActiveActionMenu(activeActionMenu === session.id ? null : session.id)}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          <AnimatePresence>
                            {activeActionMenu === session.id && (
                              <>
                                <div className="fixed inset-0 z-[5]" onClick={() => setActiveActionMenu(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1 text-left"
                                >
                                  <button
                                    onClick={() => { handleMarkAttendance(session.id); setActiveActionMenu(null); }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-indigo-600"
                                  >
                                    {t('schedules.menu.markAttendance')} <ArrowUpRight size={14} />
                                  </button>
                                  {session.status === 'RESCHEDULE_REQUESTED' && (
                                    <button
                                      onClick={() => { handleApproveReschedule(session.id); setActiveActionMenu(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-emerald-600"
                                    >
                                      <CheckCircle2 size={14} /> {t('schedules.menu.approveReschedule')}
                                    </button>
                                  )}
                                  {!isCancelled && (
                                    <button
                                      onClick={() => { handleCancelSession(session.id); setActiveActionMenu(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-red-500"
                                    >
                                      {t('schedules.menu.cancelSession')}
                                    </button>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden flex flex-col min-h-[700px]">
          {/* Calendar Header */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/30 dark:bg-zinc-900/30">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-lg min-w-[150px]">
                {calendarMode === 'month' ? format(currentDate, 'MMMM yyyy') :
                 calendarMode === 'week' ? t('schedules.calendar.weekOf', { date: format(weekStart, 'MMM d') }) :
                 format(currentDate, 'EEEE, MMM d')}
              </h3>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                <button
                  onClick={() => setCalendarMode('month')}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", calendarMode === 'month' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500")}
                >{t('schedules.calendar.month')}</button>
                <button
                  onClick={() => setCalendarMode('week')}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", calendarMode === 'week' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500")}
                >{t('schedules.calendar.week')}</button>
                <button
                  onClick={() => setCalendarMode('day')}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", calendarMode === 'day' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500")}
                >{t('schedules.calendar.day')}</button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(calendarMode === 'month' ? subMonths(currentDate, 1) : calendarMode === 'week' ? addDays(currentDate, -7) : addDays(currentDate, -1))}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
              >
                {t('common.today')}
              </button>
              <button
                onClick={() => setCurrentDate(calendarMode === 'month' ? addMonths(currentDate, 1) : calendarMode === 'week' ? addDays(currentDate, 7) : addDays(currentDate, 1))}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Month View */}
          {calendarMode === 'month' && (
            <>
              <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
                {[
                  t('schedules.calendar.sun'),
                  t('schedules.calendar.mon'),
                  t('schedules.calendar.tue'),
                  t('schedules.calendar.wed'),
                  t('schedules.calendar.thu'),
                  t('schedules.calendar.fri'),
                  t('schedules.calendar.sat'),
                ].map((day) => (
                  <div key={day} className="py-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
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
                        "min-h-[120px] p-2 border-r border-b border-zinc-50 dark:border-zinc-900 transition-colors",
                        !isSameMonth(day, monthStart) && "bg-zinc-50/50 dark:bg-zinc-950/50",
                        isSameDay(day, new Date()) && "bg-zinc-100/30 dark:bg-zinc-900/30"
                      )}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          isSameDay(day, new Date()) ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500"
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
                              onClick={() => setSelectedSessionId(s.id)}
                              className={cn(
                                "p-1.5 rounded-md text-[10px] font-medium truncate border transition-all hover:scale-[1.02] cursor-pointer",
                                isCancelled ? "bg-zinc-50 text-zinc-400 border-zinc-100 line-through" : getSubjectColor(subject),
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
          )}

          {/* Day View */}
          {calendarMode === 'day' && (
            <div className="flex-1 overflow-x-auto">
              <div className="min-w-[400px] h-full flex flex-col">
                <div className="flex-1 relative">
                  <div className="absolute inset-0 flex flex-col">
                    {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => {
                      const hourSessions = sessions.filter(s => {
                        try {
                          return isSameDay(parseISO(s.date), currentDate) && parseInt(s.start_time.split(':')[0]) === hour;
                        } catch { return false; }
                      });
                      return (
                        <div key={hour} className="flex-1 border-b border-zinc-100 dark:border-zinc-800 flex">
                          <div className="w-20 shrink-0 border-r border-zinc-100 dark:border-zinc-800 flex items-start justify-center pt-2">
                            <span className="text-[10px] font-bold text-zinc-400">{hour}:00</span>
                          </div>
                          <div className="flex-1 relative p-1 space-y-1">
                            {hourSessions.map(s => {
                              const isCancelled = s.status === 'CANCELLED';
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => setSelectedSessionId(s.id)}
                                  className={cn(
                                    "rounded-lg p-2 border shadow-sm text-[10px] cursor-pointer hover:scale-[1.01] transition-all",
                                    isCancelled ? "bg-zinc-50 text-zinc-400 border-zinc-100 line-through" : getSubjectColor(s.class?.subject),
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
          )}

          {/* Week View Placeholder */}
          {calendarMode === 'week' && (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div className="max-w-xs">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <LayoutGrid size={32} />
                </div>
                <h4 className="font-bold mb-2">{t('schedules.calendar.weeklyOverview')}</h4>
                <p className="text-sm text-zinc-500">{t('schedules.calendar.weeklyOverviewDesc')}</p>
                <Button variant="outline" className="mt-4" onClick={() => setCalendarMode('month')}>{t('schedules.calendar.backToMonthView')}</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Schedule Session Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('schedules.modal.scheduleTitle')}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('schedules.form.selectClass')}</Label>
            <select
              className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">{t('schedules.form.selectClassPlaceholder')}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('schedules.form.date')}</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('schedules.form.startTime')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('schedules.form.endTime')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleCreateSession}
              disabled={!selectedClassId || createSession.isPending}
            >
              {createSession.isPending ? t('schedules.form.scheduling') : t('schedules.scheduleSession')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title={t('schedules.modal.generateTitle')}
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex gap-3">
            <Info size={18} className="text-blue-600 shrink-0" />
            <p className="text-[10px] text-blue-700 dark:text-blue-400">
              {t('schedules.modal.generateInfo')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.form.selectClass')}</Label>
            <select
              className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
              value={genClassId}
              onChange={(e) => setGenClassId(e.target.value)}
            >
              <option value="">{t('schedules.form.selectClassPlaceholder')}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('schedules.form.dateFrom')}</Label>
              <Input type="date" value={genDateFrom} onChange={(e) => setGenDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('schedules.form.dateTo')}</Label>
              <Input type="date" value={genDateTo} onChange={(e) => setGenDateTo(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowGenerateModal(false)}>{t('common.cancel')}</Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleGenerate}
              disabled={!genClassId || generateSessions.isPending}
            >
              {generateSessions.isPending ? t('schedules.form.generating') : t('schedules.modal.generateSessions')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Session Detail Drawer */}
      <Drawer
        isOpen={!!selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
        title={t('schedules.drawer.title')}
      >
        {selectedSession && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xl font-bold mb-3 shadow-lg">
                {(selectedSession.class?.name ?? '?').charAt(0)}
              </div>
              <h3 className="text-lg font-bold dark:text-zinc-100">{selectedSession.class?.name ?? '—'}</h3>
              <div className="mt-2 flex gap-2">
                {selectedSession.class?.subject && (
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-md border', getSubjectColor(selectedSession.class.subject))}>
                    {selectedSession.class.subject.toUpperCase()}
                  </span>
                )}
                <Badge variant={selectedSession.status === 'COMPLETED' ? 'success' : selectedSession.status === 'CANCELLED' ? 'default' : 'warning'}>
                  {STATUS_LABEL[selectedSession.status]}
                </Badge>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.dateTime')}</h4>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-sm dark:text-zinc-200">
                  <CalendarIcon size={14} className="text-zinc-400" />
                  {isValid(parseISO(selectedSession.date)) ? formatDate(selectedSession.date, i18n.language) : selectedSession.date}
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                  <Clock size={14} />
                  {selectedSession.start_time} - {selectedSession.end_time}
                </div>
              </div>
            </div>

            {/* Tutor */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.tutor')}</h4>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                  {(selectedSession.class?.tutor?.name ?? '?').charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-zinc-200">{selectedSession.class?.tutor?.name ?? '—'}</p>
                  {sessionDetail.data?.class?.tutor?.email && (
                    <p className="text-xs text-zinc-500">{sessionDetail.data.class.tutor.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Session Content (if COMPLETED) */}
            {selectedSession.status === 'COMPLETED' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.sessionContent')}</h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">{t('schedules.drawer.topicCovered')}</p>
                    <p className="text-sm dark:text-zinc-200">{selectedSession.topic_covered || t('schedules.drawer.noContent')}</p>
                  </div>
                  {selectedSession.session_summary && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">{t('schedules.drawer.sessionSummary')}</p>
                      <p className="text-sm dark:text-zinc-200">{selectedSession.session_summary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reschedule Info (if RESCHEDULE_REQUESTED) */}
            {selectedSession.status === 'RESCHEDULE_REQUESTED' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('schedules.drawer.rescheduleInfo')}</h4>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-amber-700 dark:text-amber-300 font-medium">{t('schedules.drawer.proposedDateTime')}: </span>
                      <span className="dark:text-amber-200">{selectedSession.proposed_date} {selectedSession.proposed_start_time} - {selectedSession.proposed_end_time}</span>
                    </div>
                    {selectedSession.reschedule_reason && (
                      <div>
                        <span className="text-amber-700 dark:text-amber-300 font-medium">{t('schedules.drawer.reason')}: </span>
                        <span className="dark:text-amber-200">{selectedSession.reschedule_reason}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        approveReschedule.mutate(
                          { id: selectedSession.id, data: { approved: true } },
                          {
                            onSuccess: () => { toast.success(t('schedules.toast.rescheduleApproved')); setSelectedSessionId(null); },
                            onError: () => toast.error(t('schedules.toast.rescheduleError')),
                          }
                        );
                      }}
                    >
                      {t('schedules.drawer.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 justify-center text-red-500"
                      onClick={() => {
                        approveReschedule.mutate(
                          { id: selectedSession.id, data: { approved: false } },
                          {
                            onSuccess: () => { toast.success(t('schedules.toast.rescheduleRejected')); setSelectedSessionId(null); },
                            onError: () => toast.error(t('schedules.toast.rescheduleError')),
                          }
                        );
                      }}
                    >
                      {t('schedules.drawer.reject')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {t('schedules.drawer.attendance')} ({sessionDetail.data?.attendances?.length ?? 0})
              </h4>
              {sessionDetail.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : sessionDetail.data?.attendances?.length ? (
                <div className="space-y-2">
                  {sessionDetail.data.attendances.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                          {att.student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-zinc-200">{att.student.name}</p>
                          {att.student.grade && <p className="text-[10px] text-zinc-400">{att.student.grade}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {att.homework_done && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('schedules.drawer.homework')}</span>
                        )}
                        <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'LATE' ? 'warning' : 'default'}>
                          {t(`schedules.drawer.${att.status.toLowerCase()}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">{t('schedules.drawer.noAttendance')}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => { handleMarkAttendance(selectedSession.id); setSelectedSessionId(null); }}
              >
                {t('schedules.drawer.markAttendance')}
              </Button>
              {selectedSession.status !== 'CANCELLED' && (
                <Button
                  className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => { handleCancelSession(selectedSession.id); setSelectedSessionId(null); }}
                >
                  {t('schedules.drawer.cancelSession')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
