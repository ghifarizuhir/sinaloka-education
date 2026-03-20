import { useState, useEffect, useCallback } from 'react';
import api, { getAccessToken } from '../api/client';
import type { Payout } from '../types';
import { mapPayout } from '../mappers';

export function usePayouts() {
  const [data, setData] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/tutor/payouts', { params: { limit: '100' } });
      setData(res.data.data.map(mapPayout));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data payout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  return { data, isLoading, error, refetch: fetchPayouts };
}
