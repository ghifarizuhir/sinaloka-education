import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesService } from '@/src/services/classes.service';
import type { ClassQueryParams } from '@/src/types/class';

export function useClasses(params?: ClassQueryParams) {
  return useQuery({ queryKey: ['classes', params], queryFn: () => classesService.getAll(params) });
}
export function useClass(id: string) {
  return useQuery({ queryKey: ['classes', id], queryFn: () => classesService.getById(id), enabled: !!id });
}
export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: classesService.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });
}
export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: classesService.update, onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });
}
export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: classesService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });
}
