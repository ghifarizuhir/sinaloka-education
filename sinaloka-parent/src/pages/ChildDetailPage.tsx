import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useChildDetail } from '../hooks/useChildDetail';
import { AttendanceList } from '../components/AttendanceList';
import { SessionList } from '../components/SessionList';
import { PaymentList } from '../components/PaymentList';
import { EnrollmentList } from '../components/EnrollmentList';
import { PaymentStatusView } from '../components/PaymentStatusView';
import type { ChildSummary } from '../types';
import { cn } from '../lib/utils';

interface ChildDetailPageProps {
  child: ChildSummary;
  onBack: () => void;
}

const TABS = [
  { id: 'attendance' as const, label: 'Kehadiran' },
  { id: 'sessions' as const, label: 'Sesi' },
  { id: 'payments' as const, label: 'Bayar' },
  { id: 'enrollments' as const, label: 'Kelas' },
];

export function ChildDetailPage({ child, onBack }: ChildDetailPageProps) {
  const {
    attendance, attendanceSummary, sessions, payments, enrollments,
    isLoading, activeTab, setActiveTab,
    fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments,
  } = useChildDetail(child.id);

  const [paymentStatusId, setPaymentStatusId] = useState<string | null>(null);

  useEffect(() => {
    switch (activeTab) {
      case 'attendance': fetchAttendance(); break;
      case 'sessions': fetchSessions(); break;
      case 'payments': fetchPayments(); break;
      case 'enrollments': fetchEnrollments(); break;
    }
  }, [activeTab, fetchAttendance, fetchSessions, fetchPayments, fetchEnrollments]);

  if (paymentStatusId) {
    return (
      <PaymentStatusView
        paymentId={paymentStatusId}
        onBack={() => setPaymentStatusId(null)}
      />
    );
  }

  return (
    <div className="pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold">{child.name}</h1>
        <p className="text-zinc-500 text-xs">Kelas {child.grade} · {child.enrollment_count} mata pelajaran</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
              activeTab === tab.id ? "bg-lime-400 text-black" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-zinc-900 rounded-lg h-16 animate-pulse" />)}
        </div>
      ) : (
        <>
          {activeTab === 'attendance' && <AttendanceList data={attendance} summary={attendanceSummary} />}
          {activeTab === 'sessions' && <SessionList data={sessions} />}
          {activeTab === 'payments' && (
            <PaymentList
              data={payments}
              onOpenPaymentStatus={setPaymentStatusId}
            />
          )}
          {activeTab === 'enrollments' && <EnrollmentList data={enrollments} />}
        </>
      )}
    </div>
  );
}
