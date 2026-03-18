import React from 'react';
import { cn } from '../../lib/utils';
import { Search } from 'lucide-react';

export const SearchInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
);
