import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, LogOut, User, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserMenuProps {
  userName: string;
  userInitials: string;
  userRole: string;
  institutionName?: string;
  onLogout: () => void;
}

export function UserMenu({ userName, userInitials, userRole, institutionName, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const roleBadgeColor: Record<string, string> = {
    SUPER_ADMIN: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    ADMIN: 'bg-primary/10 text-primary border-primary/20',
    TUTOR: 'bg-info/10 text-info border-info/20',
    PARENT: 'bg-success/10 text-success border-success/20',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted/30 transition-colors group"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
          {userInitials}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
          >
            {/* Profile section */}
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary/20">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  {institutionName && (
                    <p className="text-[11px] text-muted-foreground truncate">{institutionName}</p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                  roleBadgeColor[userRole] || roleBadgeColor.ADMIN
                )}>
                  <Shield size={10} />
                  {userRole.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <button
                onClick={() => { navigate('/settings'); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-sidebar-accent/40 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings size={14} />
                {t('nav.settings')}
              </button>
              <button
                onClick={() => { navigate('/settings', { state: { tab: 'security' } }); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-sidebar-accent/40 text-muted-foreground hover:text-foreground transition-colors"
              >
                <User size={14} />
                Profile & Security
              </button>
              <div className="h-px bg-border/30 my-1" />
              <button
                onClick={() => { onLogout(); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
              >
                <LogOut size={14} />
                {t('layout.logOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
