import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, Button, Badge, Skeleton, PageHeader } from '../../components/UI';
import { cn } from '../../lib/utils';
import { useStudentPage } from './useStudentPage';
import { StudentFilters } from './StudentFilters';
import { StudentTable } from './StudentTable';
import { StudentDrawer } from './StudentDrawer';
import { AddEditModal } from './AddEditModal';
import { DeleteModals } from './DeleteModals';
import { ImportModal } from './ImportModal';

export const Students = () => {
  const s = useStudentPage();

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <PageHeader
        title={s.t('students.title')}
        subtitle={s.t('students.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={s.handleImportClick} disabled={s.importStudents.isPending}>
              <Upload size={16} />
              {s.importStudents.isPending ? s.t('students.importing') : s.t('common.import')}
            </Button>
            <Button variant="outline" className="hidden sm:flex" onClick={s.handleExportClick} disabled={s.exportStudents.isPending}>
              <Download size={16} />
              {s.t('common.export')}
            </Button>
            <Button onClick={s.openAddModal}>
              <Plus size={18} />
              {s.t('students.addStudent')}
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      {s.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: s.t('students.totalStudents'),
              value: s.statsTotal,
              icon: Users,
              iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
              iconColor: 'text-indigo-600 dark:text-indigo-400',
              accent: 'group-hover:border-indigo-200 dark:group-hover:border-indigo-800/40',
            },
            {
              label: s.t('students.activeStudents'),
              value: s.statsActive,
              icon: UserCheck,
              iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              accent: 'group-hover:border-emerald-200 dark:group-hover:border-emerald-800/40',
              badge: s.statsTotal > 0 ? `${((s.statsActive / s.statsTotal) * 100).toFixed(0)}%` : undefined,
              badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            },
            {
              label: s.t('students.inactive'),
              value: s.statsInactive,
              icon: UserX,
              iconBg: 'bg-zinc-100 dark:bg-zinc-800/50',
              iconColor: 'text-zinc-500 dark:text-zinc-400',
              accent: 'group-hover:border-zinc-300 dark:group-hover:border-zinc-700',
            },
            {
              label: s.t('students.overduePayments'),
              value: s.flaggedStudentIds.size,
              icon: AlertTriangle,
              iconBg: s.flaggedStudentIds.size > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-zinc-100 dark:bg-zinc-800/50',
              iconColor: s.flaggedStudentIds.size > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400',
              accent: s.flaggedStudentIds.size > 0
                ? 'group-hover:border-amber-200 dark:group-hover:border-amber-800/40'
                : 'group-hover:border-zinc-300 dark:group-hover:border-zinc-700',
              badge: s.flaggedStudentIds.size > 0 ? s.t('common.needsAttention') : undefined,
              badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className={cn(
                "group p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md",
                card.accent,
              )}>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.iconBg)}>
                  <card.icon size={20} className={card.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{card.label}</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-xl font-bold tracking-tight">{card.value}</p>
                    {card.badge && (
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", card.badgeColor)}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters & Search */}
      <StudentFilters
        searchQuery={s.searchQuery}
        onSearchChange={(e: React.ChangeEvent<HTMLInputElement>) => s.setSearchQuery(e.target.value)}
        onSearchClear={() => s.setSearchQuery('')}
        activeFilters={s.activeFilters}
        onFilterChange={s.updateFilters}
        onRemoveFilter={s.removeFilter}
        onClearAll={() => { s.updateFilters({}); s.setSearchQuery(''); }}
        visibleColumns={s.visibleColumns}
        onToggleColumn={s.setVisibleColumns}
        t={s.t}
      />

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden relative pb-0 mb-4">
        {s.isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <StudentTable
            students={s.filteredStudents}
            selectedIds={s.selectedIds}
            flaggedStudentIds={s.flaggedStudentIds}
            visibleColumns={s.visibleColumns}
            activeActionMenu={s.activeActionMenu}
            onToggleSelectAll={s.toggleSelectAll}
            onToggleSelect={s.toggleSelect}
            onRowClick={(student) => s.setSelectedStudent(student)}
            onEdit={s.handleEditClick}
            onDelete={s.handleDeleteStudent}
            onInviteParent={(student) => {
              s.inviteParent.mutate(
                { email: student.parent_email!, student_ids: [student.id] },
                {
                  onSuccess: () => {
                    toast.success(s.t('students.toast.inviteSent', { email: student.parent_email }));
                    s.setActiveActionMenu(null);
                  },
                  onError: (err: any) => toast.error(err?.response?.data?.message || s.t('students.toast.inviteError')),
                }
              );
            }}
            onActionMenuToggle={s.setActiveActionMenu}
            onClearFilters={() => { s.updateFilters({}); s.setSearchQuery(''); }}
            t={s.t}
          />
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <span className="text-xs text-zinc-500">
            {s.t('common.page')} <span className="font-bold">{s.page}</span> {s.t('common.of')} <span className="font-bold">{s.meta?.totalPages ?? 1}</span>
            {' '}&bull; <span className="font-bold">{s.meta?.total ?? 0}</span> {s.t('students.totalStudentsLabel')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!s.meta?.hasPreviousPage}
              onClick={() => s.setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              {s.t('common.prev')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: s.meta?.totalPages ?? 1 }, (_, i) => i + 1)
                .filter(p => Math.abs(p - s.page) <= 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => s.setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      s.page === p
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    {p}
                  </button>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!s.meta?.hasNextPage}
              onClick={() => s.setPage(p => p + 1)}
            >
              {s.t('common.next')}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {s.selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 dark:border-black/10">
              <div className="flex items-center gap-2 border-r border-white/20 dark:border-black/20 pr-6">
                <span className="text-sm font-bold">{s.selectedIds.length}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">{s.t('common.selected')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                  onClick={s.handleBulkDelete}
                >
                  <Trash2 size={14} />
                  {s.t('common.delete')}
                </Button>
              </div>
              <button
                onClick={() => s.setSelectedIds([])}
                className="p-1 hover:bg-white/10 dark:hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Detail Drawer */}
      <StudentDrawer
        student={s.selectedStudent}
        isOpen={!!s.selectedStudent}
        onClose={() => s.setSelectedStudent(null)}
        onInviteParent={(student) => {
          s.inviteParent.mutate(
            { email: student.parent_email!, student_ids: [student.id] },
            {
              onSuccess: () => toast.success(s.t('students.toast.inviteSent', { email: student.parent_email })),
              onError: (err: any) => toast.error(err?.response?.data?.message || s.t('students.toast.inviteError')),
            }
          );
        }}
        inviteIsPending={s.inviteParent.isPending}
        t={s.t}
        language={s.i18n.language}
      />

      {/* Add / Edit Student Modal */}
      <AddEditModal
        isOpen={s.showAddModal}
        editingStudent={s.editingStudent}
        onClose={() => { s.setShowAddModal(false); s.setEditingStudent(null); }}
        onSubmit={s.handleFormSubmit}
        isPending={s.createStudent.isPending || s.updateStudent.isPending}
        formName={s.formName}
        setFormName={s.setFormName}
        formEmail={s.formEmail}
        setFormEmail={s.setFormEmail}
        formPhone={s.formPhone}
        setFormPhone={s.setFormPhone}
        formGrade={s.formGrade}
        setFormGrade={s.setFormGrade}
        formStatus={s.formStatus}
        setFormStatus={s.setFormStatus}
        formParentName={s.formParentName}
        setFormParentName={s.setFormParentName}
        formParentPhone={s.formParentPhone}
        setFormParentPhone={s.setFormParentPhone}
        formParentEmail={s.formParentEmail}
        setFormParentEmail={s.setFormParentEmail}
        formCustomGrade={s.formCustomGrade}
        setFormCustomGrade={s.setFormCustomGrade}
        formErrors={s.formErrors}
        setFormErrors={s.setFormErrors}
        t={s.t}
      />

      {/* Delete Modals */}
      <DeleteModals
        deleteTarget={s.deleteTarget}
        onDeleteClose={() => { s.setDeleteTarget(null); s.setDeleteConfirmText(''); }}
        onDeleteConfirm={s.confirmDeleteStudent}
        deleteIsPending={s.deleteStudent.isPending}
        bulkDeleteConfirm={s.bulkDeleteConfirm}
        selectedCount={s.selectedIds.length}
        onBulkClose={() => { s.setBulkDeleteConfirm(false); s.setDeleteConfirmText(''); }}
        onBulkConfirm={s.confirmBulkDelete}
        confirmText={s.deleteConfirmText}
        onConfirmTextChange={(e: React.ChangeEvent<HTMLInputElement>) => s.setDeleteConfirmText(e.target.value)}
        t={s.t}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={s.showImportModal}
        onClose={() => s.setShowImportModal(false)}
        onImport={s.handleImportSubmit}
        onDownloadTemplate={s.handleDownloadTemplate}
        isPending={s.importStudents.isPending}
        t={s.t}
      />
    </div>
  );
};
