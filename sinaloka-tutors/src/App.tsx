import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { PayoutsPage } from './pages/PayoutsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AttendancePage } from './pages/AttendancePage';
import { RescheduleModal } from './components/RescheduleModal';
import { useAuth } from './hooks/useAuth';
import { useSchedule } from './hooks/useSchedule';
import { usePayouts } from './hooks/usePayouts';
import { useAttendance } from './hooks/useAttendance';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: schedule, isLoading: scheduleLoading, activeFilter, setFilter, refetch: refetchSchedule, cancelSession, requestReschedule } = useSchedule();
  const { data: payouts } = usePayouts();
  const { students, setStudents, fetchStudents, submitAttendance } = useAttendance();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [topicCovered, setTopicCovered] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId, fetchStudents]);

  useEffect(() => {
    if (selectedClassId) {
      const cls = schedule.find((s) => s.id === selectedClassId);
      if (cls) {
        setTopicCovered(cls.topicCovered ?? '');
        setSessionSummary(cls.sessionSummary ?? '');
      }
    }
  }, [selectedClassId, schedule]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const upcomingClasses = schedule.filter((s) => s.status === 'upcoming');
  const pendingPayout = payouts.filter((p) => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = payouts.filter((p) => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalEarnings = pendingPayout + totalPaid;
  const tutorName = profile?.name ?? 'Tutor';
  const firstName = tutorName.split(' ')[0];

  const triggerNotification = (msg: string) => {
    setNotificationMessage(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleToggleAttendance = (_classId: string, studentId: string, attendance: 'P' | 'A' | 'L') => {
    setStudents((prev) => prev.map((st) => (st.id === studentId ? { ...st, attendance } : st)));
  };

  const handleToggleHomework = (_classId: string, studentId: string) => {
    setStudents((prev) => prev.map((st) => st.id === studentId ? { ...st, homeworkDone: !st.homeworkDone } : st));
  };

  const selectedClass = selectedClassId ? schedule.find((s) => s.id === selectedClassId) ?? null : null;

  const handleFinishAttendance = async (classId: string) => {
    if (!students.every((s) => s.attendance !== undefined)) {
      triggerNotification('Harap isi semua absensi murid!');
      return;
    }
    if (!topicCovered) {
      triggerNotification('Harap isi topik yang diajarkan!');
      return;
    }
    try {
      await submitAttendance(classId, students, topicCovered, sessionSummary);
      setSelectedClassId(null);
      triggerNotification('Absensi kelas berhasil disimpan!');
      refetchSchedule();
    } catch (err: any) {
      triggerNotification(err?.response?.data?.message || 'Gagal menyimpan absensi');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSession(id);
      triggerNotification('Jadwal berhasil dibatalkan.');
    } catch (err: any) {
      triggerNotification(err?.response?.data?.message || 'Gagal membatalkan jadwal');
    }
  };

  const handleRescheduleSubmit = async (
    id: string,
    dto: { proposed_date: string; proposed_start_time: string; proposed_end_time: string; reschedule_reason: string },
  ) => {
    await requestReschedule(id, dto);
    setRescheduleSessionId(null);
    triggerNotification('Permintaan reschedule berhasil dikirim.');
  };

  const rescheduleSession = rescheduleSessionId ? schedule.find((s) => s.id === rescheduleSessionId) ?? null : null;

  const renderPage = () => {
    if (selectedClassId && selectedClass) {
      return (
        <AttendancePage
          selectedClass={selectedClass}
          students={students}
          tutorName={tutorName}
          topicCovered={topicCovered}
          sessionSummary={sessionSummary}
          onSetTopicCovered={setTopicCovered}
          onSetSessionSummary={setSessionSummary}
          onToggleAttendance={handleToggleAttendance}
          onToggleHomework={handleToggleHomework}
          onFinish={handleFinishAttendance}
          onClose={() => setSelectedClassId(null)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            firstName={firstName}
            upcomingClasses={upcomingClasses}
            pendingPayout={pendingPayout}
            scheduleLoading={scheduleLoading}
            onOpenAttendance={setSelectedClassId}
            onReschedule={setRescheduleSessionId}
            onCancel={handleCancel}
            onViewAllSchedule={() => setActiveTab('schedule')}
          />
        );
      case 'schedule':
        return (
          <SchedulePage
            schedule={schedule}
            scheduleLoading={scheduleLoading}
            activeFilter={activeFilter}
            onSetFilter={setFilter}
            onOpenAttendance={setSelectedClassId}
            onReschedule={setRescheduleSessionId}
            onCancel={handleCancel}
          />
        );
      case 'payouts':
        return (
          <PayoutsPage
            payouts={payouts}
            pendingPayout={pendingPayout}
            totalPaid={totalPaid}
            totalEarnings={totalEarnings}
            onViewProof={setSelectedProof}
          />
        );
      case 'profile':
        return <ProfilePage profile={profile} onLogout={logout} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-lime-400 selection:text-black overflow-x-hidden">
      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedClassId ? 'attendance' : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!selectedClassId && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}

      {/* Proof Modal */}
      <AnimatePresence>
        {selectedProof && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProof(null)}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Bukti Transfer</h3>
                <button onClick={() => setSelectedProof(null)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <img src={selectedProof} alt="Proof" className="w-full rounded-lg shadow-2xl" referrerPolicy="no-referrer" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleSession && (
          <RescheduleModal
            session={rescheduleSession}
            onSubmit={handleRescheduleSubmit}
            onClose={() => setRescheduleSessionId(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-6 right-6 z-[110] flex justify-center pointer-events-none"
          >
            <div className="bg-lime-400 text-black px-6 py-3 rounded-full font-semibold shadow-[0_10px_30px_rgba(163,230,53,0.4)] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {notificationMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
