import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsService } from '@/src/services/enrollments.service';
import type { EnrollmentQueryParams, CheckConflictDto } from '@/src/types/enrollment';

export function useEnrollments(params?: EnrollmentQueryParams) {
  return useQuery({ queryKey: ['enrollments', params], queryFn: () => enrollmentsService.getAll(params) });
}
export function useEnrollment(id: string) {
  return useQuery({ queryKey: ['enrollments', id], queryFn: () => enrollmentsService.getById(id), enabled: !!id });
}
export function useCreateEnrollment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enrollmentsService.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }) });
}
export function useUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enrollmentsService.update, onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }) });
}
export function useDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enrollmentsService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }) });
}
export function useCheckConflict() {
  return useMutation({ mutationFn: (data: CheckConflictDto) => enrollmentsService.checkConflict(data) });
}
export function useExportEnrollments() {
  return useMutation({ mutationFn: enrollmentsService.exportCsv });
}
export function useBulkUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enrollmentsService.bulkUpdate, onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }) });
}
export function useBulkDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enrollmentsService.bulkDelete, onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }) });
}
export function useImportEnrollments() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enrollmentsService.importCsv, onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }) });
}
export function useEnrollmentStats() {
  return useQuery({
    queryKey: ['enrollment-stats'],
    queryFn: () => enrollmentsService.getStats(),
  });
}
