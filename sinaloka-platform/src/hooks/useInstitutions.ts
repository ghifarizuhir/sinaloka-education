import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionsService } from '@/src/services/institutions.service';

export function useInstitutions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['institutions', params],
    queryFn: () => institutionsService.getAll(params),
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institutions', id],
    queryFn: () => institutionsService.getById(id),
    enabled: !!id,
  });
}

export function useInstitutionSummary(id: string) {
  return useQuery({
    queryKey: ['institutions', id, 'summary'],
    queryFn: () => institutionsService.getSummary(id),
    enabled: !!id,
  });
}

export function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: institutionsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: institutionsService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}
