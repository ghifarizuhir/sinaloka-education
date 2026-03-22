import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Settings,
  CalendarClock, UserPlus, Wallet, Receipt, Banknote,
  ClipboardCheck, ClipboardList, TrendingDown, LogOut,
  MessageSquare, ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePlan } from '../../hooks/usePlan';
import { usePendingRegistrationCount } from '../../hooks/useRegistrations';

// ─── SidebarItem ─────────────────────────────────────────
function SidebarItem({
  icon: Icon, label, href, active, minimized, badge
}: {
  icon: any; label: string; href: string; active: boolean;
  minimized: boolean; badge?: number;
}) {
  return (
    <Link
      to={href}
      title={minimized ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group overflow-hidden",
        active
          ? "bg-sidebar-accent/80 text-foreground font-medium nav-item-glow"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40"
      )}
    >
      {/* Hover light sweep */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      <Icon
        size={18}
        className={cn(
          "transition-all duration-200 shrink-0",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          minimized && "scale-110"
        )}
      />
      {!minimized && <span className="text-sm truncate flex-1">{label}</span>}
      {!minimized && badge != null && badge > 0 && (
        <span className="ml-auto shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {minimized && badge != null && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
      )}
    </Link>
  );
}

// ─── SidebarSection ──────────────────────────────────────
function SidebarSection({
  label, children, minimized, defaultOpen = true, itemCount
}: {
  label: string; children: ReactNode; minimized: boolean;
  defaultOpen?: boolean; itemCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (minimized) {
    return <div className="space-y-1 py-2">{children}</div>;
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-1 group/section"
      >
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70 group-hover/section:text-muted-foreground transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {itemCount != null && (
            <span className="text-[9px] font-medium text-muted-foreground/50 tabular-nums">
              {itemCount}
            </span>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={12} className="text-muted-foreground/50" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PlanWidget ──────────────────────────────────────────
function SidebarPlanWidget() {
  const { t } = useTranslation();
  const { data: plan } = usePlan();
  const navigate = useNavigate();

  if (!plan) return null;

  const { usage, planConfig } = plan;
  const studentPercent = planConfig.maxStudents
    ? Math.round((usage.students.current / planConfig.maxStudents) * 100)
    : 0;

  const planColors: Record<string, string> = {
    STARTER: 'text-zinc-400',
    GROWTH: 'text-blue-400',
    BUSINESS: 'text-amber-400',
  };

  return (
    <div className="p-4 border-t border-sidebar-glass-border">
      <div className="p-3 rounded-xl bg-sidebar-accent/40 backdrop-blur-sm border border-sidebar-glass-border">
        <p className={cn('text-[10px] font-bold mb-1', planColors[plan.currentPlan])}>
          {planConfig.label}
        </p>
        <p className="text-[10px] text-muted-foreground mb-2">
          {planConfig.maxStudents
            ? `${usage.students.current}/${planConfig.maxStudents} ${t('plan.maxStudents').toLowerCase()}`
            : `${usage.students.current} ${t('plan.maxStudents').toLowerCase()}`}
        </p>
        {planConfig.maxStudents && (
          <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden mb-3">
            <motion.div
              className={cn(
                'h-full rounded-full',
                studentPercent >= 100 ? 'bg-red-500' : studentPercent >= 80 ? 'bg-amber-500' : 'bg-primary',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(studentPercent, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        )}
        {plan.currentPlan !== 'BUSINESS' && (
          <button
            onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
            className="text-[10px] font-bold text-primary hover:underline"
          >
            {t('layout.upgradeNow')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────
export function Sidebar({
  minimized, onLogout
}: {
  minimized: boolean;
  onLogout: () => void;
}) {
  const location = useLocation();
  const { t } = useTranslation();
  const { data: pendingCountData } = usePendingRegistrationCount();
  const pendingRegistrations = pendingCountData?.count ?? 0;

  return (
    <aside
      className={cn(
        "sidebar-glass flex flex-col fixed h-full z-20 transition-all duration-300",
        minimized ? "w-20" : "w-64"
      )}
    >
      {/* Animated gradient line at top */}
      <div className="sidebar-gradient-line h-[2px] w-full shrink-0" />

      {/* Logo */}
      <div className={cn("px-6 pt-6 pb-4 flex items-center gap-3", minimized && "px-4 justify-center")}>
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-info rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          <div className="w-4 h-4 bg-white/90 rounded-sm rotate-45" />
        </div>
        {!minimized && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-extrabold text-xl tracking-tight text-foreground"
          >
            Sinaloka
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-thin pb-2">
        <SidebarSection label={t('nav.general')} minimized={minimized}>
          <SidebarItem icon={LayoutDashboard} label={t('nav.dashboard')} href="/" active={location.pathname === '/'} minimized={minimized} />
        </SidebarSection>

        <SidebarSection label={t('nav.academics')} minimized={minimized} itemCount={3}>
          <SidebarItem icon={Users} label={t('nav.students')} href="/students" active={location.pathname === '/students'} minimized={minimized} />
          <SidebarItem icon={GraduationCap} label={t('nav.tutors')} href="/tutors" active={location.pathname === '/tutors'} minimized={minimized} />
          <SidebarItem icon={BookOpen} label={t('nav.classes')} href="/classes" active={location.pathname === '/classes'} minimized={minimized} />
        </SidebarSection>

        <SidebarSection label={t('nav.operations')} minimized={minimized} itemCount={4}>
          <SidebarItem icon={CalendarClock} label={t('nav.schedules')} href="/schedules" active={location.pathname === '/schedules'} minimized={minimized} />
          <SidebarItem icon={ClipboardCheck} label={t('nav.attendance')} href="/attendance" active={location.pathname === '/attendance'} minimized={minimized} />
          <SidebarItem icon={UserPlus} label={t('nav.enrollments')} href="/enrollments" active={location.pathname === '/enrollments'} minimized={minimized} />
          <SidebarItem icon={ClipboardList} label={t('nav.registrations')} href="/registrations" active={location.pathname === '/registrations'} minimized={minimized} badge={pendingRegistrations} />
        </SidebarSection>

        <SidebarSection label={t('nav.finance')} minimized={minimized} itemCount={4}>
          <SidebarItem icon={Wallet} label={t('nav.overview')} href="/finance" active={location.pathname === '/finance'} minimized={minimized} />
          <SidebarItem icon={Receipt} label={t('nav.studentPayments')} href="/finance/payments" active={location.pathname === '/finance/payments'} minimized={minimized} />
          <SidebarItem icon={Banknote} label={t('nav.tutorPayouts')} href="/finance/payouts" active={location.pathname === '/finance/payouts'} minimized={minimized} />
          <SidebarItem icon={TrendingDown} label={t('nav.operatingExpenses')} href="/finance/expenses" active={location.pathname === '/finance/expenses'} minimized={minimized} />
        </SidebarSection>

        <SidebarSection label={t('nav.messaging')} minimized={minimized}>
          <SidebarItem icon={MessageSquare} label={t('nav.whatsapp')} href="/whatsapp" active={location.pathname === '/whatsapp'} minimized={minimized} />
        </SidebarSection>

        <SidebarSection label={t('nav.system')} minimized={minimized}>
          <SidebarItem icon={Settings} label={t('nav.settings')} href="/settings" active={location.pathname === '/settings'} minimized={minimized} />
          <SidebarItem icon={ClipboardList} label="Audit Log" href="/audit-logs" active={location.pathname === '/audit-logs'} minimized={minimized} />
        </SidebarSection>
      </nav>

      {!minimized && <SidebarPlanWidget />}

      {/* Logout */}
      <div className={cn("px-3 pb-4", minimized && "px-2")}>
        <button
          onClick={onLogout}
          title={t('layout.logOut')}
          className={cn(
            "flex items-center gap-3 px-3 py-2 w-full rounded-xl transition-all duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            minimized && "justify-center"
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!minimized && <span className="text-sm">{t('layout.logOut')}</span>}
        </button>
      </div>
    </aside>
  );
}
