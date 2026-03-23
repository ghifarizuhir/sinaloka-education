import { useState } from 'react';
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
      toast.error('Semua field wajib diisi');
      return;
    }
    if (yearEndDate <= yearStartDate) {
      toast.error('Tanggal selesai harus setelah tanggal mulai');
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
            toast.success('Tahun ajaran berhasil diperbarui');
            closeModal();
          },
          onError: () => toast.error('Gagal memperbarui tahun ajaran'),
        }
      );
    } else {
      createYear.mutate(data, {
        onSuccess: () => {
          toast.success('Tahun ajaran berhasil ditambahkan');
          closeModal();
        },
        onError: () => toast.error('Gagal menambahkan tahun ajaran'),
      });
    }
  };

  const handleDeleteYear = () => {
    if (modal.type !== 'delete-year') return;
    deleteYear.mutate(modal.year.id, {
      onSuccess: () => {
        toast.success('Tahun ajaran berhasil dihapus');
        closeModal();
      },
      onError: () => toast.error('Gagal menghapus tahun ajaran'),
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
      toast.error('Semua field wajib diisi');
      return;
    }
    if (semesterEndDate <= semesterStartDate) {
      toast.error('Tanggal selesai harus setelah tanggal mulai');
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
            toast.success('Semester berhasil diperbarui');
            closeModal();
          },
          onError: () => toast.error('Gagal memperbarui semester'),
        }
      );
    } else {
      createSemester.mutate(
        { yearId: modal.yearId, data },
        {
          onSuccess: () => {
            toast.success('Semester berhasil ditambahkan');
            closeModal();
          },
          onError: () => toast.error('Gagal menambahkan semester'),
        }
      );
    }
  };

  const handleDeleteSemester = () => {
    if (modal.type !== 'delete-semester') return;
    deleteSemester.mutate(modal.semester.id, {
      onSuccess: () => {
        toast.success('Semester berhasil dihapus');
        closeModal();
      },
      onError: () => toast.error('Gagal menghapus semester'),
    });
  };

  const handleArchiveSemester = () => {
    if (modal.type !== 'archive-semester') return;
    archiveSemester.mutate(modal.semester.id, {
      onSuccess: () => {
        toast.success('Semester berhasil diarsipkan');
        closeModal();
      },
      onError: () => toast.error('Gagal mengarsipkan semester'),
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
            `Roll-over selesai: ${result.created_count} kelas dibuat, ${result.skipped_count} dilewati`
          );
          closeModal();
        },
        onError: () => toast.error('Gagal melakukan roll-over'),
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
