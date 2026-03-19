import React, { useState } from 'react';
import { format } from 'date-fns';
import type { PaymentRecord } from '../types';
import { cn } from '../lib/utils';
import { checkoutPayment } from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-lime-500/20 text-lime-400',
  PENDING: 'bg-orange-500/20 text-orange-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Lunas',
  PENDING: 'Belum Bayar',
  OVERDUE: 'Terlambat',
};

interface PaymentListProps {
  data: PaymentRecord[];
  onOpenPaymentStatus?: (paymentId: string) => void;
}

export function PaymentList({ data, onOpenPaymentStatus }: PaymentListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleBayar = async (payment: PaymentRecord) => {
    setLoadingId(payment.id);
    try {
      const result = await checkoutPayment(payment.id);
      window.open(result.redirect_url, '_blank');
      onOpenPaymentStatus?.(payment.id);
    } catch {
      // silently fail — user stays on the list
    } finally {
      setLoadingId(null);
    }
  };

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Belum ada data pembayaran.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((payment) => {
        const canPay =
          (payment.status === 'PENDING' || payment.status === 'OVERDUE') &&
          payment.gateway_configured;

        return (
          <div key={payment.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{payment.enrollment.class.subject}</p>
              <p className="text-xs text-zinc-500">Jatuh tempo: {format(new Date(payment.due_date), 'dd MMM yyyy')}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <p className="text-sm font-bold text-white">Rp {payment.amount.toLocaleString('id-ID')}</p>
              <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_COLORS[payment.status])}>
                {STATUS_LABELS[payment.status]}
              </span>
              {canPay && (
                <button
                  onClick={() => handleBayar(payment)}
                  disabled={loadingId === payment.id}
                  className="mt-1 px-3 py-1 bg-lime-400 text-black text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-60">
                  {loadingId === payment.id ? '...' : 'Bayar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
