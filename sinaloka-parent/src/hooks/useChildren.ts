import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import { useAuth } from './useAuth';
import type { ChildSummary } from '../types';
import { mapChild } from '../mappers';

export function useChildren() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<ChildSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/parent/children');
      setData(res.data.map(mapChild));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data anak');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchChildren();
  }, [isAuthenticated, fetchChildren]);

  return { data, isLoading, error, refetch: fetchChildren };
}
