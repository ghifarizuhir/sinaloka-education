import { cn } from '../../lib/utils';

export const Avatar = ({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const initial = name.split(' ').pop()?.charAt(0)?.toUpperCase() ?? '?';
  const sizes = {
    sm: 'w-8 h-8 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    md: 'w-10 h-10 rounded-xl text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
    lg: 'w-16 h-16 rounded-2xl text-2xl shadow-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
  };
  return (
    <div className={cn("flex items-center justify-center font-bold", sizes[size], className)}>
      {initial}
    </div>
  );
};
