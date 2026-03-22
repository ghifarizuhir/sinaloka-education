import React from 'react';
import {
  MoreHorizontal,
  Search,
  Download,
  ArrowUpRight,
  Edit,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  SearchInput,
  Checkbox,
  Select,
  DropdownMenu,
  EmptyState,
} from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import type { Enrollment, UpdateEnrollmentDto } from '@/src/types/enrollment';
import type { TFunction } from 'i18next';

type EnrollmentStatus = 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';

const getStatusBadge = (status: EnrollmentStatus) => {
  const styles: Record<EnrollmentStatus, string> = {
    ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    TRIAL: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    WAITLISTED: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
    DROPPED: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };
  return styles[status] || styles.WAITLISTED;
};

const getPaymentBadge = (status: string) => {
  const styles: Record<string, string> = {
    NEW: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
    PAID: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    PENDING: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    OVERDUE: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };
  return styles[status] || 'text-zinc-400';
};

interface EnrollmentTableProps {
  filteredEnrollments: Enrollment[];
  selectedEnrollmentIds: string[];
  setSelectedEnrollmentIds: React.Dispatch<React.SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterStatus: EnrollmentStatus | '';
  setFilterStatus: (value: EnrollmentStatus | '') => void;
  handleExportCsv: () => void;
  exportIsPending: boolean;
  isLoading: boolean;
  flaggedStudentIds: Set<string>;
  STATUS_LABEL: Record<EnrollmentStatus, string>;
  PAYMENT_LABEL: Record<string, string>;
  handleStatusUpdate: (id: string, newStatus: UpdateEnrollmentDto['status']) => void;
  setSelectedEnrollment: (enrollment: Enrollment) => void;
  setEditStatus: (status: EnrollmentStatus) => void;
  setShowEditModal: (show: boolean) => void;
  setDeleteTarget: (id: string | null) => void;
  t: TFunction;
  i18n: { language: string };
}

export const EnrollmentTable = ({
  filteredEnrollments,
  selectedEnrollmentIds,
  setSelectedEnrollmentIds,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  handleExportCsv,
  exportIsPending,
  isLoading,
  flaggedStudentIds,
  STATUS_LABEL,
  PAYMENT_LABEL,
  handleStatusUpdate,
  setSelectedEnrollment,
  setEditStatus,
  setShowEditModal,
  setDeleteTarget,
  t,
  i18n,
}: EnrollmentTableProps) => {
  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder={t('enrollments.searchPlaceholder')}
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as EnrollmentStatus | '')}
            options={[
              { value: '', label: t('common.allStatuses') },
              { value: 'ACTIVE', label: t('enrollments.status.active') },
              { value: 'TRIAL', label: t('enrollments.status.trial') },
              { value: 'WAITLISTED', label: t('enrollments.status.waitlisted') },
              { value: 'DROPPED', label: t('enrollments.status.dropped') },
            ]}
          />
          <Button variant="outline" size="sm" className="ml-auto" onClick={handleExportCsv} disabled={exportIsPending}>
            <Download size={14} />
            {t('enrollments.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 w-10">
                    <Checkbox
                      checked={selectedEnrollmentIds.length === filteredEnrollments.length && filteredEnrollments.length > 0}
                      onChange={() => {
                        if (selectedEnrollmentIds.length === filteredEnrollments.length) setSelectedEnrollmentIds([]);
                        else setSelectedEnrollmentIds(filteredEnrollments.map(e => e.id));
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.student')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.class')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.enrollmentDate')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.payment')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={Search}
                        title={t('enrollments.noEnrollmentsFound')}
                        description={t('enrollments.noEnrollmentsHint')}
                      />
                    </td>
                  </tr>
                )}
                {filteredEnrollments.map((enroll) => (
                  <tr key={enroll.id} className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group", flaggedStudentIds.has(enroll.student_id) && 'bg-amber-50/30 dark:bg-amber-900/10')}>
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedEnrollmentIds.includes(enroll.id)}
                        onChange={() => {
                          setSelectedEnrollmentIds(prev => prev.includes(enroll.id) ? prev.filter(id => id !== enroll.id) : [...prev, enroll.id]);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 group/link cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                          {(enroll.student?.name ?? '?').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium dark:text-zinc-200 group-hover/link:text-indigo-600 transition-colors">
                            {enroll.student?.name ?? '\u2014'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">ID: {enroll.student_id.slice(0, 8)}</span>
                        </div>
                        <ArrowUpRight size={12} className="text-zinc-300 opacity-0 group-hover/link:opacity-100 transition-all" />
                        {flaggedStudentIds.has(enroll.student_id) && (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col group/link cursor-pointer">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-zinc-600 dark:text-zinc-300 font-medium group-hover/link:text-indigo-600 transition-colors">
                            {enroll.class?.name ?? '\u2014'}
                          </span>
                          <ArrowUpRight size={12} className="text-zinc-300 opacity-0 group-hover/link:opacity-100 transition-all" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {enroll.enrolled_at ? formatDate(enroll.enrolled_at.split('T')[0], i18n.language) : '\u2014'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getPaymentBadge(enroll.payment_status))}>
                          {PAYMENT_LABEL[enroll.payment_status] ?? enroll.payment_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusBadge(enroll.status)}>
                        {STATUS_LABEL[enroll.status] ?? enroll.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu
                        trigger={<MoreHorizontal size={18} />}
                        items={[
                          {
                            label: t('enrollments.menu.editEnrollment'),
                            icon: Edit,
                            onClick: () => { setSelectedEnrollment(enroll); setEditStatus(enroll.status); setShowEditModal(true); },
                          },
                          { separator: true },
                          {
                            content: (
                              <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                {t('enrollments.menu.updateStatus')}
                              </div>
                            ),
                          },
                          ...(enroll.status !== 'ACTIVE' ? [{
                            label: t('enrollments.menu.setActive'),
                            icon: CheckCircle2,
                            onClick: () => handleStatusUpdate(enroll.id, 'ACTIVE'),
                            className: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                          }] : []),
                          ...(enroll.status === 'TRIAL' ? [{
                            label: t('enrollments.menu.convertToFull'),
                            icon: GraduationCap,
                            onClick: () => handleStatusUpdate(enroll.id, 'ACTIVE'),
                            className: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                          }] : []),
                          ...(enroll.status !== 'DROPPED' ? [{
                            label: t('enrollments.menu.drop'),
                            icon: UserPlus,
                            onClick: () => handleStatusUpdate(enroll.id, 'DROPPED'),
                            className: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
                          }] : []),
                          { separator: true },
                          {
                            label: t('enrollments.menu.deleteRecord'),
                            icon: Trash2,
                            onClick: () => setDeleteTarget(enroll.id),
                            variant: 'danger' as const,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
};
