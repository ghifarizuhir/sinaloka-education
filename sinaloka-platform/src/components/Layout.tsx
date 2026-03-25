import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '../lib/utils';
import ImpersonationBanner from './ImpersonationBanner';
import { PlanWarningBanner } from './PlanWarningBanner';
import { Sidebar } from './sidebar/Sidebar';
import { Header } from './header/Header';

export const Layout = () => {
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

  const userName = auth.user?.name || 'Admin';
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
    '/': t('layout.pageTitle.dashboard'),
    '/students': t('layout.pageTitle.students'),
    '/tutors': t('layout.pageTitle.tutors'),
    '/classes': t('layout.pageTitle.classes'),
    '/schedules': t('layout.pageTitle.schedules'),
    '/enrollments': t('layout.pageTitle.enrollments'),
    '/attendance': t('layout.pageTitle.attendance'),
    '/finance': t('layout.pageTitle.financeOverview'),
    '/finance/payments': t('layout.pageTitle.studentPayments'),
    '/finance/payouts': t('layout.pageTitle.tutorPayouts'),
    '/finance/expenses': t('layout.pageTitle.operatingExpenses'),
    '/settings': t('layout.pageTitle.settings'),
    '/whatsapp': t('layout.pageTitle.whatsapp'),
    '/registrations': t('registration.title'),
  }[location.pathname] || t('layout.pageTitle.dashboard');

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <Sidebar minimized={isSidebarMinimized} onLogout={handleLogout} />

      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-300",
        isSidebarMinimized ? "ml-20" : "ml-64"
      )}>
        <ImpersonationBanner />
        <Header
          title={title}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          toggleSidebar={toggleSidebar}
          isSidebarMinimized={isSidebarMinimized}
          userName={userName}
          userInitials={userInitials}
          userRole={auth.user?.role || 'ADMIN'}
          institutionName={auth.user?.institution?.name}
          t={t}
          i18n={i18n}
          toggleLanguage={toggleLanguage}
          onLogout={handleLogout}
        />
        <PlanWarningBanner />
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
