import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '@/src/services/whatsapp.service';
import type { WhatsappMessageQueryParams, WhatsappSettings } from '@/src/types/whatsapp';

export function useWhatsappMessages(params?: WhatsappMessageQueryParams) {
  return useQuery({ queryKey: ['whatsapp-messages', params], queryFn: () => whatsappService.getMessages(params) });
}
export function useWhatsappStats() {
  return useQuery({ queryKey: ['whatsapp-stats'], queryFn: () => whatsappService.getStats() });
}
export function useWhatsappSettings() {
  return useQuery({ queryKey: ['whatsapp-settings'], queryFn: () => whatsappService.getSettings() });
}
export function useUpdateWhatsappSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WhatsappSettings>) => whatsappService.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-settings'] }),
  });
}
export function useSendPaymentReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => whatsappService.sendPaymentReminder(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-stats'] });
    },
  });
}
export function useWhatsappTemplate(name: string) {
  return useQuery({
    queryKey: ['whatsapp-template', name],
    queryFn: () => whatsappService.getTemplate(name),
  });
}
export function useUpdateWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: string }) => whatsappService.updateTemplate(name, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-template'] }),
  });
}
export function useDeleteWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => whatsappService.deleteTemplate(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-template'] }),
  });
}
