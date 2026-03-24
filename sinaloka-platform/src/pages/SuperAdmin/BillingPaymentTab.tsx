import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Wallet, Save } from 'lucide-react';
import { Card, Button, Input, Label, Switch, Skeleton, ConfirmChangesModal } from '../../components/UI';
import type { FieldChange } from '../../components/UI';
import { cn } from '../../lib/utils';
import { collectChanges, detectScalarChange } from '../../lib/change-detection';
import api from '@/src/lib/api';
import type { BillingSettings } from '@/src/types/settings';
import type { Institution } from '@/src/types/institution';

interface BillingPaymentTabProps {
  institutionId: string;
}

export default function BillingPaymentTab({ institutionId }: BillingPaymentTabProps) {
  const queryClient = useQueryClient();

  // Form state — Billing
  const [formCurrency, setFormCurrency] = useState('IDR');
  const [formInvoicePrefix, setFormInvoicePrefix] = useState('INV');
  const [formLatePaymentAutoLock, setFormLatePaymentAutoLock] = useState(false);
  const [formLatePaymentThreshold, setFormLatePaymentThreshold] = useState(7);

  // Override billing mode state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideMode, setOverrideMode] = useState<'PER_SESSION' | 'MONTHLY_FIXED'>('PER_SESSION');

  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);

  // Initial state refs for change detection
  const initialBillingRef = useRef<Record<string, string> | null>(null);

  // Fetch institution to get billing_mode
  const { data: institution } = useQuery({
    queryKey: ['institutions', institutionId],
    queryFn: () =>
      api.get<Institution>(`/api/admin/institutions/${institutionId}`).then((r) => r.data),
  });

  const billingMode = institution?.billing_mode;

  // Fetch billing settings
  const { data: billing, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['settings', 'billing', institutionId],
    queryFn: () =>
      api
        .get<BillingSettings>('/api/settings/billing', {
          params: { institution_id: institutionId },
        })
        .then((r) => r.data),
  });

  // Sync fetched billing data into form state
  useEffect(() => {
    if (!billing) return;

    setFormCurrency(billing.currency ?? 'IDR');
    setFormInvoicePrefix(billing.invoice_prefix ?? 'INV');
    setFormLatePaymentAutoLock(billing.late_payment_auto_lock ?? false);
    setFormLatePaymentThreshold(billing.late_payment_threshold ?? 7);
    // Capture initial state after sync
    initialBillingRef.current = {
      currency: billing.currency ?? 'IDR',
      invoice_prefix: billing.invoice_prefix ?? 'INV',
      late_payment: billing.late_payment_auto_lock
        ? `Aktif (${billing.late_payment_threshold} hari)`
        : 'Nonaktif',
    };
  }, [billing]);

  // Save mutation — billing only
  const saveMutation = useMutation({
    mutationFn: async () => {
      const billingPayload = {
        currency: formCurrency,
        invoice_prefix: formInvoicePrefix,
        late_payment_auto_lock: formLatePaymentAutoLock,
        late_payment_threshold: formLatePaymentThreshold,
      };

      await api.patch('/api/settings/billing', billingPayload, {
        params: { institution_id: institutionId },
      });
    },
    onSuccess: () => {
      toast.success('Pengaturan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings', 'billing', institutionId] });
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  // Override billing mode mutation
  const overrideMutation = useMutation({
    mutationFn: (mode: string) =>
      api.patch(`/api/admin/institutions/${institutionId}/billing-mode`, { billing_mode: mode }),
    onSuccess: () => {
      toast.success('Billing mode updated');
      queryClient.invalidateQueries({ queryKey: ['institutions', institutionId] });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      setShowOverride(false);
    },
    onError: () => toast.error('Gagal mengubah billing mode'),
  });

  const handleSaveClick = () => {
    const changes = collectChanges(
      initialBillingRef.current ? detectScalarChange('Currency', initialBillingRef.current.currency, formCurrency) : null,
      initialBillingRef.current ? detectScalarChange('Invoice Prefix', initialBillingRef.current.invoice_prefix, formInvoicePrefix) : null,
      initialBillingRef.current ? detectScalarChange(
        'Late Payment Auto-Lock',
        initialBillingRef.current.late_payment,
        formLatePaymentAutoLock ? `Aktif (${formLatePaymentThreshold} hari)` : 'Nonaktif',
      ) : null,
    );
    if (changes.length === 0) {
      toast.info('Tidak ada perubahan');
      return;
    }
    setPendingChanges(changes);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    initialBillingRef.current = {
      currency: formCurrency,
      invoice_prefix: formInvoicePrefix,
      late_payment: formLatePaymentAutoLock
        ? `Aktif (${formLatePaymentThreshold} hari)`
        : 'Nonaktif',
    };
    saveMutation.mutate();
    setShowConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Card 1: Billing Configuration ── */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <CreditCard size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">Konfigurasi Billing</h3>
        </div>

        {isLoadingBilling ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Billing Mode — read-only with override */}
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">Mode Billing</p>
                <p className="text-lg font-semibold dark:text-zinc-100">
                  {billingMode === 'PER_SESSION' ? 'Per Sesi' :
                   billingMode === 'MONTHLY_FIXED' ? 'Bulanan Tetap' :
                   'Belum diatur'}
                </p>
              </div>

              {!showOverride ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOverrideMode(billingMode === 'MONTHLY_FIXED' ? 'PER_SESSION' : 'MONTHLY_FIXED');
                    setShowOverride(true);
                  }}
                >
                  Override Billing Mode
                </Button>
              ) : (
                <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 space-y-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Override billing mode untuk institusi ini. Perubahan ini bersifat permanen.
                  </p>
                  <div className="flex items-center gap-3">
                    <select
                      value={overrideMode}
                      onChange={(e) => setOverrideMode(e.target.value as 'PER_SESSION' | 'MONTHLY_FIXED')}
                      className={cn(
                        'flex h-9 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm',
                        'text-zinc-900 shadow-sm transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-zinc-400',
                        'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                      )}
                    >
                      <option value="PER_SESSION">Per Sesi</option>
                      <option value="MONTHLY_FIXED">Bulanan Tetap</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={() => overrideMutation.mutate(overrideMode)}
                      disabled={overrideMutation.isPending || overrideMode === billingMode}
                    >
                      {overrideMutation.isPending ? 'Menyimpan...' : 'Terapkan'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowOverride(false)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Mata Uang</Label>
              <select
                id="currency"
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className={cn(
                  'flex h-9 w-full max-w-[200px] rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm',
                  'text-zinc-900 shadow-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400',
                  'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600'
                )}
              >
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD — Dollar</option>
              </select>
            </div>

            {/* Invoice Prefix */}
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Prefix Invoice</Label>
              <Input
                id="invoicePrefix"
                value={formInvoicePrefix}
                onChange={(e) => setFormInvoicePrefix(e.target.value)}
                placeholder="INV"
                className="max-w-[200px]"
              />
              <p className="text-xs text-zinc-500">
                Contoh: <span className="font-mono">{formInvoicePrefix || 'INV'}-2024-001</span>
              </p>
            </div>

            {/* Late Payment Auto-Lock */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
              <div className="space-y-1">
                <p className="text-sm font-medium dark:text-zinc-100">
                  Auto-Lock Keterlambatan Pembayaran
                </p>
                <p className="text-xs text-zinc-500">
                  Kunci akses siswa secara otomatis jika pembayaran terlambat
                </p>
                {formLatePaymentAutoLock && (
                  <div className="flex items-center gap-2 pt-2">
                    <Label htmlFor="threshold" className="text-xs whitespace-nowrap">
                      Threshold (hari)
                    </Label>
                    <Input
                      id="threshold"
                      type="number"
                      min={1}
                      max={90}
                      value={formLatePaymentThreshold}
                      onChange={(e) => setFormLatePaymentThreshold(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
              <Switch
                checked={formLatePaymentAutoLock}
                onChange={setFormLatePaymentAutoLock}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Card 2: Payment Gateway ── */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Wallet size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">Payment Gateway</h3>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-400 text-sm">
            Payment gateway dikelola di level platform. Semua institusi otomatis terhubung ke Midtrans.
          </p>
        </div>
      </Card>

      {/* ── Save Button ── */}
      <div className="flex justify-end">
        <Button
          className="gap-2"
          onClick={handleSaveClick}
          disabled={saveMutation.isPending || isLoadingBilling}
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>

      <ConfirmChangesModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        changes={pendingChanges}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}
