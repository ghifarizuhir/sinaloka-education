# Dark Glass Header & Sidebar Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the platform header and sidebar with a "Dark Glass" aesthetic — semi-transparent glass panels, animated gradient accents, motion-powered transitions, command palette (⌘K), and a profile card dropdown.

**Architecture:** Extract sidebar and header into dedicated component files. Add CommandPalette modal and UserMenu dropdown as new components. Update CSS theme with glass-specific variables and gradient keyframes. Both Layout.tsx and SuperAdminLayout.tsx consume the new shared components.

**Tech Stack:** React 19, TailwindCSS v4, Motion (Framer Motion), Lucide icons, existing oklch color system

---

### Task 1: Add CSS Variables & Animations for Dark Glass

**Files:**
- Modify: `sinaloka-platform/src/index.css`

- [ ] **Step 1: Add glass sidebar CSS variables to both light and dark themes**

In `:root` block, after the existing sidebar variables, add:

```css
  /* Glass sidebar */
  --sidebar-glass: oklch(0.980 0.004 90 / 70%);
  --sidebar-glass-border: oklch(0.555 0.155 180 / 15%);
  --sidebar-active-glow: oklch(0.555 0.155 180 / 10%);
```

In `.dark` block, after existing sidebar variables, add:

```css
  /* Glass sidebar */
  --sidebar-glass: oklch(0.145 0.012 260 / 75%);
  --sidebar-glass-border: oklch(0.680 0.155 180 / 15%);
  --sidebar-active-glow: oklch(0.680 0.155 180 / 12%);
```

- [ ] **Step 1b: Register glass color tokens in `@theme inline`**

In the `@theme inline` block, after the existing `--color-sidebar-ring` line, add:

```css
  --color-sidebar-glass: var(--sidebar-glass);
  --color-sidebar-glass-border: var(--sidebar-glass-border);
  --color-sidebar-active-glow: var(--sidebar-active-glow);
```

This makes `border-sidebar-glass-border`, `bg-sidebar-glass`, etc. available as Tailwind utility classes.

- [ ] **Step 2: Add gradient animation keyframes and glass utility classes**

In `@layer components`, add after the existing `.glass` class:

```css
  .sidebar-glass {
    background: var(--sidebar-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid var(--sidebar-glass-border);
  }

  .header-glass {
    background: var(--sidebar-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--sidebar-glass-border);
  }

  .sidebar-gradient-line {
    background: linear-gradient(
      90deg,
      transparent,
      oklch(0.555 0.155 180 / 60%),
      oklch(0.546 0.245 262 / 40%),
      transparent
    );
    animation: gradient-shift 6s ease infinite;
    background-size: 200% 100%;
  }

  .dark .sidebar-gradient-line {
    background: linear-gradient(
      90deg,
      transparent,
      oklch(0.680 0.155 180 / 70%),
      oklch(0.650 0.200 262 / 50%),
      transparent
    );
    animation: gradient-shift 6s ease infinite;
    background-size: 200% 100%;
  }

  .nav-item-glow {
    box-shadow: 0 0 0 1px var(--sidebar-glass-border),
                0 0 20px -5px var(--sidebar-active-glow);
  }

  .header-gradient-border {
    background: linear-gradient(
      90deg,
      transparent,
      oklch(0.555 0.155 180 / 30%),
      oklch(0.546 0.245 262 / 20%),
      transparent
    );
  }

  .dark .header-gradient-border {
    background: linear-gradient(
      90deg,
      transparent,
      oklch(0.680 0.155 180 / 40%),
      oklch(0.650 0.200 262 / 30%),
      transparent
    );
  }
```

- [ ] **Step 3: Add keyframe animation at the end of the file (outside @layer)**

```css
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

- [ ] **Step 4: Verify build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/index.css
git commit -m "style(platform): add dark glass CSS variables and animations"
```

---

### Task 2: Create the Redesigned Sidebar Component

**Files:**
- Create: `sinaloka-platform/src/components/sidebar/Sidebar.tsx`

This extracts and redesigns the sidebar from Layout.tsx. Key changes:
- Glass background with animated gradient line at top
- Motion-powered staggered entrance animation for nav items
- Glass pill active state with glow effect
- Collapsible sections with animated chevrons
- Hover light sweep effect on items
- Smooth icon scale on collapse

- [ ] **Step 1: Create the sidebar directory**

Run: `mkdir -p sinaloka-platform/src/components/sidebar`

- [ ] **Step 2: Write the Sidebar component**

Create `sinaloka-platform/src/components/sidebar/Sidebar.tsx`:

```tsx
import { useState } from 'react';
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
  label: string; children: React.ReactNode; minimized: boolean;
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
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/sidebar/
git commit -m "feat(platform): add dark glass Sidebar component"
```

---

### Task 3: Create the Command Palette Component

**Files:**
- Create: `sinaloka-platform/src/components/header/CommandPalette.tsx`

A ⌘K / Ctrl+K search modal that replaces the basic search input. Shows recent pages, search results with icons, and keyboard navigation.

- [ ] **Step 1: Create header directory**

Run: `mkdir -p sinaloka-platform/src/components/header`

- [ ] **Step 2: Write the CommandPalette component**

Create `sinaloka-platform/src/components/header/CommandPalette.tsx`:

```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
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
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/header/
git commit -m "feat(platform): add command palette (Cmd+K) component"
```

---

### Task 4: Create the UserMenu Dropdown Component

**Files:**
- Create: `sinaloka-platform/src/components/header/UserMenu.tsx`

Replaces the plain avatar circle with a profile card dropdown showing user name, role, institution, and quick actions.

- [ ] **Step 1: Write the UserMenu component**

Create `sinaloka-platform/src/components/header/UserMenu.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/header/UserMenu.tsx
git commit -m "feat(platform): add UserMenu profile dropdown component"
```

---

### Task 5: Create the Redesigned Header Component

**Files:**
- Create: `sinaloka-platform/src/components/header/Header.tsx`

Enhanced glass header with gradient border bottom, command palette trigger, and profile dropdown.

- [ ] **Step 1: Write the Header component**

Create `sinaloka-platform/src/components/header/Header.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/header/Header.tsx
git commit -m "feat(platform): add dark glass Header with gradient border"
```

---

### Task 6: Wire Up New Components in Layout.tsx

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`

Replace inline header/sidebar/plan-widget with the new extracted components. Keep all routing logic, auth, state management in Layout.

- [ ] **Step 1: Rewrite Layout.tsx to use new components**

Replace the entire file content with:

```tsx
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

  const { mustChangePassword } = auth;

  useEffect(() => {
    if (mustChangePassword && !location.pathname.startsWith('/settings')) {
      navigate('/settings?tab=security');
    }
  }, [mustChangePassword, location.pathname, navigate]);

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
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/Layout.tsx
git commit -m "refactor(platform): wire new dark glass sidebar and header into Layout"
```

---

### Task 7: Update SuperAdminLayout with Shared Glass Styling

**Files:**
- Modify: `sinaloka-platform/src/components/SuperAdminLayout.tsx`

Apply the same dark glass styling to the SuperAdmin layout. Since SuperAdmin has fewer nav items and no plan widget, we keep it simpler — just apply the glass CSS classes and gradient line.

- [ ] **Step 1: Update SuperAdminLayout sidebar and header styling**

Replace the sidebar `<aside>` className from:
```
"border-r border-zinc-100 dark:border-zinc-800 flex flex-col fixed h-full bg-white dark:bg-zinc-950 z-20 transition-all duration-300"
```
to:
```
"sidebar-glass flex flex-col fixed h-full z-20 transition-all duration-300"
```

Add the gradient line right after `<aside>` opens (before the logo div):
```tsx
<div className="sidebar-gradient-line h-[2px] w-full shrink-0" />
```

Update the logo `<div>` from the plain square to gradient:
```tsx
<div className="w-9 h-9 bg-gradient-to-br from-zinc-800 to-zinc-600 dark:from-zinc-200 dark:to-zinc-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
  <div className="w-4 h-4 bg-white dark:bg-zinc-900 rounded-sm rotate-45" />
</div>
```

Replace the header `<header>` className from:
```
"h-16 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-8 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 transition-colors"
```
to:
```
"h-16 header-glass flex items-center justify-between px-6 sticky top-0 z-10 transition-colors"
```

Add gradient border line after `</header>`:
```tsx
<div className="header-gradient-border h-[1px] w-full" />
```

Update the SidebarItem active state from:
```
"bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
```
to:
```
"bg-sidebar-accent/80 text-foreground font-medium nav-item-glow"
```

And inactive from:
```
"text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
```
to:
```
"text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40"
```

Update avatar from plain circle to gradient:
```tsx
<div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-500 dark:from-zinc-300 dark:to-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold shadow-lg">
  {userInitials}
</div>
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/SuperAdminLayout.tsx
git commit -m "style(platform): apply dark glass styling to SuperAdminLayout"
```

---

### Task 8: Visual Verification

- [ ] **Step 1: Start dev server and visually verify**

Run: `cd sinaloka-platform && npm run dev`

Check these in both light and dark modes:
1. Sidebar has glass background with animated gradient line at top
2. Logo has gradient instead of flat color
3. Nav sections are collapsible with chevron animation
4. Active nav item has glass pill with glow
5. Hover shows light sweep effect
6. Header has glass background with gradient border line
7. ⌘K opens command palette with search and keyboard navigation
8. User avatar opens profile card dropdown with role badge
9. Sidebar collapse/expand transition is smooth
10. SuperAdmin layout has matching glass styling

- [ ] **Step 2: Test command palette keyboard shortcuts**

Verify: `Ctrl+K` opens palette, `Escape` closes, arrows navigate, `Enter` navigates to selected page.

- [ ] **Step 3: Final commit if any fixes needed**

If visual adjustments were needed, commit them:
```bash
git add -A
git commit -m "fix(platform): polish dark glass visual details"
```
