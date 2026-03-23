import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import api, { checkoutPayment } from '../api/client';
import { ErrorState } from '../components/ErrorState';
import type { ChildSummary, PaymentRecord } from '../types';

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

interface BillWithChild extends PaymentRecord {
  childName: string;
  childId: string;
}

interface BillsPageProps {
  children: ChildSummary[];
  isLoading: boolean;
  onNavigateToChild: (childId: string, tab?: string) => void;
}

export function BillsPage({ children, isLoading, onNavigateToChild }: BillsPageProps) {
  const [bills, setBills] = useState<BillWithChild[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchAllBills = useCallback(async () => {
    if (children.length === 0) return;
    setIsFetching(true);
    setFetchError(null);

    const results = await Promise.allSettled(
      children.map(async (child) => {
        const res = await api.get(`/api/parent/children/${child.id}/payments`, { params: { limit: 50 } });
        const payments: PaymentRecord[] = res.data.data.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          due_date: p.due_date,
          paid_date: p.paid_date,
          status: p.status,
          method: p.method,
          gateway_configured: res.data.gateway_configured ?? false,
          enrollment: {
            class: { name: p.enrollment?.class?.name ?? '', subject: p.enrollment?.class?.subject ?? '' },
          },
        }));
        return payments
          .filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE')
          .map((p) => ({ ...p, childName: child.name, childId: child.id }));
      }),
    );

    const allBills: BillWithChild[] = [];
    let failedCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allBills.push(...result.value);
      } else {
        failedCount++;
      }
    }

    // Sort: OVERDUE first, then by due_date ascending
    allBills.sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    setBills(allBills);
    if (failedCount > 0 && allBills.length === 0) {
      setFetchError('Gagal memuat data tagihan');
    } else if (failedCount > 0) {
      toast.error(`Gagal memuat tagihan ${failedCount} anak`);
    }
    setIsFetching(false);
  }, [children]);

  useEffect(() => {
    fetchAllBills();
  }, [fetchAllBills]);

  const handleBayar = async (payment: BillWithChild) => {
    setLoadingId(payment.id);
    const newWindow = window.open('', '_blank');
    try {
      const result = await checkoutPayment(payment.id);
      if (newWindow && !newWindow.closed) {
        newWindow.location.href = result.redirect_url;
      } else {
        window.location.href = result.redirect_url;
      }
    } catch (err: unknown) {
      if (newWindow && !newWindow.closed) newWindow.close();
      const message = (err as any)?.response?.data?.message || 'Gagal memproses pembayaran';
      toast.error(message);
    } finally {
      setLoadingId(null);
    }
  };

  const loading = isLoading || isFetching;
  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tagihan</h1>
        {!loading && bills.length > 0 && (
          <button onClick={fetchAllBills} className="text-primary hover:text-primary/80">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {fetchError ? (
        <ErrorState message={fetchError} onRetry={fetchAllBills} />
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-card rounded-xl h-20 animate-pulse shadow-sm" />)}
        </div>
      ) : bills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-16 text-muted-foreground"
        >
          <div className="w-16 h-16 rounded-full bg-success-muted flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-success" />
          </div>
          <p className="text-sm font-semibold text-foreground">Tidak ada tagihan</p>
          <p className="text-xs text-muted-foreground mt-1">Semua pembayaran sudah lunas</p>
        </motion.div>
      ) : (
        <>
          {/* Summary banner */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning-muted/50 border border-warning/15 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-warning">Total Tagihan</p>
              <p className="text-lg font-bold text-foreground">Rp {totalAmount.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-warning">{bills.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</p>
            </div>
          </motion.div>

          {/* Bill cards */}
          <div className="space-y-2">
            {bills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onNavigateToChild(bill.childId, 'payments')}
                className="bg-card border border-border rounded-xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{bill.enrollment.class.subject}</p>
                    <p className="text-xs text-muted-foreground">{bill.childName}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ml-2 shrink-0', STATUS_COLORS[bill.status])}>
                    {STATUS_LABELS[bill.status]}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">Rp {bill.amount.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-muted-foreground">Jatuh tempo: {format(new Date(bill.due_date), 'dd MMM yyyy', { locale: localeId })}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBayar(bill); }}
                    disabled={loadingId === bill.id}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-60 shadow-sm"
                  >
                    {loadingId === bill.id ? '...' : 'Bayar'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
