import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tutorsService } from '@/src/services/tutors.service';
import type { TutorQueryParams } from '@/src/types/tutor';

export function useTutors(params?: TutorQueryParams) {
  return useQuery({ queryKey: ['tutors', params], queryFn: () => tutorsService.getAll(params) });
}
export function useTutor(id: string) {
  return useQuery({ queryKey: ['tutors', id], queryFn: () => tutorsService.getById(id), enabled: !!id });
}
export function useCreateTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useUpdateTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.update, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useDeleteTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useInviteTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.invite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.resendInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.cancelInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkVerifyTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkVerify, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkDeleteTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkDelete, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkResendInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkResendInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useBulkCancelInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.bulkCancelInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
