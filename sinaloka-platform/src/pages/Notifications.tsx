import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/src/hooks/useNotifications';
import { Notification } from '@/src/services/notifications.service';
import NotificationItem from '@/src/components/notifications/NotificationItem';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All' },
  { value: 'payment.received', label: 'Payments' },
  { value: 'student.registered', label: 'Students' },
  { value: 'parent.registered', label: 'Parents' },
  { value: 'session.created', label: 'Sessions' },
  { value: 'session.cancelled', label: 'Cancelled Sessions' },
  { value: 'attendance.submitted', label: 'Attendance' },
  { value: 'tutor.invite_accepted', label: 'Tutors' },
];

const DEEP_LINK_MAP: Record<string, (data: Record<string, unknown>) => string> = {
  'payment.received': (d) => `/finance/payments/${d.paymentId}`,
  'student.registered': (d) => `/students/${d.studentId}`,
  'parent.registered': (d) => `/students/${d.parentId}`,
  'session.created': (d) => `/schedules/${d.sessionId}`,
  'session.cancelled': (d) => `/schedules/${d.sessionId}`,
  'attendance.submitted': (d) => `/schedules/${d.sessionId}`,
  'tutor.invite_accepted': (d) => `/tutors/${d.tutorId}`,
};

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useNotifications({
    page,
    limit: 20,
    type: type || undefined,
    unread: unreadOnly || undefined,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleClick = (notification: Notification) => {
    if (!notification.read_at) markAsRead.mutate(notification.id);
    const linkFn = DEEP_LINK_MAP[notification.type];
    if (linkFn && notification.data) navigate(linkFn(notification.data as Record<string, unknown>));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('notifications', 'Notifications')}</h1>
        <button
          onClick={() => markAllAsRead.mutate()}
          className="text-sm text-primary hover:underline"
          disabled={markAllAsRead.isPending}
        >
          Mark all as read
        </button>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {NOTIFICATION_TYPES.map((nt) => (
            <option key={nt.value} value={nt.value}>{nt.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
            className="rounded border-input"
          />
          Unread only
        </label>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : data?.data && data.data.length > 0 ? (
          <div className="divide-y divide-border">
            {data.data.map((n) => (
              <div key={n.id}>
                <NotificationItem notification={n} onClick={handleClick} />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications found</div>
        )}
      </div>
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
            disabled={page >= data.meta.totalPages}
            className="rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
