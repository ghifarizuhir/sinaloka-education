import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Receipt, CalendarDays, ArrowRight, Check } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { onboardingService } from '@/src/services/onboarding.service';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/hooks/useAuth';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

const BILLING_OPTIONS = [
  {
    value: 'PER_SESSION' as BillingMode,
    icon: Receipt,
    title: 'Per Sesi',
    description: 'Siswa ditagih setiap kali hadir di sesi kelas',
    details: [
      'Cocok untuk les privat dan bimbel fleksibel',
      'Tagihan otomatis dibuat saat absensi dicatat',
      'Nominal diatur per kelas',
    ],
  },
  {
    value: 'MONTHLY_FIXED' as BillingMode,
    icon: CalendarDays,
    title: 'Bulanan Tetap',
    description: 'Siswa bayar biaya tetap per bulan',
    details: [
      'Cocok untuk bimbel reguler dan program intensif',
      'Tagihan otomatis dibuat setiap awal bulan',
      'Nominal diatur per kelas',
    ],
  },
] as const;

export default function Onboarding() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selected, setSelected] = useState<BillingMode | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const setBillingMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await onboardingService.setBillingMode(selected);
      await onboardingService.complete();
    },
    onSuccess: () => {
      toast.success('Setup selesai!');
      window.location.href = '/';
    },
    onError: () => {
      toast.error('Gagal menyimpan. Silakan coba lagi.');
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Selamat datang!
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Bagaimana cara kamu menagih siswa?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BILLING_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={cn(
                  'relative p-6 rounded-xl border-2 text-left transition-all',
                  'hover:border-zinc-400 dark:hover:border-zinc-500',
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50',
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white dark:text-zinc-900" />
                  </div>
                )}
                <Icon className="w-8 h-8 text-zinc-700 dark:text-zinc-300 mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {option.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </p>
                <ul className="mt-3 space-y-1">
                  {option.details.map((detail) => (
                    <li key={detail} className="text-xs text-zinc-400 dark:text-zinc-500 flex items-start gap-1.5">
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={!selected || setBillingMutation.isPending}
            onClick={() => setBillingMutation.mutate()}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
              selected
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
            )}
          >
            {setBillingMutation.isPending ? 'Menyimpan...' : 'Lanjutkan'}
            {!setBillingMutation.isPending && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Mode billing tidak dapat diubah setelah dipilih. Hubungi support jika perlu mengubah.
        </p>
      </div>
    </div>
  );
}
