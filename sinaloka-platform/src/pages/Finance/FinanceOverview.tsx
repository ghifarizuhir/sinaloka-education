import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  DollarSign, Receipt, Wallet, Banknote,
  Download, AlertTriangle, TrendingUp, TrendingDown,
  MessageSquare, ChevronRight, Minus,
  FileText, ChevronDown, Equal
} from 'lucide-react';
import { Card, Button, Badge, Skeleton, PageHeader, Tabs, DropdownMenu } from '../../components/UI';
import { cn, formatCurrencyShort, formatCurrency } from '../../lib/utils';
import { useDashboardStats } from '@/src/hooks/useDashboard';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { useFinancialSummary, useRevenueBreakdown, useExpenseBreakdown, useExportCsv } from '@/src/hooks/useReports';
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
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodParams = { period_start: periodStart, period_end: periodEnd };
  const { data: summary, isLoading: isLoadingSummary } = useFinancialSummary(periodParams);
  const { data: revenueBreakdown } = useRevenueBreakdown(periodParams);
  const { data: expenseBreakdown } = useExpenseBreakdown(periodParams);
  const exportCsv = useExportCsv();

  const { isLoading } = useDashboardStats();
  const { data: overdueSummary } = useOverdueSummary();

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
  };

  const handleRemind = (student: string) => {
    toast.success(t('finance.reminderSent', { student }));
  };

  const netProfit = summary?.net_profit ?? 0;
  const isProfit = netProfit >= 0;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ─── Header ─── */}
      <PageHeader
        title={t('finance.title')}
        subtitle={t('finance.subtitle')}
        actions={
          <>
            <Tabs
              value={activePeriod}
              onChange={handlePeriodChange}
              items={[
                { value: 'month', label: t('finance.thisMonth') },
                { value: 'quarter', label: t('finance.thisQuarter') },
                { value: 'year', label: t('finance.yearToDate') },
                { value: 'custom', label: t('finance.custom') },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => setShowReportModal(true)}>
              <FileText size={14} />
              {t('finance.generateReport')}
            </Button>
            <DropdownMenu
              trigger={<><Download size={14} /> {t('common.export')} <ChevronDown size={12} /></>}
              items={[
                { label: t('finance.exportPayments'), icon: DollarSign, onClick: () => handleExport('payments') },
                { label: t('finance.exportPayouts'), icon: Wallet, onClick: () => handleExport('payouts') },
                { label: t('finance.exportExpenses'), icon: Receipt, onClick: () => handleExport('expenses') },
              ]}
            />
          </>
        }
      />

      {/* Custom Date Range */}
      {activePeriod === 'custom' && (
        <div className="flex items-center gap-2 justify-end">
          <input
            type="date"
            value={customStart}
            onChange={(e) => { setCustomStart(e.target.value); handleCustomDateChange(e.target.value, customEnd); }}
            className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => { setCustomEnd(e.target.value); handleCustomDateChange(customStart, e.target.value); }}
            className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {/* ─── Profit Flow Hero ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border border-border p-6 md:p-8">
          {/* Decorative */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-violet-500/5 blur-3xl" />

          {isLoadingSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : (
            <div className="relative">
              {/* Shared Expenses card JSX */}
              {(() => {
                const expensesCard = (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Receipt size={14} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('finance.totalExpenses')}</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
                      {formatCurrency(summary?.total_expenses ?? 0, i18n.language)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t('finance.expenseCountLabel', { count: summary?.expense_count ?? 0 })}
                    </p>
                  </div>
                );
                return (<>
              {/* Flow equation: Revenue - Payouts - Expenses = Net */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-center">
                {/* Revenue */}
                <motion.div
                  className="col-span-1 md:col-span-2"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10">
                        <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('finance.totalRevenue')}</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(summary?.total_revenue ?? 0, i18n.language)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t('finance.paymentCountLabel', { count: summary?.payment_count ?? 0 })}
                    </p>
                  </div>
                </motion.div>

                {/* Minus operator */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Minus size={14} className="text-muted-foreground" />
                  </div>
                </div>

                {/* Payouts */}
                <motion.div
                  className="col-span-1 md:col-span-2"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Wallet size={14} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('finance.totalPayouts')}</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
                      {formatCurrency(summary?.total_payouts ?? 0, i18n.language)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t('finance.payoutCountLabel', { count: summary?.payout_count ?? 0 })}
                    </p>
                  </div>
                </motion.div>

                {/* Minus operator (for expenses) — hidden on mobile, shown inline */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Minus size={14} className="text-muted-foreground" />
                  </div>
                </div>

                {/* Mobile: Expenses */}
                <motion.div
                  className="col-span-2 md:hidden"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  {expensesCard}
                </motion.div>
              </div>

              {/* Desktop: Expenses + Net Profit row below */}
              <div className="hidden md:grid grid-cols-7 gap-3 items-center mt-3">
                <div className="col-span-2" />
                <div />
                {/* Expenses */}
                <motion.div
                  className="col-span-2"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  {expensesCard}
                </motion.div>

                {/* Equals */}
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Equal size={14} className="text-muted-foreground" />
                  </div>
                </div>

                {/* Empty space for alignment */}
                <div />
              </div>

              {/* Net Profit — full width accent bar */}
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className={cn(
                  "p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                  isProfit
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-red-500/5 border-red-500/20"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      isProfit ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      <Banknote size={20} className={isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('finance.netProfit')}</p>
                      <p className="text-xs text-muted-foreground">{t('finance.formulaRevPayoutsOpex')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isProfit ? (
                      <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
                    )}
                    <p className={cn(
                      "text-2xl md:text-3xl font-bold tracking-tight",
                      isProfit ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                    )}>
                      {formatCurrency(netProfit, i18n.language)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </>);
              })()}
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Overdue Alert ─── */}
      {overdueSummary && overdueSummary.overdue_count > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('payments.overdueAlert.title')}</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/70 truncate">
                {t('payments.overdueAlert.students', { count: overdueSummary.flagged_students.length })} · {t('payments.overdueAlert.totalDebt', { amount: formatCurrency(overdueSummary.total_overdue_amount, i18n.language) })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30 shrink-0"
              onClick={() => navigate('/finance/payments')}
            >
              {t('payments.overdueAlert.viewDetails')}
              <ChevronRight size={14} />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        {summary?.revenue_by_month && summary.revenue_by_month.length > 0 && (
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('finance.revenueSummary')}</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.revenue_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => formatCurrencyShort(v, i18n.language)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, i18n.language)} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                  <Bar dataKey="amount" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* Expense Trend */}
        {expenseBreakdown?.monthly_trend && expenseBreakdown.monthly_trend.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Receipt size={14} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('finance.monthlyTrend')}</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expenseBreakdown.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => formatCurrencyShort(v, i18n.language)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, i18n.language)} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                  <Bar dataKey="amount" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ─── Breakdown Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Breakdown */}
        {revenueBreakdown && (
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">{t('finance.revenueBreakdown')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* By Class */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('finance.byClass')}</p>
                  <div className="space-y-2">
                    {(revenueBreakdown.by_class ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
                    ) : (revenueBreakdown.by_class ?? []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-foreground truncate mr-2">{item.class_name}</span>
                        <span className="text-xs font-bold text-foreground tabular-nums shrink-0">{formatCurrencyShort(item.amount, i18n.language)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Method */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('finance.byPaymentMethod')}</p>
                  <div className="space-y-2">
                    {(revenueBreakdown.by_payment_method ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
                    ) : (revenueBreakdown.by_payment_method ?? []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-foreground">{t(`finance.methodLabel.${item.method}`, item.method)}</span>
                        <span className="text-xs font-bold text-foreground tabular-nums">{formatCurrencyShort(item.amount, i18n.language)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Status */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('finance.byStatus')}</p>
                  <div className="space-y-2.5">
                    {(revenueBreakdown.by_status ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
                    ) : (revenueBreakdown.by_status ?? []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <Badge
                          variant={item.status === 'PAID' ? 'success' : item.status === 'PENDING' ? 'warning' : 'error'}
                        >
                          {t(`finance.status.${item.status}`, item.status)}
                        </Badge>
                        <span className="text-xs font-bold text-foreground tabular-nums">{formatCurrencyShort(item.amount, i18n.language)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Expense Breakdown + Quick Links */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          {/* Expense by Category */}
          {expenseBreakdown && (
            <Card className="p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t('finance.byCategory')}</h3>
              <div className="space-y-2.5">
                {(expenseBreakdown.by_category ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
                ) : (expenseBreakdown.by_category ?? []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-xs text-foreground">{t(`finance.expenseCategory.${item.category}`, item.category)}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">{formatCurrencyShort(item.amount, i18n.language)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Finance Quick Nav */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{t('finance.financeModules')}</h3>
            <div className="space-y-1">
              {[
                { label: t('finance.studentPayments'), path: '/finance/payments', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: t('finance.tutorPayouts'), path: '/finance/payouts', icon: Wallet, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
                { label: t('finance.operatingExpenses'), path: '/finance/expenses', icon: Receipt, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/70 transition-all group"
                >
                  <div className={cn('p-2 rounded-lg transition-transform group-hover:scale-110', item.bg)}>
                    <item.icon size={14} className={item.color} />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ─── Receivables ─── */}
      {overdueSummary && (overdueSummary.flagged_students ?? []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('finance.receivables')}</h3>
                <Badge variant="error">{t('common.actionRequired')}</Badge>
              </div>
              <Link to="/finance/payments" className="text-xs font-semibold text-foreground hover:underline">{t('common.viewAll')}</Link>
            </div>
            <div className="space-y-2">
              {overdueSummary.flagged_students.map((item) => (
                <div key={item.student_id} className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">{item.student_name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.student_name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.overdue_payments} {t('finance.overduePayments')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(Number(item.total_debt), i18n.language)}</span>
                    <button
                      onClick={() => handleRemind(item.student_name)}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      <MessageSquare size={10} />
                      {t('finance.remind')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Report Preview Modal */}
      <ReportPreviewModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </div>
  );
};
