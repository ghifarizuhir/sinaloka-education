import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DollarSign, Receipt, Wallet, Banknote, Info, Download,
  Calendar as CalendarIcon, AlertTriangle, TrendingUp,
  MessageSquare, ChevronRight, ArrowUpRight,
  FileText, ChevronDown
} from 'lucide-react';
import { Card, Button, Badge, Skeleton, PageHeader, Tabs, StatCard, Separator } from '../../components/UI';
import { cn, formatCurrencyShort, formatCurrency, formatDate } from '../../lib/utils';
import { useDashboardStats } from '@/src/hooks/useDashboard';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { usePayouts } from '@/src/hooks/usePayouts';
import { useFinancialSummary, useRevenueBreakdown, useExpenseBreakdown, useExportCsv } from '@/src/hooks/useReports';
import { getPayoutTutorName } from '@/src/types/payout';
import { toast } from 'sonner';
import ReportPreviewModal from '@/src/components/ReportPreviewModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, format } from 'date-fns';

export const FinanceOverview = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);

  const [periodStart, setPeriodStart] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activePeriod, setActivePeriod] = useState('month');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodParams = { period_start: periodStart, period_end: periodEnd };
  const { data: summary, isLoading: isLoadingSummary } = useFinancialSummary(periodParams);
  const { data: revenueBreakdown } = useRevenueBreakdown(periodParams);
  const { data: expenseBreakdown } = useExpenseBreakdown(periodParams);
  const exportCsv = useExportCsv();

  const { data: stats, isLoading } = useDashboardStats();
  const { data: overdueSummary } = useOverdueSummary();
  const { data: pendingPayoutsData } = usePayouts({ status: 'PENDING', limit: 5 });

  const pendingPayoutsList = pendingPayoutsData?.data ?? [];

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period);
    const now = new Date();
    if (period === 'month') {
      setPeriodStart(format(startOfMonth(now), 'yyyy-MM-dd'));
      setPeriodEnd(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (period === 'quarter') {
      setPeriodStart(format(startOfQuarter(now), 'yyyy-MM-dd'));
      setPeriodEnd(format(endOfQuarter(now), 'yyyy-MM-dd'));
    } else if (period === 'year') {
      setPeriodStart(format(startOfYear(now), 'yyyy-MM-dd'));
      setPeriodEnd(format(now, 'yyyy-MM-dd'));
    }
    // 'custom' — dates are controlled by the date inputs directly
  };

  const handleCustomDateChange = (start: string, end: string) => {
    if (start && end) {
      setPeriodStart(start);
      setPeriodEnd(end);
    }
  };

  const handleExport = (type: 'payments' | 'payouts' | 'expenses') => {
    exportCsv.mutate({ type, period_start: periodStart, period_end: periodEnd }, {
      onSuccess: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(t('finance.exportSuccess'));
      },
    });
    setShowExportMenu(false);
  };

  const handleRemind = (student: string) => {
    toast.success(t('finance.reminderSent', { student }));
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>

        {/* Chart Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>

        {/* Breakdown Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-32 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-20">
      {/* Header with Period Selector + Export */}
      <PageHeader
        title={t('finance.title')}
        subtitle={t('finance.subtitle')}
        actions={
          <>
            <Tabs
              value={activePeriod}
              onChange={(val) => handlePeriodChange(val)}
              items={[
                { value: 'month', label: t('finance.thisMonth') },
                { value: 'quarter', label: t('finance.thisQuarter') },
                { value: 'year', label: t('finance.yearToDate') },
                { value: 'custom', label: t('finance.custom', 'Custom') },
              ]}
            />
            <Button variant="primary" size="sm" className="h-9" onClick={() => setShowReportModal(true)}>
              <FileText size={14} />
              {t('finance.generateReport')}
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" className="h-9" onClick={() => setShowExportMenu(!showExportMenu)}>
                <Download size={14} />
                {t('common.export')}
                <ChevronDown size={12} />
              </Button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={() => handleExport('payments')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-200"
                    >
                      {t('finance.studentPayments')}
                    </button>
                    <button
                      onClick={() => handleExport('payouts')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-200"
                    >
                      {t('finance.tutorPayouts')}
                    </button>
                    <button
                      onClick={() => handleExport('expenses')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-200"
                    >
                      {t('finance.operatingExpenses')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        }
      />
      {activePeriod === 'custom' && (
        <div className="flex items-center gap-2 justify-end">
          <input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              handleCustomDateChange(e.target.value, customEnd);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
          <span className="text-xs text-zinc-400">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              handleCustomDateChange(customStart, e.target.value);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingSummary ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label={t('finance.totalRevenue')}
              value={formatCurrency(summary?.total_revenue ?? 0, i18n.language)}
              icon={DollarSign}
              iconBg="bg-emerald-50 dark:bg-emerald-900/20"
              iconColor="text-emerald-600"
            />

            <StatCard
              label={t('finance.totalPayouts')}
              value={formatCurrency(summary?.total_payouts ?? 0, i18n.language)}
              icon={Wallet}
              iconBg="bg-blue-50 dark:bg-blue-900/20"
              iconColor="text-blue-600"
            />

            <StatCard
              label={t('finance.totalExpenses')}
              value={formatCurrency(summary?.total_expenses ?? 0, i18n.language)}
              icon={Receipt}
              iconBg="bg-amber-50 dark:bg-amber-900/20"
              iconColor="text-amber-600"
            />

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                  <Banknote className="text-indigo-600" size={20} />
                </div>
                <div className="group/info relative">
                  <Info size={12} className="text-zinc-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-zinc-900 text-white text-[10px] rounded-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl border border-zinc-800">
                    <p className="font-bold mb-2 border-b border-zinc-800 pb-1">{t('finance.netRevenueFormula')}</p>
                    <div className="space-y-1 text-zinc-400 italic">
                      <p>{t('finance.totalRevenueGross')}</p>
                      <p className="text-red-400">{t('finance.tutorPayoutsDirect')}</p>
                      <p className="text-red-400">{t('finance.operatingCostsOverhead')}</p>
                      <div className="border-t border-zinc-800 pt-1 mt-1 font-bold text-white not-italic">
                        {t('finance.netRevenue')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.netProfit')}</p>
              <p className={cn(
                "text-xl font-bold tracking-tight mt-1",
                (summary?.net_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {formatCurrency(summary?.net_profit ?? 0, i18n.language)}
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Trend Chart */}
      {summary?.revenue_by_month && summary.revenue_by_month.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-bold mb-4 dark:text-zinc-100">{t('finance.revenueSummary')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summary.revenue_by_month}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v, i18n.language)} />
              <Tooltip formatter={(v: number) => formatCurrency(v, i18n.language)} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Revenue Breakdown */}
      {revenueBreakdown && (
        <Card className="p-6">
          <h3 className="text-sm font-bold mb-4 dark:text-zinc-100">{t('finance.revenueBreakdown')}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* By Class */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{t('finance.byClass')}</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.class')}</th>
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.revenueLabel')}</th>
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.payments')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {(revenueBreakdown.by_class ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-center text-sm text-zinc-400">{t('common.noData')}</td></tr>
                  ) : (revenueBreakdown.by_class ?? []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-sm dark:text-zinc-200">{item.class_name}</td>
                      <td className="py-2 text-sm font-medium text-right dark:text-zinc-100">{formatCurrency(item.amount, i18n.language)}</td>
                      <td className="py-2 text-sm text-zinc-500 text-right">{item.payment_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Payment Method */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{t('finance.byPaymentMethod')}</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.method')}</th>
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.amount')}</th>
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.count')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {(revenueBreakdown.by_payment_method ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-center text-sm text-zinc-400">{t('common.noData')}</td></tr>
                  ) : (revenueBreakdown.by_payment_method ?? []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-sm dark:text-zinc-200">{t(`finance.methodLabel.${item.method}`, item.method)}</td>
                      <td className="py-2 text-sm font-medium text-right dark:text-zinc-100">{formatCurrency(item.amount, i18n.language)}</td>
                      <td className="py-2 text-sm text-zinc-500 text-right">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Status */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{t('finance.byStatus')}</p>
              <div className="space-y-3">
                {(revenueBreakdown.by_status ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-400">{t('common.noData')}</p>
                ) : (revenueBreakdown.by_status ?? []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <Badge
                      variant={item.status === 'PAID' ? 'success' : item.status === 'PENDING' ? 'warning' : 'error'}
                      className="text-[10px]"
                    >
                      {t(`finance.status.${item.status}`, item.status)}
                    </Badge>
                    <span className="text-sm font-medium dark:text-zinc-100">{formatCurrency(item.amount, i18n.language)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Expense Breakdown */}
      {expenseBreakdown && (
        <Card className="p-6">
          <h3 className="text-sm font-bold mb-4 dark:text-zinc-100">{t('finance.expenseBreakdown')}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Category */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{t('finance.byCategory')}</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.category')}</th>
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.amount')}</th>
                    <th className="pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.records')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {(expenseBreakdown.by_category ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-center text-sm text-zinc-400">{t('common.noData')}</td></tr>
                  ) : (expenseBreakdown.by_category ?? []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-sm dark:text-zinc-200">{t(`finance.expenseCategory.${item.category}`, item.category)}</td>
                      <td className="py-2 text-sm font-medium text-right dark:text-zinc-100">{formatCurrency(item.amount, i18n.language)}</td>
                      <td className="py-2 text-sm text-zinc-500 text-right">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Monthly Trend */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{t('finance.monthlyTrend')}</p>
              {(expenseBreakdown.monthly_trend ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={expenseBreakdown.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v, i18n.language)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, i18n.language)} />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-zinc-400">{t('common.noData')}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Finance Modules Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg dark:text-zinc-100">{t('finance.financeModules')}</h3>
            <p className="text-xs text-zinc-500">{t('finance.quickAccessFinance')}</p>
          </div>
          <div className="flex-1 space-y-3">
            {[
              { label: t('finance.studentPayments'), path: '/finance/payments', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: t('finance.tutorPayouts'), path: '/finance/payouts', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: t('finance.operatingExpenses'), path: '/finance/expenses', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                )}
              >
                <p className={cn("text-sm font-bold", item.color)}>{item.label}</p>
                <ChevronRight size={16} className="text-zinc-400" />
              </Link>
            ))}
            <div className="pt-4 mt-auto">
              <Button variant="secondary" className="w-full justify-center text-xs" onClick={() => setShowReportModal(true)}>
                {t('finance.generatePdfReport')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Receivables Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg dark:text-zinc-100">{t('finance.receivables')}</h3>
              <Badge variant="error" className="text-[8px]">{t('common.actionRequired')}</Badge>
            </div>
            <Link to="/finance/payments" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">{t('common.viewAll')}</Link>
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.studentClass')}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.amount')}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(overdueSummary?.flagged_students ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">{t('common.noData')}</td>
                  </tr>
                ) : (overdueSummary?.flagged_students ?? []).map((item) => (
                  <tr key={item.student_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium dark:text-zinc-200">{item.student_name}</span>
                        <span className="text-[10px] text-zinc-400">{item.overdue_payments} {t('finance.overduePayments')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[8px] font-bold uppercase tracking-tighter w-fit px-1.5 rounded bg-red-100 text-red-600">
                        {t('common.overdue')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold dark:text-zinc-100">{formatCurrency(Number(item.total_debt), i18n.language)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemind(item.student_name)}
                        className="flex items-center gap-1.5 ml-auto text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <MessageSquare size={12} />
                        {t('finance.remind')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* Report Preview Modal */}
      <ReportPreviewModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </div>
  );
};
