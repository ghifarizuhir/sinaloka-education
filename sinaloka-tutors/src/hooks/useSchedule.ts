import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import type { ClassSchedule } from '../types';
import { mapSession } from '../mappers';

type ScheduleFilter = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | undefined;

export function useSchedule(initialFilter?: ScheduleFilter) {
  const [data, setData] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>(initialFilter);

  const fetchSchedule = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (activeFilter) params.status = activeFilter;
      const res = await api.get('/tutor/schedule', { params });
      setData(res.data.data.map(mapSession));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat jadwal');
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const cancelSession = useCallback(async (id: string) => {
    // Optimistic update
    setData((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'cancelled' as const } : s)),
    );
    try {
      await api.patch(`/tutor/schedule/${id}/cancel`);
    } catch (err: any) {
      // Revert
      await fetchSchedule();
      throw err;
    }
  }, [fetchSchedule]);

  const requestReschedule = useCallback(async (
    id: string,
    dto: { proposed_date: string; proposed_start_time: string; proposed_end_time: string; reschedule_reason: string },
  ) => {
    await api.patch(`/tutor/schedule/${id}/request-reschedule`, dto);
    await fetchSchedule();
  }, [fetchSchedule]);

  return {
    data,
    isLoading,
    error,
    activeFilter,
    setFilter: setActiveFilter,
    refetch: fetchSchedule,
    cancelSession,
    requestReschedule,
  };
}
