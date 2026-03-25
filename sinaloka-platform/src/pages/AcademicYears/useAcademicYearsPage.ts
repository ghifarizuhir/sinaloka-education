import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useDeleteAcademicYear,
  useCreateSemester,
  useUpdateSemester,
  useDeleteSemester,
  useArchiveSemester,
  useRollOver,
  useSemester,
} from '@/src/hooks/useAcademicYears';
import type {
  AcademicYear,
  Semester,
  SemesterClass,
} from '@/src/types/academic-year';

type ModalState =
  | { type: 'none' }
  | { type: 'year-form'; editing: AcademicYear | null }
  | { type: 'semester-form'; yearId: string; editing: Semester | null }
  | { type: 'archive-semester'; semester: Semester }
  | { type: 'delete-year'; year: AcademicYear }
  | { type: 'delete-semester'; semester: Semester }
  | { type: 'roll-over'; targetSemester: Semester; yearId: string };

export function useAcademicYearsPage() {
  const { t } = useTranslation();

  // Data queries
  const { data: academicYears = [], isLoading } = useAcademicYears();

  // Mutations
  const createYear = useCreateAcademicYear();
  const updateYear = useUpdateAcademicYear();
  const deleteYear = useDeleteAcademicYear();
  const createSemester = useCreateSemester();
  const updateSemester = useUpdateSemester();
  const deleteSemester = useDeleteSemester();
  const archiveSemester = useArchiveSemester();
  const rollOver = useRollOver();

  // UI state
  const [expandedYearId, setExpandedYearId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  // Year form state
  const [yearName, setYearName] = useState('');
  const [yearStartDate, setYearStartDate] = useState('');
  const [yearEndDate, setYearEndDate] = useState('');

  // Semester form state
  const [semesterName, setSemesterName] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');

  // Roll-over state
  const [rollOverSourceId, setRollOverSourceId] = useState('');
  const [rollOverClassIds, setRollOverClassIds] = useState<string[]>([]);

  // Roll-over source semester detail
  const { data: sourceSemesterDetail } = useSemester(rollOverSourceId || null);

  // Helpers
  const closeModal = () => {
    setModal({ type: 'none' });
    resetYearForm();
    resetSemesterForm();
    resetRollOverForm();
  };

  const resetYearForm = () => {
    setYearName('');
    setYearStartDate('');
    setYearEndDate('');
  };

  const resetSemesterForm = () => {
    setSemesterName('');
    setSemesterStartDate('');
    setSemesterEndDate('');
  };

  const resetRollOverForm = () => {
    setRollOverSourceId('');
    setRollOverClassIds([]);
  };

  const toggleExpandYear = (id: string) => {
    setExpandedYearId((prev) => (prev === id ? null : id));
  };

  // Year actions
  const openAddYear = () => {
    resetYearForm();
    setModal({ type: 'year-form', editing: null });
  };

  const openEditYear = (year: AcademicYear) => {
    setYearName(year.name);
    setYearStartDate(year.start_date.split('T')[0]);
    setYearEndDate(year.end_date.split('T')[0]);
    setModal({ type: 'year-form', editing: year });
  };

  const openDeleteYear = (year: AcademicYear) => {
    setModal({ type: 'delete-year', year });
  };

  const handleSubmitYear = () => {
    if (!yearName.trim() || !yearStartDate || !yearEndDate) {
      toast.error(t('academicYears.toast.allFieldsRequired'));
      return;
    }
    if (yearEndDate <= yearStartDate) {
      toast.error(t('academicYears.toast.endDateAfterStart'));
      return;
    }

    const data = {
      name: yearName.trim(),
      start_date: yearStartDate,
      end_date: yearEndDate,
    };

    if (modal.type === 'year-form' && modal.editing) {
      updateYear.mutate(
        { id: modal.editing.id, data },
        {
          onSuccess: () => {
            toast.success(t('academicYears.toast.yearUpdated'));
            closeModal();
          },
          onError: () => toast.error(t('academicYears.toast.yearUpdateFailed')),
        }
      );
    } else {
      createYear.mutate(data, {
        onSuccess: () => {
          toast.success(t('academicYears.toast.yearCreated'));
          closeModal();
        },
        onError: () => toast.error(t('academicYears.toast.yearCreateFailed')),
      });
    }
  };

  const handleDeleteYear = () => {
    if (modal.type !== 'delete-year') return;
    deleteYear.mutate(modal.year.id, {
      onSuccess: () => {
        toast.success(t('academicYears.toast.yearDeleted'));
        closeModal();
      },
      onError: () => toast.error(t('academicYears.toast.yearDeleteFailed')),
    });
  };

  // Semester actions
  const openAddSemester = (yearId: string) => {
    resetSemesterForm();
    setModal({ type: 'semester-form', yearId, editing: null });
  };

  const openEditSemester = (yearId: string, semester: Semester) => {
    setSemesterName(semester.name);
    setSemesterStartDate(semester.start_date.split('T')[0]);
    setSemesterEndDate(semester.end_date.split('T')[0]);
    setModal({ type: 'semester-form', yearId, editing: semester });
  };

  const openDeleteSemester = (semester: Semester) => {
    setModal({ type: 'delete-semester', semester });
  };

  const openArchiveSemester = (semester: Semester) => {
    setModal({ type: 'archive-semester', semester });
  };

  const openRollOver = (yearId: string, semester: Semester) => {
    resetRollOverForm();
    setModal({ type: 'roll-over', targetSemester: semester, yearId });
  };

  const handleSubmitSemester = () => {
    if (!semesterName.trim() || !semesterStartDate || !semesterEndDate) {
      toast.error(t('academicYears.toast.allFieldsRequired'));
      return;
    }
    if (semesterEndDate <= semesterStartDate) {
      toast.error(t('academicYears.toast.endDateAfterStart'));
      return;
    }

    if (modal.type !== 'semester-form') return;

    const data = {
      name: semesterName.trim(),
      start_date: semesterStartDate,
      end_date: semesterEndDate,
    };

    if (modal.editing) {
      updateSemester.mutate(
        { id: modal.editing.id, data },
        {
          onSuccess: () => {
            toast.success(t('academicYears.toast.semesterUpdated'));
            closeModal();
          },
          onError: () => toast.error(t('academicYears.toast.semesterUpdateFailed')),
        }
      );
    } else {
      createSemester.mutate(
        { yearId: modal.yearId, data },
        {
          onSuccess: () => {
            toast.success(t('academicYears.toast.semesterCreated'));
            closeModal();
          },
          onError: () => toast.error(t('academicYears.toast.semesterCreateFailed')),
        }
      );
    }
  };

  const handleDeleteSemester = () => {
    if (modal.type !== 'delete-semester') return;
    deleteSemester.mutate(modal.semester.id, {
      onSuccess: () => {
        toast.success(t('academicYears.toast.semesterDeleted'));
        closeModal();
      },
      onError: () => toast.error(t('academicYears.toast.semesterDeleteFailed')),
    });
  };

  const handleArchiveSemester = () => {
    if (modal.type !== 'archive-semester') return;
    archiveSemester.mutate(modal.semester.id, {
      onSuccess: () => {
        toast.success(t('academicYears.toast.semesterArchived'));
        closeModal();
      },
      onError: () => toast.error(t('academicYears.toast.semesterArchiveFailed')),
    });
  };

  const handleRollOver = () => {
    if (modal.type !== 'roll-over' || !rollOverSourceId) return;
    rollOver.mutate(
      {
        id: modal.targetSemester.id,
        data: {
          source_semester_id: rollOverSourceId,
          class_ids: rollOverClassIds.length > 0 ? rollOverClassIds : undefined,
        },
      },
      {
        onSuccess: (result) => {
          toast.success(
            t('academicYears.toast.rollOverSuccess', {
              created: result.created_count,
              skipped: result.skipped_count,
            })
          );
          closeModal();
        },
        onError: () => toast.error(t('academicYears.toast.rollOverFailed')),
      }
    );
  };

  const toggleRollOverClass = (classId: string) => {
    setRollOverClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  // Collect all semesters across all years for roll-over source selection
  const allSemesters: (Semester & { yearName: string })[] = academicYears.flatMap(
    (y) => y.semesters.map((s) => ({ ...s, yearName: y.name }))
  );

  return {
    // Data
    academicYears,
    isLoading,
    allSemesters,
    sourceSemesterDetail,
    t,

    // UI state
    expandedYearId,
    toggleExpandYear,
    modal,
    closeModal,

    // Year form
    yearName,
    setYearName,
    yearStartDate,
    setYearStartDate,
    yearEndDate,
    setYearEndDate,
    openAddYear,
    openEditYear,
    openDeleteYear,
    handleSubmitYear,
    handleDeleteYear,
    isYearSubmitting: createYear.isPending || updateYear.isPending,
    isYearDeleting: deleteYear.isPending,

    // Semester form
    semesterName,
    setSemesterName,
    semesterStartDate,
    setSemesterStartDate,
    semesterEndDate,
    setSemesterEndDate,
    openAddSemester,
    openEditSemester,
    openDeleteSemester,
    openArchiveSemester,
    openRollOver,
    handleSubmitSemester,
    handleDeleteSemester,
    handleArchiveSemester,
    isSemesterSubmitting: createSemester.isPending || updateSemester.isPending,
    isSemesterDeleting: deleteSemester.isPending,
    isSemesterArchiving: archiveSemester.isPending,

    // Roll-over
    rollOverSourceId,
    setRollOverSourceId,
    rollOverClassIds,
    toggleRollOverClass,
    handleRollOver,
    isRollingOver: rollOver.isPending,
  };
}
