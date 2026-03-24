import type { CSSProperties } from 'react';
import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, BookOpen, Users, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/src/hooks/useAuth';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { sanitizeBrandColor, isValidImageUrl } from '@/src/lib/subdomain';
import { Card, Button, Input, Label, PasswordInput } from '@/src/components/UI';

/* ─── Star SVG used as floating decoration ─── */
function Star({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor">
      <polygon points="10,0 13,7 20,7 14,12 16,20 10,15 4,20 6,12 0,7 7,7" />
    </svg>
  );
}

/* ─── Stacked-book decoration (echoes the logo motif) ─── */
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

const FEATURE_ICONS = [BookOpen, Users, ShieldCheck];
const FEATURE_KEYS = ['login.feature1', 'login.feature2', 'login.feature3'] as const;

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

  /* ─── Resolve institution brand values ─── */
  const brandColor = institution ? (sanitizeBrandColor(institution.brand_color) ?? '#18181b') : null;
  const bgImage = institution && isValidImageUrl(institution.background_image_url)
    ? institution.background_image_url
    : null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ════════════════════════════════════════════
          BRAND SHOWCASE PANEL  (desktop only)
         ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden select-none">
        {/* ── Background layers ── */}
        {institution ? (
          /* Institution-branded background */
          bgImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${bgImage}")` }}
              />
              <div className="absolute inset-0 bg-black/55" />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 50%, ${brandColor}99 100%)`,
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
              />
            </>
          )
        ) : (
          /* Sinaloka-branded background */
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a5951] via-[#0f766e] to-[#14b8a6]" />
            {/* Dot grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            {/* Ambient color meshes */}
            <div
              className="absolute inset-0"
              style={{
                background: [
                  'radial-gradient(ellipse at 15% 85%, rgba(245,158,11,0.14) 0%, transparent 50%)',
                  'radial-gradient(ellipse at 85% 10%, rgba(20,184,166,0.25) 0%, transparent 50%)',
                ].join(', '),
              }}
            />
          </>
        )}

        {/* ── Floating decorative elements (non-institution only) ── */}
        {!institution && (
          <>
            <Star className="absolute top-[14%] right-[19%] w-5 h-5 text-amber-300/25"
                  style={{ animation: 'login-float 5s ease-in-out infinite' }} />
            <Star className="absolute top-[38%] left-[11%] w-3.5 h-3.5 text-amber-200/20"
                  style={{ animation: 'login-float 7s ease-in-out 1s infinite' }} />
            <Star className="absolute bottom-[24%] right-[26%] w-4 h-4 text-amber-300/15"
                  style={{ animation: 'login-float 6s ease-in-out 0.5s infinite' }} />
            <Star className="absolute bottom-[52%] left-[28%] w-2.5 h-2.5 text-white/10"
                  style={{ animation: 'login-float 5.5s ease-in-out 2s infinite' }} />

            {/* Book stacks */}
            <div className="absolute bottom-[7%] left-[7%] -rotate-6"
                 style={{ animation: 'login-float-slow 8s ease-in-out infinite', '--login-rotate': '-6deg' } as CSSProperties}>
              <BookStack className="opacity-[0.09]" />
            </div>
            <div className="absolute top-[9%] left-[5%] rotate-12"
                 style={{ animation: 'login-float-slow 9s ease-in-out 1s infinite', '--login-rotate': '12deg' } as CSSProperties}>
              <BookStack className="opacity-[0.06]" barCount={2} />
            </div>

            {/* Shimmer line accent */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(253,230,138,0.3), transparent)',
                animation: 'login-shimmer 4s ease-in-out infinite',
              }}
            />
          </>
        )}

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
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl text-white text-3xl font-bold ring-2 ring-white/20"
                  style={{ backgroundColor: brandColor ?? '#18181b' }}
                >
                  {institution.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight text-center">
                {institution.name}
              </h2>
              {institution.description && (
                <p className="text-white/65 text-base text-center max-w-sm leading-relaxed mt-1">
                  {institution.description}
                </p>
              )}
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
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg text-white text-xl font-bold"
                      style={{ backgroundColor: brandColor ?? '#18181b' }}
                    >
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
