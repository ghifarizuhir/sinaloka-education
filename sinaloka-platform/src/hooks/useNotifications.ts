import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/src/services/notifications.service';
import { getAccessToken } from '@/src/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useNotifications(params?: { page?: number; limit?: number; type?: string; unread?: boolean }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsService.getAll(params),
  });
}

export function useUnreadCount() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 60000,
  });
  return { ...query, queryClient };
}

export function useNotificationSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(1000);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const url = `${API_URL}/api/notifications/stream?token=${token}`;
    const es = new EventSource(url);
    es.onopen = () => {
      retryDelayRef.current = 1000;
    };
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      timeoutRef.current = setTimeout(connect, retryDelayRef.current);
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, 60000);
    };
    eventSourceRef.current = es;
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
