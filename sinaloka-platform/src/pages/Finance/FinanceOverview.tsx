import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DollarSign, Receipt, Wallet, Banknote, Info, Download,
  Calendar as CalendarIcon, AlertTriangle, TrendingUp,
  MessageSquare, ChevronRight, ArrowUpRight,
  FileText
} from 'lucide-react';
import { Card, Button, Badge, Skeleton } from '../../components/UI';
import { cn, formatCurrencyShort, formatCurrency, formatDate } from '../../lib/utils';
import { useDashboardStats } from '@/src/hooks/useDashboard';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { usePayouts } from '@/src/hooks/usePayouts';
import { getPayoutTutorName } from '@/src/types/payout';
import { toast } from 'sonner';
import ReportPreviewModal from '@/src/components/ReportPreviewModal';

export const FinanceOverview = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('This Month');
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: stats, isLoading } = useDashboardStats();
  const { data: overdueSummary } = useOverdueSummary();
  const { data: pendingPayoutsData } = usePayouts({ status: 'PENDING', limit: 5 });

  const pendingPayoutsList = pendingPayoutsData?.data ?? [];
  const totalPendingPayouts = pendingPayoutsList.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOutstanding = overdueSummary?.total_overdue_amount ?? 0;
  const revenue = stats?.total_revenue ?? 0;
  const netProfit = revenue - totalPendingPayouts - totalOutstanding;

  const formatRp = (value?: number) => {
    if (value == null) return `${i18n.language === 'id' ? 'Rp' : 'IDR'} -`;
    return formatCurrencyShort(value, i18n.language);
  };

  const dateRangeOptions = [
    { key: 'This Month', label: t('finance.thisMonth') },
    { key: 'This Quarter', label: t('finance.thisQuarter') },
    { key: 'Year to Date', label: t('finance.yearToDate') },
  ];

  const statCards = [
    {
      label: t('finance.revenueThisMonth'),
      value: formatRp(stats?.total_revenue),
      change: '',
      comparison: t('finance.basedOnTotalRevenue'),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      label: t('finance.outstandingPayments'),
      value: formatRp(totalOutstanding),
      change: overdueSummary ? `${overdueSummary.overdue_count} ${t('common.pending').toLowerCase()}` : '-',
      comparison: t('finance.seeStudentPayments'),
      icon: Receipt,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      label: t('finance.pendingPayouts'),
      value: formatRp(totalPendingPayouts),
      change: pendingPayoutsList.length > 0 ? `${pendingPayoutsList.length} ${t('common.pending').toLowerCase()}` : '-',
      comparison: t('finance.seeTutorPayouts'),
      icon: Wallet,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: t('finance.netProfit'),
      value: formatRp(netProfit),
      change: '',
      comparison: t('finance.formulaRevPayoutsOpex'),
      icon: Banknote,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      hasInfo: true
    },
  ];

  const handleExport = (tableName: string) => {
    toast.success(t('finance.exportedSuccess', { name: tableName }));
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
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            </Card>
          ))}
        </div>

        {/* Main Analysis Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-[300px] w-full" />
          </Card>
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>

        {/* Forecasting Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Card className="p-0 overflow-hidden">
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-20">
      {/* Header with Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('finance.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('finance.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {dateRangeOptions.map((range) => (
              <button
                key={range.key}
                onClick={() => setDateRange(range.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                  dateRange === range.key ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <CalendarIcon size={14} />
            {t('finance.custom')}
          </Button>
          <Button variant="primary" size="sm" className="h-9" onClick={() => setShowReportModal(true)}>
            <FileText size={14} />
            {t('finance.generateReport')}
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => handleExport('Global Dashboard')}>
            <Download size={14} />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-6 group relative">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={20} />
              </div>
              <div className="relative">
                {stat.change && (
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider cursor-help px-2 py-0.5 rounded-full",
                  stat.change.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                )}>
                  {stat.change}
                </span>
                )}
                {/* Comparison Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl border border-zinc-800">
                  <p className="font-bold mb-1">{t('common.comparison')}</p>
                  <p className="text-zinc-400">{stat.comparison}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-sm text-zinc-500">{stat.label}</p>
              {stat.hasInfo && (
                <div className="group/info relative">
                  <Info size={12} className="text-zinc-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-zinc-900 text-white text-[10px] rounded-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl border border-zinc-800">
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
              )}
            </div>
            <h3 className="text-2xl font-bold tracking-tight dark:text-zinc-100">{stat.value}</h3>
          </Card>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Summary Card */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg dark:text-zinc-100">{t('finance.revenueSummary')}</h3>
              <p className="text-xs text-zinc-500">{t('finance.aggregateRevenue')}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center h-[260px] gap-4">
            <div className="text-center">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('finance.totalRevenue')}</p>
              <p className="text-5xl font-bold text-indigo-600">{formatRp(stats?.total_revenue)}</p>
              <p className="text-xs text-zinc-500 mt-2">{t('finance.liveFromDashboardApi')}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 w-full mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.students')}</p>
                <p className="text-xl font-bold dark:text-zinc-100">{stats?.total_students ?? '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.tutors')}</p>
                <p className="text-xl font-bold dark:text-zinc-100">{stats?.active_tutors ?? '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.attendanceLabel')}</p>
                <p className="text-xl font-bold dark:text-zinc-100">{stats?.attendance_rate != null ? `${stats.attendance_rate.toFixed(0)}%` : '-'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Links Card */}
        <Card className="p-6 flex flex-col">
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
      </div>

      {/* Forecasting & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-indigo-600">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
              <TrendingUp size={18} />
            </div>
            <h4 className="font-bold text-sm">{t('finance.revenueThisPeriod')}</h4>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight">{formatRp(stats?.total_revenue)}</p>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{t('finance.totalRevenueLive')}</p>
          </div>
          <div className="mt-4 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg flex items-center gap-2">
            <ArrowUpRight size={14} className="text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700">{t('finance.fromDashboardApi')}</span>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <h4 className="font-bold text-sm">{t('finance.upcomingSessions')}</h4>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight">{stats?.upcoming_sessions ?? '-'}</p>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{t('finance.sessionsScheduled')}</p>
          </div>
          <div className="mt-4">
            <Link to="/finance/payments" className="text-[10px] font-bold text-indigo-600 hover:underline block">{t('finance.viewAllPayments')}</Link>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-rose-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600">
              <Banknote size={18} />
            </div>
            <h4 className="font-bold text-sm">{t('finance.attendanceRate')}</h4>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight">
              {stats?.attendance_rate != null ? `${stats.attendance_rate.toFixed(1)}%` : '-'}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{t('finance.overallAttendance')}</p>
          </div>
          <div className="mt-4 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${stats?.attendance_rate ?? 0}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Receivables Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg dark:text-zinc-100">{t('finance.receivables')}</h3>
              <Badge variant="error" className="text-[8px]">{t('common.actionRequired')}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleExport('Unpaid Students')}>
                <Download size={12} /> {t('common.csv')}
              </Button>
              <Link to="/finance/payments" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">{t('common.viewAll')}</Link>
            </div>
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

        {/* Tutor Payouts Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg dark:text-zinc-100">{t('finance.tutorPayouts')}</h3>
              <Badge variant="success" className="text-[8px]">{t('finance.batchReady')}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleExport('Tutor Payouts')}>
                <Download size={12} /> {t('common.csv')}
              </Button>
              <Link to="/finance/payouts" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">{t('common.viewAll')}</Link>
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.tutor')}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.period')}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('finance.amount')}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('finance.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingPayoutsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">{t('common.noData')}</td>
                  </tr>
                ) : pendingPayoutsList.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium dark:text-zinc-200">{getPayoutTutorName(item) || '-'}</span>
                        <span className="text-[10px] text-zinc-400">{formatDate(item.date, i18n.language)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-500">
                        {item.period_start && item.period_end
                          ? `${formatDate(item.period_start, i18n.language)} - ${formatDate(item.period_end, i18n.language)}`
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold dark:text-zinc-100">{formatCurrency(Number(item.amount), i18n.language)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate('/finance/payouts')}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors bg-zinc-100 text-zinc-900 dark:text-zinc-100"
                      >
                        {t('common.viewDetails')}
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
