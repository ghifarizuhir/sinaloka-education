import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { Subject } from '@/src/types/subject';

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await api.get('/api/subjects');
      return data;
    },
  });
}

export function useSubjectTutors(subjectId: string | null) {
  return useQuery({
    queryKey: ['subjects', subjectId, 'tutors'],
    queryFn: async () => {
      const { data } = await api.get(`/api/subjects/${subjectId}/tutors`);
      return data;
    },
    enabled: !!subjectId,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/api/admin/subjects', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
