import { type ElementType } from 'react';
import { DollarSign, UserPlus, Users, Calendar, CalendarX, ClipboardCheck, UserCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Notification } from '@/src/services/notifications.service';

const ICON_MAP: Record<string, { icon: ElementType; color: string; bg: string }> = {
  'payment.received': { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  'student.registered': { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'parent.registered': { icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'session.created': { icon: Calendar, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  'session.cancelled': { icon: CalendarX, color: 'text-red-500', bg: 'bg-red-500/10' },
  'attendance.submitted': { icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'tutor.invite_accepted': { icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const iconConfig = ICON_MAP[notification.type] ?? { icon: UserPlus, color: 'text-zinc-500', bg: 'bg-zinc-500/10' };
  const Icon = iconConfig.icon;
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={() => onClick?.(notification)}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
        isUnread && 'bg-blue-500/5',
      )}
    >
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', iconConfig.bg)}>
        <Icon size={16} className={iconConfig.color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', isUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {notification.body}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(notification.created_at)}</p>
      </div>
      {isUnread && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
    </button>
  );
}
