import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type PaymentRedirectStatus = 'finish' | 'unfinish' | 'error';

interface PaymentRedirectPageProps {
  status: PaymentRedirectStatus;
  onBack: () => void;
}

const CONFIG: Record<PaymentRedirectStatus, {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonClass: string;
}> = {
  finish: {
    icon: <CheckCircle className="w-16 h-16 text-success" />,
    title: 'Pembayaran Berhasil',
    description: 'Pembayaran Anda sedang diproses. Status akan diperbarui secara otomatis.',
    buttonClass: 'bg-primary text-primary-foreground',
  },
  unfinish: {
    icon: <AlertTriangle className="w-16 h-16 text-warning" />,
    title: 'Pembayaran Belum Selesai',
    description: 'Anda belum menyelesaikan pembayaran. Silakan coba lagi dari halaman tagihan.',
    buttonClass: 'bg-warning text-foreground',
  },
  error: {
    icon: <XCircle className="w-16 h-16 text-destructive" />,
    title: 'Pembayaran Gagal',
    description: 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi nanti.',
    buttonClass: 'bg-destructive text-primary-foreground',
  },
};

export function PaymentRedirectPage({ status, onBack }: PaymentRedirectPageProps) {
  const config = CONFIG[status];

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">{config.icon}</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{config.description}</p>
        </div>
        <button
          onClick={onBack}
          className={`w-full ${config.buttonClass} font-semibold py-3 rounded-xl transition-all hover:opacity-90 shadow-sm`}
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
