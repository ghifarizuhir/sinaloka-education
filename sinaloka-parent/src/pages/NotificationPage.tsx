import React from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface NotificationPageProps {
  onNavigateToChild: (studentId: string, tab?: string) => void;
}

export function NotificationPage({ onNavigateToChild }: NotificationPageProps) {
  const { notifications, isLoading, error, hasMore, loadMore, refresh, markAsRead, markAllAsRead } = useNotifications();

  const handleTap = async (notification: (typeof notifications)[0]) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    if (notification.data?.studentId) {
      onNavigateToChild(notification.data.studentId, 'payments');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        {notifications.some((n) => !n.read_at) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-lime-400 transition-colors hover:text-lime-300"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {error && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <p className="text-sm font-medium">Gagal memuat notifikasi</p>
          <button onClick={refresh} className="mt-3 flex items-center gap-1.5 text-xs text-lime-400 hover:text-lime-300">
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        </div>
      ) : isLoading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <Bell className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada notifikasi</p>
          <button onClick={refresh} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleTap(notification)}
                className={cn(
                  'w-full text-left bg-zinc-900 border rounded-xl p-4 transition-all',
                  notification.read_at
                    ? 'border-zinc-800 opacity-60'
                    : 'border-lime-400/20 bg-lime-400/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-1 w-2 h-2 rounded-full shrink-0',
                    notification.read_at ? 'bg-transparent' : 'bg-lime-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{notification.body}</p>
                    <p className="text-[10px] text-zinc-600 mt-1.5">{timeAgo(notification.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Muat lebih banyak
            </button>
          )}
        </>
      )}
    </div>
  );
}
