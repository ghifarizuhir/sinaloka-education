import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/src/services/settings.service';
import type { UpdateGeneralSettingsDto, UpdateBillingSettingsDto } from '@/src/types/settings';

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['settings', 'general'],
    queryFn: settingsService.getGeneral,
  });
}

export function useUpdateGeneralSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGeneralSettingsDto) => settingsService.updateGeneral(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'general'] });
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useBillingSettings() {
  return useQuery({
    queryKey: ['settings', 'billing'],
    queryFn: settingsService.getBilling,
  });
}

export function useUpdateBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBillingSettingsDto) => settingsService.updateBilling(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'billing'] }),
  });
}
