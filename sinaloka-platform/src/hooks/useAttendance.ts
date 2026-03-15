import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/src/services/attendance.service';
import type { AttendanceSummaryParams } from '@/src/types/attendance';

export function useAttendanceBySession(sessionId: string) {
  return useQuery({ queryKey: ['attendance', sessionId], queryFn: () => attendanceService.getBySession({ session_id: sessionId }), enabled: !!sessionId });
}
export function useAttendanceSummary(params: AttendanceSummaryParams) {
  return useQuery({ queryKey: ['attendance', 'summary', params], queryFn: () => attendanceService.getSummary(params), enabled: !!params.class_id && !!params.date_from && !!params.date_to });
}
export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: attendanceService.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
