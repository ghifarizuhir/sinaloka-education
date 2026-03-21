import { useState } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  CreditCard,
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
        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
    )}
  >
    <Icon size={18} className={cn("transition-colors shrink-0", active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100")} />
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
    <div className="flex min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-zinc-100 dark:border-zinc-800 flex flex-col fixed h-full bg-white dark:bg-zinc-950 z-20 transition-all duration-300",
        isSidebarMinimized ? "w-20" : "w-64"
      )}>
        <div className={cn("p-8 flex items-center gap-3", isSidebarMinimized && "px-6")}>
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
            <div className="w-4 h-4 bg-white dark:bg-zinc-900 rounded-sm rotate-45"></div>
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
        </nav>

        <div className={cn("px-4 pb-4", isSidebarMinimized && "px-3")}>
          <button
            onClick={handleLogout}
            title={t('layout.logOut')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all duration-200 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
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
        <header className="h-16 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-8 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 transition-colors">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors"
            >
              {isSidebarMinimized ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <h1 className="text-lg font-semibold tracking-tight dark:text-zinc-100">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={toggleLanguage}
              className="px-2 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors border border-zinc-200 dark:border-zinc-800"
              title={i18n.language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              {i18n.language === 'id' ? 'ID' : 'EN'}
            </button>

            <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold">
              {userInitials}
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
