import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, BookOpen, Users, ShieldCheck, CalendarCheck, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/src/hooks/useAuth';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { TealBrandBackground } from '@/src/components/BrandDecorations';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { Card, Button, Input, Label, PasswordInput } from '@/src/components/UI';

const FEATURE_ICONS = [BookOpen, Users, ShieldCheck];
const FEATURE_KEYS = ['login.feature1', 'login.feature2', 'login.feature3'] as const;

const INST_FEATURE_ICONS = [CalendarCheck, BookOpen, Bell];
const INST_FEATURE_KEYS = ['welcome.feature1', 'welcome.feature2', 'welcome.feature3'] as const;

export function Login() {
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { institution, slug } = useInstitution();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  if (!authLoading && isAuthenticated) {
    if (user?.role === 'SUPER_ADMIN') {
      return <Navigate to="/super/institutions" replace />;
    }
    const redirect = searchParams.get('redirect');
    const target = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const profile = await login(email, password, slug || undefined);
      if (profile.role === 'SUPER_ADMIN') {
        navigate('/super/institutions', { replace: true });
      } else {
        const redirect = searchParams.get('redirect');
        const target = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
        navigate(target, { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('login.defaultError');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ════════════════════════════════════════════
          BRAND SHOWCASE PANEL  (desktop only)
         ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden select-none">
        <TealBrandBackground />

        {/* ── Center content ── */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {institution ? (
            /* ── Institution branding ── */
            <>
              {institution.logo_url ? (
                <img
                  src={institution.logo_url}
                  alt={institution.name}
                  className="w-20 h-20 rounded-2xl mb-6 shadow-2xl object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl text-white text-3xl font-bold ring-2 ring-white/20 bg-white/15 backdrop-blur-sm">
                  {institution.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight text-center">
                {institution.name}
              </h2>
              <p className="text-teal-100/60 text-base text-center max-w-sm leading-relaxed mt-1 mb-10">
                {institution.description || t('login.tagline')}
              </p>

              {/* Institution feature highlights */}
              <div className="space-y-4 w-full max-w-xs">
                {INST_FEATURE_KEYS.map((key, i) => {
                  const Icon = INST_FEATURE_ICONS[i];
                  return (
                    <motion.div
                      key={key}
                      className="flex items-center gap-3.5"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-amber-300/90" />
                      </div>
                      <span className="text-sm text-white/80">{t(key)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── Sinaloka branding ── */
            <>
              <SinalokaLogo size={88} className="mb-7 shadow-2xl" />
              <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
                Sinaloka
              </h2>
              <p className="text-teal-100/70 text-lg text-center max-w-md leading-relaxed mb-12">
                {t('login.tagline')}
              </p>

              {/* Feature highlights */}
              <div className="space-y-4 w-full max-w-xs">
                {FEATURE_KEYS.map((key, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <motion.div
                      key={key}
                      className="flex items-center gap-3.5"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-amber-300/90" />
                      </div>
                      <span className="text-sm text-white/80">{t(key)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bottom trust text */}
        <p className="absolute bottom-5 left-0 right-0 text-center text-[11px] text-white/20 tracking-wide">
          {institution
            ? t('login.poweredBy')
            : t('login.trustText')}
        </p>
      </div>

      {/* ════════════════════════════════════════════
          LOGIN FORM PANEL
         ════════════════════════════════════════════ */}
      <div className="w-full lg:w-[48%] flex flex-col items-center justify-center p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-950 relative transition-colors min-h-screen lg:min-h-0">
        {/* Soft ambient blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-primary/[0.03] rounded-full blur-3xl" />
        </div>

        <motion.div
          className="relative w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* ── Branding header ── */}
          <div className="flex flex-col items-center mb-8 lg:mb-7">
            {/* Mobile: shows full branding since brand panel is hidden */}
            <div className="lg:hidden flex flex-col items-center">
              {institution ? (
                <>
                  {institution.logo_url ? (
                    <img
                      src={institution.logo_url}
                      alt={institution.name}
                      className="w-14 h-14 rounded-xl mb-4 shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg text-white text-xl font-bold bg-[#0f766e]">
                      {institution.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {institution.name}
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t('login.dashboardLogin')}
                  </p>
                </>
              ) : (
                <>
                  <SinalokaLogo size={56} className="mb-4 shadow-lg" />
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {t('login.title')}
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t('login.subtitle')}
                  </p>
                </>
              )}
            </div>

            {/* Desktop: text-only header (logo lives in brand panel) */}
            <div className="hidden lg:flex lg:flex-col lg:items-center">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {institution ? institution.name : t('login.welcome')}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {institution ? t('login.dashboardLogin') : t('login.subtitle')}
              </p>
            </div>
          </div>

          {/* ── Login card ── */}
          <Card className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                <PasswordInput
                  id="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotInfo((prev) => !prev)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>

              {showForgotInfo && (
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-start gap-2">
                  <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {t('login.forgotPasswordInfo')}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('login.signingIn')}
                  </>
                ) : (
                  t('login.signIn')
                )}
              </Button>
            </form>
          </Card>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-6">
            {t('login.copyright', { year: new Date().getFullYear() })}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
