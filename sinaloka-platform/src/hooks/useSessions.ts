import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService } from '@/src/services/sessions.service';
import type { SessionQueryParams, GenerateSessionsDto, ApproveRescheduleDto } from '@/src/types/session';

export function useSessions(params?: SessionQueryParams) {
  return useQuery({ queryKey: ['sessions', params], queryFn: () => sessionsService.getAll(params) });
}
export function useSession(id: string | null) {
  return useQuery({ queryKey: ['sessions', id], queryFn: () => sessionsService.getById(id!), enabled: !!id });
}
export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sessionsService.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}
export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sessionsService.update, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}
export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sessionsService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}
export function useGenerateSessions() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: GenerateSessionsDto) => sessionsService.generate(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}
export function useApproveReschedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: ApproveRescheduleDto }) => sessionsService.approveReschedule({ id, data }), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}
