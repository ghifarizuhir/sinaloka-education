import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  GraduationCap,
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
  CreditCard,
  Activity,
} from 'lucide-react';
import { Card, Button, Skeleton } from '../components/UI';
import { cn, formatCurrencyShort, formatCurrency } from '../lib/utils';
import { useDashboardStats, useDashboardActivity, useDashboardUpcomingSessions } from '@/src/hooks/useDashboard';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { AuthContext } from '@/src/contexts/AuthContext';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
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
  const { data: upcomingSessions } = useDashboardUpcomingSessions();

  const isLoading = statsLoading || activityLoading;
  const greeting = getGreeting();
  const userName = auth?.user?.name?.split(' ')[0] ?? '';
  const institutionName = auth?.user?.institution?.name ?? 'Dashboard';
  const institutionInitial = institutionName.charAt(0).toUpperCase();

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
        <Skeleton className="h-24 rounded-2xl" />
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
      {/* ─── Institution Overview ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {institutionInitial}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  {institutionName}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t(`dashboard.greeting_${greeting}`)}
                  {userName ? `, ${userName}` : ''}
                </p>
              </div>
            </div>
            <Button
              className="bg-foreground text-background hover:bg-foreground/90 shrink-0"
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <Zap size={16} />
              {t('dashboard.quickActions')}
            </Button>
          </div>

          {/* Contextual Alert Chips */}
          {((overdueSummary && overdueSummary.overdue_count > 0) || (stats?.upcoming_sessions != null && stats.upcoming_sessions > 0)) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {overdueSummary && overdueSummary.overdue_count > 0 && (
                <button
                  onClick={() => navigate('/finance/payments')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <AlertTriangle size={12} />
                  {t('payments.overdueAlert.students', { count: overdueSummary.flagged_students.length })} {t('payments.overdueAlert.title').toLowerCase()}
                </button>
              )}
              {stats?.upcoming_sessions != null && stats.upcoming_sessions > 0 && (
                <button
                  onClick={() => navigate('/schedules')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <Calendar size={12} />
                  {stats.upcoming_sessions} {t('dashboard.upcomingSessions').toLowerCase()}
                </button>
              )}
            </div>
          )}
        </Card>
      </motion.div>

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
            sub: t('tutors.status.verified'),
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
            value: stats?.monthly_revenue != null ? formatCurrencyShort(stats.monthly_revenue, i18n.language) : '—',
            icon: TrendingUp,
            accent: 'text-violet-600 dark:text-violet-400',
            accentBg: 'bg-violet-500/10',
            sub: t('finance.thisMonth'),
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

        {/* Left: Activity Feed */}
        <motion.div
          className="lg:col-span-2 space-y-4"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {/* Activity Feed */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t('dashboard.recentActivity')}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('dashboard.liveFeed')}</p>
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
          {/* Upcoming Sessions */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.upcomingSessions')}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/schedules')}>
                {t('common.viewAll')}
              </Button>
            </div>
            <div className="space-y-1">
              {upcomingSessions && upcomingSessions.length > 0 ? (
                upcomingSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{session.subject_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {session.start_time} · {session.tutor_name}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {t('dashboard.noUpcomingSessions')}
                </div>
              )}
            </div>
          </Card>

          {/* Quick Navigate */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
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
