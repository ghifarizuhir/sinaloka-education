import { useQuery } from '@tanstack/react-query';
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
