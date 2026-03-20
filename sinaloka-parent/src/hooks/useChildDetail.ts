import { useState, useCallback } from 'react';
import api from '../api/client';
import type {
  AttendanceRecord,
  AttendanceSummary,
  SessionRecord,
  PaymentRecord,
  EnrollmentRecord,
  PaginationMeta,
} from '../types';
import { mapAttendance, mapSession, mapPayment, mapEnrollment } from '../mappers';

export function useChildDetail(studentId: string | null) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'sessions' | 'payments' | 'enrollments'>('attendance');

  const fetchAttendance = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/parent/children/${studentId}/attendance`, { params: { limit: 50 } });
      setAttendance(res.data.data.map(mapAttendance));
      setAttendanceSummary(res.data.summary);
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchSessions = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/parent/children/${studentId}/sessions`, { params: { limit: 50 } });
      setSessions(res.data.data.map(mapSession));
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchPayments = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/parent/children/${studentId}/payments`, { params: { limit: 50 } });
      const gatewayConfigured = res.data.gateway_configured ?? false;
      setPayments(res.data.data.map((p: any) => ({ ...mapPayment(p), gateway_configured: gatewayConfigured })));
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/parent/children/${studentId}/enrollments`);
      setEnrollments(res.data.map(mapEnrollment));
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [studentId]);

  return {
    attendance, attendanceSummary, sessions, payments, enrollments,
    isLoading, activeTab, setActiveTab,
    fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
  };
}
