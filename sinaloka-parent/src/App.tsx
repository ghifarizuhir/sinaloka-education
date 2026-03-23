import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChildDetailPage } from './pages/ChildDetailPage';
import { PaymentRedirectPage } from './pages/PaymentRedirectPage';
import { NotificationPage } from './pages/NotificationPage';
import { BillsPage } from './pages/BillsPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuth } from './hooks/useAuth';
import { useChildren } from './hooks/useChildren';
import { useUnreadCount } from './hooks/useNotifications';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: children, isLoading: childrenLoading, error: childrenError, refetch: refetchChildren } = useChildren();
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
      return <RegisterPage inviteToken={inviteToken} onSwitchToLogin={() => { window.history.replaceState({}, '', window.location.pathname); setAuthScreen('login'); }} />;
    }
    if (authScreen === 'forgot') {
      return <ForgotPasswordPage onBack={() => setAuthScreen('login')} />;
    }
    return <LoginPage onForgotPassword={() => setAuthScreen('forgot')} />;
  }

  const parentName = profile?.name ?? 'Orang Tua';
  const firstName = parentName.split(' ')[0];
  const selectedChild = selectedChildId ? children.find((c) => c.id === selectedChildId) ?? null : null;
  const totalPendingBills = children.reduce((acc, c) => acc + c.pending_payments + c.overdue_payments, 0);

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
            error={childrenError}
            onRetry={refetchChildren}
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
      case 'bills':
        return (
          <BillsPage
            children={children}
            isLoading={childrenLoading}
            onNavigateToChild={handleNavigateToChild}
          />
        );
      case 'profile':
        return <ProfilePage profile={profile} onLogout={logout} />;
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

      {!selectedChild && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); if (tab === 'notifications') refreshUnread(); }}
          unreadCount={unreadCount}
          pendingBills={totalPendingBills}
        />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          className: 'font-sans',
          style: {
            background: 'color-mix(in oklch, var(--color-card) 92%, transparent)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-foreground)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: '500',
          },
        }}
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
