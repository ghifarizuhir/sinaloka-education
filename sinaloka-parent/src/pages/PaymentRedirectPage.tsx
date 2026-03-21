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
  color: string;
}> = {
  finish: {
    icon: <CheckCircle className="w-16 h-16 text-lime-400" />,
    title: 'Pembayaran Berhasil',
    description: 'Pembayaran Anda sedang diproses. Status akan diperbarui secara otomatis.',
    color: 'bg-lime-400',
  },
  unfinish: {
    icon: <AlertTriangle className="w-16 h-16 text-amber-400" />,
    title: 'Pembayaran Belum Selesai',
    description: 'Anda belum menyelesaikan pembayaran. Silakan coba lagi dari halaman tagihan.',
    color: 'bg-amber-400',
  },
  error: {
    icon: <XCircle className="w-16 h-16 text-red-400" />,
    title: 'Pembayaran Gagal',
    description: 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi nanti.',
    color: 'bg-red-400',
  },
};

export function PaymentRedirectPage({ status, onBack }: PaymentRedirectPageProps) {
  const config = CONFIG[status];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">{config.icon}</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">{config.description}</p>
        </div>
        <button
          onClick={onBack}
          className={`w-full ${config.color} text-black font-semibold py-3 rounded-xl transition-all hover:opacity-90`}
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
