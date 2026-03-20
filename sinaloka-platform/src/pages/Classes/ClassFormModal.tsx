import React from 'react';
import {
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  Label,
  Select,
} from '../../components/UI';
import { cn } from '../../lib/utils';
import { ScheduleWeekPreview } from '../../components/ScheduleWeekPreview';
import { DAYS_OF_WEEK } from './useClassesPage';
import type { Class, ScheduleDay, ClassScheduleItem } from '@/src/types/class';
import type { Room } from '@/src/types/settings';

interface ClassFormModalProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingClass: Class | null;
  setEditingClass: (cls: Class | null) => void;
  formName: string;
  setFormName: (val: string) => void;
  formSubjectId: string;
  setFormSubjectId: (val: string) => void;
  formTutorId: string;
  setFormTutorId: (val: string) => void;
  formCapacity: string;
  setFormCapacity: (val: string) => void;
  formFee: string;
  setFormFee: (val: string) => void;
  formPackageFee: string;
  setFormPackageFee: (val: string) => void;
  formTutorFee: string;
  setFormTutorFee: (val: string) => void;
  formTutorFeeMode: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
  setFormTutorFeeMode: (val: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY') => void;
  formTutorFeePerStudent: string;
  setFormTutorFeePerStudent: (val: string) => void;
  formSchedules: ClassScheduleItem[];
  setFormSchedules: React.Dispatch<React.SetStateAction<ClassScheduleItem[]>>;
  formRoom: string;
  setFormRoom: (val: string) => void;
  formStatus: 'ACTIVE' | 'ARCHIVED';
  setFormStatus: (val: 'ACTIVE' | 'ARCHIVED') => void;
  subjectsList: { id: string; name: string }[] | undefined;
  subjectTutors: { id: string; name?: string; user?: { name: string } }[] | undefined;
  billingMode: string;
  createClass: { isPending: boolean };
  updateClass: { isPending: boolean };
  tutorClasses: any[];
  availableRooms: Room[];
  toggleScheduleDay: (day: ScheduleDay) => void;
  handleFormSubmit: () => void;
  errors: Record<string, string>;
  clearError: (field: string) => void;
}

export const ClassFormModal = ({
  t,
  showModal,
  setShowModal,
  editingClass,
  setEditingClass,
  formName,
  setFormName,
  formSubjectId,
  setFormSubjectId,
  formTutorId,
  setFormTutorId,
  formCapacity,
  setFormCapacity,
  formFee,
  setFormFee,
  formPackageFee,
  setFormPackageFee,
  formTutorFee,
  setFormTutorFee,
  formTutorFeeMode,
  setFormTutorFeeMode,
  formTutorFeePerStudent,
  setFormTutorFeePerStudent,
  formSchedules,
  setFormSchedules,
  formRoom,
  setFormRoom,
  formStatus,
  setFormStatus,
  subjectsList,
  subjectTutors,
  billingMode,
  createClass,
  updateClass,
  tutorClasses,
  availableRooms,
  toggleScheduleDay,
  handleFormSubmit,
  errors,
  clearError,
}: ClassFormModalProps) => {
  const roomOptions = availableRooms.map(r => ({
    value: r.name,
    label: `${r.name} (${r.type}${r.capacity ? `, ${r.capacity} seats` : ', unlimited'})`,
  }));

  const hasRoomMismatch = editingClass?.room && !availableRooms.some(r => r.name === editingClass.room);

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-red-500 text-sm mt-1">{errors[field]}</p> : null;

  return (
    <Modal
      isOpen={showModal}
      onClose={() => { setShowModal(false); setEditingClass(null); }}
      title={editingClass ? t('classes.modal.editTitle') : t('classes.modal.createTitle')}
      className="max-w-5xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">{t('classes.form.className')}</Label>
            <Input
              id="class-name"
              placeholder={t('classes.form.classNamePlaceholder')}
              value={formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormName(e.target.value); clearError('name'); }}
            />
            <FieldError field="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">{t('classes.form.subject')}</Label>
            <Select
              className="w-full"
              value={formSubjectId}
              onChange={(val) => { setFormSubjectId(val); setFormTutorId(''); clearError('subject_id'); }}
              options={(subjectsList ?? []).map(s => ({ value: s.id, label: s.name }))}
              placeholder={t('classes.form.selectSubject')}
            />
            <FieldError field="subject_id" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tutor">{t('classes.form.assignTutor')}</Label>
            <Select
              className="w-full"
              value={formTutorId}
              onChange={(val) => { setFormTutorId(val); clearError('tutor_id'); }}
              disabled={!formSubjectId}
              options={(subjectTutors ?? []).map((tutor: { id: string; name?: string; user?: { name: string } }) => ({
                value: tutor.id,
                label: tutor.user?.name ?? tutor.name ?? '',
              }))}
              placeholder={t('classes.form.selectTutor')}
            />
            <FieldError field="tutor_id" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">{t('classes.form.status')}</Label>
            <Select
              className="w-full"
              value={formStatus}
              onChange={(val) => setFormStatus(val as 'ACTIVE' | 'ARCHIVED')}
              options={[
                { value: 'ACTIVE', label: t('common.active') },
                { value: 'ARCHIVED', label: t('common.archived') },
              ]}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t('classes.form.scheduleDays')}</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleScheduleDay(day)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                  formSchedules.some(s => s.day === day)
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                    : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          {formSchedules
            .sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day))
            .map((schedule) => (
              <div key={schedule.day} className="flex items-center gap-2 pl-1">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-20">
                  {schedule.day.slice(0, 3)}
                </span>
                <input
                  type="time"
                  value={schedule.start_time}
                  onChange={(e) => setFormSchedules(prev => prev.map(s => s.day === schedule.day ? { ...s, start_time: e.target.value } : s))}
                  className="h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 dark:text-zinc-100"
                />
                <span className="text-zinc-400 text-sm">&ndash;</span>
                <input
                  type="time"
                  value={schedule.end_time}
                  onChange={(e) => setFormSchedules(prev => prev.map(s => s.day === schedule.day ? { ...s, end_time: e.target.value } : s))}
                  className="h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => setFormSchedules(prev => prev.filter(s => s.day !== schedule.day))}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <FieldError field="schedules" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="capacity">{t('classes.form.capacity')}</Label>
            <Input
              id="capacity"
              type="number"
              placeholder="25"
              value={formCapacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormCapacity(e.target.value); clearError('capacity'); }}
            />
            <FieldError field="capacity" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee">
              {billingMode === 'subscription'
                ? t('classes.form.monthlyFee')
                : billingMode === 'manual'
                  ? t('classes.form.baseFee')
                  : t('classes.form.feePerSession')}
            </Label>
            <Input
              id="fee"
              type="number"
              placeholder="500000"
              value={formFee}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormFee(e.target.value); clearError('fee'); }}
            />
            <FieldError field="fee" />
          </div>
        </div>

        {billingMode === 'package' && (
          <div className="space-y-1.5">
            <Label>{t('classes.form.packageFee')}</Label>
            <Input
              type="number"
              placeholder="700000"
              value={formPackageFee}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPackageFee(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t('classes.form.tutorFeeMode')}</Label>
          <Select
            className="w-full"
            value={formTutorFeeMode}
            onChange={(val) => setFormTutorFeeMode(val as 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY')}
            options={[
              { value: 'FIXED_PER_SESSION', label: t('classes.form.feeMode.fixedPerSession') },
              { value: 'PER_STUDENT_ATTENDANCE', label: t('classes.form.feeMode.perStudentAttendance') },
              { value: 'MONTHLY_SALARY', label: t('classes.form.feeMode.monthlySalary') },
            ]}
          />
        </div>
        {formTutorFeeMode === 'FIXED_PER_SESSION' && (
          <div className="space-y-1.5">
            <Label>{t('classes.form.tutorFee')}</Label>
            <Input
              type="number"
              placeholder="200000"
              required
              value={formTutorFee}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormTutorFee(e.target.value); clearError('tutor_fee'); }}
            />
            <FieldError field="tutor_fee" />
          </div>
        )}
        {formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' && (
          <div className="space-y-1.5">
            <Label>{t('classes.form.tutorFeePerStudent')}</Label>
            <Input
              type="number"
              placeholder="30000"
              required
              value={formTutorFeePerStudent}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormTutorFeePerStudent(e.target.value); clearError('tutor_fee_per_student'); }}
            />
            <FieldError field="tutor_fee_per_student" />
          </div>
        )}
        {formTutorFeeMode === 'MONTHLY_SALARY' && (
          <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg">
            {t('classes.form.monthlySalaryHint')}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="room">{t('classes.form.room')}</Label>
          {hasRoomMismatch && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg p-3 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{t('classes.form.roomMismatchWarning', { value: editingClass?.room })}</span>
            </div>
          )}
          <Select
            className="w-full"
            value={formRoom}
            onChange={(val) => setFormRoom(val)}
            options={roomOptions}
            placeholder={t('classes.form.selectRoom')}
            disabled={availableRooms.length === 0}
          />
          {availableRooms.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('classes.form.noRoomsAvailable')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onClick={() => { setShowModal(false); setEditingClass(null); }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleFormSubmit}
            disabled={createClass.isPending || updateClass.isPending || !formName}
          >
            {editingClass ? t('classes.modal.updateClass') : t('classes.modal.createClass')}
          </Button>
        </div>
      </div>
      <div className="hidden lg:block space-y-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('classes.form.schedulePreview')}</label>
        {formTutorId ? (
          <ScheduleWeekPreview
            currentSchedules={formSchedules}
            tutorClasses={tutorClasses}
            currentClassId={editingClass?.id}
          />
        ) : (
          <div className="flex items-center justify-center h-64 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
            <p className="text-sm text-zinc-400">{t('classes.form.selectTutorForPreview')}</p>
          </div>
        )}
      </div>
      </div>
    </Modal>
  );
};
