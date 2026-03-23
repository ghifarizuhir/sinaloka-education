import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogOut, ChevronRight, Shield, Smartphone } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { cn } from '../lib/utils';
import { getInitials, getAvatarColor } from '../lib/avatar';
import type { ParentProfile } from '../types';

interface ProfilePageProps {
  profile: ParentProfile | null;
  onLogout: () => Promise<void>;
}

export function ProfilePage({ profile, onLogout }: ProfilePageProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const name = profile?.name ?? 'Orang Tua';
  const email = profile?.email ?? '';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await onLogout();
    setIsLoggingOut(false);
    setShowLogoutConfirm(false);
  };

  const menuItems = [
    { icon: Shield, label: 'Keamanan Akun', sub: 'Password & autentikasi', disabled: true },
    { icon: Smartphone, label: 'Tentang Aplikasi', sub: 'Sinaloka Parent v1.0', disabled: true },
  ];

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Profil</h1>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4"
      >
        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0", getAvatarColor(name))}>
          {getInitials(name)}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </motion.div>

      {/* Menu items */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              {i > 0 && <div className="border-t border-border mx-4" />}
              <button
                disabled={item.disabled}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Logout button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => setShowLogoutConfirm(true)}
        disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-4 text-destructive font-semibold transition-all hover:bg-destructive-muted active:scale-[0.98] shadow-sm disabled:opacity-50"
      >
        <LogOut className="w-5 h-5" />
        {isLoggingOut ? 'Keluar...' : 'Keluar'}
      </motion.button>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Keluar dari Sinaloka?"
        message="Anda perlu login kembali untuk mengakses data anak Anda."
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
