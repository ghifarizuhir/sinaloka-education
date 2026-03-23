import React from 'react';
import { Plus, CalendarRange } from 'lucide-react';
import {
  PageHeader,
  Button,
  Skeleton,
  ConfirmDialog,
  EmptyState,
} from '../../components/ui';
import { useAcademicYearsPage } from './useAcademicYearsPage';
import { AcademicYearCard } from './AcademicYearCard';
import { YearFormModal } from './YearFormModal';
import { SemesterFormModal } from './SemesterFormModal';
import { RollOverModal } from './RollOverModal';

export const AcademicYears = () => {
  const state = useAcademicYearsPage();

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Tahun Ajaran"
        subtitle="Kelola tahun ajaran dan semester untuk mengorganisir kelas"
        actions={
          <Button onClick={state.openAddYear}>
            <Plus size={18} />
            Tambah Tahun Ajaran
          </Button>
        }
      />

      {/* Year list */}
      {state.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : state.academicYears.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Belum ada tahun ajaran"
          description="Tambahkan tahun ajaran pertama untuk mulai mengorganisir kelas"
          action={
            <Button onClick={state.openAddYear}>
              <Plus size={18} />
              Tambah Tahun Ajaran
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {state.academicYears.map((year) => (
            <AcademicYearCard
              key={year.id}
              year={year}
              isExpanded={state.expandedYearId === year.id}
              onToggle={() => state.toggleExpandYear(year.id)}
              onEditYear={() => state.openEditYear(year)}
              onDeleteYear={() => state.openDeleteYear(year)}
              onAddSemester={() => state.openAddSemester(year.id)}
              onEditSemester={(sem) => state.openEditSemester(year.id, sem)}
              onDeleteSemester={(sem) => state.openDeleteSemester(sem)}
              onArchiveSemester={(sem) => state.openArchiveSemester(sem)}
              onRollOver={(sem) => state.openRollOver(year.id, sem)}
            />
          ))}
        </div>
      )}

      {/* Year Form Modal */}
      <YearFormModal
        isOpen={state.modal.type === 'year-form'}
        onClose={state.closeModal}
        editing={state.modal.type === 'year-form' && state.modal.editing !== null}
        name={state.yearName}
        setName={state.setYearName}
        startDate={state.yearStartDate}
        setStartDate={state.setYearStartDate}
        endDate={state.yearEndDate}
        setEndDate={state.setYearEndDate}
        onSubmit={state.handleSubmitYear}
        isSubmitting={state.isYearSubmitting}
      />

      {/* Semester Form Modal */}
      <SemesterFormModal
        isOpen={state.modal.type === 'semester-form'}
        onClose={state.closeModal}
        editing={state.modal.type === 'semester-form' && state.modal.editing !== null}
        name={state.semesterName}
        setName={state.setSemesterName}
        startDate={state.semesterStartDate}
        setStartDate={state.setSemesterStartDate}
        endDate={state.semesterEndDate}
        setEndDate={state.setSemesterEndDate}
        onSubmit={state.handleSubmitSemester}
        isSubmitting={state.isSemesterSubmitting}
      />

      {/* Delete Year Confirm */}
      <ConfirmDialog
        isOpen={state.modal.type === 'delete-year'}
        onClose={state.closeModal}
        onConfirm={state.handleDeleteYear}
        title="Hapus Tahun Ajaran"
        description={
          state.modal.type === 'delete-year'
            ? `Apakah Anda yakin ingin menghapus tahun ajaran "${state.modal.year.name}"? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={state.isYearDeleting}
      />

      {/* Delete Semester Confirm */}
      <ConfirmDialog
        isOpen={state.modal.type === 'delete-semester'}
        onClose={state.closeModal}
        onConfirm={state.handleDeleteSemester}
        title="Hapus Semester"
        description={
          state.modal.type === 'delete-semester'
            ? `Apakah Anda yakin ingin menghapus semester "${state.modal.semester.name}"? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={state.isSemesterDeleting}
      />

      {/* Archive Semester Confirm */}
      <ConfirmDialog
        isOpen={state.modal.type === 'archive-semester'}
        onClose={state.closeModal}
        onConfirm={state.handleArchiveSemester}
        title="Arsipkan Semester"
        description={
          state.modal.type === 'archive-semester'
            ? `Apakah Anda yakin ingin mengarsipkan semester "${state.modal.semester.name}"? Semua kelas dalam semester ini juga akan diarsipkan.`
            : ''
        }
        confirmLabel="Arsipkan"
        cancelLabel="Batal"
        variant="default"
        isLoading={state.isSemesterArchiving}
      />

      {/* Roll-over Modal */}
      <RollOverModal
        isOpen={state.modal.type === 'roll-over'}
        onClose={state.closeModal}
        targetSemester={
          state.modal.type === 'roll-over' ? state.modal.targetSemester : null
        }
        allSemesters={state.allSemesters}
        sourceId={state.rollOverSourceId}
        setSourceId={state.setRollOverSourceId}
        sourceSemesterDetail={state.sourceSemesterDetail}
        selectedClassIds={state.rollOverClassIds}
        toggleClass={state.toggleRollOverClass}
        onSubmit={state.handleRollOver}
        isSubmitting={state.isRollingOver}
      />
    </div>
  );
};
