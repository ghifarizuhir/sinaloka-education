import { PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePlan } from '../../hooks/usePlan';
import NotificationBell from '../notifications/NotificationBell';
import { CommandPalette } from './CommandPalette';
import { UserMenu } from './UserMenu';

const planBadgeColors: Record<string, string> = {
  STARTER: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  GROWTH: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BUSINESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

interface HeaderProps {
  title: string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  isSidebarMinimized: boolean;
  userName: string;
  userInitials: string;
  userRole: string;
  institutionName?: string;
  t: (key: string) => string;
  i18n: { language: string };
  toggleLanguage: () => void;
  onLogout: () => void;
}

export function Header({
  title, isDarkMode, toggleDarkMode, toggleSidebar, isSidebarMinimized,
  userName, userInitials, userRole, institutionName,
  t, i18n, toggleLanguage, onLogout
}: HeaderProps) {
  const { data: plan } = usePlan();

  return (
    <div className="sticky top-0 z-10">
      <header className="h-16 header-glass flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-all"
          >
            {isSidebarMinimized ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {plan && (
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-lg border',
              planBadgeColors[plan.currentPlan]
            )}>
              {plan.planConfig.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CommandPalette />

          <button
            onClick={toggleDarkMode}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-all"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-all border border-border/30"
            title={i18n.language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            {i18n.language === 'id' ? 'ID' : 'EN'}
          </button>

          <NotificationBell />

          <UserMenu
            userName={userName}
            userInitials={userInitials}
            userRole={userRole}
            institutionName={institutionName}
            onLogout={onLogout}
          />
        </div>
      </header>
      {/* Animated gradient border */}
      <div className="header-gradient-border h-[1px] w-full" />
    </div>
  );
}
