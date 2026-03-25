import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsService } from '@/src/services/settings.service';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '@/src/lib/utils';

interface ProfileStepProps {
  onNext: () => void;
  onBack?: () => void;
  onSkip: () => void;
}

export function ProfileStep({ onNext, onBack, onSkip }: ProfileStepProps) {
  const { user } = useAuth();
  const institutionName = user?.institution?.name || '';

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      settingsService.updateGeneral({
        phone: phone.trim() || null,
        email: email.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Profil berhasil disimpan');
      onNext();
    },
    onError: () => {
      toast.error('Gagal menyimpan profil');
    },
  });

  const hasData = phone.trim() || email.trim();

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-6 h-6 text-[#0f766e]" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Lengkapi Profil Institusi
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Informasi ini akan ditampilkan di invoice, laporan, dan komunikasi dengan orang tua siswa.
      </p>

      <div className="max-w-md space-y-4">
        {/* Institution Name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Nama Institusi
          </label>
          <input
            type="text"
            value={institutionName}
            disabled
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            No. Telepon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812-xxxx-xxxx"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Untuk kontak di invoice dan komunikasi dengan orang tua
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@institusi.com"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Untuk notifikasi sistem dan kontak resmi institusi
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Kembali
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Lewati
          </button>
          <button
            type="button"
            disabled={!hasData || mutation.isPending}
            onClick={() => mutation.mutate()}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
              hasData
                ? 'bg-[#0f766e] text-white hover:bg-[#0a5951]'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
            )}
          >
            {mutation.isPending ? 'Menyimpan...' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}
