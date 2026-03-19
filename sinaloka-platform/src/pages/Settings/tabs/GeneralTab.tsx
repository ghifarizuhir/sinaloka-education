import React from 'react';
import {
  Card, Button, Input, Label, Skeleton
} from '../../../components/UI';
import {
  Building2, Save
} from 'lucide-react';
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
              <Button className="gap-2" onClick={handleSaveGeneral} disabled={updateSettings.isPending}>
                <Save size={16} />
                {updateSettings.isPending ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
