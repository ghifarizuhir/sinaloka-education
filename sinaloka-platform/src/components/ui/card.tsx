import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm transition-colors", className)} {...props}>
    {children}
  </div>
);
