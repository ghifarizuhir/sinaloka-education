import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { sanitizeBrandColor } from '@/src/lib/subdomain';
import { Card, Button, Input, Label, PasswordInput } from '@/src/components/UI';

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 transition-colors">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-zinc-300 dark:bg-zinc-700 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8">
          {institution ? (
            <>
              {institution.logo_url ? (
                <img
                  src={institution.logo_url}
                  alt={institution.name}
                  className="w-12 h-12 rounded-xl mb-4 shadow-lg object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg text-white text-lg font-bold"
                  style={{ backgroundColor: sanitizeBrandColor(institution.brand_color) ?? '#18181b' }}
                >
                  {institution.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {institution.name}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Masuk ke dashboard
              </p>
            </>
          ) : (
            <>
              <SinalokaLogo size={48} className="mb-4 shadow-lg" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {t('login.title')}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t('login.subtitle')}
              </p>
            </>
          )}
        </div>

        {/* Login card */}
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
                onClick={() => setShowForgotInfo(prev => !prev)}
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
      </div>
    </div>
  );
}
