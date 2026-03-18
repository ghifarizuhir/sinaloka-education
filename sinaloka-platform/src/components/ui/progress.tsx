import { cn } from '../../lib/utils';

export const Progress = ({ value, max = 100, className }: { value: number, max?: number, className?: string }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
