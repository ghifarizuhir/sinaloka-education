import { useNavigate, Navigate } from 'react-router-dom';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { useAuth } from '@/src/hooks/useAuth';
import { sanitizeBrandColor, isValidImageUrl } from '@/src/lib/subdomain';
import { Button } from '@/src/components/UI';

export function InstitutionLanding() {
  const { institution } = useInstitution();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!institution) return null;

  const brandColor = sanitizeBrandColor(institution.brand_color) ?? '#18181b';
  const bgImage = isValidImageUrl(institution.background_image_url) ? institution.background_image_url : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {bgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${bgImage}")` }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${brandColor} 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${brandColor} 0%, transparent 50%)`,
            }}
          />
        </div>
      )}

      <div className="relative z-10 text-center max-w-lg">
        {institution.logo_url ? (
          <img
            src={institution.logo_url}
            alt={institution.name}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg text-white text-2xl font-bold"
            style={{ backgroundColor: brandColor }}
          >
            {institution.name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1
          className={`text-3xl font-bold mb-3 ${bgImage ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}
        >
          {institution.name}
        </h1>

        {institution.description && (
          <p
            className={`text-base mb-8 ${bgImage ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            {institution.description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            style={{ backgroundColor: brandColor }}
            className="text-white"
          >
            Masuk
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/register')}
            className={bgImage ? 'border-white/30 text-white hover:bg-white/10' : ''}
          >
            Daftar
          </Button>
        </div>
      </div>

      <p
        className={`absolute bottom-4 text-xs ${bgImage ? 'text-white/40' : 'text-zinc-400 dark:text-zinc-600'}`}
      >
        Powered by Sinaloka
      </p>
    </div>
  );
}
