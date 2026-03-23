import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '../api/notifications';
import type { Notification } from '../types';

const POLL_INTERVAL_MS = 60_000;

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const result = await notificationApi.getUnreadCount();
      setCount(result);
    } catch {
      // Silent retry at next interval
    }
  }, []);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  return { count, refresh: fetch };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetch = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(false);
    try {
      const result = await notificationApi.getAll(pageNum);
      if (pageNum === 1) {
        setNotifications(result.data);
      } else {
        setNotifications((prev) => [...prev, ...result.data]);
      }
      setHasMore(pageNum < result.meta.totalPages);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(1);
  }, [fetch]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetch(nextPage);
  }, [page, fetch]);

  const refresh = useCallback(() => {
    setPage(1);
    fetch(1);
  }, [fetch]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
    } catch {
      // Silent fail — notification stays unread visually
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
    } catch {
      // Silent fail — notifications stay unread visually
    }
  }, []);

  return { notifications, isLoading, error, hasMore, loadMore, refresh, markAsRead, markAllAsRead };
}
