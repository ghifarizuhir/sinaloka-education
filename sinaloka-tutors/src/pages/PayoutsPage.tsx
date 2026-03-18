import React from 'react';
import { TrendingUp } from 'lucide-react';
import { PayoutCard } from '../components/PayoutCard';
import type { Payout } from '../types';

interface PayoutsPageProps {
  payouts: Payout[];
  pendingPayout: number;
  totalPaid: number;
  totalEarnings: number;
  onViewProof: (url: string) => void;
}

export function PayoutsPage({
  payouts,
  pendingPayout,
  totalPaid,
  totalEarnings,
  onViewProof,
}: PayoutsPageProps) {
  return (
    <div className="space-y-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Payouts</h1>
        <p className="text-subtle text-xs font-bold uppercase tracking-widest">Riwayat pendapatan kamu</p>
      </div>

      <div className="bg-surface-muted border border-surface-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-lg bg-brand flex items-center justify-center text-brand-foreground">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">Total Pendapatan</p>
            <p className="text-2xl font-bold tracking-tight text-white">Rp {totalEarnings.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="h-px bg-surface-border mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">Pending</p>
            <p className="text-lg font-bold tracking-tight text-orange-400">Rp {pendingPayout.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">Paid</p>
            <p className="text-lg font-bold tracking-tight text-brand">Rp {totalPaid.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-subtle mb-4 px-2">Transaksi Terakhir</h3>
        {payouts.map((payout) => (
          <PayoutCard key={payout.id} payout={payout} onViewProof={onViewProof} />
        ))}
      </div>
    </div>
  );
}
