import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { ChildSummary } from '../types';
import { cn } from '../lib/utils';
import { getInitials, getAvatarColor } from '../lib/avatar';

// Mini SVG progress ring
function AttendanceRing({ rate, size = 36 }: { rate: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? 'var(--color-success)' : rate >= 60 ? 'var(--color-warning)' : 'var(--color-destructive)';

  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill={color}
        fontSize="9" fontWeight="700"
      >
        {rate}%
      </text>
    </svg>
  );
}

interface ChildCardProps {
  child: ChildSummary;
  onSelect: (id: string) => void;
  index?: number;
}

export function ChildCard({ child, onSelect, index = 0 }: ChildCardProps) {
  const hasPaymentIssue = child.pending_payments > 0 || child.overdue_payments > 0;
  const initials = getInitials(child.name);
  const avatarColor = getAvatarColor(child.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => onSelect(child.id)}
      className="bg-card border border-border rounded-xl p-4 mb-3 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
    >
      {/* Header: avatar + name + chevron */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor)}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">{child.name}</h3>
          <p className="text-muted-foreground text-xs">Kelas {child.grade} · {child.enrollment_count} mapel</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center">
          <AttendanceRing rate={child.attendance_rate} />
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Hadir</p>
        </div>
        <div className="flex flex-col items-center justify-center">
          {child.next_session ? (
            <>
              <p className="text-xs font-semibold text-foreground leading-tight text-center">{child.next_session.subject}</p>
              <p className="text-[10px] text-muted-foreground">{child.next_session.start_time}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground/40">—</p>
          )}
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Sesi</p>
        </div>
        <div className="flex flex-col items-center justify-center">
          {hasPaymentIssue ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <span className="text-sm font-bold text-warning">{child.pending_payments + child.overdue_payments}</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-success">Lunas</span>
          )}
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Bayar</p>
        </div>
      </div>
    </motion.div>
  );
}
