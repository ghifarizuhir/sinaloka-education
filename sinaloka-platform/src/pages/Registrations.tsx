import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Card,
  Button,
  PageHeader,
  Skeleton,
  Modal,
} from '../components/UI';
import { cn, formatDate } from '../lib/utils';
import {
  useRegistrations,
  useApproveRegistration,
  useRejectRegistration,
} from '../hooks/useRegistrations';
import type { Registration, RegistrationStatus, RegistrationType } from '../types/registration';

type TypeFilter = 'ALL' | RegistrationType;
type StatusFilter = 'ALL' | RegistrationStatus;

const PAGE_SIZE = 20;

function TypeBadge({ type }: { type: RegistrationType }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
        type === 'STUDENT'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      )}
    >
      {type === 'STUDENT' ? t('registration.student') : t('registration.tutor')}
    </span>
  );
}

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const { t } = useTranslation();
  const classes: Record<RegistrationStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const labels: Record<RegistrationStatus, string> = {
    PENDING: t('registration.pending'),
    APPROVED: t('registration.approved'),
    REJECTED: t('registration.rejected'),
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', classes[status])}>
      {labels[status]}
    </span>
  );
}

function RegistrationDetailBlock({ registration }: { registration: Registration }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-1">
        <p className="font-medium text-sm dark:text-zinc-100">{registration.name}</p>
        <p className="text-xs text-zinc-500">
          {registration.email || registration.phone || '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {registration.type === 'STUDENT' && (
          <>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.grade', { defaultValue: 'Grade' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.grade || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.parentName', { defaultValue: 'Parent Name' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.parent_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.parentPhone', { defaultValue: 'Parent Phone' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.parent_phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('students.form.parentEmail', { defaultValue: 'Parent Email' })}</p>
              <p className="font-medium dark:text-zinc-100">{registration.parent_email || '—'}</p>
            </div>
          </>
        )}
        {registration.type === 'TUTOR' && (
          <>
            <div className="col-span-2">
              <p className="text-xs text-zinc-500 mb-0.5">{t('tutors.form.subjects', { defaultValue: 'Subjects' })}</p>
              <p className="font-medium dark:text-zinc-100">
                {registration.subject_names?.length > 0
                  ? registration.subject_names.join(', ')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{t('tutors.form.yearsOfExperience', { defaultValue: 'Experience' })}</p>
              <p className="font-medium dark:text-zinc-100">
                {registration.experience_years != null
                  ? `${registration.experience_years} ${t('common.years', { defaultValue: 'years' })}`
                  : '—'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ApproveModalProps {
  registration: Registration | null;
  onClose: () => void;
}

function ApproveModal({ registration, onClose }: ApproveModalProps) {
  const { t } = useTranslation();
  const approveMutation = useApproveRegistration();

  const handleApprove = () => {
    if (!registration) return;
    approveMutation.mutate(registration.id, {
      onSuccess: () => onClose(),
    });
  };

  const confirmText =
    registration?.type === 'TUTOR'
      ? t('registration.approveTutorConfirm', {
          email: registration.email ?? registration.phone ?? '',
        })
      : t('registration.approveStudentConfirm');

  return (
    <Modal isOpen={!!registration} onClose={onClose} title={t('registration.approve')}>
      {registration && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{confirmText}</p>
          <RegistrationDetailBlock registration={registration} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={approveMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" className="flex-1" onClick={handleApprove} disabled={approveMutation.isPending}>
              <Check size={14} />
              {t('registration.approve')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface RejectModalProps {
  registration: Registration | null;
  onClose: () => void;
}

function RejectModal({ registration, onClose }: RejectModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const rejectMutation = useRejectRegistration();

  const handleReject = () => {
    if (!registration) return;
    rejectMutation.mutate(
      { id: registration.id, reason: reason || undefined },
      {
        onSuccess: () => {
          setReason('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal isOpen={!!registration} onClose={onClose} title={t('registration.reject')}>
      {registration && (
        <div className="space-y-4">
          <RegistrationDetailBlock registration={registration} />
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('registration.rejectReason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={rejectMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              <X size={14} />
              {t('registration.reject')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const TYPE_TABS: { key: TypeFilter; labelKey: string }[] = [
  { key: 'ALL', labelKey: 'common.allStatuses' },
  { key: 'STUDENT', labelKey: 'registration.student' },
  { key: 'TUTOR', labelKey: 'registration.tutor' },
];

const STATUS_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'ALL', labelKey: 'common.allStatuses' },
  { key: 'PENDING', labelKey: 'registration.pending' },
  { key: 'APPROVED', labelKey: 'registration.approved' },
  { key: 'REJECTED', labelKey: 'registration.rejected' },
];

export function Registrations() {
  const { t, i18n } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState<Registration | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null);

  const queryParams = {
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError } = useRegistrations(queryParams);

  const allRegistrations: Registration[] = Array.isArray(data)
    ? data
    : (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? allRegistrations.length;

  const filtered = searchQuery.trim()
    ? allRegistrations.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allRegistrations;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleTypeChange = (key: TypeFilter) => {
    setTypeFilter(key);
    setPage(1);
  };

  const handleStatusChange = (key: StatusFilter) => {
    setStatusFilter(key);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('registration.title')} />

      <Card className="!p-0 overflow-hidden">
        {/* Type tabs */}
        <div className="px-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto">
          {TYPE_TABS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => handleTypeChange(key)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                typeFilter === key
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Status filters + search */}
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map(({ key, labelKey }) => (
              <button
                key={key}
                onClick={() => handleStatusChange(key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  statusFilter === key
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                )}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t('common.search')}
              className="pl-8 pr-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-zinc-900 dark:text-zinc-100 w-48 transition"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-red-500 text-sm">{t('common.noData')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">{t('registration.noRegistrations')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {[
                    'Name',
                    `${t('registration.student')} / ${t('registration.tutor')}`,
                    'Email / Phone',
                    'Date',
                    t('common.status'),
                    t('common.actions'),
                  ].map((header) => (
                    <th
                      key={header}
                      className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg) => (
                  <tr
                    key={reg.id}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-medium text-sm dark:text-zinc-100">{reg.name}</span>
                    </td>
                    <td className="p-4">
                      <TypeBadge type={reg.type} />
                    </td>
                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {reg.email ?? reg.phone ?? '—'}
                    </td>
                    <td className="p-4 text-sm text-zinc-500">
                      {formatDate(reg.created_at, i18n.language)}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="p-4">
                      {reg.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => setApproveTarget(reg)}
                          >
                            <Check size={14} />
                            {t('registration.approve')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={() => setRejectTarget(reg)}
                          >
                            <X size={14} />
                            {t('registration.reject')}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
            <span>
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <ApproveModal registration={approveTarget} onClose={() => setApproveTarget(null)} />
      <RejectModal registration={rejectTarget} onClose={() => setRejectTarget(null)} />
    </div>
  );
}
