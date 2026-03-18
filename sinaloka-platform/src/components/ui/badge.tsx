import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-[10px] uppercase tracking-wider font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
        error: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
        outline: 'border border-border text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
  className?: string;
  children?: React.ReactNode;
  key?: React.Key;
}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { badgeVariants };
