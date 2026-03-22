import { useState } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  CreditCard,
  Banknote,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
  Languages
} from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '../lib/utils';

const SidebarItem = ({ icon: Icon, label, href, active, minimized }: { icon: any, label: string, href: string, active: boolean, minimized: boolean }) => (
  <Link
    to={href}
    title={minimized ? label : undefined}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
      active
        ? "bg-sidebar-accent/80 text-foreground font-medium nav-item-glow"
        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40"
    )}
  >
    <Icon size={18} className={cn("transition-colors shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
    {!minimized && <span className="text-sm truncate">{label}</span>}
  </Link>
);

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { t, i18n } = useTranslation();
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleSidebar = () => setIsSidebarMinimized(!isSidebarMinimized);
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'id' ? 'en' : 'id';
    i18n.changeLanguage(newLang);
    localStorage.setItem('sinaloka-lang', newLang);
    document.documentElement.lang = newLang;
  };

  const userInitials = auth.user?.name
    ? auth.user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : 'SA';

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  const title = (() => {
    const path = location.pathname;
    if (path === '/super/institutions') return t('superAdmin.institutions');
    if (path === '/super/institutions/new') return t('superAdmin.createInstitution');
    if (path.match(/^\/super\/institutions\/[^/]+$/)) return t('superAdmin.institutionDetail');
    if (path === '/super/users') return t('superAdmin.users');
    if (path === '/super/upgrade-requests') return t('plan.upgradeRequests');
    return t('superAdmin.institutions');
  })();

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      {/* Sidebar */}
      <aside className={cn(
        "sidebar-glass flex flex-col fixed h-full z-20 transition-all duration-300",
        isSidebarMinimized ? "w-20" : "w-64"
      )}>
        <div className="sidebar-gradient-line h-[2px] w-full shrink-0" />
        <div className={cn("p-8 flex items-center gap-3", isSidebarMinimized && "px-6")}>
          <div className="w-9 h-9 bg-gradient-to-br from-zinc-800 to-zinc-600 dark:from-zinc-200 dark:to-zinc-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <div className="w-4 h-4 bg-white dark:bg-zinc-900 rounded-sm rotate-45" />
          </div>
          {!isSidebarMinimized && (
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight dark:text-zinc-100 leading-tight">Sinaloka</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-600 dark:text-amber-400">Super Admin</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <SidebarItem icon={Building2} label={t('superAdmin.institutions')} href="/super/institutions" active={location.pathname.startsWith('/super/institutions')} minimized={isSidebarMinimized} />
          <SidebarItem icon={Users} label={t('superAdmin.users')} href="/super/users" active={location.pathname === '/super/users'} minimized={isSidebarMinimized} />
          <SidebarItem icon={TrendingUp} label={t('plan.upgradeRequests')} href="/super/upgrade-requests" active={location.pathname === '/super/upgrade-requests'} minimized={isSidebarMinimized} />
          <SidebarItem icon={CreditCard} label={t('subscription.management', 'Subscriptions')} href="/super/subscriptions" active={location.pathname === '/super/subscriptions'} minimized={isSidebarMinimized} />
          <SidebarItem icon={Banknote} label="Settlements" href="/super/settlements" active={location.pathname === '/super/settlements'} minimized={isSidebarMinimized} />
          <SidebarItem
            icon={ClipboardList}
            label="Audit Log"
            href="/super/audit-logs"
            active={location.pathname === '/super/audit-logs'}
            minimized={isSidebarMinimized}
          />
        </nav>

        <div className={cn("px-4 pb-4", isSidebarMinimized && "px-3")}>
          <button
            onClick={handleLogout}
            title={t('layout.logOut')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 w-full rounded-xl transition-all duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              isSidebarMinimized && "justify-center"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!isSidebarMinimized && <span className="text-sm">{t('layout.logOut')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-300",
        isSidebarMinimized ? "ml-20" : "ml-64"
      )}>
        <header className="h-16 header-glass flex items-center justify-between px-6 sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-all"
            >
              {isSidebarMinimized ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <h1 className="text-lg font-semibold tracking-tight dark:text-zinc-100">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-all border border-border/30"
              title={i18n.language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              {i18n.language === 'id' ? 'ID' : 'EN'}
            </button>

            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-500 dark:from-zinc-300 dark:to-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold shadow-lg">
              {userInitials}
            </div>
          </div>
        </header>
        <div className="header-gradient-border h-[1px] w-full" />
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
