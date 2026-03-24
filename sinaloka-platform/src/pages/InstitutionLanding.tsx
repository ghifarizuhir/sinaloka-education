import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, BookOpen, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { useAuth } from '@/src/hooks/useAuth';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { TealBrandBackground } from '@/src/components/BrandDecorations';
import { Button } from '@/src/components/UI';

const FEATURE_ICONS = [CalendarCheck, BookOpen, Bell];
const FEATURE_KEYS = ['welcome.feature1', 'welcome.feature2', 'welcome.feature3'] as const;

export function InstitutionLanding() {
  const { institution } = useInstitution();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!institution) return null;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center select-none">
      <TealBrandBackground />

      {/* ══════════════════════════════════
          MAIN CONTENT
         ══════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 py-12">
        {/* Greeting */}
        <motion.p
          className="text-teal-100/65 text-sm tracking-widest uppercase mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {t('welcome.greeting')}
        </motion.p>

        {/* Institution logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {institution.logo_url ? (
            <img
              src={institution.logo_url}
              alt={institution.name}
              className="w-24 h-24 rounded-2xl mb-5 shadow-2xl object-cover ring-2 ring-white/15"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-5 shadow-2xl text-white text-4xl font-bold ring-2 ring-white/20 bg-white/20 backdrop-blur-sm">
              {institution.name.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        {/* Institution name */}
        <motion.h1
          className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight text-center leading-tight"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {institution.name}
        </motion.h1>

        {/* Description */}
        {institution.description && (
          <motion.p
            className="text-teal-100/60 text-base sm:text-lg text-center max-w-md leading-relaxed mb-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45 }}
          >
            {institution.description}
          </motion.p>
        )}

        {/* ── Feature highlights ── */}
        <motion.div
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-8 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div key={key} className="flex items-center gap-2">
                <Icon size={15} className="text-amber-300/80" />
                <span className="text-sm text-white/70">{t(key)}</span>
              </div>
            );
          })}
        </motion.div>

        {/* ── CTA buttons ── */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
        >
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-white text-[#0f766e] hover:bg-white/90 shadow-lg shadow-black/10 font-semibold sm:min-w-[140px] justify-center"
          >
            {t('welcome.loginButton')}
          </Button>
          {institution.registration_enabled && (
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-[#0f766e] hover:bg-white/90 shadow-lg shadow-black/10 font-semibold sm:min-w-[140px] justify-center"
            >
              {t('welcome.registerButton')}
            </Button>
          )}
        </motion.div>
      </div>

      {/* ── Footer ── */}
      <motion.div
        className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <SinalokaLogo size={14} />
        <span className="text-[11px] text-white/20 tracking-wide">
          {t('welcome.poweredBy')}
        </span>
      </motion.div>
    </div>
  );
}
