import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChildDetailPage } from './pages/ChildDetailPage';
import { useAuth } from './hooks/useAuth';
import { useChildren } from './hooks/useChildren';
import { LogOut } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: children, isLoading: childrenLoading } = useChildren();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Check URL for invite token (only way to access registration)
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('token');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Registration only accessible via invite link (URL with ?token=)
    if (inviteToken) {
      return <RegisterPage inviteToken={inviteToken} onSwitchToLogin={() => window.history.replaceState({}, '', window.location.pathname)} />;
    }
    return <LoginPage />;
  }

  const parentName = profile?.name ?? 'Orang Tua';
  const firstName = parentName.split(' ')[0];
  const selectedChild = selectedChildId ? children.find((c) => c.id === selectedChildId) ?? null : null;

  const renderPage = () => {
    if (selectedChild) {
      return <ChildDetailPage child={selectedChild} onBack={() => setSelectedChildId(null)} />;
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
      case 'children':
        return (
          <div className="space-y-4 pb-24">
            <h1 className="text-2xl font-bold tracking-tight">Anak Anda</h1>
            {childrenLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="bg-zinc-900 rounded-xl h-28 animate-pulse" />)}</div>
            ) : (
              children.map((child) => (
                <div key={child.id}>
                  <div className="cursor-pointer" onClick={() => setSelectedChildId(child.id)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                      <h3 className="font-semibold text-white">{child.name}</h3>
                      <p className="text-zinc-500 text-xs">Kelas {child.grade} · Kehadiran {child.attendance_rate}%</p>
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
            <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white">{profile?.name}</h2>
              <p className="text-zinc-500 text-sm">{profile?.email}</p>
            </div>
            <button onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl py-4 text-red-400 font-semibold transition-all hover:bg-red-500/10">
              <LogOut className="w-5 h-5" /> Keluar
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-lime-400 selection:text-black overflow-x-hidden">
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

      {!selectedChild && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
