import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planService } from '../services/plan.service';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function usePlan() {
  return useQuery({
    queryKey: ['plan'],
    queryFn: planService.getPlan,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRequestUpgrade() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: planService.requestUpgrade,
    onSuccess: () => {
      toast.success(t('plan.upgradeRequestSent'));
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
    onError: () => {
      toast.error(t('plan.upgradeRequestFailed'));
    },
  });
}

export function useUpgradeRequests(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['upgrade-requests', params],
    queryFn: () => planService.getUpgradeRequests(params),
  });
}

export function useReviewUpgradeRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: 'APPROVED' | 'REJECTED'; review_notes?: string }) =>
      planService.reviewUpgradeRequest(id, data),
    onSuccess: () => {
      toast.success(t('plan.reviewSuccess'));
      queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] });
    },
    onError: () => {
      toast.error(t('plan.reviewFailed'));
    },
  });
}

export function useUpdateInstitutionPlan() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ institutionId, ...data }: { institutionId: string; plan_type: string }) =>
      planService.updateInstitutionPlan(institutionId, data),
    onSuccess: () => {
      toast.success(t('plan.planUpdated'));
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: () => {
      toast.error(t('plan.planUpdateFailed'));
    },
  });
}
