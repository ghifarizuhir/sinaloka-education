import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChildDetailPage } from './pages/ChildDetailPage';
import { PaymentRedirectPage } from './pages/PaymentRedirectPage';
import { NotificationPage } from './pages/NotificationPage';
import { useAuth } from './hooks/useAuth';
import { useChildren } from './hooks/useChildren';
import { useUnreadCount } from './hooks/useNotifications';
import { LogOut } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: children, isLoading: childrenLoading } = useChildren();
  const { count: unreadCount, refresh: refreshUnread } = useUnreadCount();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot'>('login');
  const [selectedChildTab, setSelectedChildTab] = useState<string | undefined>();

  // Check URL params for invite token or reset token
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('token');
  const resetToken = urlParams.get('reset_token');

  // Midtrans payment redirect pages
  const path = window.location.pathname;
  if (path === '/payment/finish' || path === '/payment/unfinish' || path === '/payment/error') {
    const status = path.split('/').pop() as 'finish' | 'unfinish' | 'error';
    return (
      <PaymentRedirectPage
        status={status}
        onBack={() => {
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (resetToken) {
      return <ResetPasswordPage token={resetToken} onBack={() => { window.history.replaceState({}, '', window.location.pathname); setAuthScreen('login'); }} />;
    }
    if (inviteToken) {
      return <RegisterPage inviteToken={inviteToken} onSwitchToLogin={() => window.history.replaceState({}, '', window.location.pathname)} />;
    }
    if (authScreen === 'forgot') {
      return <ForgotPasswordPage onBack={() => setAuthScreen('login')} />;
    }
    return <LoginPage onForgotPassword={() => setAuthScreen('forgot')} />;
  }

  const parentName = profile?.name ?? 'Orang Tua';
  const firstName = parentName.split(' ')[0];
  const selectedChild = selectedChildId ? children.find((c) => c.id === selectedChildId) ?? null : null;

  const handleNavigateToChild = (studentId: string, tab?: string) => {
    setSelectedChildId(studentId);
    setSelectedChildTab(tab);
  };

  const renderPage = () => {
    if (selectedChild) {
      return <ChildDetailPage child={selectedChild} onBack={() => { setSelectedChildId(null); setSelectedChildTab(undefined); }} initialTab={selectedChildTab as any} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            firstName={firstName}
            children={children}
            isLoading={childrenLoading}
            onSelectChild={setSelectedChildId}
          />
        );
      case 'notifications':
        return (
          <NotificationPage
            onNavigateToChild={(studentId, tab) => {
              handleNavigateToChild(studentId, tab);
              refreshUnread();
            }}
          />
        );
      case 'children':
        return (
          <div className="space-y-4 pb-24">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Anak Anda</h1>
            {childrenLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="bg-card rounded-xl h-28 animate-pulse shadow-sm" />)}</div>
            ) : (
              children.map((child) => (
                <div key={child.id}>
                  <div className="cursor-pointer" onClick={() => setSelectedChildId(child.id)}>
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                      <h3 className="font-semibold text-foreground">{child.name}</h3>
                      <p className="text-muted-foreground text-xs">Kelas {child.grade} · Kehadiran {child.attendance_rate}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6 pb-24">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Profil</h1>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{profile?.name}</h2>
              <p className="text-muted-foreground text-sm">{profile?.email}</p>
            </div>
            <button onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-4 text-destructive font-semibold transition-all hover:bg-destructive-muted shadow-sm">
              <LogOut className="w-5 h-5" /> Keluar
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChildId ? `child-${selectedChildId}` : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!selectedChild && <BottomNav activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); if (tab === 'notifications') refreshUnread(); }} unreadCount={unreadCount} />}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
