import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useUnreadCount, useNotificationSSE } from '@/src/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadCount();

  useNotificationSSE();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell size={20} />
        {unreadCount != null && unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
}
