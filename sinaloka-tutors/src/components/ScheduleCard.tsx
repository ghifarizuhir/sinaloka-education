import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, RefreshCcw, Edit } from 'lucide-react';
import { ClassSchedule } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ScheduleCardProps {
  item: ClassSchedule;
  onOpenAttendance: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
  onEdit: (id: string) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ item, onOpenAttendance, onCancel, onReschedule, onEdit }) => {
  const isUpcoming = item.status === 'upcoming';
  const allAttended = item.students.length > 0 && item.students.every(s => s.attendance !== undefined);
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-900 border border-stone-800 rounded-[24px] p-5 mb-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-white leading-tight">
              {item.subject}
            </h3>
            <button 
              onClick={() => onEdit(item.id)}
              className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className={cn(
            "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2",
            item.status === 'upcoming' ? "bg-blue-500/20 text-blue-400" :
            item.status === 'completed' ? "bg-lime-500/20 text-lime-400" :
            "bg-red-500/20 text-red-400"
          )}>
            {item.status}
          </div>
        </div>
        {allAttended && item.status === 'completed' && (
          <div className="text-[9px] font-black uppercase tracking-widest text-lime-400 mt-1">
            Absensi Selesai
          </div>
        )}
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-3 text-stone-400 text-sm">
          <Calendar className="w-4 h-4 text-stone-500" />
          <span>{format(new Date(item.date), 'EEEE, d MMMM yyyy', { locale: id })}</span>
        </div>
        <div className="flex items-center gap-3 text-stone-400 text-sm">
          <Clock className="w-4 h-4 text-stone-500" />
          <span>{item.startTime} - {item.endTime}</span>
        </div>
        <div className="flex items-center gap-3 text-stone-400 text-sm">
          <MapPin className="w-4 h-4 text-stone-500" />
          <span className="truncate">{item.location}</span>
        </div>
      </div>

      {isUpcoming && !allAttended && (
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => onOpenAttendance(item.id)}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-lime-400 text-black hover:bg-lime-300 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Absen Murid</span>
          </button>
          <button 
            onClick={() => onReschedule(item.id)}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-stone-800 text-white hover:bg-stone-700 transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Atur Ulang</span>
          </button>
          <button 
            onClick={() => onCancel(item.id)}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-stone-800 text-red-400 hover:bg-stone-700 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Cancel</span>
          </button>
        </div>
      )}

      {isUpcoming && allAttended && (
        <div className="p-4 rounded-2xl bg-stone-800/50 border border-stone-700 text-center">
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Absensi Murid Selesai</p>
        </div>
      )}
    </motion.div>
  );
};
