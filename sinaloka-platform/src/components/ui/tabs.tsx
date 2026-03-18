import { cn } from '../../lib/utils';

export const Tabs = ({ value, onChange, items, className }: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; disabled?: boolean }[];
  className?: string;
}) => (
  <div className={cn("flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg", className)}>
    {items.map(item => (
      <button
        key={item.value}
        type="button"
        disabled={item.disabled}
        onClick={() => !item.disabled && onChange(item.value)}
        className={cn(
          "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
          value === item.value
            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
          item.disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);
