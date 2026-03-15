import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import type { ChildSummary } from '../types';
import { mapChild } from '../mappers';

export function useChildren() {
  const [data, setData] = useState<ChildSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/parent/children');
      setData(res.data.map(mapChild));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data anak');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  return { data, isLoading, error, refetch: fetchChildren };
}
