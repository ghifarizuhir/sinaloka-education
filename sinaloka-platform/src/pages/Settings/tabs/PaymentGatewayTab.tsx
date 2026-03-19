import React from 'react';
import {
  Card, Button, Input, Label, Skeleton, Badge, Switch
} from '../../../components/UI';
import {
  Wallet, Save, CheckCircle2, AlertTriangle
} from 'lucide-react';
import type { SettingsPageState } from '../useSettingsPage';

type PaymentGatewayTabProps = Pick<SettingsPageState,
  't' | 'isLoadingPaymentGateway' | 'updatePaymentGateway' |
  'formServerKey' | 'setFormServerKey' |
  'formClientKey' | 'setFormClientKey' |
  'formIsSandbox' | 'setFormIsSandbox' |
  'paymentGatewayConfigured' |
  'handleSavePaymentGateway'
>;

export const PaymentGatewayTab = ({
  t, isLoadingPaymentGateway, updatePaymentGateway,
  formServerKey, setFormServerKey,
  formClientKey, setFormClientKey,
  formIsSandbox, setFormIsSandbox,
  paymentGatewayConfigured,
  handleSavePaymentGateway,
}: PaymentGatewayTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold dark:text-zinc-100 flex items-center gap-2">
              <Wallet size={20} className="text-zinc-400" />
              {t('settings.paymentGateway.title')}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">{t('settings.paymentGateway.subtitle')}</p>
          </div>
          {paymentGatewayConfigured ? (
            <Badge variant="success" className="flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              {t('settings.paymentGateway.statusConnected')}
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {t('settings.paymentGateway.statusNotConfigured')}
            </Badge>
          )}
        </div>

        {isLoadingPaymentGateway ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>{t('settings.paymentGateway.serverKey')}</Label>
                <Input
                  type="password"
                  value={formServerKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormServerKey(e.target.value)}
                  placeholder={t('settings.paymentGateway.serverKeyPlaceholder')}
                />
                <p className="text-xs text-zinc-400">{t('settings.paymentGateway.serverKeyHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.paymentGateway.clientKey')}</Label>
                <Input
                  type="text"
                  value={formClientKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormClientKey(e.target.value)}
                  placeholder={t('settings.paymentGateway.clientKeyPlaceholder')}
                />
                <p className="text-xs text-zinc-400">{t('settings.paymentGateway.clientKeyHint')}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="text-sm font-medium dark:text-zinc-200">{t('settings.paymentGateway.sandboxMode')}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t('settings.paymentGateway.sandboxModeDesc')}</p>
              </div>
              <Switch checked={formIsSandbox} onChange={setFormIsSandbox} />
            </div>

            {!paymentGatewayConfigured && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/30">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t('settings.paymentGateway.notConfiguredWarning')}
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <Button className="gap-2" onClick={handleSavePaymentGateway} disabled={updatePaymentGateway.isPending}>
                <Save size={16} />
                {updatePaymentGateway.isPending ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
