import React from 'react';
import { Users, GraduationCap } from 'lucide-react';
import { ChildCard } from '../components/ChildCard';
import type { ChildSummary } from '../types';

interface DashboardPageProps {
  firstName: string;
  children: ChildSummary[];
  isLoading: boolean;
  onSelectChild: (id: string) => void;
}

export function DashboardPage({ firstName, children, isLoading, onSelectChild }: DashboardPageProps) {
  const totalPending = children.reduce((acc, c) => acc + c.pending_payments + c.overdue_payments, 0);

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Halo, {firstName}!</h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Perkembangan Anak Anda</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary p-5 rounded-xl text-primary-foreground shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Aktif</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1 opacity-80">Anak Terdaftar</p>
          <p className="text-xl font-bold tracking-tight">{children.length} Anak</p>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl text-foreground shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter mb-1 text-muted-foreground">Tagihan Aktif</p>
          <p className={`text-xl font-bold tracking-tight ${totalPending > 0 ? 'text-warning' : 'text-success'}`}>
            {totalPending > 0 ? `${totalPending} Tagihan` : 'Lunas'}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-foreground">Anak Anda</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-card rounded-xl h-28 animate-pulse shadow-sm" />)}
          </div>
        ) : children.length > 0 ? (
          children.map((child) => <ChildCard key={child.id} child={child} onSelect={onSelectChild} />)
        ) : (
          <div className="bg-muted border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Belum ada data anak terhubung.</p>
          </div>
        )}
      </div>
    </div>
  );
}
