import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, X } from 'lucide-react';
import {
  Card,
  Button,
  PageHeader,
  Skeleton,
  Modal,
} from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { useUpgradeRequests, useReviewUpgradeRequest } from '../../hooks/usePlan';
import type { UpgradeRequest, PlanType } from '../../types/plan';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function PlanBadge({ plan }: { plan: PlanType }) {
  const { t } = useTranslation();
  const classes: Record<PlanType, string> = {
    STARTER: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    GROWTH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    BUSINESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const labels: Record<PlanType, string> = {
    STARTER: t('plan.starter'),
    GROWTH: t('plan.growth'),
    BUSINESS: t('plan.business'),
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', classes[plan])}>
      {labels[plan]}
    </span>
  );
}

function StatusBadge({ status }: { status: UpgradeRequest['status'] }) {
  const { t } = useTranslation();
  const classes: Record<UpgradeRequest['status'], string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  const labels: Record<UpgradeRequest['status'], string> = {
    PENDING: t('plan.pending'),
    APPROVED: t('plan.approved'),
    REJECTED: t('plan.rejected'),
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', classes[status])}>
      {labels[status]}
    </span>
  );
}

interface ReviewModalProps {
  request: UpgradeRequest | null;
  onClose: () => void;
}

function ReviewModal({ request, onClose }: ReviewModalProps) {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = useState('');
  const reviewMutation = useReviewUpgradeRequest();

  const handleReview = (status: 'APPROVED' | 'REJECTED') => {
    if (!request) return;
    reviewMutation.mutate(
      { id: request.id, status, review_notes: reviewNotes || undefined },
      {
        onSuccess: () => {
          onClose();
          setReviewNotes('');
        },
      }
    );
  };

  return (
    <Modal
      isOpen={!!request}
      onClose={onClose}
      title={t('plan.upgradeRequests')}
    >
      {request && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PlanBadge plan={request.current_plan} />
            <ArrowRight size={14} className="text-zinc-400" />
            <PlanBadge plan={request.requested_plan} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              {t('superAdmin.table.name')}
            </p>
            <p className="text-sm dark:text-zinc-100">
              {request.institution?.name ?? request.institution_id}
            </p>
          </div>

          {request.message && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                {t('plan.upgradeMessage')}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{request.message}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('plan.reviewNotes')}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={t('plan.reviewNotesPlaceholder')}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
              disabled={reviewMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => handleReview('REJECTED')}
              disabled={reviewMutation.isPending}
            >
              <X size={14} />
              {t('plan.reject')}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleReview('APPROVED')}
              disabled={reviewMutation.isPending}
            >
              <Check size={14} />
              {t('plan.approve')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'common.allStatuses' },
  { key: 'PENDING', label: 'plan.pending' },
  { key: 'APPROVED', label: 'plan.approved' },
  { key: 'REJECTED', label: 'plan.rejected' },
];

export default function UpgradeRequests() {
  const { t, i18n } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);

  const { data, isLoading } = useUpgradeRequests(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined
  );

  const requests: UpgradeRequest[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('plan.upgradeRequests')}
        subtitle={t('plan.planManagement')}
      />

      <Card className="!p-0 overflow-hidden">
        {/* Filter Tabs */}
        <div className="px-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                statusFilter === key
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">{t('plan.noRequests')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.table.name')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('plan.from')} → {t('plan.to')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('plan.upgradeMessage')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('common.status')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.table.created')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-medium dark:text-zinc-100">
                        {req.institution?.name ?? req.institution_id}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={req.current_plan} />
                        <ArrowRight size={14} className="text-zinc-400" />
                        <PlanBadge plan={req.requested_plan} />
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 max-w-xs">
                        {req.message ?? '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="p-4 text-sm text-zinc-500">
                      {formatDate(req.created_at, i18n.language)}
                    </td>
                    <td className="p-4">
                      {req.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(req)}
                        >
                          {t('plan.approve')} / {t('plan.reject')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ReviewModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}
