import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/hooks/useAuth';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { Star } from '@/src/components/BrandDecorations';
import { PasswordStep } from './Onboarding/steps/PasswordStep';

export default function ChangePassword() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user, logout, mustChangePassword } = useAuth();
  const { institution } = useInstitution();

  const brandName = institution?.name || user?.institution?.name || 'Sinaloka';
  const brandLogo = institution?.logo_url || null;

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

  if (!mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePasswordChanged = async () => {
    toast.success(t('changePassword.success'));
    await logout();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Teal header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a5951] via-[#0f766e] to-[#14b8a6]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.2) 0%, transparent 50%)',
          }}
        />

        <Star
          className="absolute top-4 right-[18%] w-3 h-3 text-amber-300/20"
          style={{ animation: 'login-float 6s ease-in-out infinite' }}
        />
        <Star
          className="absolute bottom-3 left-[12%] w-2.5 h-2.5 text-amber-200/15"
          style={{ animation: 'login-float 5s ease-in-out 1s infinite' }}
        />

        <div className="relative z-10 px-4 py-8 sm:py-10">
          <motion.div
            className="flex flex-col items-center"
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
            <p className="text-sm text-teal-100/60 mt-0.5">{t('changePassword.title')}</p>
          </motion.div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(253,230,138,0.3), transparent)',
            animation: 'login-shimmer 4s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center p-4 sm:p-8 pt-6 sm:pt-8">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <PasswordStep onNext={handlePasswordChanged} />
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-1.5 mt-6 mb-4">
          <SinalokaLogo size={14} />
          <span className="text-[11px] text-zinc-300 dark:text-zinc-600 tracking-wide">
            Powered by Sinaloka
          </span>
        </div>
      </div>
    </div>
  );
}
