import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/src/services/students.service';
import type { StudentQueryParams } from '@/src/types/student';

export function useStudents(params?: StudentQueryParams) {
  return useQuery({ queryKey: ['students', params], queryFn: () => studentsService.getAll(params) });
}
export function useStudent(id: string) {
  return useQuery({ queryKey: ['students', id], queryFn: () => studentsService.getById(id), enabled: !!id });
}
export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: studentsService.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
}
export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: studentsService.update, onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
}
export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: studentsService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
}
export function useImportStudents() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: studentsService.importCsv, onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
}
export function useExportStudents() {
  return useMutation({ mutationFn: (params?: StudentQueryParams) => studentsService.exportCsv(params) });
}
