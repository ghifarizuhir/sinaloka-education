import React from 'react';
import { cn } from '../../lib/utils';

export const Badge = ({ children, variant = 'default', className, ...props }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline', className?: string } & React.HTMLAttributes<HTMLSpanElement>) => {
  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    success: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    error: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    outline: "border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
  };

  return (
    <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full", variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
