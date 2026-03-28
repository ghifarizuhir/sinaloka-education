import { useState, useCallback } from 'react';
import api from '../api/client';
import type { Student } from '../types';
import { mapStudent, mapAttendanceToBackend } from '../mappers';

export function useAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/tutor/schedule/${sessionId}/students`);
      setStudents(res.data.students.map(mapStudent));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data siswa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAttendance = useCallback(async (
    sessionId: string,
    studentList: Student[],
    topicCovered: string,
    sessionSummary?: string,
  ) => {
    const payload = mapAttendanceToBackend(sessionId, studentList);

    // Single atomic call — replaces two sequential calls
    await api.post('/api/tutor/attendance/finalize', {
      session_id: sessionId,
      records: payload.records,
      topic_covered: topicCovered,
      session_summary: sessionSummary || undefined,
    });
  }, []);

  return {
    students,
    setStudents,
    isLoading,
    error,
    fetchStudents,
    submitAttendance,
  };
}
