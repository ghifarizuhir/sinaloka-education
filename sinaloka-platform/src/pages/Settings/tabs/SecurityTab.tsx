import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react';
import { Card } from '../../../components/UI';
import { authService } from '../../../services/auth.service';
import { useAuth } from '../../../hooks/useAuth';

export const SecurityTab = () => {
  const { t } = useTranslation();
  const { mustChangePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');

  const validations = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    digit: /[0-9]/.test(newPassword),
  };
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allValid = validations.minLength && validations.uppercase && validations.digit && passwordsMatch;

  const mutation = useMutation({
    mutationFn: () =>
      authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setServerError('');

      if (mustChangePassword) {
        toast.success(t('settings.security.successWelcome'));
        window.location.href = '/';
      } else {
        toast.success(t('settings.security.successMessage'));
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '';
      if (message.includes('incorrect')) {
        setServerError(t('settings.security.errorCurrentWrong'));
      } else if (message.includes('different')) {
        setServerError(t('settings.security.errorSamePassword'));
      } else {
        setServerError(message || t('settings.security.errorCurrentWrong'));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      {mustChangePassword && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="font-semibold text-amber-500 text-sm">
              {t('settings.security.forceChangeAlert')}
            </p>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">
            {t('settings.security.title')}
          </h3>
        </div>
        <p className="text-zinc-500 text-sm mb-6">
          {t('settings.security.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {serverError && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('settings.security.currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('settings.security.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('settings.security.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">
                {t('settings.security.errorMismatch')}
              </p>
            )}
          </div>

          {newPassword.length > 0 && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-1.5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                {t('settings.security.validationTitle')}
              </p>
              {Object.entries(validations).map(([key, valid]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={valid ? 'text-green-500' : 'text-red-500'}>
                    {valid ? '✓' : '✗'}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {t(`settings.security.validation.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={!allValid || !currentPassword || mutation.isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? '...' : t('settings.security.updateButton')}
          </button>
        </form>
      </Card>
    </div>
  );
};
