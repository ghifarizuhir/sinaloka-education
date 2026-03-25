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
  const { t } = state;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={t('academicYears.title')}
        subtitle={t('academicYears.subtitle')}
        actions={
          <Button onClick={state.openAddYear}>
            <Plus size={18} />
            {t('academicYears.addYear')}
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
          title={t('academicYears.emptyTitle')}
          description={t('academicYears.emptyDescription')}
          action={
            <Button onClick={state.openAddYear}>
              <Plus size={18} />
              {t('academicYears.addYear')}
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
              t={t}
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
        t={t}
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
        t={t}
      />

      {/* Delete Year Confirm */}
      <ConfirmDialog
        isOpen={state.modal.type === 'delete-year'}
        onClose={state.closeModal}
        onConfirm={state.handleDeleteYear}
        title={t('academicYears.deleteYear')}
        description={
          state.modal.type === 'delete-year'
            ? t('academicYears.deleteYearConfirm', { name: state.modal.year.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={state.isYearDeleting}
      />

      {/* Delete Semester Confirm */}
      <ConfirmDialog
        isOpen={state.modal.type === 'delete-semester'}
        onClose={state.closeModal}
        onConfirm={state.handleDeleteSemester}
        title={t('academicYears.deleteSemester')}
        description={
          state.modal.type === 'delete-semester'
            ? t('academicYears.deleteSemesterConfirm', { name: state.modal.semester.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={state.isSemesterDeleting}
      />

      {/* Archive Semester Confirm */}
      <ConfirmDialog
        isOpen={state.modal.type === 'archive-semester'}
        onClose={state.closeModal}
        onConfirm={state.handleArchiveSemester}
        title={t('academicYears.archiveSemester')}
        description={
          state.modal.type === 'archive-semester'
            ? t('academicYears.archiveSemesterConfirm', { name: state.modal.semester.name })
            : ''
        }
        confirmLabel={t('academicYears.archive')}
        cancelLabel={t('common.cancel')}
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
        t={t}
      />
    </div>
  );
};
