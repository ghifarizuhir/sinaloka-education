import React from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifikasi</h1>
        {notifications.some((n) => !n.read_at) && (
          <button
            onClick={async () => {
              try {
                await markAllAsRead();
                toast.success('Semua notifikasi ditandai dibaca');
              } catch {
                toast.error('Gagal menandai notifikasi');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {error && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">Gagal memuat notifikasi</p>
          <button onClick={refresh} className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        </div>
      ) : isLoading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl h-20 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada notifikasi</p>
          <button onClick={refresh} className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
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
                  'w-full text-left bg-card border rounded-xl p-4 transition-all shadow-sm',
                  notification.read_at
                    ? 'border-border opacity-60'
                    : 'border-primary/20 bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-1 w-2 h-2 rounded-full shrink-0',
                    notification.read_at ? 'bg-transparent' : 'bg-primary'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notification.body}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">{timeAgo(notification.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Muat lebih banyak
            </button>
          )}
        </>
      )}
    </div>
  );
}
