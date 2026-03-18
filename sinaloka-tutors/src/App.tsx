import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { PayoutsPage } from './pages/PayoutsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AttendancePage } from './pages/AttendancePage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { RescheduleModal } from './components/RescheduleModal';
import { useAuth } from './hooks/useAuth';
import { useSchedule } from './hooks/useSchedule';
import { usePayouts } from './hooks/usePayouts';
import { useAttendance } from './hooks/useAttendance';

function MainAppContent() {
  const { profile, logout } = useAuth();
  const { data: schedule, isLoading: scheduleLoading, activeFilter, setFilter, refetch: refetchSchedule, cancelSession, requestReschedule } = useSchedule();
  const { data: payouts, refetch: refetchPayouts } = usePayouts();
  const { students, setStudents, fetchStudents, submitAttendance } = useAttendance();

  const [activeTab, setActiveTabRaw] = useState('dashboard');
  const setActiveTab = (tab: string) => {
    setActiveTabRaw(tab);
    if (tab === 'payouts') refetchPayouts();
  };
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [topicCovered, setTopicCovered] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

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

  const handleSetNote = (_classId: string, studentId: string, note: string) => {
    setStudents((prev) => prev.map((st) => st.id === studentId ? { ...st, note } : st));
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
      refetchPayouts();
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

  const detailSession = detailSessionId ? schedule.find((s) => s.id === detailSessionId) ?? null : null;

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
          onSetNote={handleSetNote}
          onFinish={handleFinishAttendance}
          onClose={() => setSelectedClassId(null)}
        />
      );
    }

    if (detailSession) {
      return (
        <SessionDetailPage
          session={detailSession}
          onClose={() => setDetailSessionId(null)}
        />
      );
    }

    if (editingProfile) {
      return (
        <ProfileEditPage
          onSaved={() => {
            setEditingProfile(false);
            triggerNotification('Profil berhasil diperbarui.');
          }}
          onClose={() => setEditingProfile(false)}
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
            onViewDetail={setDetailSessionId}
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
            onViewDetail={setDetailSessionId}
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
        return <ProfilePage profile={profile} onLogout={logout} onEditProfile={() => setEditingProfile(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white font-sans selection:bg-brand/30 selection:text-white overflow-x-hidden">
      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedClassId ? 'attendance' : detailSessionId ? 'detail' : editingProfile ? 'edit-profile' : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!selectedClassId && !detailSessionId && !editingProfile && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}

      {/* Proof Modal */}
      <AnimatePresence>
        {selectedProof && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProof(null)}
              className="absolute inset-0 bg-surface/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-surface-muted border border-surface-border rounded-xl overflow-hidden"
            >
              <div className="p-6 border-b border-surface-border flex justify-between items-center">
                <h3 className="text-lg font-semibold">Bukti Transfer</h3>
                <button onClick={() => setSelectedProof(null)} className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center">
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
            <div className="bg-brand text-brand-foreground px-6 py-3 rounded-full font-semibold shadow-[0_10px_30px_rgba(45,212,191,0.3)] flex items-center gap-2">
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

export default function App() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/*" element={isAuthenticated ? <MainAppContent /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
