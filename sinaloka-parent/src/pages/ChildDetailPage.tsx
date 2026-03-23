import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useChildDetail } from '../hooks/useChildDetail';
import { AttendanceList } from '../components/AttendanceList';
import { SessionList } from '../components/SessionList';
import { PaymentList } from '../components/PaymentList';
import { EnrollmentList } from '../components/EnrollmentList';
import type { ChildSummary } from '../types';
import { cn } from '../lib/utils';
import { getInitials, getAvatarColor } from '../lib/avatar';

interface ChildDetailPageProps {
  child: ChildSummary;
  onBack: () => void;
  initialTab?: 'attendance' | 'sessions' | 'payments' | 'enrollments';
}

const TABS = [
  { id: 'attendance' as const, label: 'Kehadiran' },
  { id: 'sessions' as const, label: 'Sesi' },
  { id: 'payments' as const, label: 'Bayar' },
  { id: 'enrollments' as const, label: 'Kelas' },
];

export function ChildDetailPage({ child, onBack, initialTab }: ChildDetailPageProps) {
  const {
    attendance, attendanceSummary, sessions, payments, enrollments,
    isLoading, activeTab, setActiveTab,
    fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
    lastFetchedAt, refresh, errors,
  } = useChildDetail(child.id, initialTab);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isPulling = useRef(false);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;

    if (window.scrollY === 0 && !isLoading && !isRefreshing) {
      isPulling.current = true;
    }
  }, [isLoading, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Pull-to-refresh (vertical)
    if (isPulling.current && !isSwiping.current && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      setPullDistance(Math.min(dy * 0.5, 80));
      return;
    }

    // Horizontal swipe detection
    if (!isSwiping.current && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      isSwiping.current = true;
      isPulling.current = false;
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;

    // Swipe gesture
    if (isSwiping.current && Math.abs(dx) > 50) {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      if (dx < 0 && currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1].id);
      } else if (dx > 0 && currentIndex > 0) {
        setActiveTab(TABS[currentIndex - 1].id);
      }
    }

    // Pull-to-refresh
    if (isPulling.current) {
      isPulling.current = false;
      if (pullDistance > 40) {
        setIsRefreshing(true);
        setPullDistance(0);
        await refresh();
        setIsRefreshing(false);
      } else {
        setPullDistance(0);
      }
    }

    isSwiping.current = false;
  }, [pullDistance, refresh, activeTab, setActiveTab]);

  const [minutesAgo, setMinutesAgo] = useState(0);

  useEffect(() => {
    if (!lastFetchedAt) return;
    const update = () => {
      setMinutesAgo(Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  const isStale = minutesAgo >= 5;

  useEffect(() => {
    switch (activeTab) {
      case 'attendance': fetchAttendance(); break;
      case 'sessions': fetchSessions(); break;
      case 'payments': fetchPayments(); break;
      case 'enrollments': fetchEnrollments(); break;
    }
  }, [activeTab, fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments]);

  return (
    <div
      className="pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Header with avatar */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0", getAvatarColor(child.name))}>
          {getInitials(child.name)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{child.name}</h1>
          <p className="text-muted-foreground text-xs">Kelas {child.grade} · {child.enrollment_count} mata pelajaran</p>
        </div>
      </div>

      {/* Tabs with animated indicator */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="relative px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors"
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="child-tab-indicator"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className={cn("relative z-10", activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground")}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center py-3 text-muted-foreground text-xs">
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          {isRefreshing ? 'Memperbarui...' : pullDistance > 40 ? 'Lepas untuk refresh' : 'Tarik untuk refresh'}
        </div>
      )}

      {/* Stale banner */}
      {isStale && !isRefreshing && (
        <div className="flex items-center justify-between bg-muted border border-border rounded-lg px-3 py-2 mb-4">
          <span className="text-muted-foreground text-xs">Diperbarui {minutesAgo} menit lalu</span>
          <button onClick={async () => { setIsRefreshing(true); await refresh(); setIsRefreshing(false); }}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      {isLoading && !isRefreshing ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-card rounded-lg h-16 skeleton-shimmer shadow-sm" />)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'attendance' && <AttendanceList data={attendance} summary={attendanceSummary} error={errors.attendance} onRetry={fetchAttendance} />}
            {activeTab === 'sessions' && <SessionList data={sessions} error={errors.sessions} onRetry={fetchSessions} />}
            {activeTab === 'payments' && <PaymentList data={payments} error={errors.payments} onRetry={fetchPayments} />}
            {activeTab === 'enrollments' && <EnrollmentList data={enrollments} error={errors.enrollments} onRetry={fetchEnrollments} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
