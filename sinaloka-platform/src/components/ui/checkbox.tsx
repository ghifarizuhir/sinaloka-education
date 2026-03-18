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
        ? "bg-primary border-primary text-primary-foreground"
        : "bg-background border-input",
      className
    )}
  >
    {checked && <Check size={12} strokeWidth={3} />}
  </button>
);
