import { Receipt, CalendarDays, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type BillingMode = 'PER_SESSION' | 'MONTHLY_FIXED';

interface BillingStepProps {
  selected: BillingMode | null;
  onSelect: (mode: BillingMode) => void;
  onBack: () => void;
  onComplete: () => void;
  isPending: boolean;
}

const BILLING_OPTIONS = [
  {
    value: 'PER_SESSION' as BillingMode,
    icon: Receipt,
    title: 'Per Sesi',
    description: 'Tagihan otomatis dihitung setiap kali siswa hadir. Cocok untuk bimbel dengan jadwal fleksibel.',
    example: 'Siswa hadir 12x dalam sebulan dengan biaya Rp50.000/sesi → tagihan Rp600.000',
  },
  {
    value: 'MONTHLY_FIXED' as BillingMode,
    icon: CalendarDays,
    title: 'Bulanan Tetap',
    description: 'Tagihan bulanan dengan jumlah tetap, digenerate otomatis setiap awal bulan. Cocok untuk bimbel dengan biaya bulanan.',
    example: 'Biaya kelas Rp500.000/bulan → tagihan Rp500.000 otomatis setiap tanggal 1',
  },
];

export function BillingStep({ selected, onSelect, onBack, onComplete, isPending }: BillingStepProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Receipt className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Pilih Mode Tagihan
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Tentukan bagaimana institusi Anda menghitung biaya belajar siswa. Mode ini tidak dapat diubah setelah onboarding.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {BILLING_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
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
              <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Contoh: {option.example}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Warning */}
      <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 max-w-2xl">
        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Mode tagihan tidak dapat diubah setelah onboarding selesai. Hubungi support jika perlu mengubah.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-6 max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Kembali
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={!selected || isPending}
          onClick={onComplete}
          className={cn(
            'px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
            selected
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed',
          )}
        >
          {isPending ? 'Menyimpan...' : 'Selesai'}
        </button>
      </div>
    </div>
  );
}
