import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { ChildSummary } from '../types';

interface ChildCardProps {
  child: ChildSummary;
  onSelect: (id: string) => void;
}

export function ChildCard({ child, onSelect }: ChildCardProps) {
  const hasPaymentIssue = child.pending_payments > 0 || child.overdue_payments > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(child.id)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-3 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-white">{child.name}</h3>
          <p className="text-zinc-500 text-xs">Kelas {child.grade} · {child.enrollment_count} mata pelajaran</p>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className={`text-lg font-bold ${child.attendance_rate >= 80 ? 'text-lime-400' : child.attendance_rate >= 60 ? 'text-orange-400' : 'text-red-400'}`}>
            {child.attendance_rate}%
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kehadiran</p>
        </div>
        <div className="text-center">
          {child.next_session ? (
            <>
              <div className="text-xs font-semibold text-white">{child.next_session.subject}</div>
              <p className="text-[10px] text-zinc-500">{child.next_session.start_time}</p>
            </>
          ) : (
            <div className="text-xs text-zinc-600">—</div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sesi Berikut</p>
        </div>
        <div className="text-center">
          {hasPaymentIssue ? (
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">{child.pending_payments + child.overdue_payments}</span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-lime-400">Lunas</div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Bayar</p>
        </div>
      </div>
    </motion.div>
  );
}
