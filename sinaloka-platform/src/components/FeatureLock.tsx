import React from 'react';
import { usePlan } from '../hooks/usePlan';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PlanFeatures } from '../types/plan';

interface FeatureLockProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
}

export function FeatureLock({ feature, children }: FeatureLockProps) {
  const { data: plan, isLoading } = usePlan();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading || !plan) {
    return null;
  }

  if (plan.planConfig.features[feature]) {
    return <>{children}</>;
  }

  // Find which plan unlocks this feature
  const requiredPlan = Object.values(plan.allPlans).find(
    (p) => p.features[feature],
  );

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
        <div className="text-center space-y-2">
          <Lock size={24} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">
            {requiredPlan?.label} {t('common.proFeature')}
          </p>
          <button
            onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
            className="text-xs font-bold text-primary hover:underline"
          >
            {t('layout.upgradeNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
