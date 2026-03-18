import React from 'react';
import {
  Plus,
  Users,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import ClassTimetable from '../../components/ClassTimetable';
import {
  Card,
  Button,
  Skeleton,
  PageHeader,
} from '../../components/UI';
import { formatCurrency } from '../../lib/utils';
import { useClassesPage } from './useClassesPage';
import { ClassFilters } from './ClassFilters';
import { ClassTable } from './ClassTable';
import { ClassDetailDrawer } from './ClassDetailDrawer';
import { ClassFormModal } from './ClassFormModal';
import { ClassDeleteModal } from './ClassDeleteModal';
import { GenerateSessionsModal } from './GenerateSessionsModal';

export const Classes = () => {
  const state = useClassesPage();

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <PageHeader
        title={state.t('classes.title')}
        subtitle={state.t('classes.subtitle')}
        actions={
          <Button onClick={state.openAddModal}>
            <Plus size={18} />
            {state.t('classes.registerNewClass')}
          </Button>
        }
      />

      {/* Stats Overview */}
      {state.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{state.t('classes.totalMonthlyFee')}</p>
              <p className="text-xl font-bold">{formatCurrency(state.totalRevenue, state.i18n.language)}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{state.t('classes.totalClasses')}</p>
              <p className="text-xl font-bold">{state.meta?.total ?? state.classes.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{state.t('classes.activeCourses')}</p>
              <p className="text-xl font-bold">{state.classes.filter(c => c.status === 'ACTIVE').length}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <ClassFilters
        t={state.t}
        searchQuery={state.searchQuery}
        onSearchChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          state.setSearchQuery(e.target.value);
          state.setPage(1);
        }}
        filterSubject={state.filterSubject}
        onFilterSubjectChange={(val) => {
          state.setFilterSubject(val);
          state.setPage(1);
        }}
        showOnlyAvailable={state.showOnlyAvailable}
        onShowOnlyAvailableChange={(val: boolean) => {
          state.setShowOnlyAvailable(val);
          state.setPage(1);
        }}
        viewMode={state.viewMode}
        onViewModeChange={state.setViewMode}
        subjectsList={state.subjectsList}
      />

      {state.viewMode === 'table' ? (
        <ClassTable
          t={state.t}
          i18n={state.i18n}
          isLoading={state.isLoading}
          filteredClasses={state.filteredClasses}
          activeActionMenu={state.activeActionMenu}
          setActiveActionMenu={state.setActiveActionMenu}
          setSelectedClassId={state.setSelectedClassId}
          openEditModal={state.openEditModal}
          handleDeleteClass={state.handleDeleteClass}
          currentPage={state.currentPage}
          totalPages={state.totalPages}
          meta={state.meta}
          setPage={state.setPage}
        />
      ) : (
        <ClassTimetable
          classes={state.filteredTimetableClasses}
          onClassClick={(id) => state.setSelectedClassId(id)}
        />
      )}

      {/* Modal */}
      <ClassFormModal
        t={state.t}
        showModal={state.showModal}
        setShowModal={state.setShowModal}
        editingClass={state.editingClass}
        setEditingClass={state.setEditingClass}
        formName={state.formName}
        setFormName={state.setFormName}
        formSubjectId={state.formSubjectId}
        setFormSubjectId={state.setFormSubjectId}
        formTutorId={state.formTutorId}
        setFormTutorId={state.setFormTutorId}
        formCapacity={state.formCapacity}
        setFormCapacity={state.setFormCapacity}
        formFee={state.formFee}
        setFormFee={state.setFormFee}
        formPackageFee={state.formPackageFee}
        setFormPackageFee={state.setFormPackageFee}
        formTutorFee={state.formTutorFee}
        setFormTutorFee={state.setFormTutorFee}
        formTutorFeeMode={state.formTutorFeeMode}
        setFormTutorFeeMode={state.setFormTutorFeeMode}
        formTutorFeePerStudent={state.formTutorFeePerStudent}
        setFormTutorFeePerStudent={state.setFormTutorFeePerStudent}
        formSchedules={state.formSchedules}
        setFormSchedules={state.setFormSchedules}
        formRoom={state.formRoom}
        setFormRoom={state.setFormRoom}
        formStatus={state.formStatus}
        setFormStatus={state.setFormStatus}
        subjectsList={state.subjectsList}
        subjectTutors={state.subjectTutors}
        billingMode={state.billingMode}
        createClass={state.createClass}
        updateClass={state.updateClass}
        tutorClasses={state.tutorClasses}
        toggleScheduleDay={state.toggleScheduleDay}
        handleFormSubmit={state.handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <ClassDeleteModal
        t={state.t}
        deleteTarget={state.deleteTarget}
        setDeleteTarget={state.setDeleteTarget}
        deleteConfirmText={state.deleteConfirmText}
        setDeleteConfirmText={state.setDeleteConfirmText}
        confirmDeleteClass={state.confirmDeleteClass}
        deleteClass={state.deleteClass}
      />

      {/* Class Detail Drawer */}
      <ClassDetailDrawer
        t={state.t}
        i18n={state.i18n}
        selectedClassId={state.selectedClassId}
        setSelectedClassId={state.setSelectedClassId}
        selectedClass={state.selectedClass}
        classDetail={state.classDetail}
        openEditModal={state.openEditModal}
        handleDeleteClass={state.handleDeleteClass}
        setShowGenerateModal={state.setShowGenerateModal}
      />

      {/* Generate Sessions Modal */}
      <GenerateSessionsModal
        t={state.t}
        showGenerateModal={state.showGenerateModal}
        setShowGenerateModal={state.setShowGenerateModal}
        generateDuration={state.generateDuration}
        setGenerateDuration={state.setGenerateDuration}
        classDetail={state.classDetail}
        generateSessions={state.generateSessions}
        estimateSessionCount={state.estimateSessionCount}
        handleGenerateSessions={state.handleGenerateSessions}
      />
    </div>
  );
};
