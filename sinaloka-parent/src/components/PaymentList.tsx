import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { PaymentRecord } from '../types';
import { cn } from '../lib/utils';
import { checkoutPayment } from '../api/client';
import { ErrorState } from './ErrorState';

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-success-muted text-success',
  PENDING: 'bg-warning-muted text-warning',
  OVERDUE: 'bg-destructive-muted text-destructive',
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Lunas',
  PENDING: 'Belum Bayar',
  OVERDUE: 'Terlambat',
};

interface PaymentListProps {
  data: PaymentRecord[];
  error?: string | null;
  onRetry?: () => void;
}

export function PaymentList({ data, error, onRetry }: PaymentListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleBayar = async (payment: PaymentRecord) => {
    setLoadingId(payment.id);
    // Open window synchronously (direct user gesture) to avoid popup blocker
    const newWindow = window.open('', '_blank');
    try {
      const result = await checkoutPayment(payment.id);
      if (newWindow && !newWindow.closed) {
        newWindow.location.href = result.redirect_url;
      } else {
        // Fallback if popup blocked or user closed the blank tab
        window.location.href = result.redirect_url;
      }
    } catch (err: unknown) {
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
      const message = (err as any)?.response?.data?.message || 'Gagal memproses pembayaran. Coba lagi.';
      toast.error(message);
    } finally {
      setLoadingId(null);
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (data.length === 0) {
    return (
      <div className="bg-muted border border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Belum ada data pembayaran.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((payment) => {
        const canPay =
          payment.status === 'PENDING' || payment.status === 'OVERDUE';

        return (
          <div key={payment.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{payment.enrollment.class.subject}</p>
              <p className="text-xs text-muted-foreground">Jatuh tempo: {format(new Date(payment.due_date), 'dd MMM yyyy')}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <p className="text-sm font-bold text-foreground">Rp {payment.amount.toLocaleString('id-ID')}</p>
              <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_COLORS[payment.status])}>
                {STATUS_LABELS[payment.status]}
              </span>
              {canPay && (
                <button
                  onClick={() => handleBayar(payment)}
                  disabled={loadingId === payment.id}
                  className="mt-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-60 shadow-sm">
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
