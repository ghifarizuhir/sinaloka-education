import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isValid,
  addDays,
  parseISO,
  isBefore,
  startOfDay
} from 'date-fns';
import { toast } from 'sonner';
import { useSessions, useSession, useSessionStudents, useCreateSession, useUpdateSession, useDeleteSession, useGenerateSessions, useApproveReschedule } from '@/src/hooks/useSessions';
import { useClasses } from '@/src/hooks/useClasses';
import type { Session, CreateSessionDto, SessionStatus } from '@/src/types/session';

export { getSubjectColor } from '@/src/lib/utils';

export function getSessionDate(session: Session): Date {
  return parseISO(session.date);
}

export function getStatusBorder(status: SessionStatus): string {
  switch (status) {
    case 'COMPLETED': return 'border-l-2 border-l-emerald-500';
    case 'RESCHEDULE_REQUESTED': return 'border-l-2 border-l-amber-500';
    default: return '';
  }
}

export function useSchedulesPage() {
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

  // Auto-compute date range from calendar view
  const autoDateRange = (() => {
    if (calendarMode === 'month') {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      // Extend to cover the full calendar grid (previous/next month overflow days)
      const gridStart = startOfWeek(ms);
      const gridEnd = endOfWeek(me);
      return {
        date_from: format(gridStart, 'yyyy-MM-dd'),
        date_to: format(gridEnd, 'yyyy-MM-dd'),
      };
    } else if (calendarMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return {
        date_from: format(ws, 'yyyy-MM-dd'),
        date_to: format(we, 'yyyy-MM-dd'),
      };
    } else {
      // day mode
      return {
        date_from: format(currentDate, 'yyyy-MM-dd'),
        date_to: format(currentDate, 'yyyy-MM-dd'),
      };
    }
  })();

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

  // Queries — always scope to current calendar view range
  const effectiveDateFrom = filterDateFrom || autoDateRange.date_from;
  const effectiveDateTo = filterDateTo || autoDateRange.date_to;

  const sessionsQuery = useSessions({
    page,
    limit: 500,
    date_from: effectiveDateFrom,
    date_to: effectiveDateTo,
    ...(filterClassId && { class_id: filterClassId }),
    ...(filterStatus && { status: filterStatus }),
  });
  const classesQuery = useClasses({ limit: 100 });

  const sessions: Session[] = sessionsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  // Mutations
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
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
  const startDateCal = startOfWeek(monthStart);
  const endDateCal = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDateCal, end: endDateCal });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleCancelSession = (id: string) => {
    updateSession.mutate({ id, data: { status: 'CANCELLED' } }, {
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

  return {
    t,
    i18n,
    showModal,
    setShowModal,
    view,
    setView,
    calendarMode,
    setCalendarMode,
    currentDate,
    setCurrentDate,
    STATUS_LABEL,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterClassId,
    setFilterClassId,
    filterStatus,
    setFilterStatus,
    selectedSessionId,
    setSelectedSessionId,
    showGenerateModal,
    setShowGenerateModal,
    genClassId,
    setGenClassId,
    genDateFrom,
    setGenDateFrom,
    genDateTo,
    setGenDateTo,
    selectedClassId,
    setSelectedClassId,
    selectedDate,
    setSelectedDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    sessions,
    classes,
    createSession,
    updateSession,
    deleteSession,
    generateSessions,
    approveReschedule,
    sessionDetail,
    sessionStudentsQuery,
    selectedSession,
    calendarDays,
    monthStart,
    weekStart,
    weekDays,
    handleCancelSession,
    handleMarkAttendance,
    handleApproveReschedule,
    handleCreateSession,
    handleGenerate,
    isLoading,
  };
}
