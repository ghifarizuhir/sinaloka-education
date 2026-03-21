import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '../services/subscription.service';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CreatePaymentRequest } from '../types/subscription';

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['subscription-status'],
    queryFn: subscriptionService.getStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: subscriptionService.getInvoices,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => subscriptionService.createPayment(data),
    onSuccess: () => {
      toast.success(t('subscription.paymentCreated'));
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
    },
    onError: () => {
      toast.error(t('subscription.paymentFailed'));
    },
  });
}

export function useSubscriptionList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['admin-subscriptions', params],
    queryFn: () => subscriptionService.listSubscriptions(params),
  });
}

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ['admin-subscription-stats'],
    queryFn: subscriptionService.getStats,
  });
}

export function useOverrideSubscription() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      subscriptionService.overrideSubscription(id, data),
    onSuccess: () => {
      toast.success(t('subscription.overrideSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
    },
    onError: () => {
      toast.error(t('subscription.overrideFailed'));
    },
  });
}

export function useSubscriptionPayments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['admin-subscription-payments', params],
    queryFn: () => subscriptionService.listPayments(params),
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      action: 'approve' | 'reject';
      notes?: string;
    }) => subscriptionService.confirmPayment(id, data),
    onSuccess: () => {
      toast.success(t('subscription.paymentConfirmed'));
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: () => {
      toast.error(t('subscription.paymentConfirmFailed'));
    },
  });
}
