import { cn } from '../../lib/utils';

export const Progress = ({ value, max = 100, className }: { value: number, max?: number, className?: string }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("h-1.5 w-full bg-secondary rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
