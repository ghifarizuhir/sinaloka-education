import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/src/services/auth.service';
import { cn } from '@/src/lib/utils';

interface PasswordStepProps {
  onNext: () => void;
}

export function PasswordStep({ onNext }: PasswordStepProps) {
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
      toast.success('Password berhasil diubah');
      onNext();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '';
      if (message.includes('incorrect')) {
        setServerError('Password saat ini salah');
      } else if (message.includes('different')) {
        setServerError('Password baru harus berbeda dari password saat ini');
      } else {
        setServerError(message || 'Gagal mengubah password');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    mutation.mutate();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Amankan Akun Anda
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Password saat ini dibuat oleh admin sistem. Ganti dengan password pribadi Anda untuk keamanan akun.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {serverError && (
          <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {serverError}
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Password Saat Ini
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

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Password Baru
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

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Konfirmasi Password Baru
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
            <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
          )}
        </div>

        {/* Validation indicators */}
        {newPassword.length > 0 && (
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Persyaratan password:
            </p>
            {[
              { key: 'minLength', label: 'Minimal 8 karakter' },
              { key: 'uppercase', label: 'Mengandung huruf besar' },
              { key: 'digit', label: 'Mengandung angka' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={validations[key as keyof typeof validations] ? 'text-green-500' : 'text-red-500'}>
                  {validations[key as keyof typeof validations] ? '✓' : '✗'}
                </span>
                <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!allValid || !currentPassword || mutation.isPending}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
            allValid && currentPassword
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
          )}
        >
          {mutation.isPending ? 'Menyimpan...' : 'Lanjut'}
        </button>
      </form>
    </div>
  );
}
