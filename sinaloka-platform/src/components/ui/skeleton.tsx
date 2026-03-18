import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg", className)} {...props} />
);
