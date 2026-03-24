import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { onboardingService } from '@/src/services/onboarding.service';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '@/src/lib/utils';
import { PasswordStep } from './steps/PasswordStep';
import { ProfileStep } from './steps/ProfileStep';
import { AcademicStep } from './steps/AcademicStep';
import { BillingStep } from './steps/BillingStep';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

const STEPS = [
  { label: 'Password', number: 1 },
  { label: 'Profil', number: 2 },
  { label: 'Akademik', number: 3 },
  { label: 'Billing', number: 4 },
];

export default function Onboarding() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [billingMode, setBillingMode] = useState<BillingMode | null>(null);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!billingMode) return;
      await onboardingService.setBillingMode(billingMode);
      await onboardingService.complete();
    },
    onSuccess: () => {
      toast.success('Setup selesai! Selamat datang.');
      window.location.href = '/';
    },
    onError: () => {
      toast.error('Gagal menyelesaikan setup. Silakan coba lagi.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 4));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    currentStep > step.number
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : currentStep === step.number
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  {currentStep > step.number ? <Check size={14} /> : step.number}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 font-medium',
                    currentStep >= step.number
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2 mb-4',
                    currentStep > step.number
                      ? 'bg-zinc-900 dark:bg-zinc-100'
                      : 'bg-zinc-200 dark:bg-zinc-800',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          {currentStep === 1 && <PasswordStep onNext={goNext} />}
          {currentStep === 2 && <ProfileStep onNext={goNext} onBack={goBack} onSkip={goNext} />}
          {currentStep === 3 && <AcademicStep onNext={goNext} onBack={goBack} onSkip={goNext} />}
          {currentStep === 4 && (
            <BillingStep
              selected={billingMode}
              onSelect={setBillingMode}
              onBack={goBack}
              onComplete={() => completeMutation.mutate()}
              isPending={completeMutation.isPending}
            />
          )}
        </div>

        {/* Step indicator text */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Langkah {currentStep} dari {STEPS.length}
        </p>
      </div>
    </div>
  );
}
