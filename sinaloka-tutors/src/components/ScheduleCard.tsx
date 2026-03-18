import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';
import { ClassSchedule } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ScheduleCardProps {
  item: ClassSchedule;
  onOpenAttendance: (id: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onViewDetail?: (id: string) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ item, onOpenAttendance, onReschedule, onCancel, onViewDetail }) => {
  const isUpcoming = item.status === 'upcoming';
  const allAttended = item.students.length > 0 && item.students.every(s => s.attendance !== undefined);
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-muted border border-surface-border rounded-xl p-5 mb-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white leading-tight">
            {item.subject}
          </h3>
          <div className={cn(
            "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2",
            item.status === 'upcoming' ? "bg-blue-500/20 text-blue-400" :
            item.status === 'completed' ? "bg-brand-muted text-brand" :
            "bg-red-500/20 text-red-400"
          )}>
            {item.status}
          </div>
        </div>
        {allAttended && item.status === 'completed' && (
          <div className="text-[9px] font-bold uppercase tracking-wider text-brand mt-1">
            Absensi Selesai
          </div>
        )}
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-3 text-subtle text-sm">
          <Calendar className="w-4 h-4 text-subtle" />
          <span>{format(new Date(item.date), 'EEEE, d MMMM yyyy', { locale: id })}</span>
        </div>
        <div className="flex items-center gap-3 text-subtle text-sm">
          <Clock className="w-4 h-4 text-subtle" />
          <span>{item.startTime} - {item.endTime}</span>
        </div>
        <div className="flex items-center gap-3 text-subtle text-sm">
          <MapPin className="w-4 h-4 text-subtle" />
          <span className="truncate">{item.location}</span>
        </div>
      </div>

      {isUpcoming && !allAttended && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onOpenAttendance(item.id)}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Absen Murid</span>
          </button>
          <button
            onClick={() => onReschedule(item.id)}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-surface-border text-white hover:bg-surface-border/80 transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Atur Ulang</span>
          </button>
          <button
            onClick={() => onCancel(item.id)}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-surface-border text-red-400 hover:bg-surface-border/80 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Cancel</span>
          </button>
        </div>
      )}

      {isUpcoming && allAttended && (
        <div className="p-4 rounded-lg bg-surface-border/50 border border-surface-border text-center">
          <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">Absensi Murid Selesai</p>
        </div>
      )}

      {!isUpcoming && onViewDetail && (
        <button
          onClick={() => onViewDetail(item.id)}
          className="w-full p-3 rounded-lg bg-surface-border text-subtle hover:bg-surface-border/80 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider"
        >
          Lihat Detail
        </button>
      )}
    </motion.div>
  );
};
