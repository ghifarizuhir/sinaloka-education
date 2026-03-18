import { cn } from '../../lib/utils';

export const Separator = ({ className }: { className?: string }) => (
  <div className={cn('h-px bg-border', className)} />
);
