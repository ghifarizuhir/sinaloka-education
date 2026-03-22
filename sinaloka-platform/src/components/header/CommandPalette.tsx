import { useState, useEffect, useRef, useMemo, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, LayoutDashboard, Users, GraduationCap, BookOpen,
  CalendarClock, ClipboardCheck, UserPlus, ClipboardList,
  Wallet, Receipt, Banknote, TrendingDown, Settings,
  MessageSquare, Command
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageEntry {
  label: string;
  href: string;
  icon: any;
  section: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pages: PageEntry[] = useMemo(() => [
    { label: t('nav.dashboard'), href: '/', icon: LayoutDashboard, section: t('nav.general') },
    { label: t('nav.students'), href: '/students', icon: Users, section: t('nav.academics') },
    { label: t('nav.tutors'), href: '/tutors', icon: GraduationCap, section: t('nav.academics') },
    { label: t('nav.classes'), href: '/classes', icon: BookOpen, section: t('nav.academics') },
    { label: t('nav.schedules'), href: '/schedules', icon: CalendarClock, section: t('nav.operations') },
    { label: t('nav.attendance'), href: '/attendance', icon: ClipboardCheck, section: t('nav.operations') },
    { label: t('nav.enrollments'), href: '/enrollments', icon: UserPlus, section: t('nav.operations') },
    { label: t('nav.registrations'), href: '/registrations', icon: ClipboardList, section: t('nav.operations') },
    { label: t('nav.overview'), href: '/finance', icon: Wallet, section: t('nav.finance') },
    { label: t('nav.studentPayments'), href: '/finance/payments', icon: Receipt, section: t('nav.finance') },
    { label: t('nav.tutorPayouts'), href: '/finance/payouts', icon: Banknote, section: t('nav.finance') },
    { label: t('nav.operatingExpenses'), href: '/finance/expenses', icon: TrendingDown, section: t('nav.finance') },
    { label: t('nav.whatsapp'), href: '/whatsapp', icon: MessageSquare, section: t('nav.messaging') },
    { label: t('nav.settings'), href: '/settings', icon: Settings, section: t('nav.system') },
    { label: 'Audit Log', href: '/audit-logs', icon: ClipboardList, section: t('nav.system') },
  ], [t]);

  const filtered = query.trim()
    ? pages.filter(p =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.section.toLowerCase().includes(query.toLowerCase())
      )
    : pages;

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation within palette
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].href);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-xl text-sm text-muted-foreground transition-all w-56 group"
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1 text-left text-xs">{t('layout.searchPlaceholder')}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/30">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
            >
              <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 border-b border-border/30">
                  <Search size={18} className="text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('layout.searchPlaceholder')}
                    className="flex-1 py-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <kbd className="text-[10px] font-medium text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto scrollbar-thin p-2">
                  {filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No results found.</p>
                  )}
                  {filtered.map((page, i) => {
                    const Icon = page.icon;
                    return (
                      <button
                        key={page.href}
                        onClick={() => { navigate(page.href); setIsOpen(false); }}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                          i === selectedIndex
                            ? "bg-sidebar-accent/60 text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon size={16} className={cn(i === selectedIndex ? "text-primary" : "text-muted-foreground")} />
                        <span className="flex-1 text-left">{page.label}</span>
                        <span className="text-[10px] text-muted-foreground/50">{page.section}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
