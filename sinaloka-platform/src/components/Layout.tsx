import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  CalendarClock,
  UserPlus,
  Wallet,
  Receipt,
  Banknote,
  ClipboardCheck,
  TrendingDown,
  LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
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

const Header = ({ title, isDarkMode, toggleDarkMode, toggleSidebar, isSidebarMinimized, userInitials }: {
  title: string,
  isDarkMode: boolean,
  toggleDarkMode: () => void,
  toggleSidebar: () => void,
  isSidebarMinimized: boolean,
  userInitials: string
}) => (
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
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
        <input 
          type="text" 
          placeholder="Search anything..." 
          className="pl-10 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 w-64 transition-all dark:text-zinc-100"
        />
      </div>
      
      <button 
        onClick={toggleDarkMode}
        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <button className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors relative">
        <Bell size={20} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></span>
      </button>
      <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold">
        {userInitials}
      </div>
    </div>
  </header>
);

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
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

  const userInitials = auth.user?.name
    ? auth.user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : 'AD';

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  const title = {
    '/': 'Dashboard',
    '/students': 'Students',
    '/tutors': 'Tutors',
    '/classes': 'Classes',
    '/schedules': 'Schedules',
    '/enrollments': 'Enrollments',
    '/attendance': 'Attendance',
    '/finance': 'Finance Overview',
    '/finance/payments': 'Student Payments',
    '/finance/payouts': 'Tutor Payouts',
    '/finance/expenses': 'Operating Expenses',
    '/settings': 'Settings'
  }[location.pathname] || 'Dashboard';

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
          {!isSidebarMinimized && <span className="font-bold text-xl tracking-tight dark:text-zinc-100">Sinaloka</span>}
        </div>
        
        <nav className="flex-1 px-4 space-y-8 overflow-y-auto overflow-x-hidden">
          <div>
            {!isSidebarMinimized && <p className="px-3 text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-4">General</p>}
            <div className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/" active={location.pathname === '/'} minimized={isSidebarMinimized} />
            </div>
          </div>

          <div>
            {!isSidebarMinimized && <p className="px-3 text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-4">Academics</p>}
            <div className="space-y-1">
              <SidebarItem icon={Users} label="Students" href="/students" active={location.pathname === '/students'} minimized={isSidebarMinimized} />
              <SidebarItem icon={GraduationCap} label="Tutors" href="/tutors" active={location.pathname === '/tutors'} minimized={isSidebarMinimized} />
              <SidebarItem icon={BookOpen} label="Classes" href="/classes" active={location.pathname === '/classes'} minimized={isSidebarMinimized} />
            </div>
          </div>

          <div>
            {!isSidebarMinimized && <p className="px-3 text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-4">Operations</p>}
            <div className="space-y-1">
              <SidebarItem icon={CalendarClock} label="Schedules" href="/schedules" active={location.pathname === '/schedules'} minimized={isSidebarMinimized} />
              <SidebarItem icon={ClipboardCheck} label="Attendance" href="/attendance" active={location.pathname === '/attendance'} minimized={isSidebarMinimized} />
              <SidebarItem icon={UserPlus} label="Enrollments" href="/enrollments" active={location.pathname === '/enrollments'} minimized={isSidebarMinimized} />
            </div>
          </div>

          <div>
            {!isSidebarMinimized && <p className="px-3 text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-4">Finance</p>}
            <div className="space-y-1">
              <SidebarItem icon={Wallet} label="Overview" href="/finance" active={location.pathname === '/finance'} minimized={isSidebarMinimized} />
              <SidebarItem icon={Receipt} label="Student Payments" href="/finance/payments" active={location.pathname === '/finance/payments'} minimized={isSidebarMinimized} />
              <SidebarItem icon={Banknote} label="Tutor Payouts" href="/finance/payouts" active={location.pathname === '/finance/payouts'} minimized={isSidebarMinimized} />
              <SidebarItem icon={TrendingDown} label="Operating Expenses" href="/finance/expenses" active={location.pathname === '/finance/expenses'} minimized={isSidebarMinimized} />
            </div>
          </div>

          <div>
            {!isSidebarMinimized && <p className="px-3 text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-4">System</p>}
            <div className="space-y-1">
              <SidebarItem icon={Settings} label="Settings" href="/settings" active={location.pathname === '/settings'} minimized={isSidebarMinimized} />
            </div>
          </div>
        </nav>

        {!isSidebarMinimized && (
          <div className="p-4 border-t border-zinc-50 dark:border-zinc-900">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">Pro Plan</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3">You're using 80% of your storage.</p>
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div className="w-4/5 h-full bg-zinc-900 dark:bg-zinc-100"></div>
              </div>
              <button className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline">Upgrade Now</button>
            </div>
          </div>
        )}

        <div className={cn("px-4 pb-4", isSidebarMinimized && "px-3")}>
          <button
            onClick={handleLogout}
            title="Log out"
            className={cn(
              "flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all duration-200 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
              isSidebarMinimized && "justify-center"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!isSidebarMinimized && <span className="text-sm">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-300",
        isSidebarMinimized ? "ml-20" : "ml-64"
      )}>
        <Header
          title={title}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          toggleSidebar={toggleSidebar}
          isSidebarMinimized={isSidebarMinimized}
          userInitials={userInitials}
        />
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
