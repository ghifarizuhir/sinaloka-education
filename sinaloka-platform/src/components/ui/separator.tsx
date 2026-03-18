import { cn } from '../../lib/utils';

export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px bg-zinc-100 dark:bg-zinc-800", className)} />
);
