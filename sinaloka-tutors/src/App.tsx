import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  ChevronRight,
  Star,
  TrendingUp,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
  LogOut,
  Settings,
  ShieldCheck,
  CreditCard,
  Download,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { ScheduleCard } from './components/ScheduleCard';
import { PayoutCard } from './components/PayoutCard';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import { useSchedule } from './hooks/useSchedule';
import { usePayouts } from './hooks/usePayouts';
import { useAttendance } from './hooks/useAttendance';
import type { ClassSchedule } from './types';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout } = useAuth();
  const { data: schedule, isLoading: scheduleLoading, activeFilter, setFilter, refetch: refetchSchedule, cancelSession } = useSchedule();
  const { data: payouts } = usePayouts();
  const { students, setStudents, fetchStudents, submitAttendance } = useAttendance();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [topicCovered, setTopicCovered] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');

  // Fetch students when opening attendance view
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId, fetchStudents]);

  // Reset topic/summary when opening a new attendance view
  useEffect(() => {
    if (selectedClassId) {
      const cls = schedule.find((s) => s.id === selectedClassId);
      if (cls) {
        setTopicCovered(cls.topicCovered ?? '');
        setSessionSummary(cls.sessionSummary ?? '');
      }
    }
  }, [selectedClassId, schedule]);

  // Auth loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login gate
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const upcomingClasses = schedule.filter((s) => s.status === 'upcoming');
  const pendingPayout = payouts
    .filter((p) => p.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalEarnings = pendingPayout + totalPaid;

  const tutorName = profile?.name ?? 'Tutor';
  const firstName = tutorName.split(' ')[0];

  const triggerNotification = (msg: string) => {
    setNotificationMessage(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleToggleAttendance = (classId: string, studentId: string, attendance: 'P' | 'A' | 'L') => {
    setStudents((prev) =>
      prev.map((st) => (st.id === studentId ? { ...st, attendance } : st)),
    );
  };

  const handleToggleHomework = (classId: string, studentId: string) => {
    setStudents((prev) =>
      prev.map((st) =>
        st.id === studentId ? { ...st, homeworkDone: !st.homeworkDone } : st,
      ),
    );
  };

  const selectedClass = selectedClassId
    ? schedule.find((s) => s.id === selectedClassId) ?? null
    : null;

  const handleFinishAttendance = async (classId: string) => {
    const allMarked = students.every((s) => s.attendance !== undefined);
    if (!allMarked) {
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

  const handleReschedule = (id: string) => {
    triggerNotification('Fitur atur ulang jadwal akan segera hadir!');
  };

  const handleEdit = (id: string) => {
    triggerNotification('Fitur edit detail jadwal akan segera hadir!');
  };

  const renderAttendanceView = () => {
    if (!selectedClass) return null;

    const presentCount = students.filter((s) => s.attendance === 'P').length;

    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedClassId(null)}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold leading-none mb-1">{selectedClass.subject}</h1>
              <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">Scheduled</span>
                <span>{tutorName}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight leading-none">{presentCount} / {students.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Present</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="flex flex-wrap gap-4 text-zinc-400 text-[10px] font-bold uppercase tracking-widest bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3 h-3 text-zinc-600" />
            <span>{format(new Date(selectedClass.date), 'EEEE, MMM d, yyyy', { locale: id })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span>{selectedClass.startTime} - {selectedClass.endTime}</span>
          </div>
        </div>

        {/* Topic & Attachments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Topic Covered</label>
            <input
              type="text"
              value={topicCovered}
              onChange={(e) => setTopicCovered(e.target.value)}
              placeholder="e.g., Algebraic Fractions"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Attachments</label>
            <button className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-3 text-zinc-500 hover:text-white transition-all text-sm font-bold">
              <Download className="w-4 h-4" />
              Upload Lesson Notes
            </button>
          </div>
        </div>

        {/* Student List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Student List</h3>
            <button
              onClick={() => students.forEach((s) => handleToggleAttendance(selectedClass.id, s.id, 'P'))}
              className="text-[10px] font-bold uppercase tracking-wider text-lime-400 hover:text-lime-300"
            >
              Mark All Present
            </button>
          </div>

          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white font-semibold">{student.name}</h4>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{student.grade}</p>
                  </div>
                  <div className="flex gap-1">
                    {(['P', 'A', 'L'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleToggleAttendance(selectedClass.id, student.id, status)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-[10px] font-bold transition-all border',
                          student.attendance === status
                            ? status === 'P'
                              ? 'bg-lime-400 border-lime-400 text-black'
                              : status === 'A'
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-orange-400 border-orange-400 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-500',
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={student.homeworkDone || false}
                      onChange={() => handleToggleHomework(selectedClass.id, student.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-lime-400 focus:ring-lime-400/20"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">HW Done</span>
                  </div>
                  <button className="text-zinc-500 hover:text-white transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Summary */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Session Summary</label>
          <textarea
            value={sessionSummary}
            onChange={(e) => setSessionSummary(e.target.value)}
            placeholder="Enter learning summary, materials taught, or important notes..."
            rows={4}
            className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm resize-none"
          />
        </div>

        {/* Footer Action */}
        <div className="pt-8">
          <button
            onClick={() => handleFinishAttendance(selectedClass.id)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-5 rounded-xl text-lg flex items-center justify-center gap-3 transition-all"
          >
            <CheckCircle2 className="w-6 h-6" />
            Finalize & Close
          </button>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Halo, {firstName}!</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Jadwal Mengajar Kamu</p>
        </div>
        <div className="relative">
          <button className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Bell className="w-5 h-5" />
          </button>
          <div className="absolute top-0 right-0 w-3 h-3 bg-lime-400 rounded-full border-2 border-zinc-950"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-lime-400 p-5 rounded-xl text-black">
          <div className="flex justify-between items-start mb-4">
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pending</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1">Total Payout</p>
          <p className="text-xl font-bold tracking-tight">Rp {pendingPayout.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-white">
          <div className="flex justify-between items-start mb-4">
            <CalendarIcon className="w-6 h-6 text-lime-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Today</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1 text-zinc-400">Sesi Mengajar</p>
          <p className="text-xl font-bold tracking-tight">{upcomingClasses.length} Kelas</p>
        </div>
      </div>

      {/* Today's Schedule Preview */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold">Jadwal Hari Ini</h2>
          <button onClick={() => setActiveTab('schedule')} className="text-lime-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {scheduleLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : upcomingClasses.length > 0 ? (
          upcomingClasses.slice(0, 2).map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              onOpenAttendance={setSelectedClassId}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">Gak ada jadwal buat hari ini. <br/>Waktunya istirahat!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Star className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Rating Siswa</span>
          </button>
          <button className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Sertifikasi</span>
          </button>
        </div>
      </div>
    </div>
  );

  const filterOptions = [
    { label: 'Upcoming', value: 'SCHEDULED' as const },
    { label: 'Completed', value: 'COMPLETED' as const },
    { label: 'Cancelled', value: 'CANCELLED' as const },
  ];

  const renderSchedule = () => (
    <div className="space-y-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Jadwal Mengajar</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Manajemen sesi dan absensi</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(activeFilter === f.value ? undefined : f.value)}
            className={cn(
              'px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
              activeFilter === f.value
                ? 'bg-lime-400 text-black'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div>
        {scheduleLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : schedule.length > 0 ? (
          schedule.map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              onOpenAttendance={setSelectedClassId}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">Tidak ada jadwal ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPayouts = () => (
    <div className="space-y-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Payouts</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Riwayat pendapatan kamu</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-lg bg-lime-400 flex items-center justify-center text-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Pendapatan</p>
            <p className="text-2xl font-bold tracking-tight text-white">Rp {totalEarnings.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="h-px bg-zinc-800 mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Pending</p>
            <p className="text-lg font-bold tracking-tight text-orange-400">Rp {pendingPayout.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Paid</p>
            <p className="text-lg font-bold tracking-tight text-lime-400">Rp {totalPaid.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 px-2">Transaksi Terakhir</h3>
        {payouts.map((payout) => (
          <PayoutCard key={payout.id} payout={payout} onViewProof={setSelectedProof} />
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col items-center text-center pt-8">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-lime-400 shadow-[0_0_40px_rgba(163,230,53,0.3)]">
            <img src={profile?.avatar ?? ''} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-zinc-950 border-2 border-zinc-800 p-2 rounded-lg">
            <Settings className="w-5 h-5 text-lime-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">{tutorName}</h1>
        <p className="text-lime-400 text-xs font-bold uppercase tracking-wider mb-4">{profile?.subject ?? ''} Tutor</p>
        <div className="flex gap-4">
          <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold">{profile?.rating?.toFixed(1) ?? '0.0'}</span>
          </div>
          <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400" />
            <span className="text-sm font-bold">Verified</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button className="w-full flex items-center justify-between p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-lime-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">Metode Pembayaran</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </button>
        <button className="w-full flex items-center justify-between p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-lime-400">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">Pengaturan Akun</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-red-400">Keluar Platform</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400/50" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-lime-400 selection:text-black overflow-x-hidden">
      {/* Main Content Area */}
      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedClassId ? 'attendance' : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedClassId ? (
              renderAttendanceView()
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'schedule' && renderSchedule()}
                {activeTab === 'payouts' && renderPayouts()}
                {activeTab === 'profile' && renderProfile()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
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
                <button className="w-full mt-6 bg-lime-400 text-black font-semibold py-4 rounded-lg flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Simpan Gambar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
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
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
