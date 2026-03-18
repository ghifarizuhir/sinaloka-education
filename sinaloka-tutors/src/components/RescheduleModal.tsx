import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import type { ClassSchedule } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface RescheduleModalProps {
  session: ClassSchedule;
  onSubmit: (
    id: string,
    dto: {
      proposed_date: string;
      proposed_start_time: string;
      proposed_end_time: string;
      reschedule_reason: string;
    },
  ) => Promise<void>;
  onClose: () => void;
}

export function RescheduleModal({ session, onSubmit, onClose }: RescheduleModalProps) {
  const [proposedDate, setProposedDate] = useState('');
  const [proposedStartTime, setProposedStartTime] = useState(session.startTime);
  const [proposedEndTime, setProposedEndTime] = useState(session.endTime);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proposedDate || !proposedStartTime || !proposedEndTime || !reason.trim()) {
      setError('Semua field harus diisi.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(session.id, {
        proposed_date: proposedDate,
        proposed_start_time: proposedStartTime,
        proposed_end_time: proposedEndTime,
        reschedule_reason: reason.trim(),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengirim permintaan reschedule.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface/90 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-surface-muted border border-surface-border rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex justify-between items-center">
          <h3 className="text-lg font-semibold">Atur Ulang Jadwal</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center hover:bg-surface-border/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Session Info */}
        <div className="px-5 pt-4 pb-2">
          <p className="font-semibold text-white">{session.subject}</p>
          <div className="flex items-center gap-3 text-subtle text-xs mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(session.date), 'EEE, d MMM yyyy', { locale: id })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.startTime} - {session.endTime}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Tanggal Baru</label>
            <input
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-surface-border border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Waktu Mulai</label>
              <input
                type="time"
                value={proposedStartTime}
                onChange={(e) => setProposedStartTime(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-surface-border border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Waktu Selesai</label>
              <input
                type="time"
                value={proposedEndTime}
                onChange={(e) => setProposedEndTime(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-surface-border border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Alasan</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Jelaskan alasan atur ulang jadwal..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg bg-surface-border border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Mengirim...' : 'Kirim Permintaan'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
