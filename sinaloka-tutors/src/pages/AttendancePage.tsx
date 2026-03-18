import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, X, Clock, MessageSquare } from 'lucide-react';
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
  onSetNote: (classId: string, studentId: string, note: string) => void;
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
  onSetNote,
  onFinish,
  onClose,
}: AttendancePageProps) {
  const presentCount = students.filter((s) => s.attendance === 'P').length;

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleNoteExpanded = (studentId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold leading-none mb-1">{selectedClass.subject}</h1>
            <div className="flex items-center gap-3 text-subtle text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-surface-border px-2 py-0.5 rounded text-subtle">Scheduled</span>
              <span>{tutorName}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight leading-none">{presentCount} / {students.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Present</p>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex flex-wrap gap-4 text-subtle text-[10px] font-bold uppercase tracking-widest bg-surface-muted/50 p-4 rounded-lg border border-surface-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-3 h-3 text-subtle" />
          <span>{format(new Date(selectedClass.date), 'EEEE, MMM d, yyyy', { locale: id })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-subtle" />
          <span>{selectedClass.startTime} - {selectedClass.endTime}</span>
        </div>
      </div>

      {/* Topic */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-2">Topic Covered</label>
        <input
          type="text"
          value={topicCovered}
          onChange={(e) => onSetTopicCovered(e.target.value)}
          placeholder="e.g., Algebraic Fractions"
          className="w-full px-6 py-4 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
        />
      </div>

      {/* Student List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-subtle">Student List</h3>
          <button
            onClick={() => students.forEach((s) => onToggleAttendance(selectedClass.id, s.id, 'P'))}
            className="text-[10px] font-bold uppercase tracking-wider text-brand hover:text-brand/80"
          >
            Mark All Present
          </button>
        </div>

        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="bg-surface-muted border border-surface-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-semibold">{student.name}</h4>
                  <p className="text-subtle text-[10px] font-bold uppercase tracking-widest">{student.grade}</p>
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
                            ? 'bg-brand border-brand text-brand-foreground'
                            : status === 'A'
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-orange-400 border-orange-400 text-white'
                          : 'bg-surface-border border-surface-border text-subtle',
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={student.homeworkDone || false}
                      onChange={() => onToggleHomework(selectedClass.id, student.id)}
                      className="w-4 h-4 rounded border-surface-border bg-surface-border text-brand focus:ring-brand-muted"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">HW Done</span>
                  </div>
                  <button
                    onClick={() => toggleNoteExpanded(student.id)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all border',
                      student.note
                        ? 'text-brand border-brand/30 bg-brand-muted'
                        : 'text-subtle border-surface-border bg-surface-border'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
                {expandedNotes.has(student.id) && (
                  <input
                    type="text"
                    value={student.note || ''}
                    onChange={(e) => onSetNote(selectedClass.id, student.id, e.target.value)}
                    placeholder="Add note..."
                    maxLength={500}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Summary */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-2">Session Summary</label>
        <textarea
          value={sessionSummary}
          onChange={(e) => onSetSessionSummary(e.target.value)}
          placeholder="Enter learning summary, materials taught, or important notes..."
          rows={4}
          className="w-full px-6 py-4 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm resize-none"
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
