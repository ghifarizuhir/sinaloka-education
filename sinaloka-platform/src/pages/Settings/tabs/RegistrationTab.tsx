import { Card, Skeleton } from '../../../components/UI';
import { ClipboardList, Copy, Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { useRegistrationSettings, useUpdateRegistrationSettings } from '../../../hooks/useRegistrations';

export const RegistrationTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: settings, isLoading } = useRegistrationSettings();
  const updateSettings = useUpdateRegistrationSettings();

  const slug = user?.institution?.slug ?? '';
  const registrationLink = `sinaloka.com/register/${slug}`;

  const handleToggleStudent = (enabled: boolean) => {
    updateSettings.mutate({
      student_enabled: enabled,
      tutor_enabled: settings?.tutor_enabled ?? false,
    });
  };

  const handleToggleTutor = (enabled: boolean) => {
    updateSettings.mutate({
      student_enabled: settings?.student_enabled ?? false,
      tutor_enabled: enabled,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${registrationLink}`);
    toast.success(t('registration.linkCopied'));
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">
            {t('registration.settings')}
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="text-sm font-medium dark:text-zinc-100">
                  {t('registration.studentEnabled')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.student_enabled ?? false}
                  onChange={(e) => handleToggleStudent(e.target.checked)}
                  disabled={updateSettings.isPending}
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-primary" />
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="text-sm font-medium dark:text-zinc-100">
                  {t('registration.tutorEnabled')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.tutor_enabled ?? false}
                  onChange={(e) => handleToggleTutor(e.target.checked)}
                  disabled={updateSettings.isPending}
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Link size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">
            {t('registration.copyLink')}
          </h3>
        </div>

        {isLoading ? (
          <Skeleton className="h-12" />
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 flex-1 truncate">
              {registrationLink}
            </p>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <Copy size={14} />
              Salin
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
