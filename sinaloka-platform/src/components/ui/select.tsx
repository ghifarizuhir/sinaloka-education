import React from 'react';
import { cn } from '../../lib/utils';

function isOptionGroup(opt: any): opt is { label: string; options: { value: string; label: string; disabled?: boolean }[] } {
  return 'options' in opt;
}

export const Select = ({ value, onChange, options, placeholder, className, ...rest }: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  options: ({ value: string; label: string; disabled?: boolean } | { label: string; options: { value: string; label: string; disabled?: boolean }[] })[];
  placeholder?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      "h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 dark:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...rest}
  >
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map((opt, i) =>
      isOptionGroup(opt) ? (
        <optgroup key={i} label={opt.label}>
          {opt.options.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </optgroup>
      ) : (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      )
    )}
  </select>
);
