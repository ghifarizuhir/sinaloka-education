import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import {
  Button,
  PageHeader,
  ConfirmDialog,
} from '../../components/UI';
import { Pagination } from '../../components/ui/pagination';
import { useEnrollmentsPage } from './useEnrollmentsPage';
import { EnrollmentStats } from './EnrollmentStats';
import { EnrollmentTable } from './EnrollmentTable';
import { NewEnrollmentModal } from './NewEnrollmentModal';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { BulkImportModal } from './BulkImportModal';
import { BulkDeleteModal } from './BulkDeleteModal';

type EnrollmentStatus = 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';

export const Enrollments = () => {
  const state = useEnrollmentsPage();

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800">
        <PageHeader
          title={state.t('enrollments.title')}
          subtitle={state.t('enrollments.subtitle')}
          actions={
            <>
              <Button variant="outline" onClick={() => state.setImportModal(true)}>
                <Upload size={16} />
                {state.t('enrollments.bulkImport')}
              </Button>
              <Button onClick={() => state.setShowModal(true)}>
                <UserPlus size={18} />
                {state.t('enrollments.newEnrollment')}
              </Button>
            </>
          }
        />
      </div>

      {/* Stats Overview */}
      <EnrollmentStats
        stats={state.stats}
        isLoading={state.statsLoading}
        t={state.t}
      />

      {/* Filters + Table */}
      <EnrollmentTable
        filteredEnrollments={state.filteredEnrollments}
        selectedEnrollmentIds={state.selectedEnrollmentIds}
        setSelectedEnrollmentIds={state.setSelectedEnrollmentIds}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        filterStatus={state.filterStatus}
        setFilterStatus={state.setFilterStatus}
        handleExportCsv={state.handleExportCsv}
        exportIsPending={state.exportEnrollments.isPending}
        isLoading={state.isLoading}
        flaggedStudentIds={state.flaggedStudentIds}
        STATUS_LABEL={state.STATUS_LABEL}
        PAYMENT_LABEL={state.PAYMENT_LABEL}
        handleStatusUpdate={state.handleStatusUpdate}
        setSelectedEnrollment={state.setSelectedEnrollment}
        setEditStatus={state.setEditStatus}
        setShowEditModal={state.setShowEditModal}
        setDeleteTarget={state.setDeleteTarget}
        t={state.t}
        i18n={state.i18n}
      />

      {/* Pagination */}
      {state.meta && (
        <Pagination
          currentPage={state.page}
          totalPages={state.meta.totalPages}
          total={state.meta.total}
          itemsPerPage={state.meta.limit}
          onPageChange={state.setPage}
        />
      )}

      {/* New Enrollment Modal */}
      <NewEnrollmentModal
        showModal={state.showModal}
        setShowModal={state.setShowModal}
        selectedStudentIds={state.selectedStudentIds}
        setSelectedStudentIds={state.setSelectedStudentIds}
        selectedClassId={state.selectedClassId}
        setSelectedClassId={state.setSelectedClassId}
        enrollmentType={state.enrollmentType}
        setEnrollmentType={state.setEnrollmentType}
        autoInvoice={state.autoInvoice}
        setAutoInvoice={state.setAutoInvoice}
        studentSearch={state.studentSearch}
        setStudentSearch={state.setStudentSearch}
        filteredStudents={state.filteredStudents}
        studentsLoading={state.studentsQuery.isLoading}
        classes={state.classes}
        classesLoading={state.classesQuery.isLoading}
        handleEnroll={state.handleEnroll}
        createIsPending={state.createEnrollment.isPending}
        t={state.t}
      />

      {/* Edit Enrollment Modal */}
      <EditEnrollmentModal
        showEditModal={state.showEditModal}
        setShowEditModal={state.setShowEditModal}
        selectedEnrollment={state.selectedEnrollment}
        editStatus={state.editStatus}
        setEditStatus={state.setEditStatus}
        handleStatusUpdate={state.handleStatusUpdate}
        updateIsPending={state.updateEnrollment.isPending}
        t={state.t}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        importModal={state.importModal}
        setImportModal={state.setImportModal}
        importFile={state.importFile}
        setImportFile={state.setImportFile}
        handleImportFileChange={state.handleImportFileChange}
        handleImportSubmit={state.handleImportSubmit}
        importIsPending={state.importEnrollments.isPending}
        t={state.t}
      />

      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {state.selectedEnrollmentIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 dark:border-black/10">
              <div className="flex items-center gap-2 border-r border-white/20 dark:border-black/20 pr-6">
                <span className="text-sm font-bold">{state.selectedEnrollmentIds.length}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">{state.t('common.selected')}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="h-8 px-2 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 text-xs font-medium focus:outline-none"
                  defaultValue=""
                  disabled={state.bulkUpdate.isPending}
                  onChange={(e) => {
                    if (e.target.value) state.handleBulkStatusChange(e.target.value as EnrollmentStatus);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>{state.t('enrollments.bulk.changeStatus')}</option>
                  <option value="ACTIVE">{state.t('enrollments.status.active')}</option>
                  <option value="TRIAL">{state.t('enrollments.status.trial')}</option>
                  <option value="WAITLISTED">{state.t('enrollments.status.waitlisted')}</option>
                  <option value="DROPPED">{state.t('enrollments.status.dropped')}</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                  onClick={state.handleBulkDelete}
                >
                  <Trash2 size={14} />
                  {state.t('common.delete')}
                </Button>
              </div>
              <button
                onClick={() => state.setSelectedEnrollmentIds([])}
                className="p-1 hover:bg-white/10 dark:hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteModal
        bulkDeleteConfirm={state.bulkDeleteConfirm}
        setBulkDeleteConfirm={state.setBulkDeleteConfirm}
        selectedEnrollmentIds={state.selectedEnrollmentIds}
        confirmBulkDelete={state.confirmBulkDelete}
        bulkDeleteIsPending={state.bulkDelete.isPending}
        t={state.t}
      />

      <ConfirmDialog
        isOpen={!!state.deleteTarget}
        onClose={() => state.setDeleteTarget(null)}
        onConfirm={state.handleDeleteEnrollment}
        title={state.t('enrollments.confirm.deleteTitle', 'Delete Enrollment')}
        description={state.t('enrollments.confirm.deleteEnrollment')}
        confirmLabel={state.t('common.delete', 'Delete')}
        cancelLabel={state.t('common.cancel', 'Cancel')}
        isLoading={state.deleteEnrollment.isPending}
      />
    </div>
  );
};
