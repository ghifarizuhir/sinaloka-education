import React from 'react';
import {
  Search,
  DollarSign,
  Check,
  User,
} from 'lucide-react';
import {
  Modal,
  Button,
  Label,
  Switch,
} from '../../components/UI';
import { cn } from '../../lib/utils';
import type { TFunction } from 'i18next';
import type { Class } from '@/src/types/class';

interface NewEnrollmentModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  selectedStudentIds: string[];
  setSelectedStudentIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  enrollmentType: 'ACTIVE' | 'TRIAL';
  setEnrollmentType: (type: 'ACTIVE' | 'TRIAL') => void;
  autoInvoice: boolean;
  setAutoInvoice: (value: boolean) => void;
  studentSearch: string;
  setStudentSearch: (value: string) => void;
  filteredStudents: { id: string; name: string }[];
  studentsLoading: boolean;
  classes: Class[];
  classesLoading: boolean;
  handleEnroll: () => void;
  createIsPending: boolean;
  t: TFunction;
}

export const NewEnrollmentModal = ({
  showModal,
  setShowModal,
  selectedStudentIds,
  setSelectedStudentIds,
  selectedClassId,
  setSelectedClassId,
  enrollmentType,
  setEnrollmentType,
  autoInvoice,
  setAutoInvoice,
  studentSearch,
  setStudentSearch,
  filteredStudents,
  studentsLoading,
  classes,
  classesLoading,
  handleEnroll,
  createIsPending,
  t,
}: NewEnrollmentModalProps) => {
  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title={t('enrollments.modal.newTitle')}
      className="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">{t('enrollments.form.step1')}</Label>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <Search size={14} className="text-zinc-400" />
                <input
                  placeholder={t('enrollments.form.searchStudents')}
                  className="bg-transparent text-xs focus:outline-none w-full"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {studentsLoading ? (
                  <div className="p-4 text-center text-xs text-zinc-400">{t('enrollments.form.loadingStudents')}</div>
                ) : filteredStudents.map(student => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                      selectedStudentIds.includes(student.id) ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <span className="text-xs font-medium dark:text-zinc-200">{student.name}</span>
                    </div>
                    {selectedStudentIds.includes(student.id) && <Check size={14} className="text-indigo-600" />}
                  </div>
                ))}
              </div>
            </div>
            {selectedStudentIds.length > 0 && (
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                {t('enrollments.form.studentsSelected', { count: selectedStudentIds.length })}
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">{t('enrollments.form.step2')}</Label>
            <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-thin">
              {classesLoading ? (
                <div className="p-4 text-center text-xs text-zinc-400">{t('enrollments.form.loadingClasses')}</div>
              ) : classes.map(cls => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                    selectedClassId === cls.id
                      ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10"
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold dark:text-zinc-200">{cls.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-zinc-500 font-medium">
                    <span>{cls.subject ?? ''}</span>
                    {cls.tutor_id && <span className="flex items-center gap-1"><User size={10} /> {t('enrollments.form.tutorAssigned')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px]">{t('enrollments.form.type')}</Label>
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <button
                  onClick={() => setEnrollmentType('ACTIVE')}
                  className={cn(
                    "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                    enrollmentType === 'ACTIVE' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                  )}
                >
                  {t('enrollments.status.active')}
                </button>
                <button
                  onClick={() => setEnrollmentType('TRIAL')}
                  className={cn(
                    "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                    enrollmentType === 'TRIAL' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                  )}
                >
                  {t('enrollments.status.trial')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <DollarSign size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold dark:text-zinc-200">{t('enrollments.form.autoInvoice')}</p>
              </div>
            </div>
            <Switch checked={autoInvoice} onChange={setAutoInvoice} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-6">
        <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
        <Button
          className="flex-1 justify-center"
          onClick={handleEnroll}
          disabled={createIsPending || selectedStudentIds.length === 0 || !selectedClassId}
        >
          {createIsPending ? t('common.processing') : t('enrollments.form.enrollStudents', { count: selectedStudentIds.length })}
        </Button>
      </div>
    </Modal>
  );
};
