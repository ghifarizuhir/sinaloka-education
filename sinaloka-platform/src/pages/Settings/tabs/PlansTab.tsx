import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Zap } from 'lucide-react';
import { Card, Button, Badge } from '../../../components/UI';
import { cn } from '../../../lib/utils';
import { usePlan } from '../../../hooks/usePlan';
import { useSubscriptionStatus } from '../../../hooks/useSubscription';
import type { PlanType, PlanConfig } from '../../../types/plan';
import { SubscriptionStatusCard } from './PlansTab/SubscriptionStatusCard';
import { PaymentModal } from './PlansTab/PaymentModal';
import { InvoiceTable } from './PlansTab/InvoiceTable';

const PLAN_ORDER: PlanType[] = ['STARTER', 'GROWTH', 'BUSINESS'];

function PricingCard({
  planType,
  planConfig,
  currentPlan,
  onRequestUpgrade,
}: {
  key?: React.Key;
  planType: PlanType;
  planConfig: PlanConfig;
  currentPlan: PlanType;
  onRequestUpgrade: (plan: PlanType) => void;
}) {
  const { t } = useTranslation();

  const currentOrder = PLAN_ORDER.indexOf(currentPlan);
  const thisOrder = PLAN_ORDER.indexOf(planType);
  const isCurrent = planType === currentPlan;
  const isHigher = thisOrder > currentOrder;
  const isLower = thisOrder < currentOrder;

  const features: { key: keyof typeof planConfig.features; label: string }[] = [
    { key: 'whatsappNotification', label: t('plan.whatsappNotification') },
    { key: 'advancedReporting', label: t('plan.advancedReporting') },
    { key: 'multiBranch', label: t('plan.multiBranch') },
  ];

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 relative',
        isCurrent && 'ring-2 ring-primary border-primary',
        isLower && 'opacity-60',
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold shadow-sm">
            {t('plan.currentPlan')}
          </Badge>
        </div>
      )}

      <div className="pt-2">
        <h3 className="text-lg font-bold dark:text-zinc-100">{planConfig.label}</h3>
        <p className="text-2xl font-extrabold mt-1 dark:text-zinc-100">
          {planConfig.priceDisplay}
        </p>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t('plan.features')}
        </p>
        {features.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            {planConfig.features[key] ? (
              <Check size={15} className="text-emerald-500 shrink-0" />
            ) : (
              <X size={15} className="text-zinc-400 shrink-0" />
            )}
            <span className={cn(!planConfig.features[key] && 'text-muted-foreground line-through')}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('plan.maxStudents')}</span>
          <span className="font-semibold dark:text-zinc-100">
            {planConfig.maxStudents === null ? t('plan.unlimited') : planConfig.maxStudents}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('plan.maxTutors')}</span>
          <span className="font-semibold dark:text-zinc-100">
            {planConfig.maxTutors === null ? t('plan.unlimited') : planConfig.maxTutors}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-2">
        {isHigher && (
          <Button
            className="w-full gap-2"
            onClick={() => onRequestUpgrade(planType)}
          >
            <Zap size={15} />
            {t('plan.requestUpgrade')}
          </Button>
        )}
        {isCurrent && (
          <Button variant="outline" className="w-full" disabled>
            {t('plan.currentPlan')}
          </Button>
        )}
        {isLower && (
          <Button variant="outline" className="w-full opacity-50" disabled>
            {planConfig.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface PaymentModalState {
  open: boolean;
  planType: 'GROWTH' | 'BUSINESS';
  type: 'new' | 'renewal';
}

export const PlansTab = () => {
  const { t } = useTranslation();
  const { data: planInfo, isLoading } = usePlan();
  const { data: subscriptionStatus } = useSubscriptionStatus();

  const [paymentModal, setPaymentModal] = useState<PaymentModalState | null>(null);

  const handleRequestUpgrade = (plan: PlanType) => {
    if (plan === 'STARTER') return;
    setPaymentModal({ open: true, planType: plan as 'GROWTH' | 'BUSINESS', type: 'new' });
  };

  const handleRenew = () => {
    if (!planInfo) return;
    const currentPlan = planInfo.currentPlan;
    if (currentPlan === 'STARTER') return;
    setPaymentModal({ open: true, planType: currentPlan as 'GROWTH' | 'BUSINESS', type: 'renewal' });
  };

  const closePaymentModal = () => setPaymentModal(null);

  const paymentPrice =
    paymentModal && planInfo
      ? (planInfo.allPlans[paymentModal.planType]?.price ?? 0)
      : 0;

  if (isLoading || !planInfo) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {subscriptionStatus && (
          <SubscriptionStatusCard data={subscriptionStatus} onRenew={handleRenew} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_ORDER.map((planType) => (
            <PricingCard
              key={planType}
              planType={planType}
              planConfig={planInfo.allPlans[planType]}
              currentPlan={planInfo.currentPlan}
              onRequestUpgrade={handleRequestUpgrade}
            />
          ))}
        </div>

        <div>
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Invoice</h3>
          <InvoiceTable />
        </div>
      </div>

      {paymentModal && (
        <PaymentModal
          isOpen={paymentModal.open}
          onClose={closePaymentModal}
          planType={paymentModal.planType}
          type={paymentModal.type}
          price={paymentPrice}
        />
      )}
    </>
  );
};
