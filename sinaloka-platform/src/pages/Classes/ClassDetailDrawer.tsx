import React from 'react';
import {
  Calendar,
  Clock,
} from 'lucide-react';
import {
  Button,
  Badge,
  Drawer,
  Progress,
  Skeleton,
} from '../../components/UI';
import { cn, formatCurrency } from '../../lib/utils';
import { getSubjectColor } from './useClassesPage';
import type { Class } from '@/src/types/class';

interface ClassDetailDrawerProps {
  t: (key: string, opts?: Record<string, unknown>) => string;
  i18n: { language: string };
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  selectedClass: Class | null;
  classDetail: {
    data: any;
    isLoading: boolean;
  };
  billingMode: 'PER_SESSION' | 'MONTHLY_FIXED';
  openEditModal: (cls: Class) => void;
  handleDeleteClass: (cls: Class) => void;
  setShowGenerateModal: (show: boolean) => void;
}

export const ClassDetailDrawer = ({
  t,
  i18n,
  selectedClassId,
  setSelectedClassId,
  selectedClass,
  classDetail,
  billingMode,
  openEditModal,
  handleDeleteClass,
  setShowGenerateModal,
}: ClassDetailDrawerProps) => {
  return (
    <Drawer
      isOpen={!!selectedClassId}
      onClose={() => setSelectedClassId(null)}
      title={t('classes.drawer.title')}
    >
      {selectedClass && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-2xl font-bold mb-3 shadow-lg">
              {selectedClass.name.charAt(0)}
            </div>
            <h3 className="text-xl font-bold dark:text-zinc-100">{selectedClass.name}</h3>
            <div className="mt-3 flex gap-2">
              <span className={cn(
                'text-[10px] font-bold px-2 py-1 rounded-md border border-transparent',
                getSubjectColor(selectedClass.subject.name)
              )}>
                {selectedClass.subject.name.toUpperCase()}
              </span>
              <Badge variant={selectedClass.status === 'ACTIVE' ? 'success' : 'default'}>
                {selectedClass.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
              <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.enrolled')}</p>
              <p className="text-lg font-bold dark:text-zinc-100">
                {classDetail.data?.enrolled_count ?? 0}/{selectedClass.capacity}
              </p>
              <Progress value={classDetail.data?.enrolled_count ?? 0} max={selectedClass.capacity} />
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
              <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.fee')}</p>
              <p className="text-lg font-bold dark:text-zinc-100">{formatCurrency(Number(selectedClass.fee), i18n.language)}</p>
              <p className="text-[10px] text-zinc-400">{billingMode === 'PER_SESSION' ? t('classes.drawer.perSession') : t('classes.drawer.perMonth')}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
              <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.room')}</p>
              <p className="text-lg font-bold dark:text-zinc-100">{selectedClass.room ?? '—'}</p>
              {!selectedClass.room && <p className="text-[10px] text-zinc-400">{t('classes.drawer.noRoom')}</p>}
            </div>
          </div>

          {/* Tutor Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('classes.drawer.tutor')}</h4>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                {(selectedClass.tutor?.name ?? '?').charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold dark:text-zinc-200">{selectedClass.tutor?.name ?? '—'}</p>
                {classDetail.data?.tutor?.email && (
                  <p className="text-xs text-zinc-500">{classDetail.data.tutor.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('classes.drawer.schedule')}</h4>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
              {selectedClass.schedules?.map((schedule) => (
                <div key={schedule.day} className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold w-12 text-center">
                    {schedule.day.slice(0, 3)}
                  </span>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                    <Clock size={14} />
                    {schedule.start_time} - {schedule.end_time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrolled Students Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              {t('classes.drawer.enrolledStudents')} ({classDetail.data?.enrolled_count ?? 0})
            </h4>
            {classDetail.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : classDetail.data?.enrollments?.length ? (
              <div className="space-y-2">
                {classDetail.data.enrollments.map((enrollment: any) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                        {enrollment.student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-zinc-200">{enrollment.student.name}</p>
                        {enrollment.student.grade && (
                          <p className="text-[10px] text-zinc-400">{enrollment.student.grade}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={enrollment.status === 'ACTIVE' ? 'success' : 'default'}>
                      {enrollment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">{t('classes.drawer.noStudents')}</p>
            )}
          </div>

          {/* Generate Sessions Button */}
          {classDetail.data?.status === 'ACTIVE' && classDetail.data?.schedules?.length > 0 && (
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => setShowGenerateModal(true)}
                disabled={classDetail.isLoading}
              >
                <Calendar size={16} />
                {t('classes.drawer.generateSessions')}
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { openEditModal(selectedClass); setSelectedClassId(null); }}
            >
              {t('classes.drawer.editClass')}
            </Button>
            <Button
              className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => handleDeleteClass(selectedClass)}
            >
              {t('classes.drawer.deleteClass')}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
