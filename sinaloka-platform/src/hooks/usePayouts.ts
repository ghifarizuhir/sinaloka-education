import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payoutsService } from '@/src/services/payouts.service';
import type { PayoutQueryParams } from '@/src/types/payout';

export function usePayouts(params?: PayoutQueryParams) {
  return useQuery({ queryKey: ['payouts', params], queryFn: () => payoutsService.getAll(params) });
}
export function usePayout(id: string) {
  return useQuery({ queryKey: ['payouts', id], queryFn: () => payoutsService.getById(id), enabled: !!id });
}
export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: payoutsService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payouts'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useUpdatePayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: payoutsService.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payouts'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useDeletePayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: payoutsService.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payouts'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useCalculatePayout() {
  return useMutation({
    mutationFn: payoutsService.calculatePayout,
  });
}
export function useGenerateSalaries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutsService.generateSalaries,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payouts'] }); },
  });
}
