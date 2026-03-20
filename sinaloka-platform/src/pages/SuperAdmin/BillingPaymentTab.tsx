import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Wallet, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Button, Input, Label, Switch, Badge, Skeleton, ConfirmChangesModal } from '../../components/UI';
import type { FieldChange } from '../../components/UI';
import { cn } from '../../lib/utils';
import { collectChanges, detectScalarChange, detectSecretChange } from '../../lib/change-detection';
import api from '@/src/lib/api';
import type { BillingSettings, PaymentGatewaySettings } from '@/src/types/settings';

interface BillingPaymentTabProps {
  institutionId: string;
}

type BillingMode = 'manual' | 'per_session' | 'package' | 'subscription';

const BILLING_MODES: { key: BillingMode; label: string; description: string }[] = [
  { key: 'manual', label: 'Manual', description: 'Tagihan dibuat dan dikelola secara manual' },
  { key: 'per_session', label: 'Per Sesi', description: 'Tagihan dihitung per sesi belajar' },
  { key: 'package', label: 'Paket', description: 'Tagihan berdasarkan paket yang dipilih' },
  { key: 'subscription', label: 'Langganan', description: 'Tagihan berulang secara berkala' },
];

export default function BillingPaymentTab({ institutionId }: BillingPaymentTabProps) {
  const queryClient = useQueryClient();

  // Form state — Billing
  const [formBillingMode, setFormBillingMode] = useState<BillingMode>('per_session');
  const [formCurrency, setFormCurrency] = useState('IDR');
  const [formInvoicePrefix, setFormInvoicePrefix] = useState('INV');
  const [formLatePaymentAutoLock, setFormLatePaymentAutoLock] = useState(false);
  const [formLatePaymentThreshold, setFormLatePaymentThreshold] = useState(7);

  // Form state — Payment Gateway
  const [formServerKey, setFormServerKey] = useState('');
  const [formClientKey, setFormClientKey] = useState('');
  const [formIsSandbox, setFormIsSandbox] = useState(true);

  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);

  // Initial state refs for change detection
  const initialBillingRef = useRef<Record<string, string> | null>(null);
  const initialPGRef = useRef<Record<string, string> | null>(null);

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

  // Fetch payment gateway settings
  const { data: paymentGateway, isLoading: isLoadingPG } = useQuery({
    queryKey: ['settings', 'payment-gateway', institutionId],
    queryFn: () =>
      api
        .get<PaymentGatewaySettings>('/api/settings/payment-gateway', {
          params: { institution_id: institutionId },
        })
        .then((r) => r.data),
  });

  // Sync fetched billing data into form state
  useEffect(() => {
    if (!billing) return;
    const mode = billing.billing_mode;
    if (mode === 'manual' || mode === 'per_session' || mode === 'package' || mode === 'subscription') {
      setFormBillingMode(mode);
    }

    setFormCurrency(billing.currency ?? 'IDR');
    setFormInvoicePrefix(billing.invoice_prefix ?? 'INV');
    setFormLatePaymentAutoLock(billing.late_payment_auto_lock ?? false);
    setFormLatePaymentThreshold(billing.late_payment_threshold ?? 7);
    // Capture initial state after sync
    initialBillingRef.current = {
      billing_mode: mode,
      currency: billing.currency ?? 'IDR',
      invoice_prefix: billing.invoice_prefix ?? 'INV',
      late_payment: billing.late_payment_auto_lock
        ? `Aktif (${billing.late_payment_threshold} hari)`
        : 'Nonaktif',
    };
  }, [billing]);

  // Sync fetched payment gateway data into form state
  useEffect(() => {
    if (!paymentGateway) return;
    setFormClientKey(paymentGateway.midtrans_client_key ?? '');
    setFormIsSandbox(paymentGateway.is_sandbox ?? true);
    // Server key is masked — don't pre-fill
    initialPGRef.current = {
      client_key: paymentGateway.midtrans_client_key ?? '',
      is_sandbox: paymentGateway.is_sandbox ? 'Aktif' : 'Nonaktif',
    };
  }, [paymentGateway]);

  // Save mutation — calls both PATCH endpoints
  const saveMutation = useMutation({
    mutationFn: async () => {
      const billingPayload = {
        billing_mode: formBillingMode,
        currency: formCurrency,
        invoice_prefix: formInvoicePrefix,
        late_payment_auto_lock: formLatePaymentAutoLock,
        late_payment_threshold: formLatePaymentThreshold,
      };
      const pgPayload: Record<string, unknown> = { is_sandbox: formIsSandbox };
      if (formServerKey) pgPayload.midtrans_server_key = formServerKey;
      if (formClientKey) pgPayload.midtrans_client_key = formClientKey;

      await Promise.all([
        api.patch('/api/settings/billing', billingPayload, {
          params: { institution_id: institutionId },
        }),
        api.patch('/api/settings/payment-gateway', pgPayload, {
          params: { institution_id: institutionId },
        }),
      ]);
    },
    onSuccess: () => {
      toast.success('Pengaturan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings', 'billing', institutionId] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'payment-gateway', institutionId] });
      setFormServerKey('');
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  const isLoading = isLoadingBilling || isLoadingPG;

  const handleSaveClick = () => {
    const changes = collectChanges(
      initialBillingRef.current ? detectScalarChange('Billing Mode', initialBillingRef.current.billing_mode, formBillingMode) : null,
      initialBillingRef.current ? detectScalarChange('Currency', initialBillingRef.current.currency, formCurrency) : null,
      initialBillingRef.current ? detectScalarChange('Invoice Prefix', initialBillingRef.current.invoice_prefix, formInvoicePrefix) : null,
      initialBillingRef.current ? detectScalarChange(
        'Late Payment Auto-Lock',
        initialBillingRef.current.late_payment,
        formLatePaymentAutoLock ? `Aktif (${formLatePaymentThreshold} hari)` : 'Nonaktif',
      ) : null,
      detectSecretChange('Midtrans Server Key', formServerKey),
      initialPGRef.current ? detectScalarChange('Midtrans Client Key', initialPGRef.current.client_key, formClientKey) : null,
      initialPGRef.current ? detectScalarChange('Mode Sandbox', initialPGRef.current.is_sandbox, formIsSandbox ? 'Aktif' : 'Nonaktif') : null,
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
      billing_mode: formBillingMode,
      currency: formCurrency,
      invoice_prefix: formInvoicePrefix,
      late_payment: formLatePaymentAutoLock
        ? `Aktif (${formLatePaymentThreshold} hari)`
        : 'Nonaktif',
    };
    initialPGRef.current = {
      client_key: formClientKey,
      is_sandbox: formIsSandbox ? 'Aktif' : 'Nonaktif',
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
            {/* Billing Mode */}
            <div className="space-y-2">
              <Label>Mode Tagihan</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BILLING_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setFormBillingMode(mode.key)}
                    className={cn(
                      'relative flex flex-col gap-1 rounded-xl border p-4 text-left transition-all',
                      formBillingMode === mode.key
                        ? 'border-zinc-800 bg-zinc-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
                    )}
                  >
                    {formBillingMode === mode.key && (
                      <CheckCircle2
                        size={16}
                        className="absolute right-3 top-3 shrink-0"
                      />
                    )}
                    <span className="text-sm font-semibold">{mode.label}</span>
                    <span
                      className={cn(
                        'text-xs',
                        formBillingMode === mode.key
                          ? 'text-zinc-300 dark:text-zinc-600'
                          : 'text-zinc-500'
                      )}
                    >
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-zinc-400" />
            <h3 className="text-lg font-bold dark:text-zinc-100">Payment Gateway</h3>
          </div>
          {!isLoadingPG && (
            <Badge variant={paymentGateway?.is_configured ? 'success' : 'default'}>
              {paymentGateway?.is_configured ? 'Terhubung' : 'Belum dikonfigurasi'}
            </Badge>
          )}
        </div>

        {isLoadingPG ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Warning if not configured */}
            {!paymentGateway?.is_configured && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Payment gateway belum dikonfigurasi. Masukkan Midtrans Server Key dan Client Key
                  untuk mengaktifkan pembayaran online.
                </p>
              </div>
            )}

            {/* Midtrans Server Key */}
            <div className="space-y-2">
              <Label htmlFor="serverKey">Midtrans Server Key</Label>
              <Input
                id="serverKey"
                type="password"
                value={formServerKey}
                onChange={(e) => setFormServerKey(e.target.value)}
                placeholder={
                  paymentGateway?.midtrans_server_key_masked
                    ? paymentGateway.midtrans_server_key_masked
                    : 'sk-mid-...'
                }
              />
              {paymentGateway?.midtrans_server_key_masked && (
                <p className="text-xs text-zinc-500">
                  Kosongkan jika tidak ingin mengubah server key yang ada.
                </p>
              )}
            </div>

            {/* Midtrans Client Key */}
            <div className="space-y-2">
              <Label htmlFor="clientKey">Midtrans Client Key</Label>
              <Input
                id="clientKey"
                value={formClientKey}
                onChange={(e) => setFormClientKey(e.target.value)}
                placeholder="pk-mid-..."
              />
            </div>

            {/* Sandbox Mode */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
              <div className="space-y-1">
                <p className="text-sm font-medium dark:text-zinc-100">Mode Sandbox</p>
                <p className="text-xs text-zinc-500">
                  Aktifkan untuk transaksi uji coba. Nonaktifkan di produksi.
                </p>
              </div>
              <Switch checked={formIsSandbox} onChange={setFormIsSandbox} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Save Button ── */}
      <div className="flex justify-end">
        <Button
          className="gap-2"
          onClick={handleSaveClick}
          disabled={saveMutation.isPending || isLoading}
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
