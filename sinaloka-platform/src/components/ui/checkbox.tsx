import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export const Checkbox = ({ checked, onChange, disabled, className }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, className?: string }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={cn(
      "w-4 h-4 rounded border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      checked
        ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900"
        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800",
      className
    )}
  >
    {checked && <Check size={12} strokeWidth={3} />}
  </button>
);
