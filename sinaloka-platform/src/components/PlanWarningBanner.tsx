import { useTranslation } from 'react-i18next';
import { usePlan } from '../hooks/usePlan';
import { useSubscriptionStatus } from '../hooks/useSubscription';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function PlanWarningBanner() {
  const { t } = useTranslation();
  const { data: plan } = usePlan();
  const { data: subscriptionData } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  const subscription = subscriptionData?.subscription;

  // Subscription warnings take priority over plan limit warnings
  if (subscription?.status === 'GRACE_PERIOD') {
    const daysRemaining = subscription.days_remaining;
    return (
      <div className="flex items-center justify-between px-4 py-2 text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>
            Subscription telah expired. {daysRemaining} hari tersisa sebelum downgrade ke STARTER.
          </span>
          <button
            onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
            className="font-bold underline ml-2"
          >
            {t('layout.upgradeNow')}
          </button>
        </div>
        <button onClick={() => setDismissed(true)}>
          <X size={16} />
        </button>
      </div>
    );
  }

  if (subscription?.status === 'ACTIVE' && subscription.days_remaining <= 7) {
    const daysRemaining = subscription.days_remaining;
    return (
      <div className="flex items-center justify-between px-4 py-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Subscription berakhir dalam {daysRemaining} hari. Perpanjang sekarang.</span>
          <button
            onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
            className="font-bold underline ml-2"
          >
            {t('layout.upgradeNow')}
          </button>
        </div>
        <button onClick={() => setDismissed(true)}>
          <X size={16} />
        </button>
      </div>
    );
  }

  if (!plan) return null;

  const { usage, planConfig, gracePeriod } = plan;

  const studentPercent = planConfig.maxStudents
    ? (usage.students.current / planConfig.maxStudents) * 100
    : 0;
  const tutorPercent = planConfig.maxTutors
    ? (usage.tutors.current / planConfig.maxTutors) * 100
    : 0;

  const isApproaching = studentPercent >= 80 || tutorPercent >= 80;
  const isAtLimit = studentPercent >= 100 || tutorPercent >= 100;

  if (!isApproaching && !isAtLimit) return null;

  const resource = studentPercent >= tutorPercent
    ? t('plan.maxStudents').toLowerCase()
    : t('plan.maxTutors').toLowerCase();
  const percent = Math.round(Math.max(studentPercent, tutorPercent));

  let message: string;
  let severity: 'warning' | 'error';

  if (gracePeriod?.expired) {
    message = t('plan.warningExpired', { resource });
    severity = 'error';
  } else if (isAtLimit && gracePeriod) {
    message = t('plan.warningReached', { resource, days: gracePeriod.daysRemaining });
    severity = 'error';
  } else {
    message = t('plan.warningApproaching', { resource, percent });
    severity = 'warning';
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 text-sm',
        severity === 'error'
          ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>{message}</span>
        <button
          onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
          className="font-bold underline ml-2"
        >
          {t('layout.upgradeNow')}
        </button>
      </div>
      <button onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  );
}
