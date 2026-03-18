import React from 'react';
import {
  Card, Switch, Label
} from '../../../components/UI';
import {
  ShieldCheck, Smartphone
} from 'lucide-react';
import type { SettingsPageState } from '../useSettingsPage';

type SecurityTabProps = Pick<SettingsPageState, 't'>;

export const SecurityTab = ({
  t,
}: SecurityTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
          <ShieldCheck size={20} className="text-zinc-400" />
          {t('settings.security.securityTitle')}
        </h3>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">{t('settings.security.twoFactorAuth')}</p>
                <p className="text-xs text-zinc-500">{t('settings.security.twoFactorAuthDesc')}</p>
              </div>
            </div>
            <Switch checked={false} onChange={() => {}} />
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <Label>{t('settings.security.passwordPolicy')}</Label>
            <div className="space-y-3">
              {[
                { label: t('settings.security.minChars'), active: true },
                { label: t('settings.security.includeNumbers'), active: true },
                { label: t('settings.security.includeSpecialChars'), active: false },
                { label: t('settings.security.requirePasswordChange'), active: false },
              ].map((policy, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{policy.label}</span>
                  <Switch checked={policy.active} onChange={() => {}} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
