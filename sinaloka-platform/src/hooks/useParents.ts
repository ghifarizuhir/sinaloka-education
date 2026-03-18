import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentsService } from '@/src/services/parents.service';

export function useParents(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['parents', params],
    queryFn: () => parentsService.getAll(params),
  });
}

export function useInviteParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parentsService.invite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  });
}

export function useDeleteParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parentsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  });
}

export function useLinkStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parentsService.linkStudents,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  });
}

export function useUnlinkStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parentsService.unlinkStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  });
}
