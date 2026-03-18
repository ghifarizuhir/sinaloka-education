import React from 'react';
import {
  Card
} from '../../../components/UI';
import {
  Puzzle, CreditCard, Smartphone, Mail, Calendar, ExternalLink
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SettingsPageState } from '../useSettingsPage';

type IntegrationsTabProps = Pick<SettingsPageState, 't'>;

export const IntegrationsTab = ({
  t,
}: IntegrationsTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
          <Puzzle size={20} className="text-zinc-400" />
          {t('settings.integrations.connectedServices')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: t('settings.integrations.whatsappApi'), desc: t('settings.integrations.whatsappDesc'), icon: Smartphone, status: 'connected', color: 'text-emerald-500' },
            { name: t('settings.integrations.midtrans'), desc: t('settings.integrations.midtransDesc'), icon: CreditCard, status: 'notConnected', color: 'text-zinc-400' },
            { name: t('settings.integrations.sendgrid'), desc: t('settings.integrations.sendgridDesc'), icon: Mail, status: 'connected', color: 'text-emerald-500' },
            { name: t('settings.integrations.googleCalendar'), desc: t('settings.integrations.googleCalendarDesc'), icon: Calendar, status: 'notConnected', color: 'text-zinc-400' },
          ].map((service, i) => (
            <div key={i} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between hover:border-zinc-200 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                  <service.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">{service.name}</p>
                  <p className="text-[10px] text-zinc-500">{service.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold uppercase", service.color)}>
                  {service.status === 'connected' ? t('settings.integrations.connected') : t('settings.integrations.notConnected')}
                </span>
                <ExternalLink size={12} className="text-zinc-300" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
