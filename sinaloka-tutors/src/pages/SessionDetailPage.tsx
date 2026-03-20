import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import type { ClassSchedule, Student } from '../types';
import { mapStudent } from '../mappers';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SessionDetailPageProps {
  session: ClassSchedule;
  onClose: () => void;
}

const statusIcon = {
  P: <CheckCircle2 className="w-4 h-4 text-brand" />,
  A: <XCircle className="w-4 h-4 text-red-400" />,
  L: <AlertTriangle className="w-4 h-4 text-orange-400" />,
};

const statusLabel = {
  P: 'Hadir',
  A: 'Tidak Hadir',
  L: 'Terlambat',
};

export function SessionDetailPage({ session, onClose }: SessionDetailPageProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/tutor/schedule/${session.id}/students`)
      .then((res) => setStudents(res.data.students.map(mapStudent)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.id]);

  const presentCount = students.filter((s) => s.attendance === 'P').length;
  const lateCount = students.filter((s) => s.attendance === 'L').length;
  const absentCount = students.filter((s) => s.attendance === 'A').length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold leading-none mb-1">{session.subject}</h1>
          <div className={cn(
            'inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1',
            session.status === 'completed' ? 'bg-brand-muted text-brand' :
            session.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
            session.status === 'rescheduled' ? 'bg-orange-500/20 text-orange-400' :
            'bg-blue-500/20 text-blue-400',
          )}>
            {session.status}
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex flex-wrap gap-4 text-subtle text-[10px] font-bold uppercase tracking-widest bg-surface-muted/50 p-4 rounded-lg border border-surface-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-3 h-3 text-subtle" />
          <span>{format(new Date(session.date), 'EEEE, d MMMM yyyy', { locale: id })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-subtle" />
          <span>{session.startTime} - {session.endTime}</span>
        </div>
      </div>

      {/* Topic & Summary */}
      {(session.topicCovered || session.sessionSummary) && (
        <div className="space-y-4">
          {session.topicCovered && (
            <div className="bg-surface-muted border border-surface-border rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-2">Topik</p>
              <p className="text-white text-sm">{session.topicCovered}</p>
            </div>
          )}
          {session.sessionSummary && (
            <div className="bg-surface-muted border border-surface-border rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-2">Ringkasan Sesi</p>
              <p className="text-white text-sm">{session.sessionSummary}</p>
            </div>
          )}
        </div>
      )}

      {/* Attendance Summary */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-muted border border-surface-border rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-brand">{presentCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Hadir</p>
          </div>
          <div className="bg-surface-muted border border-surface-border rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-orange-400">{lateCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Terlambat</p>
          </div>
          <div className="bg-surface-muted border border-surface-border rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-red-400">{absentCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Tidak Hadir</p>
          </div>
        </div>
      )}

      {/* Student List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-subtle px-1">Daftar Siswa</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface-muted rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : students.length > 0 ? (
          students.map((student) => (
            <div key={student.id} className="bg-surface-muted border border-surface-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold text-sm">{student.name}</h4>
                <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">{student.grade}</p>
              </div>
              <div className="flex items-center gap-2">
                {student.attendance && statusIcon[student.attendance]}
                <span className={cn(
                  'text-xs font-semibold',
                  student.attendance === 'P' ? 'text-brand' :
                  student.attendance === 'A' ? 'text-red-400' :
                  student.attendance === 'L' ? 'text-orange-400' :
                  'text-subtle',
                )}>
                  {student.attendance ? statusLabel[student.attendance] : 'Belum'}
                </span>
                {student.homeworkDone && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-subtle bg-surface-elevated px-2 py-0.5 rounded">HW</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-muted/50 border border-dashed border-surface-border rounded-xl p-6 text-center">
            <p className="text-subtle text-sm">Tidak ada data siswa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
