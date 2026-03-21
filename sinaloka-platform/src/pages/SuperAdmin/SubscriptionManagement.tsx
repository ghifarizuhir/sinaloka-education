import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import {
  Card,
  Button,
  PageHeader,
  Skeleton,
  Modal,
  StatCard,
} from '../../components/UI';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import {
  useSubscriptionStats,
  useSubscriptionList,
  useSubscriptionPayments,
  useOverrideSubscription,
  useConfirmPayment,
} from '../../hooks/useSubscription';
import type { SubscriptionListItem, SubscriptionPayment } from '../../types/subscription';

type TabKey = 'SUBSCRIPTIONS' | 'PENDING_PAYMENTS' | 'PAYMENT_HISTORY';

const PLAN_TYPES = ['STARTER', 'GROWTH', 'BUSINESS'] as const;
type PlanType = (typeof PLAN_TYPES)[number];
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED'] as const;
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation();
  const classes: Record<string, string> = {
    STARTER: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    GROWTH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    BUSINESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const labels: Record<string, string> = {
    STARTER: t('plan.starter'),
    GROWTH: t('plan.growth'),
    BUSINESS: t('plan.business'),
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', classes[plan] ?? 'bg-zinc-100 text-zinc-600')}>
      {labels[plan] ?? plan}
    </span>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    GRACE_PERIOD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    GRACE_PERIOD: 'Grace Period',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', classes[status] ?? 'bg-zinc-100 text-zinc-600')}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── Override Modal ───────────────────────────────────────────────────────────

interface OverrideModalProps {
  subscription: SubscriptionListItem | null;
  onClose: () => void;
}

function OverrideModal({ subscription, onClose }: OverrideModalProps) {
  const { t, i18n } = useTranslation();
  const [planType, setPlanType] = useState<PlanType>('STARTER');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [notes, setNotes] = useState('');
  const overrideMutation = useOverrideSubscription();

  const handleOpen = (sub: SubscriptionListItem) => {
    setPlanType((sub.plan_type as PlanType) ?? 'STARTER');
    setStatus((sub.status as SubscriptionStatus) ?? 'ACTIVE');
    // Pre-fill expires_at with existing value formatted as YYYY-MM-DD for date input
    setExpiresAt(sub.expires_at ? sub.expires_at.slice(0, 10) : '');
    setNotes('');
  };

  // When subscription changes, reset form
  if (subscription && planType === 'STARTER' && expiresAt === '' && subscription.plan_type !== 'STARTER') {
    handleOpen(subscription);
  }

  const handleSubmit = () => {
    if (!subscription || !notes.trim()) return;
    overrideMutation.mutate(
      {
        id: subscription.id,
        plan_type: planType,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        status,
        notes,
      },
      {
        onSuccess: () => {
          onClose();
          setNotes('');
          setExpiresAt('');
        },
      }
    );
  };

  return (
    <Modal
      isOpen={!!subscription}
      onClose={onClose}
      title={t('subscription.overrideSubscription', 'Override Subscription')}
    >
      {subscription && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              {t('superAdmin.table.name', 'Institution')}
            </p>
            <p className="text-sm dark:text-zinc-100">
              {subscription.institution?.name ?? subscription.institution_id}
            </p>
          </div>

          {/* Plan Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('subscription.planType', 'Plan Type')}
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanType)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            >
              {PLAN_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Expires At */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('subscription.expiresAt', 'Expires At')}
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('common.status', 'Status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            >
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Notes (required) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('plan.reviewNotes', 'Notes')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('subscription.overrideNotesPlaceholder', 'Reason for override...')}
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
              disabled={overrideMutation.isPending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSubmit}
              disabled={overrideMutation.isPending || !notes.trim()}
            >
              {t('subscription.override', 'Override')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Payment Confirm Modal ────────────────────────────────────────────────────

interface ConfirmPaymentModalProps {
  payment: SubscriptionPayment | null;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
}

function ConfirmPaymentModal({ payment, action, onClose }: ConfirmPaymentModalProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const confirmMutation = useConfirmPayment();

  const handleSubmit = () => {
    if (!payment || !action) return;
    confirmMutation.mutate(
      { id: payment.id, action, notes: notes || undefined },
      {
        onSuccess: () => {
          onClose();
          setNotes('');
        },
      }
    );
  };

  const isOpen = !!payment && !!action;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        action === 'approve'
          ? t('subscription.approvePayment', 'Approve Payment')
          : t('subscription.rejectPayment', 'Reject Payment')
      }
    >
      {payment && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                {t('subscription.amount', 'Amount')}
              </p>
              <p className="text-sm font-medium dark:text-zinc-100">
                {formatCurrency(payment.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                {t('subscription.method', 'Method')}
              </p>
              <p className="text-sm dark:text-zinc-100">{payment.method}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              {t('plan.reviewNotes', 'Notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('subscription.confirmNotesPlaceholder', 'Optional notes...')}
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
              disabled={confirmMutation.isPending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            {action === 'reject' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={handleSubmit}
                disabled={confirmMutation.isPending}
              >
                {t('plan.reject', 'Reject')}
              </Button>
            )}
            {action === 'approve' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                disabled={confirmMutation.isPending}
              >
                {t('plan.approve', 'Approve')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Subscriptions Table ─────────────────────────────────────────────────────

function SubscriptionsTable({
  onOverride,
}: {
  onOverride: (sub: SubscriptionListItem) => void;
}) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useSubscriptionList();
  const items: SubscriptionListItem[] = Array.isArray(data)
    ? data
    : (data as any)?.items ?? [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">
          {t('subscription.noSubscriptions', 'No subscriptions found.')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('superAdmin.table.name', 'Institution')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('subscription.plan', 'Plan')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('common.status', 'Status')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('subscription.expiresAt', 'Expires At')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('subscription.lastPayment', 'Last Payment')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('common.actions', 'Actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((sub) => {
            const lastPayment = sub.payments?.[0] ?? null;
            return (
              <tr
                key={sub.id}
                className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="p-4">
                  <span className="font-medium dark:text-zinc-100">
                    {sub.institution?.name ?? sub.institution_id}
                  </span>
                </td>
                <td className="p-4">
                  <PlanBadge plan={sub.plan_type} />
                </td>
                <td className="p-4">
                  <SubscriptionStatusBadge status={sub.status} />
                </td>
                <td className="p-4 text-sm text-zinc-500">
                  {formatDate(sub.expires_at, i18n.language)}
                </td>
                <td className="p-4 text-sm text-zinc-500">
                  {lastPayment
                    ? formatDate(lastPayment.created_at, i18n.language)
                    : '—'}
                </td>
                <td className="p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOverride(sub)}
                  >
                    {t('subscription.override', 'Override')}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Payments Table ───────────────────────────────────────────────────────────

function PaymentsTable({
  statusFilter,
  onApprove,
  onReject,
}: {
  statusFilter?: string;
  onApprove: (payment: SubscriptionPayment) => void;
  onReject: (payment: SubscriptionPayment) => void;
}) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useSubscriptionPayments(
    statusFilter ? { status: statusFilter } : undefined
  );
  const items: SubscriptionPayment[] = Array.isArray(data)
    ? data
    : (data as any)?.items ?? [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">
          {t('subscription.noPayments', 'No payments found.')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('superAdmin.table.name', 'Institution')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('subscription.amount', 'Amount')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('subscription.method', 'Method')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('subscription.proof', 'Proof')}
            </th>
            <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
              {t('superAdmin.table.created', 'Date')}
            </th>
            {!statusFilter && (
              <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                {t('common.status', 'Status')}
              </th>
            )}
            {statusFilter === 'PENDING' && (
              <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                {t('common.actions', 'Actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((payment) => (
            <tr
              key={payment.id}
              className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <td className="p-4">
                <span className="font-medium dark:text-zinc-100">
                  {payment.institution_id}
                </span>
              </td>
              <td className="p-4 text-sm dark:text-zinc-100">
                {formatCurrency(payment.amount)}
              </td>
              <td className="p-4 text-sm text-zinc-500">{payment.method}</td>
              <td className="p-4">
                {payment.proof_url ? (
                  <a
                    href={payment.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink size={14} />
                    {t('subscription.viewProof', 'View')}
                  </a>
                ) : (
                  <span className="text-sm text-zinc-400">—</span>
                )}
              </td>
              <td className="p-4 text-sm text-zinc-500">
                {formatDate(payment.created_at, i18n.language)}
              </td>
              {!statusFilter && (
                <td className="p-4">
                  <SubscriptionStatusBadge status={payment.status} />
                </td>
              )}
              {statusFilter === 'PENDING' && (
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white border-0"
                      onClick={() => onApprove(payment)}
                    >
                      {t('plan.approve', 'Approve')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => onReject(payment)}
                    >
                      {t('plan.reject', 'Reject')}
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'SUBSCRIPTIONS', label: 'subscription.tabSubscriptions' },
  { key: 'PENDING_PAYMENTS', label: 'subscription.tabPendingPayments' },
  { key: 'PAYMENT_HISTORY', label: 'subscription.tabPaymentHistory' },
];

export default function SubscriptionManagement() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('SUBSCRIPTIONS');
  const [overrideTarget, setOverrideTarget] = useState<SubscriptionListItem | null>(null);
  const [confirmPayment, setConfirmPayment] = useState<{
    payment: SubscriptionPayment | null;
    action: 'approve' | 'reject' | null;
  }>({ payment: null, action: null });

  const { data: stats, isLoading: statsLoading } = useSubscriptionStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscription.management', 'Subscription Management')}
        subtitle={t('subscription.managementSubtitle', 'Manage institution subscriptions and payments')}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label={`${t('plan.starter', 'Starter')} — ${t('subscription.institutions', 'Institutions')}`}
              value={stats?.planCounts?.find(p => p.plan_type === 'STARTER')?.count ?? 0}
            />
            <StatCard
              label={`${t('plan.growth', 'Growth')} — ${t('subscription.institutions', 'Institutions')}`}
              value={stats?.planCounts?.find(p => p.plan_type === 'GROWTH')?.count ?? 0}
            />
            <StatCard
              label={`${t('plan.business', 'Business')} — ${t('subscription.institutions', 'Institutions')}`}
              value={stats?.planCounts?.find(p => p.plan_type === 'BUSINESS')?.count ?? 0}
            />
            <StatCard
              label={t('subscription.expiringIn7Days', 'Expiring in 7 Days')}
              value={stats?.expiringSoon ?? 0}
            />
          </>
        )}
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statsLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label={t('subscription.pendingPayments', 'Pending Payments')}
              value={stats?.pendingPayments ?? 0}
            />
            <StatCard
              label={t('subscription.revenueThisMonth', 'Revenue This Month')}
              value={
                stats?.monthlyRevenue != null
                  ? new Intl.NumberFormat(i18n.language === 'id' ? 'id-ID' : 'en-US', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(stats.monthlyRevenue)
                  : 'Rp 0'
              }
            />
          </>
        )}
      </div>

      {/* Tabs + Table */}
      <Card className="!p-0 overflow-hidden">
        {/* Tab Headers */}
        <div className="px-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === key
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              {t(label, key)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'SUBSCRIPTIONS' && (
          <SubscriptionsTable onOverride={setOverrideTarget} />
        )}
        {activeTab === 'PENDING_PAYMENTS' && (
          <PaymentsTable
            statusFilter="PENDING"
            onApprove={(p) => setConfirmPayment({ payment: p, action: 'approve' })}
            onReject={(p) => setConfirmPayment({ payment: p, action: 'reject' })}
          />
        )}
        {activeTab === 'PAYMENT_HISTORY' && (
          <PaymentsTable
            onApprove={(p) => setConfirmPayment({ payment: p, action: 'approve' })}
            onReject={(p) => setConfirmPayment({ payment: p, action: 'reject' })}
          />
        )}
      </Card>

      {/* Modals */}
      <OverrideModal
        subscription={overrideTarget}
        onClose={() => setOverrideTarget(null)}
      />
      <ConfirmPaymentModal
        payment={confirmPayment.payment}
        action={confirmPayment.action}
        onClose={() => setConfirmPayment({ payment: null, action: null })}
      />
    </div>
  );
}
