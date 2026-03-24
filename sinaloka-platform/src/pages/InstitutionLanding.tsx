import type { CSSProperties } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, BookOpen, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { useAuth } from '@/src/hooks/useAuth';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { Button } from '@/src/components/UI';

/* ─── Decorative star (matches login page motif) ─── */
function Star({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor">
      <polygon points="10,0 13,7 20,7 14,12 16,20 10,15 4,20 6,12 0,7 7,7" />
    </svg>
  );
}

/* ─── Stacked-book decoration ─── */
function BookStack({ className, barCount = 3 }: { className?: string; barCount?: number }) {
  return (
    <div className={className}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-md"
          style={{
            width: `${110 - i * 14}px`,
            height: '8px',
            marginLeft: `${i * 8}px`,
            marginBottom: i < barCount - 1 ? '5px' : 0,
            opacity: 0.55 - i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

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
      {/* ── Sinaloka teal gradient background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a5951] via-[#0f766e] to-[#14b8a6]" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse at 20% 80%, rgba(245,158,11,0.12) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 15%, rgba(20,184,166,0.22) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* ── Floating decorations ── */}
      <Star
        className="absolute top-[10%] right-[15%] w-5 h-5 text-amber-300/20"
        style={{ animation: 'login-float 6s ease-in-out infinite' }}
      />
      <Star
        className="absolute top-[30%] left-[8%] w-3 h-3 text-amber-200/15"
        style={{ animation: 'login-float 7s ease-in-out 1.5s infinite' }}
      />
      <Star
        className="absolute bottom-[18%] right-[22%] w-4 h-4 text-amber-300/15"
        style={{ animation: 'login-float 5.5s ease-in-out 0.8s infinite' }}
      />
      <Star
        className="absolute bottom-[40%] left-[18%] w-2.5 h-2.5 text-white/8"
        style={{ animation: 'login-float 6.5s ease-in-out 2.5s infinite' }}
      />
      <div
        className="absolute top-[6%] left-[4%] rotate-12"
        style={{ animation: 'login-float-slow 9s ease-in-out infinite', '--login-rotate': '12deg' } as CSSProperties}
      >
        <BookStack className="opacity-[0.06]" barCount={2} />
      </div>
      <div
        className="absolute bottom-[5%] right-[6%] -rotate-6"
        style={{ animation: 'login-float-slow 8s ease-in-out 1s infinite', '--login-rotate': '-6deg' } as CSSProperties}
      >
        <BookStack className="opacity-[0.07]" />
      </div>

      {/* Shimmer line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(253,230,138,0.25), transparent)',
          animation: 'login-shimmer 4s ease-in-out infinite',
        }}
      />

      {/* ══════════════════════════════════
          MAIN CONTENT
         ══════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 py-12">
        {/* Greeting */}
        <motion.p
          className="text-teal-200/50 text-sm tracking-widest uppercase mb-6"
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
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-5 shadow-2xl text-white text-4xl font-bold ring-2 ring-white/15 bg-white/15 backdrop-blur-sm">
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
                <Icon size={15} className="text-amber-300/70" />
                <span className="text-sm text-white/55">{t(key)}</span>
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
              variant="outline"
              onClick={() => navigate('/register')}
              className="border-white/25 text-white hover:bg-white/10 sm:min-w-[140px] justify-center"
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
