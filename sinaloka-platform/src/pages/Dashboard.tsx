import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  GraduationCap,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  Receipt,
  ClipboardCheck,
  UserPlus,
  Calendar,
  MoreVertical,
  Zap,
  Search,
  Command,
  X
} from 'lucide-react';
import { Card, Button, Badge, Skeleton, Progress } from '../components/UI';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useDashboardStats, useDashboardActivity } from '@/src/hooks/useDashboard';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity();

  const isLoading = statsLoading || activityLoading;

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
    return `Rp ${amount}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return UserPlus;
      case 'payment': return Receipt;
      case 'attendance': return ClipboardCheck;
      default: return CheckCircle2;
    }
  };

  const getActivityCategory = (type: string) => {
    switch (type) {
      case 'enrollment': return 'Operations';
      case 'payment': return 'Finance';
      case 'attendance': return 'Academic';
      default: return 'System';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="w-10 h-10" />
                <Skeleton className="w-12 h-5" />
              </div>
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-32 h-8" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.total_students?.toLocaleString() ?? '—',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      label: 'Active Tutors',
      value: stats?.active_tutors?.toLocaleString() ?? '—',
      icon: GraduationCap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      label: 'Attendance Rate',
      value: stats?.attendance_rate != null ? `${stats.attendance_rate.toFixed(1)}%` : '—',
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      label: 'Monthly Revenue',
      value: stats?.total_revenue != null ? formatCurrency(stats.total_revenue) : '—',
      icon: ArrowUpRight,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">Morning Coffee</h2>
          <p className="text-zinc-500 text-sm">Here's what's happening at Sinaloka Platform today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => navigate('/schedules')}
          >
            <Calendar size={16} />
            Schedule
          </Button>
          <div className="relative group">
            <Button
              className="h-10 gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <Zap size={16} />
              Quick Actions
            </Button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
              <button
                onClick={() => navigate('/enrollments')}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
              >
                <UserPlus size={14} /> Quick Enroll
              </button>
              <button
                onClick={() => navigate('/finance/payments')}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
              >
                <Receipt size={14} /> Record Payment
              </button>
              <button
                onClick={() => navigate('/schedules')}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
              >
                <Plus size={14} /> Add Make-up Class
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex flex-col gap-4 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight dark:text-zinc-100">{stat.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Sessions */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg dark:text-zinc-100">Overview</h3>
              <p className="text-xs text-zinc-500">Key metrics at a glance</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/schedules')}>Full Schedule</Button>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-12 rounded-full bg-indigo-500" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold text-sm dark:text-zinc-100">Upcoming Sessions</h4>
                      <Badge variant="default">{stats?.upcoming_sessions ?? 0} scheduled</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">Sessions planned for the near future</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/schedules')}>
                  View All
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-12 rounded-full bg-emerald-500" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold text-sm dark:text-zinc-100">Student Attendance</h4>
                      <Badge variant="success">{stats?.attendance_rate?.toFixed(1) ?? 0}% rate</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">Overall attendance across all sessions</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
                  View Details
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-12 rounded-full bg-amber-500" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold text-sm dark:text-zinc-100">Total Students</h4>
                      <Badge variant="warning">{stats?.total_students?.toLocaleString() ?? 0} enrolled</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">Registered students in the platform</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
                  View Students
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Center */}
        <div className="space-y-6">
          <Card className="border-l-4 border-l-indigo-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                <TrendingUp size={18} />
              </div>
              <h3 className="font-bold text-lg dark:text-zinc-100">Revenue Summary</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                    <Receipt size={16} className="text-indigo-500" />
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Monthly Revenue</span>
                </div>
                <span className="text-sm font-bold dark:text-zinc-100">
                  {stats?.total_revenue != null ? formatCurrency(stats.total_revenue) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
                    <Users size={16} className="text-emerald-500" />
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Active Tutors</span>
                </div>
                <span className="text-sm font-bold dark:text-zinc-100">{stats?.active_tutors ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 shrink-0">
                    <Clock size={16} className="text-amber-500" />
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Upcoming Sessions</span>
                </div>
                <span className="text-sm font-bold dark:text-zinc-100">{stats?.upcoming_sessions ?? '—'}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm dark:text-zinc-100">Quick Links</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'View All Students', path: '/students', icon: Users },
                { label: 'Manage Finance', path: '/finance', icon: Receipt },
                { label: 'Attendance Records', path: '/attendance', icon: ClipboardCheck },
              ].map((link, i) => (
                <button
                  key={i}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group text-left"
                >
                  <link.icon size={16} className="text-zinc-400" />
                  <span className="text-sm font-medium dark:text-zinc-200 flex-1">{link.label}</span>
                  <ChevronRight size={14} className="text-zinc-300 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg dark:text-zinc-100">Recent Activity</h3>
          <Button variant="outline" size="sm">View All</Button>
        </div>
        <div className="space-y-6">
          {activity && activity.length > 0 ? (
            activity.map((item, index) => {
              const IconComp = getActivityIcon(item.type);
              return (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                      <IconComp size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium dark:text-zinc-200">{item.description}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                        {getTimeAgo(item.created_at)} • {getActivityCategory(item.type)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-zinc-400 text-sm">No recent activity</div>
          )}
        </div>
      </Card>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandPaletteOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Search className="text-zinc-400" size={20} />
                <input
                  autoFocus
                  placeholder="Search for students, tutors, or actions..."
                  className="flex-1 bg-transparent border-none outline-none text-sm dark:text-zinc-100"
                />
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[10px] font-mono text-zinc-400">
                  <Command size={10} />
                  <span>K</span>
                </div>
                <button
                  onClick={() => setIsCommandPaletteOpen(false)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quick Actions</div>
                <div className="space-y-1">
                  {[
                    { icon: UserPlus, label: 'Enroll New Student', path: '/enrollments', color: 'text-blue-500' },
                    { icon: Receipt, label: 'Record New Payment', path: '/finance/payments', color: 'text-emerald-500' },
                    { icon: Calendar, label: 'Schedule Make-up Class', path: '/schedules', color: 'text-amber-500' },
                    { icon: Users, label: 'Add New Tutor', path: '/tutors', color: 'text-purple-500' },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigate(action.path);
                        setIsCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group text-left"
                    >
                      <div className={cn("p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors", action.color)}>
                        <action.icon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium dark:text-zinc-200">{action.label}</p>
                        <p className="text-[10px] text-zinc-500">Navigate to {action.path}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-mono shadow-sm">↑↓</kbd>
                    <span className="text-[10px] text-zinc-500">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-mono shadow-sm">Enter</kbd>
                    <span className="text-[10px] text-zinc-500">Select</span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400">Sinaloka Platform v1.0</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
