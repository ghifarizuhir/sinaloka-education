import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Lock,
} from 'lucide-react';
import { isValid, parseISO, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Drawer, Button, Badge, Skeleton } from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { getSessionDate, getSubjectColor } from './useSchedulesPage';
import type { Session, SessionStatus } from '@/src/types/session';
import type { TFunction } from 'i18next';
import { EditSessionModal } from './EditSessionModal';

interface SessionStudent {
  id: string;
  name: string;
  grade?: string;
  attendance_id: string | null;
  status?: string | null;
  homework_done?: boolean;
}

interface SessionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSession: Session | null;
  sessionDetail: { data?: any };
  sessionStudentsQuery: { data?: { students?: SessionStudent[] }; isLoading: boolean };
  STATUS_LABEL: Record<SessionStatus, string>;
  approveReschedule: { mutate: (args: { id: string; data: { approved: boolean } }, opts: any) => void };
  onCancelSession: (id: string) => void;
  onMarkAttendance: (id: string) => void;
  t: TFunction;
  language: string;
}

export const SessionDetailDrawer: React.FC<SessionDetailDrawerProps> = ({
  isOpen,
  onClose,
  selectedSession,
  sessionDetail,
  sessionStudentsQuery,
  STATUS_LABEL,
  approveReschedule,
  onCancelSession,
  onMarkAttendance,
  t,
  language,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
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
                {isValid(parseISO(selectedSession.date)) ? formatDate(selectedSession.date, language) : selectedSession.date}
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
                          onSuccess: () => { toast.success(t('schedules.toast.rescheduleApproved')); onClose(); },
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
                          onSuccess: () => { toast.success(t('schedules.toast.rescheduleRejected')); onClose(); },
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
                  onClick={() => setShowEditModal(true)}
                >
                  {t('schedules.drawer.editSession', { defaultValue: 'Edit Session' })}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 justify-center"
                  onClick={() => { onMarkAttendance(selectedSession.id); onClose(); }}
                >
                  {t('schedules.drawer.markAttendance')}
                </Button>
                {selectedSession.status !== 'CANCELLED' && (
                  <Button
                    className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => { onCancelSession(selectedSession.id); onClose(); }}
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
    <EditSessionModal
      session={selectedSession ? {
        id: selectedSession.id,
        date: selectedSession.date,
        start_time: selectedSession.start_time,
        end_time: selectedSession.end_time,
        status: selectedSession.status,
      } : null}
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
    />
    </>
  );
};
