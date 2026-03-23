import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { getPaymentStatus } from '../api/client';

type PollStatus = 'polling' | 'paid' | 'timeout';

interface PaymentStatusViewProps {
  paymentId: string;
  onBack: () => void;
}

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

export function PaymentStatusView({ paymentId, onBack }: PaymentStatusViewProps) {
  const [pollStatus, setPollStatus] = useState<PollStatus>('polling');
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = async () => {
    try {
      const data = await getPaymentStatus(paymentId);
      if (data.status === 'PAID') {
        setPollStatus('paid');
        return;
      }
    } catch {
      // silently ignore fetch errors and keep polling
    }

    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setPollStatus('timeout');
      return;
    }

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  };

  const startPolling = () => {
    attemptsRef.current = 0;
    setPollStatus('polling');
    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    startPolling();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const handleManualRefresh = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startPolling();
  };

  return (
    <div className="pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        {pollStatus === 'polling' && (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">Memproses Pembayaran...</p>
              <p className="text-sm text-muted-foreground">Mohon tunggu, kami sedang memverifikasi pembayaran Anda.</p>
            </div>
          </>
        )}

        {pollStatus === 'paid' && (
          <>
            <CheckCircle className="w-20 h-20 text-success" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-xl font-bold text-foreground">Pembayaran Berhasil!</p>
              <p className="text-sm text-muted-foreground">Terima kasih, pembayaran Anda telah dikonfirmasi.</p>
            </div>
            <button
              onClick={onBack}
              className="mt-4 px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all active:scale-95 shadow-sm">
              Selesai
            </button>
          </>
        )}

        {pollStatus === 'timeout' && (
          <>
            <div className="w-20 h-20 rounded-full bg-warning-muted flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-warning" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">Masih Diproses</p>
              <p className="text-sm text-muted-foreground">
                Pembayaran Anda sedang diverifikasi. Coba cek kembali sebentar lagi.
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              className="mt-4 flex items-center gap-2 px-8 py-3 bg-muted border border-border text-foreground font-semibold rounded-xl transition-all active:scale-95">
              <RefreshCw className="w-4 h-4" /> Cek Lagi
            </button>
            <button onClick={onBack} className="text-muted-foreground text-sm underline">
              Kembali ke daftar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
