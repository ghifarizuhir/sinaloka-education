import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicYearService } from '@/src/services/academic-year.service';

export function useAcademicYears(params?: { status?: string }) {
  return useQuery({
    queryKey: ['academic-years', params],
    queryFn: () => academicYearService.getAll(params),
  });
}

export function useAcademicYear(id: string | null) {
  return useQuery({
    queryKey: ['academic-years', id],
    queryFn: () => academicYearService.getById(id!),
    enabled: !!id,
  });
}

export function useSemester(id: string | null) {
  return useQuery({
    queryKey: ['semesters', id],
    queryFn: () => academicYearService.getSemester(id!),
    enabled: !!id,
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useUpdateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.createSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useUpdateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.updateSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useDeleteSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.removeSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useArchiveSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.archiveSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useRollOver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.rollOver,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-years'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
