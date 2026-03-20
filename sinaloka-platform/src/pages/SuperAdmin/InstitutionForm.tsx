import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Label, PasswordInput, PageHeader, Select, Switch } from '../../components/UI';
import { toast } from 'sonner';
import { CreditCard, ChevronDown, CheckCircle2 } from 'lucide-react';
import {
  useCreateInstitution,
  useUpdateInstitution,
} from '@/src/hooks/useInstitutions';
import type { Institution } from '@/src/types/institution';
import { cn } from '../../lib/utils';
import api from '@/src/lib/api';

interface InstitutionFormProps {
  institution?: Institution;
}

type BillingMode = 'manual' | 'per_session' | 'package' | 'subscription';

const BILLING_MODES: { key: BillingMode; label: string; description: string }[] = [
  { key: 'manual', label: 'Manual', description: 'Tagihan dibuat dan dikelola secara manual' },
  { key: 'per_session', label: 'Per Sesi', description: 'Tagihan dihitung per sesi belajar' },
  { key: 'package', label: 'Paket', description: 'Tagihan berdasarkan paket yang dipilih' },
  { key: 'subscription', label: 'Langganan', description: 'Tagihan berulang secara berkala' },
];

export function InstitutionForm({ institution }: InstitutionFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEdit = !!institution;

  const createInstitution = useCreateInstitution();
  const updateInstitution = useUpdateInstitution();

  // Institution fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [defaultLanguage, setDefaultLanguage] = useState('id');
  const [isActive, setIsActive] = useState(true);

  // Admin fields (create mode only)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Billing fields (create mode only)
  const [showBilling, setShowBilling] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>('per_session');
  const [billingCurrency, setBillingCurrency] = useState('IDR');
  const [billingInvoicePrefix, setBillingInvoicePrefix] = useState('INV-');
  const [billingLatePaymentAutoLock, setBillingLatePaymentAutoLock] = useState(false);
  const [billingLatePaymentThreshold, setBillingLatePaymentThreshold] = useState(0);

  // Danger zone confirmation
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  useEffect(() => {
    if (institution) {
      setName(institution.name);
      setAddress(institution.address ?? '');
      setPhone(institution.phone ?? '');
      setEmail(institution.email ?? '');
      setTimezone(institution.timezone ?? 'Asia/Jakarta');
      setDefaultLanguage(institution.default_language ?? 'id');
      setIsActive(institution.is_active);
    }
  }, [institution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('superAdmin.form.nameRequired'));
      return;
    }

    try {
      if (isEdit) {
        await updateInstitution.mutateAsync({
          id: institution!.id,
          data: {
            name: name.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            timezone,
            default_language: defaultLanguage,
          },
        });
        toast.success(t('superAdmin.toast.updated'));
      } else {
        if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
          toast.error(t('superAdmin.form.adminRequired'));
          return;
        }
        const result = await createInstitution.mutateAsync({
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          timezone,
          default_language: defaultLanguage,
          admin: {
            name: adminName.trim(),
            email: adminEmail.trim(),
            password: adminPassword,
          },
        });

        // Optionally save billing settings if changed from defaults
        const hasCustomBilling =
          billingMode !== 'per_session' ||
          billingCurrency !== 'IDR' ||
          billingInvoicePrefix !== 'INV-' ||
          billingLatePaymentAutoLock;

        if (hasCustomBilling && result?.id) {
          try {
            await api.patch(
              '/api/settings/billing',
              {
                billing_mode: billingMode,
                currency: billingCurrency,
                invoice_prefix: billingInvoicePrefix,
                late_payment_auto_lock: billingLatePaymentAutoLock,
                late_payment_threshold: billingLatePaymentThreshold,
              },
              { params: { institution_id: result.id } }
            );
          } catch {
            // Don't fail the whole creation — billing is optional
            toast.error('Gagal menyimpan pengaturan billing');
          }
        }

        toast.success(t('superAdmin.toast.created'));
        navigate('/super/institutions');
      }
    } catch {
      toast.error(
        isEdit
          ? t('superAdmin.toast.updateError')
          : t('superAdmin.toast.createError')
      );
    }
  };

  const handleToggleActive = async () => {
    if (!institution) return;
    try {
      await updateInstitution.mutateAsync({
        id: institution.id,
        data: { is_active: !isActive },
      });
      setIsActive(!isActive);
      setShowDeactivateConfirm(false);
      toast.success(
        isActive
          ? t('superAdmin.toast.deactivated')
          : t('superAdmin.toast.activated')
      );
    } catch {
      toast.error(t('superAdmin.toast.updateError'));
    }
  };

  const isPending = createInstitution.isPending || updateInstitution.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Create mode header */}
      {!isEdit && (
        <PageHeader title={t('superAdmin.createInstitution')} subtitle={t('superAdmin.createInstitutionSubtitle')} />
      )}

      {/* Institution Details */}
      <Card>
        <h2 className="text-lg font-bold dark:text-zinc-100 mb-4">
          {t('superAdmin.form.institutionDetails')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('superAdmin.form.name')}{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('superAdmin.form.namePlaceholder')}
              required
            />
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>{t('superAdmin.form.slug')}</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                {institution?.slug}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('superAdmin.form.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('superAdmin.form.emailPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('superAdmin.form.phone')}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('superAdmin.form.phonePlaceholder')}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">{t('superAdmin.form.address')}</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('superAdmin.form.addressPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('superAdmin.form.timezone')}</Label>
            <Select
              value={timezone}
              onChange={(val) => setTimezone(val)}
              options={[
                { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
                { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA)' },
                { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT)' },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">
              {t('superAdmin.form.defaultLanguage')}
            </Label>
            <Select
              value={defaultLanguage}
              onChange={(val) => setDefaultLanguage(val)}
              options={[
                { value: 'id', label: 'Indonesian' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Billing & Payment (create mode only, collapsed by default) */}
      {!isEdit && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBilling(!showBilling)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Billing & Payment</span>
              <span className="text-xs text-muted-foreground">(opsional)</span>
            </div>
            <ChevronDown
              size={16}
              className={cn('text-muted-foreground transition-transform', showBilling && 'rotate-180')}
            />
          </button>

          {showBilling && (
            <div className="p-4 pt-0 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
              {/* Billing Mode */}
              <div className="space-y-2 pt-4">
                <Label>Mode Tagihan</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BILLING_MODES.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setBillingMode(mode.key)}
                      className={cn(
                        'relative flex flex-col gap-1 rounded-xl border p-4 text-left transition-all',
                        billingMode === mode.key
                          ? 'border-zinc-800 bg-zinc-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
                      )}
                    >
                      {billingMode === mode.key && (
                        <CheckCircle2 size={16} className="absolute right-3 top-3 shrink-0" />
                      )}
                      <span className="text-sm font-semibold">{mode.label}</span>
                      <span
                        className={cn(
                          'text-xs',
                          billingMode === mode.key
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
                <Label htmlFor="billingCurrency">Mata Uang</Label>
                <select
                  id="billingCurrency"
                  value={billingCurrency}
                  onChange={(e) => setBillingCurrency(e.target.value)}
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
                <Label htmlFor="billingInvoicePrefix">Prefix Invoice</Label>
                <Input
                  id="billingInvoicePrefix"
                  value={billingInvoicePrefix}
                  onChange={(e) => setBillingInvoicePrefix(e.target.value)}
                  placeholder="INV-"
                  className="max-w-[200px]"
                />
                <p className="text-xs text-zinc-500">
                  Contoh:{' '}
                  <span className="font-mono">
                    {billingInvoicePrefix || 'INV-'}2024-001
                  </span>
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
                  {billingLatePaymentAutoLock && (
                    <div className="flex items-center gap-2 pt-2">
                      <Label htmlFor="billingThreshold" className="text-xs whitespace-nowrap">
                        Threshold (hari)
                      </Label>
                      <Input
                        id="billingThreshold"
                        type="number"
                        min={1}
                        max={90}
                        value={billingLatePaymentThreshold}
                        onChange={(e) =>
                          setBillingLatePaymentThreshold(Number(e.target.value))
                        }
                        className="w-20"
                      />
                    </div>
                  )}
                </div>
                <Switch
                  checked={billingLatePaymentAutoLock}
                  onChange={setBillingLatePaymentAutoLock}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* First Admin (create mode only) */}
      {!isEdit && (
        <Card>
          <h2 className="text-lg font-bold dark:text-zinc-100 mb-4">
            {t('superAdmin.form.firstAdmin')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">
                {t('superAdmin.form.adminName')}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder={t('superAdmin.form.adminNamePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">
                {t('superAdmin.form.adminEmail')}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder={t('superAdmin.form.adminEmailPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">
                {t('superAdmin.form.adminPassword')}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <PasswordInput
                id="adminPassword"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? t('common.saving')
            : isEdit
              ? t('common.saveChanges')
              : t('superAdmin.createInstitution')}
        </Button>
      </div>

      {/* Danger Zone (edit mode only) */}
      {isEdit && (
        <Card className="!border-red-200 dark:!border-red-900/50">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
            {t('superAdmin.dangerZone')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {isActive
              ? t('superAdmin.deactivateWarning')
              : t('superAdmin.activateInfo')}
          </p>

          {showDeactivateConfirm ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {t('superAdmin.confirmToggle')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={updateInstitution.isPending}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {updateInstitution.isPending
                  ? t('common.processing')
                  : t('common.confirm')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              {isActive
                ? t('superAdmin.deactivateInstitution')
                : t('superAdmin.activateInstitution')}
            </button>
          )}
        </Card>
      )}
    </form>
  );
}

export default InstitutionForm;
