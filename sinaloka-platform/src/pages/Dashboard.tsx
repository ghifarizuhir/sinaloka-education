import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  GraduationCap,
  ArrowUpRight,
  ChevronRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  Receipt,
  ClipboardCheck,
  UserPlus,
  Calendar,
  Zap,
  Search,
  Command,
  X,
  Sparkles,
  BookOpen,
  CreditCard,
  Activity,
  Sun,
  Moon,
  Sunset
} from 'lucide-react';
import { Card, Button, Badge, Skeleton, DropdownMenu } from '../components/UI';
import { cn, formatCurrencyShort, formatCurrency } from '../lib/utils';
import { useDashboardStats, useDashboardActivity } from '@/src/hooks/useDashboard';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { AuthContext } from '@/src/contexts/AuthContext';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: Sun, gradient: 'from-amber-200 via-orange-100 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-transparent' };
  if (h < 17) return { text: 'Good Afternoon', icon: Sunset, gradient: 'from-sky-200 via-blue-100 to-indigo-50 dark:from-sky-950/40 dark:via-blue-950/20 dark:to-transparent' };
  return { text: 'Good Evening', icon: Moon, gradient: 'from-indigo-200 via-purple-100 to-violet-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-transparent' };
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'enrollment': return UserPlus;
    case 'payment': return Receipt;
    case 'attendance': return ClipboardCheck;
    default: return Activity;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'enrollment': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'payment': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'attendance': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const auth = useContext(AuthContext);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity();
  const { data: overdueSummary } = useOverdueSummary();

  const isLoading = statsLoading || activityLoading;
  const greeting = getGreeting();
  const userName = auth?.user?.name?.split(' ')[0] ?? '';

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t('dashboard.timeAgo.minutes', { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('dashboard.timeAgo.hours', { count: hrs });
    return t('dashboard.timeAgo.days', { count: Math.floor(hrs / 24) });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ─── Hero Greeting ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br",
          greeting.gradient
        )}>
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/30 dark:bg-white/5 blur-xl" />

          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-foreground/60">
                <greeting.icon size={16} />
                <span className="text-xs font-semibold uppercase tracking-widest">{greeting.text}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {userName ? `${userName} 👋` : t('dashboard.greeting')}
              </h1>
              <p className="text-sm text-foreground/60 max-w-md">
                {t('dashboard.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-background/60 backdrop-blur-sm border-border/50"
                onClick={() => navigate('/schedules')}
              >
                <Calendar size={16} />
                {t('dashboard.schedule')}
              </Button>
              <Button
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setIsCommandPaletteOpen(true)}
              >
                <Zap size={16} />
                {t('dashboard.quickActions')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Overdue Alert ─── */}
      {overdueSummary && overdueSummary.overdue_count > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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

      {/* ─── Bento Stats Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('dashboard.totalStudents'),
            value: stats?.total_students?.toLocaleString() ?? '—',
            icon: Users,
            accent: 'text-blue-600 dark:text-blue-400',
            accentBg: 'bg-blue-500/10',
            sub: t('dashboard.enrolled'),
          },
          {
            label: t('dashboard.activeTutors'),
            value: stats?.active_tutors?.toLocaleString() ?? '—',
            icon: GraduationCap,
            accent: 'text-emerald-600 dark:text-emerald-400',
            accentBg: 'bg-emerald-500/10',
            sub: 'verified',
          },
          {
            label: t('dashboard.attendanceRate'),
            value: stats?.attendance_rate != null ? `${stats.attendance_rate.toFixed(0)}%` : '—',
            icon: ClipboardCheck,
            accent: 'text-amber-600 dark:text-amber-400',
            accentBg: 'bg-amber-500/10',
            sub: t('dashboard.rate'),
          },
          {
            label: t('dashboard.monthlyRevenue'),
            value: stats?.total_revenue != null ? formatCurrencyShort(stats.total_revenue, i18n.language) : '—',
            icon: TrendingUp,
            accent: 'text-violet-600 dark:text-violet-400',
            accentBg: 'bg-violet-500/10',
            sub: t('dashboard.thisMonth') ?? 'this month',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
          >
            <Card className="p-5 hover:shadow-md transition-shadow group cursor-default">
              <div className="flex items-start justify-between mb-4">
                <div className={cn('p-2.5 rounded-xl', stat.accentBg)}>
                  <stat.icon size={18} className={stat.accent} />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ─── Main Content: 2/3 + 1/3 Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Sessions & Metrics */}
        <motion.div
          className="lg:col-span-2 space-y-4"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {/* Revenue + Sessions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Revenue Card */}
            <Card className="p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <CreditCard size={16} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.monthlyRevenue')}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stats?.total_revenue != null ? formatCurrency(stats.total_revenue, i18n.language) : '—'}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight size={14} />
                    <span className="text-xs font-bold">+12%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
            </Card>

            {/* Sessions Card */}
            <Card className="p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.upcomingSessions')}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stats?.upcoming_sessions ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{t('dashboard.sessionsPlanned')}</p>
              </div>
            </Card>
          </div>

          {/* Activity Feed */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t('dashboard.recentActivity')}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Live feed</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')}>
                {t('common.viewAll')}
              </Button>
            </div>

            <div className="space-y-1">
              {activity && activity.length > 0 ? (
                activity.slice(0, 6).map((item, index) => {
                  const IconComp = getActivityIcon(item.type);
                  const colorClass = getActivityColor(item.type);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.06 }}
                      className="flex items-center gap-3 py-3 px-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-default"
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                        <IconComp size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {getTimeAgo(item.created_at)}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">{t('dashboard.noRecentActivity')}</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Right Sidebar */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {/* Quick Navigate */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.quickLinks')}</h3>
            </div>
            <div className="space-y-1">
              {[
                { label: t('dashboard.viewAllStudents'), path: '/students', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
                { label: t('dashboard.manageFinance'), path: '/finance', icon: CreditCard, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
                { label: t('dashboard.attendanceRecords'), path: '/attendance', icon: ClipboardCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                { label: t('dashboard.schedule'), path: '/schedules', icon: Calendar, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map((link, i) => (
                <button
                  key={i}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/70 transition-all group text-left"
                >
                  <div className={cn('p-2 rounded-lg transition-transform group-hover:scale-110', link.bg)}>
                    <link.icon size={14} className={link.color} />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{link.label}</span>
                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </Card>

          {/* Metrics Summary */}
          <Card className="p-5 bg-gradient-to-br from-card to-muted/30">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.overview')}</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: t('dashboard.monthlyRevenue'), value: stats?.total_revenue != null ? formatCurrencyShort(stats.total_revenue, i18n.language) : '—', icon: Receipt, color: 'text-violet-500' },
                { label: t('dashboard.activeTutors'), value: stats?.active_tutors?.toString() ?? '—', icon: GraduationCap, color: 'text-emerald-500' },
                { label: t('dashboard.upcomingSessions'), value: stats?.upcoming_sessions?.toString() ?? '—', icon: Clock, color: 'text-blue-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5">
                    <item.icon size={14} className={item.color} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ─── Command Palette ─── */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandPaletteOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Search className="text-muted-foreground" size={18} />
                <input
                  autoFocus
                  placeholder={t('dashboard.commandPalette.searchPlaceholder')}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                  <Command size={10} /> K
                </kbd>
                <button
                  onClick={() => setIsCommandPaletteOpen(false)}
                  className="p-1 hover:bg-accent rounded-lg transition-colors"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
                <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.commandPalette.quickActions')}</div>
                {[
                  { icon: UserPlus, label: t('dashboard.commandPalette.enrollNewStudent'), path: '/enrollments', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { icon: Receipt, label: t('dashboard.commandPalette.recordNewPayment'), path: '/finance/payments', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { icon: Calendar, label: t('dashboard.commandPalette.scheduleMakeupClass'), path: '/schedules', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { icon: Users, label: t('dashboard.commandPalette.addNewTutor'), path: '/tutors', color: 'text-violet-500', bg: 'bg-violet-500/10' },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => { navigate(action.path); setIsCommandPaletteOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors group text-left"
                  >
                    <div className={cn('p-2 rounded-lg', action.bg, action.color)}>
                      <action.icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t('dashboard.commandPalette.navigateTo', { path: action.path })}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </button>
                ))}
              </div>

              <div className="p-3 bg-muted/50 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[10px] font-mono shadow-sm">↑↓</kbd>
                    <span className="text-[10px] text-muted-foreground">{t('dashboard.commandPalette.navigate')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[10px] font-mono shadow-sm">Enter</kbd>
                    <span className="text-[10px] text-muted-foreground">{t('dashboard.commandPalette.select')}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{t('dashboard.commandPalette.version')}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
