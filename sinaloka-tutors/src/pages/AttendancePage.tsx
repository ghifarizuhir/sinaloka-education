import React from 'react';
import { Calendar as CalendarIcon, CheckCircle2, X, Clock } from 'lucide-react';
import type { ClassSchedule, Student } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface AttendancePageProps {
  selectedClass: ClassSchedule;
  students: Student[];
  tutorName: string;
  topicCovered: string;
  sessionSummary: string;
  onSetTopicCovered: (value: string) => void;
  onSetSessionSummary: (value: string) => void;
  onToggleAttendance: (classId: string, studentId: string, attendance: 'P' | 'A' | 'L') => void;
  onToggleHomework: (classId: string, studentId: string) => void;
  onFinish: (classId: string) => void;
  onClose: () => void;
}

export function AttendancePage({
  selectedClass,
  students,
  tutorName,
  topicCovered,
  sessionSummary,
  onSetTopicCovered,
  onSetSessionSummary,
  onToggleAttendance,
  onToggleHomework,
  onFinish,
  onClose,
}: AttendancePageProps) {
  const presentCount = students.filter((s) => s.attendance === 'P').length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
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

      {/* Topic */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Topic Covered</label>
        <input
          type="text"
          value={topicCovered}
          onChange={(e) => onSetTopicCovered(e.target.value)}
          placeholder="e.g., Algebraic Fractions"
          className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
        />
      </div>

      {/* Student List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Student List</h3>
          <button
            onClick={() => students.forEach((s) => onToggleAttendance(selectedClass.id, s.id, 'P'))}
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
                      onClick={() => onToggleAttendance(selectedClass.id, student.id, status)}
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
              <div className="flex items-center pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={student.homeworkDone || false}
                    onChange={() => onToggleHomework(selectedClass.id, student.id)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-lime-400 focus:ring-lime-400/20"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">HW Done</span>
                </div>
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
          onChange={(e) => onSetSessionSummary(e.target.value)}
          placeholder="Enter learning summary, materials taught, or important notes..."
          rows={4}
          className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm resize-none"
        />
      </div>

      {/* Footer Action */}
      <div className="pt-8">
        <button
          onClick={() => onFinish(selectedClass.id)}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-5 rounded-xl text-lg flex items-center justify-center gap-3 transition-all"
        >
          <CheckCircle2 className="w-6 h-6" />
          Finalize & Close
        </button>
      </div>
    </div>
  );
}
