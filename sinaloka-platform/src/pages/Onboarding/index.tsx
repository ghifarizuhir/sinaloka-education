import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { onboardingService } from '@/src/services/onboarding.service';
import { useAuth } from '@/src/hooks/useAuth';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { Star } from '@/src/components/BrandDecorations';
import { cn } from '@/src/lib/utils';
import { ProfileStep } from './steps/ProfileStep';
import { AcademicStep } from './steps/AcademicStep';
import { BillingStep } from './steps/BillingStep';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

const STEPS = [
  { label: 'Profil', number: 1 },
  { label: 'Akademik', number: 2 },
  { label: 'Billing', number: 3 },
];

export default function Onboarding() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { institution } = useInstitution();
  const [currentStep, setCurrentStep] = useState(1);
  const [billingMode, setBillingMode] = useState<BillingMode | null>(null);

  // Brand display: prefer InstitutionContext (has logo), fall back to user's institution
  const brandName = institution?.name || user?.institution?.name || 'Sinaloka';
  const brandLogo = institution?.logo_url || null;

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
        <div className="w-8 h-8 border-2 border-[#0f766e]/30 border-t-[#0f766e] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 3));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* ════════════════════════════════════════════
          TEAL HEADER SECTION
         ════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a5951] via-[#0f766e] to-[#14b8a6]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Ambient color mesh */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.2) 0%, transparent 50%)',
          }}
        />

        {/* Floating stars */}
        <Star
          className="absolute top-4 right-[18%] w-3 h-3 text-amber-300/20"
          style={{ animation: 'login-float 6s ease-in-out infinite' }}
        />
        <Star
          className="absolute bottom-3 left-[12%] w-2.5 h-2.5 text-amber-200/15"
          style={{ animation: 'login-float 5s ease-in-out 1s infinite' }}
        />
        <Star
          className="absolute top-6 left-[30%] w-2 h-2 text-white/10"
          style={{ animation: 'login-float 7s ease-in-out 0.5s infinite' }}
        />

        <div className="relative z-10 px-4 py-8 sm:py-10">
          {/* Institution branding */}
          <motion.div
            className="flex flex-col items-center mb-7"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                className="w-12 h-12 rounded-xl mb-3 shadow-xl object-cover ring-2 ring-white/15"
              />
            ) : institution || user?.institution ? (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-xl ring-2 ring-white/15 bg-white/20 backdrop-blur-sm text-white text-lg font-bold">
                {brandName.charAt(0).toUpperCase()}
              </div>
            ) : (
              <SinalokaLogo size={48} className="mb-3 shadow-xl" />
            )}
            <h1 className="text-xl font-bold text-white tracking-tight">{brandName}</h1>
            <p className="text-sm text-teal-100/60 mt-0.5">Setup Awal</p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                      currentStep > step.number
                        ? 'bg-white text-[#0f766e]'
                        : currentStep === step.number
                          ? 'bg-white text-[#0f766e]'
                          : 'bg-white/20 text-white/60',
                    )}
                  >
                    {currentStep > step.number ? <Check size={14} /> : step.number}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] mt-1 font-medium',
                      currentStep >= step.number
                        ? 'text-white'
                        : 'text-white/40',
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
                        ? 'bg-white/80'
                        : 'bg-white/20',
                    )}
                  />
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Shimmer line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(253,230,138,0.3), transparent)',
            animation: 'login-shimmer 4s ease-in-out infinite',
          }}
        />
      </div>

      {/* ════════════════════════════════════════════
          CONTENT SECTION
         ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center p-4 sm:p-8 pt-6 sm:pt-8">
        <motion.div
          key={currentStep}
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            {currentStep === 1 && <ProfileStep onNext={goNext} onSkip={goNext} />}
            {currentStep === 2 && <AcademicStep onNext={goNext} onBack={goBack} onSkip={goNext} />}
            {currentStep === 3 && (
              <BillingStep
                selected={billingMode}
                onSelect={setBillingMode}
                onBack={goBack}
                onComplete={() => completeMutation.mutate()}
                isPending={completeMutation.isPending}
              />
            )}
          </div>
        </motion.div>

        {/* Step counter */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Langkah {currentStep} dari {STEPS.length}
        </p>

        {/* Powered by Sinaloka */}
        <div className="flex items-center justify-center gap-1.5 mt-4 mb-4">
          <SinalokaLogo size={14} />
          <span className="text-[11px] text-zinc-300 dark:text-zinc-600 tracking-wide">
            Powered by Sinaloka
          </span>
        </div>
      </div>
    </div>
  );
}
