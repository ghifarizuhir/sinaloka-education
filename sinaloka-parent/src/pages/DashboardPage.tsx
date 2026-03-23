import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Users, CreditCard, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ChildCard } from '../components/ChildCard';
import { ErrorState } from '../components/ErrorState';
import { cn } from '../lib/utils';
import type { ChildSummary } from '../types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getGreetingIcon(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return '☀️';
  if (hour >= 11 && hour < 15) return '🌤️';
  if (hour >= 15 && hour < 18) return '🌅';
  return '🌙';
}

interface DashboardPageProps {
  firstName: string;
  children: ChildSummary[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectChild: (id: string) => void;
}

export function DashboardPage({ firstName, children, isLoading, error, onRetry, onSelectChild }: DashboardPageProps) {
  const totalPending = children.reduce((acc, c) => acc + c.pending_payments + c.overdue_payments, 0);
  const todayFormatted = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId });

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isLoading && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isLoading, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance > 40 && onRetry) {
      setIsRefreshing(true);
      setPullDistance(0);
      await onRetry();
      setIsRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRetry]);

  return (
    <div
      className="space-y-6 pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          {isRefreshing ? 'Memperbarui...' : pullDistance > 40 ? 'Lepas untuk refresh' : 'Tarik untuk refresh'}
        </div>
      )}

      {/* Greeting card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-primary/10 p-6"
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-primary/8" />

        <div className="relative">
          <p className="text-sm text-muted-foreground font-medium">{getGreetingIcon()} {getGreeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{firstName}!</h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{todayFormatted}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-primary p-4 rounded-xl text-primary-foreground shadow-sm"
        >
          <Users className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold tracking-tight">{children.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Anak Terdaftar</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-card border border-border p-4 rounded-xl text-foreground shadow-sm"
        >
          <CreditCard className={cn("w-5 h-5 mb-2", totalPending > 0 ? "text-warning" : "text-success")} />
          <p className={cn("text-2xl font-bold tracking-tight", totalPending > 0 ? "text-warning" : "text-success")}>
            {totalPending > 0 ? totalPending : '0'}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {totalPending > 0 ? 'Tagihan Aktif' : 'Semua Lunas'}
          </p>
        </motion.div>
      </div>

      {/* Children list */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">Anak Anda</h2>
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-card rounded-xl h-28 skeleton-shimmer shadow-sm" />)}
          </div>
        ) : children.length > 0 ? (
          children.map((child, index) => (
            <React.Fragment key={child.id}>
              <ChildCard child={child} onSelect={onSelectChild} index={index} />
            </React.Fragment>
          ))
        ) : (
          <div className="bg-muted border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Belum ada data anak terhubung.</p>
          </div>
        )}
      </div>
    </div>
  );
}
