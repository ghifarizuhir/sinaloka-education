import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/src/hooks/useNotifications';
import { Notification } from '@/src/services/notifications.service';
import NotificationItem from './NotificationItem';

const DEEP_LINK_MAP: Record<string, (data: Record<string, unknown>) => string> = {
  'payment.received': (d) => `/finance/payments/${d.paymentId}`,
  'student.registered': (d) => `/students/${d.studentId}`,
  'parent.registered': (d) => `/students/${d.parentId}`,
  'session.created': (d) => `/schedules/${d.sessionId}`,
  'session.cancelled': (d) => `/schedules/${d.sessionId}`,
  'attendance.submitted': (d) => `/schedules/${d.sessionId}`,
  'tutor.invite_accepted': (d) => `/tutors/${d.tutorId}`,
};

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const { data } = useNotifications({ limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleClick = (notification: Notification) => {
    if (!notification.read_at) markAsRead.mutate(notification.id);
    const linkFn = DEEP_LINK_MAP[notification.type];
    if (linkFn && notification.data) navigate(linkFn(notification.data as Record<string, unknown>));
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] rounded-lg border border-border bg-popover shadow-lg z-50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <button
          onClick={() => markAllAsRead.mutate()}
          className="text-xs text-primary hover:underline"
          disabled={markAllAsRead.isPending}
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {data?.data && data.data.length > 0 ? (
          data.data.map((n) => (
            <div key={n.id}>
              <NotificationItem notification={n} onClick={handleClick} />
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
        )}
      </div>
      <div className="border-t border-border p-2 text-center">
        <button
          onClick={() => { navigate('/notifications'); onClose(); }}
          className="text-sm text-primary hover:underline"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
