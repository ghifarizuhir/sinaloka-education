import { cn } from '../../lib/utils';

export const Switch = ({ checked, onChange, disabled, className }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, className?: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
      checked ? "bg-primary" : "bg-input",
      className
    )}
  >
    <span
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
        checked ? "translate-x-4" : "translate-x-1"
      )}
    />
  </button>
);
