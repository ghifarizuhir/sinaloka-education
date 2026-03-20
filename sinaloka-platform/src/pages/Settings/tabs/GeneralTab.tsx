import React, { useState, useRef } from 'react';
import {
  Card, Button, Input, Label, Skeleton, ConfirmChangesModal
} from '../../../components/UI';
import type { FieldChange } from '../../../components/UI';
import {
  Building2, Save
} from 'lucide-react';
import { collectChanges, detectScalarChange } from '../../../lib/change-detection';
import { toast } from 'sonner';
import type { SettingsPageState } from '../useSettingsPage';

type GeneralTabProps = Pick<SettingsPageState,
  't' | 'isLoadingGeneral' | 'updateSettings' |
  'formName' | 'setFormName' | 'formEmail' | 'setFormEmail' |
  'formPhone' | 'setFormPhone' | 'formAddress' | 'setFormAddress' |
  'formTimezone' | 'setFormTimezone' | 'formLanguage' | 'setFormLanguage' |
  'handleSaveGeneral'
>;

export const GeneralTab = ({
  t, isLoadingGeneral, updateSettings,
  formName, setFormName, formEmail, setFormEmail,
  formPhone, setFormPhone, formAddress, setFormAddress,
  formTimezone, setFormTimezone, formLanguage, setFormLanguage,
  handleSaveGeneral,
}: GeneralTabProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);
  const initialRef = useRef<Record<string, string> | null>(null);

  if (!isLoadingGeneral && !initialRef.current) {
    initialRef.current = {
      name: formName, email: formEmail, phone: formPhone,
      address: formAddress, timezone: formTimezone, language: formLanguage,
    };
  }

  const handleSaveClick = () => {
    if (!initialRef.current) return;
    const changes = collectChanges(
      detectScalarChange('Nama', initialRef.current.name, formName),
      detectScalarChange('Email', initialRef.current.email, formEmail),
      detectScalarChange('Telepon', initialRef.current.phone, formPhone),
      detectScalarChange('Alamat', initialRef.current.address, formAddress),
      detectScalarChange('Timezone', initialRef.current.timezone, formTimezone),
      detectScalarChange('Bahasa', initialRef.current.language, formLanguage),
    );
    if (changes.length === 0) {
      toast.info('Tidak ada perubahan');
      return;
    }
    setPendingChanges(changes);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    handleSaveGeneral();
    setShowConfirm(false);
    initialRef.current = {
      name: formName, email: formEmail, phone: formPhone,
      address: formAddress, timezone: formTimezone, language: formLanguage,
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
          <Building2 size={20} className="text-zinc-400" />
          {t('settings.general.institutionInfo')}
        </h3>
        {isLoadingGeneral ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>{t('settings.general.institutionName')}</Label>
                <Input value={formName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.general.supportEmail')}</Label>
                <Input type="email" value={formEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.general.phone')}</Label>
                <Input value={formPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPhone(e.target.value)} placeholder="+62 812 3456 7890" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.general.address')}</Label>
                <Input value={formAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormAddress(e.target.value)} placeholder={t('settings.general.addressPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.general.timezone')}</Label>
                <select
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                  <option value="Asia/Makassar">Asia/Makassar (GMT+8)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (GMT+9)</option>
                  <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.general.language')}</Label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English (US)</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button className="gap-2" onClick={handleSaveClick} disabled={updateSettings.isPending}>
                <Save size={16} />
                {updateSettings.isPending ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </>
        )}
      </Card>

      <ConfirmChangesModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        changes={pendingChanges}
        isLoading={updateSettings.isPending}
      />
    </div>
  );
};
