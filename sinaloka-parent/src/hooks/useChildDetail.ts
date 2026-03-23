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

type TabKey = 'attendance' | 'sessions' | 'payments' | 'enrollments';

function extractErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as any)?.response?.data?.message;
  return typeof msg === 'string' ? msg : fallback;
}

export function useChildDetail(studentId: string | null, initialTab?: TabKey) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'attendance');
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    attendance: null, sessions: null, payments: null, enrollments: null,
  });

  const fetchAttendance = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, attendance: null }));
    try {
      const res = await api.get(`/api/parent/children/${studentId}/attendance`, { params: { limit: 50 } });
      setAttendance(res.data.data.map(mapAttendance));
      setAttendanceSummary(res.data.summary);
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      setErrors((prev) => ({ ...prev, attendance: extractErrorMessage(err, 'Gagal memuat data kehadiran') }));
    }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchSessions = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, sessions: null }));
    try {
      const res = await api.get(`/api/parent/children/${studentId}/sessions`, { params: { limit: 50 } });
      setSessions(res.data.data.map(mapSession));
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      setErrors((prev) => ({ ...prev, sessions: extractErrorMessage(err, 'Gagal memuat data sesi') }));
    }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchPayments = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, payments: null }));
    try {
      const res = await api.get(`/api/parent/children/${studentId}/payments`, { params: { limit: 50 } });
      const gatewayConfigured = res.data.gateway_configured ?? false;
      setPayments(res.data.data.map((p: any) => ({ ...mapPayment(p), gateway_configured: gatewayConfigured })));
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      setErrors((prev) => ({ ...prev, payments: extractErrorMessage(err, 'Gagal memuat data pembayaran') }));
    }
    finally { setIsLoading(false); }
  }, [studentId]);

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, enrollments: null }));
    try {
      const res = await api.get(`/api/parent/children/${studentId}/enrollments`);
      setEnrollments(res.data.map(mapEnrollment));
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      setErrors((prev) => ({ ...prev, enrollments: extractErrorMessage(err, 'Gagal memuat data kelas') }));
    }
    finally { setIsLoading(false); }
  }, [studentId]);

  const refresh = useCallback(async () => {
    switch (activeTab) {
      case 'attendance': await fetchAttendance(); break;
      case 'sessions': await fetchSessions(); break;
      case 'payments': await fetchPayments(); break;
      case 'enrollments': await fetchEnrollments(); break;
    }
  }, [activeTab, fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments]);

  return {
    attendance, attendanceSummary, sessions, payments, enrollments,
    isLoading, activeTab, setActiveTab,
    fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
    lastFetchedAt, refresh, errors,
  };
}
