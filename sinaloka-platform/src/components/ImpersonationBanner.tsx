import { useAuth } from '@/src/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ImpersonationBanner() {
  const { impersonatedInstitution, exitInstitution } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!impersonatedInstitution) return null;

  const handleExit = () => {
    exitInstitution();
    navigate('/super/institutions');
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-semibold">{t('superAdmin.viewingAs')}:</span>
        <span>{impersonatedInstitution.name}</span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 bg-amber-950 text-amber-500 px-3 py-1 rounded text-xs font-medium hover:bg-amber-900 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('superAdmin.exitToSuperAdmin')}
      </button>
    </div>
  );
}
