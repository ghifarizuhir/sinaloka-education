import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Label, PasswordInput, PageHeader, Select } from '../../components/UI';
import { toast } from 'sonner';
import {
  useCreateInstitution,
  useUpdateInstitution,
} from '@/src/hooks/useInstitutions';
import type { Institution } from '@/src/types/institution';

interface InstitutionFormProps {
  institution?: Institution;
}

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
        await createInstitution.mutateAsync({
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
