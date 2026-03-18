import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsService } from '@/src/services/payments.service';
import type { PaymentQueryParams } from '@/src/types/payment';

export function usePayments(params?: PaymentQueryParams) {
  return useQuery({ queryKey: ['payments', params], queryFn: () => paymentsService.getAll(params) });
}
export function usePayment(id: string) {
  return useQuery({ queryKey: ['payments', id], queryFn: () => paymentsService.getById(id), enabled: !!id });
}
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: paymentsService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: paymentsService.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: paymentsService.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useOverdueSummary() {
  return useQuery({
    queryKey: ['payments', 'overdue-summary'],
    queryFn: paymentsService.getOverdueSummary,
  });
}
export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.generateInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
