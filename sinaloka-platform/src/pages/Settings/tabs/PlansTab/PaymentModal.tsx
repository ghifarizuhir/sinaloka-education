import React, { useState } from 'react';
import { CreditCard, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button } from '../../../../components/UI';
import { cn } from '../../../../lib/utils';
import { useCreatePayment } from '../../../../hooks/useSubscription';

type PaymentMethod = 'MIDTRANS' | 'MANUAL_TRANSFER';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'GROWTH' | 'BUSINESS';
  type: 'new' | 'renewal';
  price: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function PaymentModal({ isOpen, onClose, planType, type, price }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('MIDTRANS');
  const [proofUrl, setProofUrl] = useState('');
  const createPayment = useCreatePayment();

  const handleClose = () => {
    setMethod('MIDTRANS');
    setProofUrl('');
    onClose();
  };

  const handleSubmit = () => {
    const payload = {
      plan_type: planType,
      method,
      type,
      ...(method === 'MANUAL_TRANSFER' && proofUrl ? { proof_url: proofUrl } : {}),
    };

    createPayment.mutate(payload, {
      onSuccess: (data) => {
        if (method === 'MIDTRANS' && data.snap_redirect_url) {
          window.location.href = data.snap_redirect_url;
        } else {
          toast.success('Menunggu konfirmasi admin');
          handleClose();
        }
      },
    });
  };

  const planLabel = planType === 'GROWTH' ? 'Growth Plan' : 'Business Plan';
  const typeLabel = type === 'renewal' ? 'Perpanjang' : 'Upgrade ke';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${typeLabel} ${planLabel}`}
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Total pembayaran</span>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(price)}</span>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Pilih metode pembayaran</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('MIDTRANS')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-colors focus:outline-none',
                method === 'MIDTRANS'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
              )}
            >
              <CreditCard size={22} />
              <span>Bayar via Midtrans</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('MANUAL_TRANSFER')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-colors focus:outline-none',
                method === 'MANUAL_TRANSFER'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
              )}
            >
              <Upload size={22} />
              <span>Transfer Manual</span>
            </button>
          </div>
        </div>

        {method === 'MANUAL_TRANSFER' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              URL Bukti Transfer
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Upload bukti transfer ke Google Drive / cloud storage lalu paste link-nya di sini.
            </p>
          </div>
        )}

        {method === 'MIDTRANS' && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Anda akan diarahkan ke halaman pembayaran Midtrans untuk menyelesaikan transaksi.
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={handleClose} disabled={createPayment.isPending}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createPayment.isPending || (method === 'MANUAL_TRANSFER' && !proofUrl)}
            className="gap-2"
          >
            {createPayment.isPending ? 'Memproses...' : method === 'MIDTRANS' ? 'Lanjutkan Pembayaran' : 'Kirim Bukti Transfer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
