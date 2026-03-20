import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationService } from '../services/registration.service';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useRegistrations(params?: { type?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['registrations', params],
    queryFn: () => registrationService.getRegistrations(params),
  });
}

export function useRegistration(id: string) {
  return useQuery({
    queryKey: ['registration', id],
    queryFn: () => registrationService.getRegistration(id),
  });
}

export function usePendingRegistrationCount() {
  return useQuery({
    queryKey: ['registrations', 'count'],
    queryFn: registrationService.getPendingCount,
    staleTime: 60 * 1000, // 60 seconds
  });
}

export function useApproveRegistration() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => registrationService.approveRegistration(id),
    onSuccess: () => {
      toast.success(t('registration.approveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: () => {
      toast.error(t('registration.approveFailed'));
    },
  });
}

export function useRejectRegistration() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      registrationService.rejectRegistration(id, reason),
    onSuccess: () => {
      toast.success(t('registration.rejectSuccess'));
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: () => {
      toast.error(t('registration.rejectFailed'));
    },
  });
}

export function useRegistrationSettings() {
  return useQuery({
    queryKey: ['settings', 'registration'],
    queryFn: registrationService.getRegistrationSettings,
  });
}

export function useUpdateRegistrationSettings() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: registrationService.updateRegistrationSettings,
    onSuccess: () => {
      toast.success(t('registration.settingsUpdated'));
      queryClient.invalidateQueries({ queryKey: ['settings', 'registration'] });
    },
    onError: () => {
      toast.error(t('registration.settingsFailed'));
    },
  });
}
