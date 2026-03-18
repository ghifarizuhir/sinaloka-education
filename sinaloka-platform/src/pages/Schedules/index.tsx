import React from 'react';
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
  Zap,
  Lock,
  Search
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  isValid,
  addDays,
  parseISO,
  isBefore,
  startOfDay
} from 'date-fns';
import { Card, Button, Badge, Skeleton, PageHeader, Tabs, DropdownMenu } from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { useSchedulesPage, getSubjectColor, getStatusBorder, getSessionDate } from './useSchedulesPage';
import { ScheduleFilters } from './ScheduleFilters';
import { CalendarMonth } from './CalendarMonth';
import { CalendarWeek } from './CalendarWeek';
import { CalendarDay } from './CalendarDay';
import { ScheduleSessionModal } from './ScheduleSessionModal';
import { GenerateSessionsModal } from './GenerateSessionsModal';
import { SessionDetailDrawer } from './SessionDetailDrawer';

export const Schedules = () => {
  const s = useSchedulesPage();

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={s.t('schedules.title')}
        subtitle={s.t('schedules.subtitle')}
        actions={
          <>
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => s.setView('list')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  s.view === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => s.setView('calendar')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  s.view === 'calendar' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                <CalendarDays size={18} />
              </button>
            </div>
            <Button variant="outline" onClick={() => s.setShowGenerateModal(true)}>
              <Zap size={18} />
              {s.t('schedules.autoGenerate')}
            </Button>
            <Button onClick={() => s.setShowModal(true)}>
              <CalendarClock size={18} />
              {s.t('schedules.scheduleSession')}
            </Button>
          </>
        }
      />

      {/* Filters */}
      <ScheduleFilters
        filterDateFrom={s.filterDateFrom}
        onFilterDateFromChange={s.setFilterDateFrom}
        filterDateTo={s.filterDateTo}
        onFilterDateToChange={s.setFilterDateTo}
        filterClassId={s.filterClassId}
        onFilterClassIdChange={s.setFilterClassId}
        filterStatus={s.filterStatus}
        onFilterStatusChange={s.setFilterStatus}
        classes={s.classes}
        t={s.t}
      />

      {s.isLoading ? (
        <Card className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </Card>
      ) : s.view === 'list' ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.t('schedules.table.classSubject')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.t('schedules.table.tutor')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.t('schedules.table.dateTime')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.t('schedules.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.sessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                          <Search size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">{s.t('schedules.noSessionsFound')}</h3>
                        <p className="text-muted-foreground text-sm mb-6">{s.t('schedules.noSessionsHint')}</p>
                      </div>
                    </td>
                  </tr>
                )}
                {s.sessions.map((session) => {
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
                        s.setSelectedSessionId(session.id);
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
                            {isValid(sessionDate) ? formatDate(session.date, s.i18n.language) : session.date}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={12} /> {session.start_time} - {session.end_time}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={session.status === 'COMPLETED' ? 'success' : session.status === 'CANCELLED' ? 'default' : 'warning'}>
                          {s.STATUS_LABEL[session.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          trigger={<MoreHorizontal size={18} />}
                          items={
                            isLocked
                              ? [{ content: <span className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Lock size={12} /> {isCompleted ? s.t('schedules.menu.completedLocked') : s.t('schedules.menu.pastLocked')}</span> }]
                              : [
                                  { label: s.t('schedules.menu.markAttendance'), icon: ArrowUpRight, onClick: () => s.handleMarkAttendance(session.id), className: 'text-indigo-600' },
                                  ...(session.status === 'RESCHEDULE_REQUESTED'
                                    ? [{ label: s.t('schedules.menu.approveReschedule'), icon: CheckCircle2, onClick: () => s.handleApproveReschedule(session.id), className: 'text-emerald-600' }]
                                    : []),
                                  ...(!isCancelled
                                    ? [{ label: s.t('schedules.menu.cancelSession'), onClick: () => s.handleCancelSession(session.id), variant: 'danger' as const }]
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
                {s.calendarMode === 'month' ? format(s.currentDate, 'MMMM yyyy') :
                 s.calendarMode === 'week' ? s.t('schedules.calendar.weekOf', { date: format(s.weekStart, 'MMM d') }) :
                 format(s.currentDate, 'EEEE, MMM d')}
              </h3>
              <Tabs
                value={s.calendarMode}
                onChange={(val) => s.setCalendarMode(val as 'month' | 'week' | 'day')}
                items={[
                  { value: 'month', label: s.t('schedules.calendar.month') },
                  { value: 'week', label: s.t('schedules.calendar.week') },
                  { value: 'day', label: s.t('schedules.calendar.day') },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => s.setCurrentDate(s.calendarMode === 'month' ? subMonths(s.currentDate, 1) : s.calendarMode === 'week' ? addDays(s.currentDate, -7) : addDays(s.currentDate, -1))}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => s.setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-medium bg-card border border-input rounded-md"
              >
                {s.t('common.today')}
              </button>
              <button
                onClick={() => s.setCurrentDate(s.calendarMode === 'month' ? addMonths(s.currentDate, 1) : s.calendarMode === 'week' ? addDays(s.currentDate, 7) : addDays(s.currentDate, 1))}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Month View */}
          {s.calendarMode === 'month' && (
            <CalendarMonth
              calendarDays={s.calendarDays}
              monthStart={s.monthStart}
              sessions={s.sessions}
              onSelectSession={s.setSelectedSessionId}
              getSubjectColor={getSubjectColor}
              getStatusBorder={getStatusBorder}
              t={s.t}
            />
          )}

          {/* Day View */}
          {s.calendarMode === 'day' && (
            <CalendarDay
              currentDate={s.currentDate}
              sessions={s.sessions}
              onSelectSession={s.setSelectedSessionId}
              getSubjectColor={getSubjectColor}
              getStatusBorder={getStatusBorder}
            />
          )}

          {/* Week View */}
          {s.calendarMode === 'week' && (
            <CalendarWeek
              sessions={s.sessions}
              weekDays={s.weekDays}
              onSelectSession={s.setSelectedSessionId}
              getSubjectColor={getSubjectColor}
              getStatusBorder={getStatusBorder}
            />
          )}
        </Card>
      )}

      {/* Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={s.showModal}
        onClose={() => s.setShowModal(false)}
        selectedClassId={s.selectedClassId}
        onSelectedClassIdChange={s.setSelectedClassId}
        selectedDate={s.selectedDate}
        onSelectedDateChange={s.setSelectedDate}
        startTime={s.startTime}
        onStartTimeChange={s.setStartTime}
        endTime={s.endTime}
        onEndTimeChange={s.setEndTime}
        classes={s.classes}
        onSubmit={s.handleCreateSession}
        isPending={s.createSession.isPending}
        t={s.t}
      />

      {/* Auto-Generate Modal */}
      <GenerateSessionsModal
        isOpen={s.showGenerateModal}
        onClose={() => s.setShowGenerateModal(false)}
        genClassId={s.genClassId}
        onGenClassIdChange={s.setGenClassId}
        genDateFrom={s.genDateFrom}
        onGenDateFromChange={s.setGenDateFrom}
        genDateTo={s.genDateTo}
        onGenDateToChange={s.setGenDateTo}
        classes={s.classes}
        onSubmit={s.handleGenerate}
        isPending={s.generateSessions.isPending}
        t={s.t}
      />

      {/* Session Detail Drawer */}
      <SessionDetailDrawer
        isOpen={!!s.selectedSessionId}
        onClose={() => s.setSelectedSessionId(null)}
        selectedSession={s.selectedSession}
        sessionDetail={s.sessionDetail}
        sessionStudentsQuery={s.sessionStudentsQuery}
        STATUS_LABEL={s.STATUS_LABEL}
        approveReschedule={s.approveReschedule}
        onCancelSession={s.handleCancelSession}
        onMarkAttendance={s.handleMarkAttendance}
        t={s.t}
        language={s.i18n.language}
      />
    </div>
  );
};
