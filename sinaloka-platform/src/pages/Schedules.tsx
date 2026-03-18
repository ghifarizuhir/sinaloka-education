import React, { useState, useMemo, useEffect } from 'react';
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
  Zap,
  Lock,
  Search
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
  parseISO,
  isBefore,
  startOfDay
} from 'date-fns';
import { toast } from 'sonner';
import { Card, Button, Badge, Modal, Drawer, Input, Label, Switch, Skeleton, PageHeader, Select, Tabs, DropdownMenu } from '../components/UI';
import { WeekCalendar } from '../components/WeekCalendar';
import { cn, formatDate } from '../lib/utils';
import { useSessions, useSession, useSessionStudents, useCreateSession, useUpdateSession, useDeleteSession, useGenerateSessions, useApproveReschedule } from '@/src/hooks/useSessions';
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
  const sessionStudentsQuery = useSessionStudents(selectedSessionId);
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
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
      <PageHeader
        title={t('schedules.title')}
        subtitle={t('schedules.subtitle')}
        actions={
          <>
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setView('list')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  view === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  view === 'calendar' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
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
          </>
        }
      />

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
        <Select
          value={filterClassId}
          onChange={setFilterClassId}
          className="h-9 text-xs"
          options={[
            { value: '', label: t('schedules.filter.allClasses') },
            ...classes.map(c => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          value={filterStatus}
          onChange={(val) => setFilterStatus(val as SessionStatus | '')}
          className="h-9 text-xs"
          options={[
            { value: '', label: t('schedules.filter.allStatuses') },
            { value: 'SCHEDULED', label: t('schedules.filter.scheduled') },
            { value: 'COMPLETED', label: t('schedules.filter.completed') },
            { value: 'CANCELLED', label: t('schedules.filter.cancelled') },
            { value: 'RESCHEDULE_REQUESTED', label: t('schedules.filter.rescheduleRequested') },
          ]}
        />
      </div>

      {isLoading ? (
        <Card className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </Card>
      ) : view === 'list' ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('schedules.table.classSubject')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('schedules.table.tutor')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('schedules.table.dateTime')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('schedules.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                          <Search size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">{t('schedules.noSessionsFound')}</h3>
                        <p className="text-muted-foreground text-sm mb-6">{t('schedules.noSessionsHint')}</p>
                      </div>
                    </td>
                  </tr>
                )}
                {sessions.map((session) => {
                  const isCancelled = session.status === 'CANCELLED';
                  const isCompleted = session.status === 'COMPLETED';
                  const sessionDate = getSessionDate(session);
                  const isPast = isValid(sessionDate) && isBefore(startOfDay(sessionDate), startOfDay(new Date()));
                  const isLocked = isCompleted || isPast;
                  const subject = session.class?.subject;
                  const tutorName = session.class?.tutor?.name ?? '—';
                  const className = session.class?.name ?? '—';
                  return (
                    <tr
                      key={session.id}
                      className={cn(
                        "hover:bg-muted/50 transition-colors group cursor-pointer",
                        isCancelled && "opacity-50 grayscale-[0.5]"
                      )}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-bold text-foreground", isCancelled && "line-through")}>{className}</span>
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User size={14} className="text-muted-foreground" />
                          {tutorName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {isValid(sessionDate) ? formatDate(session.date, i18n.language) : session.date}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
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
                        <DropdownMenu
                          trigger={<MoreHorizontal size={18} />}
                          items={
                            isLocked
                              ? [{ content: <span className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Lock size={12} /> {isCompleted ? t('schedules.menu.completedLocked') : t('schedules.menu.pastLocked')}</span> }]
                              : [
                                  { label: t('schedules.menu.markAttendance'), icon: ArrowUpRight, onClick: () => handleMarkAttendance(session.id), className: 'text-indigo-600' },
                                  ...(session.status === 'RESCHEDULE_REQUESTED'
                                    ? [{ label: t('schedules.menu.approveReschedule'), icon: CheckCircle2, onClick: () => handleApproveReschedule(session.id), className: 'text-emerald-600' }]
                                    : []),
                                  ...(!isCancelled
                                    ? [{ label: t('schedules.menu.cancelSession'), onClick: () => handleCancelSession(session.id), variant: 'danger' as const }]
                                    : []),
                                ]
                          }
                        />
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
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-lg min-w-[150px]">
                {calendarMode === 'month' ? format(currentDate, 'MMMM yyyy') :
                 calendarMode === 'week' ? t('schedules.calendar.weekOf', { date: format(weekStart, 'MMM d') }) :
                 format(currentDate, 'EEEE, MMM d')}
              </h3>
              <Tabs
                value={calendarMode}
                onChange={(val) => setCalendarMode(val as 'month' | 'week' | 'day')}
                items={[
                  { value: 'month', label: t('schedules.calendar.month') },
                  { value: 'week', label: t('schedules.calendar.week') },
                  { value: 'day', label: t('schedules.calendar.day') },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(calendarMode === 'month' ? subMonths(currentDate, 1) : calendarMode === 'week' ? addDays(currentDate, -7) : addDays(currentDate, -1))}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-medium bg-card border border-input rounded-md"
              >
                {t('common.today')}
              </button>
              <button
                onClick={() => setCurrentDate(calendarMode === 'month' ? addMonths(currentDate, 1) : calendarMode === 'week' ? addDays(currentDate, 7) : addDays(currentDate, 1))}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Month View */}
          {calendarMode === 'month' && (
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
                              onClick={() => setSelectedSessionId(s.id)}
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
                                  onClick={() => setSelectedSessionId(s.id)}
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
          )}

          {/* Week View */}
          {calendarMode === 'week' && (
            <WeekCalendar
              sessions={sessions}
              weekDays={weekDays}
              onSelectSession={setSelectedSessionId}
              getSubjectColor={getSubjectColor}
              getStatusBorder={getStatusBorder}
            />
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
            <Select
              value={selectedClassId}
              onChange={setSelectedClassId}
              className="w-full"
              options={[
                { value: '', label: t('schedules.form.selectClassPlaceholder') },
                ...classes.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
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
              <Select
                value={startTime}
                onChange={setStartTime}
                className="w-full"
                options={TIME_SLOTS.map(slot => ({ value: slot, label: slot }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('schedules.form.endTime')}</Label>
              <Select
                value={endTime}
                onChange={setEndTime}
                className="w-full"
                options={TIME_SLOTS.map(slot => ({ value: slot, label: slot }))}
              />
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
            <Select
              value={genClassId}
              onChange={setGenClassId}
              className="w-full"
              options={[
                { value: '', label: t('schedules.form.selectClassPlaceholder') },
                ...classes.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
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
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold mb-3 shadow-lg">
                {(selectedSession.class?.name ?? '?').charAt(0)}
              </div>
              <h3 className="text-lg font-bold text-foreground">{selectedSession.class?.name ?? '—'}</h3>
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
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('schedules.drawer.dateTime')}</h4>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {isValid(parseISO(selectedSession.date)) ? formatDate(selectedSession.date, i18n.language) : selectedSession.date}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Clock size={14} />
                  {selectedSession.start_time} - {selectedSession.end_time}
                </div>
              </div>
            </div>

            {/* Tutor */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('schedules.drawer.tutor')}</h4>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                  {(selectedSession.class?.tutor?.name ?? '?').charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedSession.class?.tutor?.name ?? '—'}</p>
                  {sessionDetail.data?.class?.tutor?.email && (
                    <p className="text-xs text-muted-foreground">{sessionDetail.data.class.tutor.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Session Content (if COMPLETED) */}
            {selectedSession.status === 'COMPLETED' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('schedules.drawer.sessionContent')}</h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('schedules.drawer.topicCovered')}</p>
                    <p className="text-sm text-foreground">{selectedSession.topic_covered || t('schedules.drawer.noContent')}</p>
                  </div>
                  {selectedSession.session_summary && (
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('schedules.drawer.sessionSummary')}</p>
                      <p className="text-sm text-foreground">{selectedSession.session_summary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reschedule Info (if RESCHEDULE_REQUESTED) */}
            {selectedSession.status === 'RESCHEDULE_REQUESTED' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('schedules.drawer.rescheduleInfo')}</h4>
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
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {t('schedules.drawer.attendance')} ({sessionStudentsQuery.data?.students?.filter(s => s.attendance_id !== null).length ?? 0}/{sessionStudentsQuery.data?.students?.length ?? 0})
              </h4>
              {sessionStudentsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : sessionStudentsQuery.data?.students?.length ? (
                <div className="space-y-2">
                  {sessionStudentsQuery.data.students.map((student) => (
                    <div key={student.id} className={cn("flex items-center justify-between p-3 rounded-xl bg-muted/50", !student.attendance_id && "opacity-60")}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{student.name}</p>
                          {student.grade && <p className="text-[10px] text-muted-foreground">{student.grade}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.attendance_id !== null ? (
                          <>
                            {student.homework_done && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('schedules.drawer.homework')}</span>
                            )}
                            <Badge variant={student.status === 'PRESENT' ? 'success' : student.status === 'LATE' ? 'warning' : 'default'}>
                              {t(`schedules.drawer.${student.status!.toLowerCase()}`)}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="default">
                            {t('schedules.drawer.pending', 'Pending')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t('schedules.drawer.noStudents', 'No students enrolled')}</p>
              )}
            </div>

            {/* Action Buttons */}
            {(() => {
              const drawerSessionDate = getSessionDate(selectedSession);
              const drawerIsPast = isValid(drawerSessionDate) && isBefore(startOfDay(drawerSessionDate), startOfDay(new Date()));
              const drawerIsLocked = selectedSession.status === 'COMPLETED' || drawerIsPast;
              return drawerIsLocked ? (
                <div className="flex items-center gap-2 pt-4 border-t border-border text-muted-foreground text-sm">
                  <Lock size={14} />
                  {selectedSession.status === 'COMPLETED' ? t('schedules.menu.completedLocked') : t('schedules.menu.pastLocked')}
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-4 border-t border-border">
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
              );
            })()}
          </div>
        )}
      </Drawer>
    </div>
  );
};
